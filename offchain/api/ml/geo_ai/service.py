import logging
from sqlalchemy.ext.asyncio import AsyncSession
from .features import build_training_dataframe
from .model_registry import ModelRegistry
import numpy as np
import pandas as pd
from typing import Dict, Any

BASE_DROP = ['upi', 'id', 'district', 'sector', 'price', 'property_age',
             'risk_score', 'development_score']


def _to_python(obj):
    """Recursively convert numpy/pandas types to plain Python for JSON serialization."""
    if isinstance(obj, dict):
        return {k: _to_python(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_to_python(i) for i in obj]
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if pd.isna(obj) if not isinstance(obj, (list, dict, np.ndarray)) else False:
        return None
    return obj


def _feature_importance(model, feat_cols) -> Dict[str, float]:
    if not hasattr(model, 'feature_importances_') or not feat_cols:
        return {}
    return {str(col): float(imp)
            for col, imp in zip(feat_cols, model.feature_importances_)}


def _safe_records(df, cols):
    """Return to_dict records with all values cast to plain Python types."""
    return [
        {k: _to_python(v) for k, v in row.items()}
        for row in df[cols].to_dict(orient='records')
    ]


def _align_features(row_or_df, model_name):
    cols = ModelRegistry.get_features(model_name)
    if not cols:
        if isinstance(row_or_df, pd.Series):
            return row_or_df.drop(BASE_DROP, errors='ignore') \
                            .select_dtypes(include=['number']) \
                            .values.reshape(1, -1)
        return row_or_df.drop(BASE_DROP, axis=1, errors='ignore') \
                        .select_dtypes(include=['number', 'bool', 'uint8'])
    if isinstance(row_or_df, pd.Series):
        return pd.Series(
            [row_or_df.get(c, 0) for c in cols], index=cols
        ).values.reshape(1, -1)
    for c in cols:
        if c not in row_or_df.columns:
            row_or_df[c] = 0
    return row_or_df[cols]


async def _get_features_for_upi(session: AsyncSession, upi: str):
    df = await build_training_dataframe(session)
    row = df[df['upi'] == upi]
    if row.empty:
        raise ValueError(f'No data found for UPI: {upi}')
    return row.iloc[0], df


async def predict_land_value(session: AsyncSession, upi: str) -> Dict[str, Any]:
    try:
        features, _ = await _get_features_for_upi(session, upi)
        model = ModelRegistry.get_model('valuation')
        if model is None:
            raise RuntimeError('Valuation model not loaded. Run POST /api/geoai/retrain first.')
        X = _align_features(features, 'valuation')
        pred = float(model.predict(X)[0])
        return _to_python({
            'upi': upi,
            'predicted_land_value': pred,
            'confidence': round(pred * 0.05, 4),
            'explainability': {
                'feature_importance': _feature_importance(
                    model, ModelRegistry.get_features('valuation'))
            }
        })
    except Exception as e:
        logging.exception(e)
        return {'error': str(e)}


async def predict_investment_score(session: AsyncSession, upi: str) -> Dict[str, Any]:
    try:
        features, _ = await _get_features_for_upi(session, upi)
        model = ModelRegistry.get_model('investment')
        if model is None:
            raise RuntimeError('Investment model not loaded. Run POST /api/geoai/retrain first.')
        X = _align_features(features, 'investment')
        proba = model.predict_proba(X)[0]
        pred = float(proba[1])
        proxy_value = float(features.get('parcel_area_sqm', 1) or 1) * \
                      float(features.get('development_score', 1) or 1)
        return _to_python({
            'upi': upi,
            'investment_probability': pred,
            'investment_score': pred / proxy_value,
            'confidence': float(np.max(proba) - np.min(proba)),
            'explainability': {
                'feature_importance': _feature_importance(
                    model, ModelRegistry.get_features('investment'))
            }
        })
    except Exception as e:
        logging.exception(e)
        return {'error': str(e)}


async def predict_risk(session: AsyncSession, upi: str) -> Dict[str, Any]:
    try:
        features, _ = await _get_features_for_upi(session, upi)
        model = ModelRegistry.get_model('risk')
        if model is None:
            raise RuntimeError('Risk model not loaded. Run POST /api/geoai/retrain first.')
        X = _align_features(features, 'risk')
        proba = model.predict_proba(X)[0]
        pred = float(proba[1])
        return _to_python({
            'upi': upi,
            'risk_probability': pred,
            'risk_label': 'HIGH' if pred > 0.5 else 'LOW',
            'confidence': float(np.max(proba) - np.min(proba)),
            'explainability': {
                'risk_factors': {
                    'under_mortgage': int(features.get('under_mortgage', 0)),
                    'has_caveat': int(features.get('has_caveat', 0)),
                    'in_transaction': int(features.get('in_transaction', 0)),
                },
                'feature_importance': _feature_importance(
                    model, ModelRegistry.get_features('risk'))
            }
        })
    except Exception as e:
        logging.exception(e)
        return {'error': str(e)}


async def get_risky_parcels(session: AsyncSession) -> Dict[str, Any]:
    try:
        df = await build_training_dataframe(session)
        model = ModelRegistry.get_model('risk')
        if model is None:
            raise RuntimeError('Risk model not loaded. Run POST /api/geoai/retrain first.')
        X = _align_features(df, 'risk')
        risk_pred = model.predict_proba(X)[:, 1]
        df['risk_probability'] = risk_pred
        risky = df[df['risk_probability'] > 0.5] \
                    .sort_values('risk_probability', ascending=False).head(20)
        return _to_python({
            'total_risky_parcels': int(len(risky)),
            'risky_parcels': _safe_records(risky, ['upi', 'district', 'sector', 'risk_probability']),
            'avg_risk_score': float(np.mean(risk_pred)),
            'explainability': {
                'feature_importance': _feature_importance(
                    model, ModelRegistry.get_features('risk'))
            }
        })
    except Exception as e:
        logging.exception(e)
        return {'error': str(e)}


async def get_growth_ranking(session: AsyncSession) -> Dict[str, Any]:
    try:
        df = await build_training_dataframe(session)
        model = ModelRegistry.get_model('growth')
        if model is None:
            raise RuntimeError('Growth model not loaded. Run POST /api/geoai/retrain first.')
        X = _align_features(df, 'growth')
        preds = model.predict(X)
        df['growth_score'] = preds
        top = df.sort_values('growth_score', ascending=False).head(10)
        return _to_python({
            'top_growth_neighborhoods': _safe_records(
                top, ['upi', 'district', 'sector', 'growth_score']),
            'confidence': float(np.std(preds)),
            'explainability': {
                'feature_importance': _feature_importance(
                    model, ModelRegistry.get_features('growth'))
            }
        })
    except Exception as e:
        logging.exception(e)
        return {'error': str(e)}


async def get_bank_lending_targets(session: AsyncSession) -> Dict[str, Any]:
    try:
        df = await build_training_dataframe(session)
        inv_model = ModelRegistry.get_model('investment')
        risk_model = ModelRegistry.get_model('risk')
        if inv_model is None or risk_model is None:
            raise RuntimeError('Models not loaded. Run POST /api/geoai/retrain first.')
        X_inv  = _align_features(df, 'investment')
        X_risk = _align_features(df, 'risk')
        inv_pred  = inv_model.predict_proba(X_inv)[:, 1]
        risk_pred = risk_model.predict_proba(X_risk)[:, 1]
        bank_score = inv_pred - risk_pred
        df['bank_score'] = bank_score
        top = df.sort_values('bank_score', ascending=False).head(10)
        return _to_python({
            'bank_lending_targets': _safe_records(
                top, ['upi', 'district', 'sector', 'bank_score']),
            'confidence': float(np.std(bank_score)),
            'explainability': {
                'investment_feature_importance': _feature_importance(
                    inv_model, ModelRegistry.get_features('investment')),
                'risk_feature_importance': _feature_importance(
                    risk_model, ModelRegistry.get_features('risk'))
            }
        })
    except Exception as e:
        logging.exception(e)
        return {'error': str(e)}
