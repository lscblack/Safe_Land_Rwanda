import os
import time
import json
import logging
import numpy as np
import pandas as pd
from lightgbm import LGBMRegressor, LGBMClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import root_mean_squared_error, accuracy_score, classification_report
from sklearn.preprocessing import MinMaxScaler
import joblib
from .features import build_training_dataframe
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict

MODELS_DIR = os.path.join(os.path.dirname(__file__), '../../../models')
LATEST_PATH = os.path.join(MODELS_DIR, 'latest.json')

os.makedirs(MODELS_DIR, exist_ok=True)

logger = logging.getLogger(__name__)


def _has_variance(series: pd.Series, name: str) -> bool:
    if series.nunique() <= 1:
        logger.warning(f'Target "{name}" has no variance (all values = {series.iloc[0]}). '
                       f'Using synthetic composite target instead.')
        return False
    return True


def _composite_growth_target(df: pd.DataFrame) -> pd.Series:
    """
    Growth potential = weighted sum of available continuous features.
    Uses whatever has actual variance in the dataset.
    """
    score = pd.Series(0.0, index=df.index)
    area = pd.to_numeric(df.get('parcel_area_sqm', 0), errors='coerce').fillna(0)
    floors = pd.to_numeric(df.get('building_floors', 0), errors='coerce').fillna(0)
    dev = pd.to_numeric(df.get('development_score', 0), errors='coerce').fillna(0)
    lease_sec = pd.to_numeric(df.get('lease_security_score', 0), errors='coerce').fillna(0)
    age = pd.to_numeric(df.get('property_age', 0), errors='coerce').fillna(0)
    year = pd.to_numeric(df.get('year_of_record', 0), errors='coerce').fillna(0)

    # Normalize each to [0,1] only if it has variance
    def _norm(s):
        mn, mx = s.min(), s.max()
        return (s - mn) / (mx - mn) if mx > mn else s * 0

    score += _norm(area) * 0.35
    score += _norm(floors) * 0.15
    score += _norm(dev) * 0.20
    score += _norm(lease_sec) * 0.15
    score += _norm(age) * 0.10
    score += _norm(year) * 0.05
    return score


def _composite_risk_target(df: pd.DataFrame) -> pd.Series:
    """
    Risk = legal encumbrances + short lease security + undeveloped + small area.
    Always has variance because it uses continuous sub-scores.
    """
    risk = pd.Series(0.0, index=df.index)
    # Legal flags (0 or 1) — may all be 0, but we add other dimensions
    risk += pd.to_numeric(df.get('under_mortgage', 0), errors='coerce').fillna(0)
    risk += pd.to_numeric(df.get('has_caveat', 0), errors='coerce').fillna(0)
    risk += pd.to_numeric(df.get('in_transaction', 0), errors='coerce').fillna(0)
    # Lease insecurity (low remaining / term ratio = high risk)
    lease_sec = pd.to_numeric(df.get('lease_security_score', 0), errors='coerce').fillna(0)
    risk += (1 - lease_sec.clip(0, 1)) * 0.5
    # Undeveloped = higher risk
    dev = pd.to_numeric(df.get('development_score', 0), errors='coerce').fillna(0)
    risk += (1 - (dev / dev.max()).clip(0, 1)) * 0.5 if dev.max() > 0 else 0.5
    # Normalise to [0, 1]
    mn, mx = risk.min(), risk.max()
    return (risk - mn) / (mx - mn) if mx > mn else risk


def _composite_investment_target(df: pd.DataFrame) -> pd.Series:
    """
    Investment potential = large developed area with good lease security.
    """
    area = pd.to_numeric(df.get('parcel_area_sqm', 0), errors='coerce').fillna(0)
    dev = pd.to_numeric(df.get('development_score', 0), errors='coerce').fillna(0)
    lease_sec = pd.to_numeric(df.get('lease_security_score', 0), errors='coerce').fillna(0)
    floors = pd.to_numeric(df.get('building_floors', 0), errors='coerce').fillna(0)

    def _norm(s):
        mn, mx = s.min(), s.max()
        return (s - mn) / (mx - mn) if mx > mn else s * 0

    score = (
        _norm(area) * 0.40 +
        _norm(dev)  * 0.30 +
        _norm(lease_sec) * 0.20 +
        _norm(floors) * 0.10
    )
    # Binary: top 50th percentile = good investment
    threshold = score.median()
    return (score >= threshold).astype(int)


