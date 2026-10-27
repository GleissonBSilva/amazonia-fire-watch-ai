"""
API Endpoints for National INPE & NASA FIRMS Ingestion.
Equipado com cache em memória (TTL 35s-45s) para absorver rajadas de polling e evitar sobrecarga de I/O.
"""

from fastapi import APIRouter, Query
from ..services.inpe_firms_ingestion import national_ingestion
from ..services.simple_cache import memory_cache

router = APIRouter(prefix="/fires", tags=["National Fires Ingestion"])

@router.get("/national")
async def get_national_fires(
    simulation: bool = Query(True, description="Se True, retorna cenário de simulação; se False, consome NASA FIRMS e INPE reais"),
    brazil_only: bool = Query(False, description="Se True, filtra exclusivamente focos contidos no território do Brasil (malha IBGE)")
):
    """Returns real-time 24h active fire spots (simulated or real satellite) with 35s in-memory cache."""
    cache_key = f"fires_national_{simulation}_{brazil_only}"
    cached = memory_cache.get(cache_key)
    if cached is not None:
        return cached

    if not simulation:
        data = await national_ingestion.get_real_satellite_fires(filter_brazil_only=brazil_only)
    else:
        data = national_ingestion.get_realtime_24h_fires(filter_brazil_only=brazil_only)

    memory_cache.set(cache_key, data, ttl=35)
    return data

@router.get("/heatmap")
async def get_monthly_heatmap(
    simulation: bool = Query(True, description="Se True, retorna cenário de simulação; se False, usa pontos reais da NASA")
):
    """Returns accumulated month-to-date fire density points with 45s in-memory cache."""
    cache_key = f"fires_heatmap_{simulation}"
    cached = memory_cache.get(cache_key)
    if cached is not None:
        return cached

    data = national_ingestion.get_monthly_heatmap_data(simulation=simulation)
    memory_cache.set(cache_key, data, ttl=45)
    return data

@router.get("/timeline")
async def get_historical_timeline():
    """Returns multi-year historical timeline (2020-2026) with 60s in-memory cache."""
    cache_key = "fires_timeline"
    cached = memory_cache.get(cache_key)
    if cached is not None:
        return cached

    data = national_ingestion.get_historical_timeline()
    memory_cache.set(cache_key, data, ttl=60)
    return data
