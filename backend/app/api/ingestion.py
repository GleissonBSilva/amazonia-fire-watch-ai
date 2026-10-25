"""
API Endpoints for National INPE & NASA FIRMS Ingestion.
"""

from fastapi import APIRouter
from ..services.inpe_firms_ingestion import national_ingestion

router = APIRouter(prefix="/fires", tags=["National Fires Ingestion"])

@router.get("/national")
async def get_national_fires():
    """Returns real-time 24h active fire spots across Brazil."""
    return national_ingestion.get_realtime_24h_fires()

@router.get("/heatmap")
async def get_monthly_heatmap():
    """Returns accumulated month-to-date fire density points."""
    return national_ingestion.get_monthly_heatmap_data()

@router.get("/timeline")
async def get_historical_timeline():
    """Returns multi-year historical timeline (2020-2026)."""
    return national_ingestion.get_historical_timeline()
