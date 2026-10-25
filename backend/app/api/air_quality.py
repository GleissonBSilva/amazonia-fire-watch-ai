"""
API Router for Air Quality (AQI / PM2.5 / CONAMA 491/2018).
Provides endpoints to fetch real-time air quality, check alerts (AQI > 50),
and list categorical classifications.
"""

from fastapi import APIRouter, Query
from typing import Optional
from ..services.air_quality_service import air_quality_service, CATEGORIES

router = APIRouter(prefix="/air-quality", tags=["Air Quality & Smoke Dispersion"])

@router.get("")
async def get_air_quality(
    lat: float = Query(..., description="Latitude do local de interesse"),
    lng: float = Query(..., description="Longitude do local de interesse"),
    frp_mw: Optional[float] = Query(None, description="Potência radiativa térmica (FRP) se for área de foco")
):
    """
    Retorna medição completa da qualidade do ar (AQI, PM2.5, PM10, CO),
    verificação de disparo de alerta (se AQI > 50) e classificação CONAMA.
    """
    return await air_quality_service.get_air_quality(lat, lng, frp_mw)

@router.get("/categories")
async def get_air_quality_categories():
    """
    Retorna a tabela oficial de categorias (CONAMA 491/2018 e US EPA),
    com faixas de AQI, PM2.5, severidade e protocolos de Defesa Civil.
    """
    return {"categories": CATEGORIES, "alert_threshold": 50}