async def train_all_models(session: AsyncSession) -> Dict[str, str]:
    df = await build_training_dataframe(session)
    if df.empty:
        raise ValueError('No training data found')

    logger.info(f'Training on {len(df)} records with columns: {df.columns.tolist()}')

    # ── Feature matrix ────────────────────────────────────────────────────────
    BASE_DROP = ['upi', 'id', 'district', 'sector', 'price', 'property_age',
                 'risk_score', 'development_score']
    X_base = (df.drop(BASE_DROP, axis=1, errors='ignore')
                .select_dtypes(include=['number', 'bool', 'uint8'])
                .fillna(0))
    feature_cols = X_base.columns.tolist()
    logger.info(f'Feature columns ({len(feature_cols)}): {feature_cols}')

    # ── Targets ───────────────────────────────────────────────────────────────
    y_value = df['price']

    # Growth: prefer property_age if it has variance, else composite
    y_growth_raw = df.get('property_age', pd.Series(0, index=df.index))
    y_growth = y_growth_raw if _has_variance(y_growth_raw, 'property_age') \
               else _composite_growth_target(df)

    # Risk: prefer risk_score binary if it has variance, else composite
    y_risk_raw = (df.get('risk_score', pd.Series(0, index=df.index)) > 0).astype(int)
    y_risk = y_risk_raw if _has_variance(y_risk_raw, 'risk_score') \
             else (_composite_risk_target(df) >= 0.5).astype(int)

    # Investment: prefer development_score based binary, else composite
    y_inv_raw = (df.get('development_score', pd.Series(0, index=df.index)) > 1).astype(int)
    y_investment = y_inv_raw if _has_variance(y_inv_raw, 'investment') \
                   else _composite_investment_target(df)

    logger.info(f'Target distributions — '
                f'growth unique: {y_growth.nunique()}, '
                f'risk classes: {y_risk.value_counts().to_dict()}, '
                f'investment classes: {y_investment.value_counts().to_dict()}')

    # ── Train / test split (handle tiny datasets) ─────────────────────────────
    n = len(X_base)
    test_size = 0.2 if n >= 10 else 0.0   # no split if < 10 records
    split_kw = dict(test_size=test_size, random_state=42) if test_size > 0 \
               else dict(test_size=1, random_state=42)    # dummy — ignored below

    if test_size > 0:
        X_train, X_test, yv_tr, yv_te = train_test_split(X_base, y_value, **split_kw)
        _, _, yi_tr, yi_te = train_test_split(X_base, y_investment, **split_kw)
        _, _, yr_tr, yr_te = train_test_split(X_base, y_risk, **split_kw)
        _, _, yg_tr, yg_te = train_test_split(X_base, y_growth, **split_kw)
    else:
        X_train = X_test = X_base
        yv_tr = yv_te = y_value
        yi_tr = yi_te = y_investment
        yr_tr = yr_te = y_risk
        yg_tr = yg_te = y_growth

    timestamp = int(time.time())
    models = {}

    lgbm_params = dict(n_estimators=300, learning_rate=0.05,
                       min_child_samples=1, n_jobs=-1, random_state=42,
                       verbose=-1)

    # ── Valuation ─────────────────────────────────────────────────────────────
    val_model = LGBMRegressor(**lgbm_params)
    val_model.fit(X_train, yv_tr)
    logger.info(f'Valuation RMSE: {root_mean_squared_error(yv_te, val_model.predict(X_test)):.4f}')
    val_path = f'valuation_model_v{timestamp}.pkl'
    joblib.dump({'model': val_model, 'features': feature_cols},
                os.path.join(MODELS_DIR, val_path))
    models['valuation'] = val_path

    # ── Investment ────────────────────────────────────────────────────────────
    inv_model = LGBMClassifier(**lgbm_params)
    inv_model.fit(X_train, yi_tr)
    logger.info(f'Investment Accuracy: {accuracy_score(yi_te, inv_model.predict(X_test)):.4f}')
    logger.info(classification_report(yi_te, inv_model.predict(X_test), zero_division=0))
    inv_path = f'investment_model_v{timestamp}.pkl'
    joblib.dump({'model': inv_model, 'features': feature_cols},
                os.path.join(MODELS_DIR, inv_path))
    models['investment'] = inv_path

    # ── Risk ──────────────────────────────────────────────────────────────────
    risk_model = LGBMClassifier(**lgbm_params)
    risk_model.fit(X_train, yr_tr)
    logger.info(f'Risk Accuracy: {accuracy_score(yr_te, risk_model.predict(X_test)):.4f}')
    logger.info(classification_report(yr_te, risk_model.predict(X_test), zero_division=0))
    risk_path = f'risk_model_v{timestamp}.pkl'
    joblib.dump({'model': risk_model, 'features': feature_cols},
                os.path.join(MODELS_DIR, risk_path))
    models['risk'] = risk_path

    # ── Growth ────────────────────────────────────────────────────────────────
    growth_model = LGBMRegressor(**lgbm_params)
    growth_model.fit(X_train, yg_tr)
    logger.info(f'Growth RMSE: {root_mean_squared_error(yg_te, growth_model.predict(X_test)):.4f}')
    growth_path = f'growth_model_v{timestamp}.pkl'
    joblib.dump({'model': growth_model, 'features': feature_cols},
                os.path.join(MODELS_DIR, growth_path))
    models['growth'] = growth_path

    # Save latest.json
    with open(LATEST_PATH, 'w') as f:
        json.dump(models, f)
    return models
