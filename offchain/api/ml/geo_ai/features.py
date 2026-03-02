import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Any

# Columns to drop before returning training features
NON_FEATURE_COLS = [
    'id', 'property_id', 'uploaded_by',
    'official_registry_polygon', 'document_detected_polygon',
    'full_address', 'registration_date', 'approval_date',
    'created_at', 'updated_at',
]

async def build_training_dataframe(session: AsyncSession) -> pd.DataFrame:
    """
    Loads mapping data from DB using actual schema, performs feature engineering,
    and returns a pandas DataFrame ready for training or inference.
    """
    result = await session.execute(text("""
        SELECT
            id, upi, parcel_area_sqm,
            province, district, sector, cell, village,
            land_use_type, planned_land_use,
            is_developed, has_infrastructure, has_building, building_floors,
            tenure_type, lease_term_years, remaining_lease_term,
            under_mortgage, has_caveat, in_transaction,
            year_of_record,
            EXTRACT(YEAR FROM CURRENT_DATE)::int
                - COALESCE(year_of_record, EXTRACT(YEAR FROM CURRENT_DATE)::int) AS property_age
        FROM mappings
    """))
    mappings = result.fetchall()
    if not mappings:
        return pd.DataFrame()
    df = pd.DataFrame([dict(row._mapping) for row in mappings])

    # Handle nulls with real column names
    df.fillna({
        'under_mortgage': False,
        'has_caveat': False,
        'in_transaction': False,
        'is_developed': False,
        'has_building': False,
        'has_infrastructure': False,
        'building_floors': 0,
        'remaining_lease_term': 0,
        'lease_term_years': 1,
        'province': '',
        'district': '',
        'sector': '',
        'cell': '',
        'village': '',
        'land_use_type': 'unknown',
        'planned_land_use': 'unknown',
        'tenure_type': 'unknown',
        'parcel_area_sqm': 0.0,
        'property_age': 0,
        'year_of_record': 0,
    }, inplace=True)

    # Cast booleans to int for ML
    for bool_col in ['under_mortgage', 'has_caveat', 'in_transaction',
                     'is_developed', 'has_building', 'has_infrastructure']:
        df[bool_col] = df[bool_col].astype(int)

    # Engineered features
    df['risk_score'] = df['under_mortgage'] + df['has_caveat'] + df['in_transaction']
    df['development_score'] = df['is_developed'] + df['has_building'] + df['has_infrastructure']
    df['lease_security_score'] = df['remaining_lease_term'] / df['lease_term_years'].replace(0, 1)
    df['location_encoding'] = (
        df['district'].astype(str) + '_' + df['sector'].astype(str)
    )

    # Encode categorical fields
    df = pd.get_dummies(
        df,
        columns=['location_encoding', 'land_use_type', 'planned_land_use', 'tenure_type'],
        drop_first=True
    )

    # Drop string/non-numeric location columns after encoding
    df.drop(columns=['province', 'cell', 'village'], errors='ignore', inplace=True)

    # Proxy price (target) — parcel_area_sqm × development_score
    df['price'] = df['parcel_area_sqm'] * df['development_score'].replace(0, 1)

    return df
