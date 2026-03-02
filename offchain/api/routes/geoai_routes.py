from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from api.ml.geo_ai.train import train_all_models
from api.ml.geo_ai.model_registry import ModelRegistry
from api.ml.geo_ai.service import (
    predict_land_value,
    predict_investment_score,
    predict_risk,
    get_risky_parcels,
    get_growth_ranking,
    get_bank_lending_targets
)
from data.database.database import get_db
import logging

router = APIRouter(prefix="/geoai", tags=["GeoAI"])

@router.post("/retrain")
async def retrain_models(background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    async def train_task():
        try:
            await train_all_models(db)
            ModelRegistry.reload_models()
        except Exception as e:
            logging.exception(e)
    background_tasks.add_task(train_task)
    return {
        "status": "training started",
        "message": "models will reload automatically"
    }

@router.post("/predict-value/{upi}")
async def predict_value(upi: str, db: AsyncSession = Depends(get_db)):
    result = await predict_land_value(db, upi)
    if 'error' in result:
        raise HTTPException(status_code=404, detail=result['error'])
    return result

@router.post("/investment-score/{upi}")
async def investment_score(upi: str, db: AsyncSession = Depends(get_db)):
    result = await predict_investment_score(db, upi)
    if 'error' in result:
        raise HTTPException(status_code=404, detail=result['error'])
    return result

@router.get("/growth-neighborhoods")
async def growth_neighborhoods(db: AsyncSession = Depends(get_db)):
    result = await get_growth_ranking(db)
    if 'error' in result:
        raise HTTPException(status_code=500, detail=result['error'])
    return result

@router.get("/risky-parcels")
async def risky_parcels(db: AsyncSession = Depends(get_db)):
    result = await get_risky_parcels(db)
    if 'error' in result:
        raise HTTPException(status_code=500, detail=result['error'])
    return result

@router.get("/bank-lending-targets")
async def bank_lending_targets(db: AsyncSession = Depends(get_db)):
    result = await get_bank_lending_targets(db)
    if 'error' in result:
        raise HTTPException(status_code=500, detail=result['error'])
    return result
