"""
API Endpoints for Spatial Intelligence, Clustering and Arson Detection.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from ..services.inpe_firms_ingestion import national_ingestion
from ..services.spatial_intelligence import spatial_engine

router = APIRouter(prefix="/spatial", tags=["Spatial Intelligence"])

class EvaluateAreaPayload(BaseModel):
    min_lat: float
    max_lat: float
    min_lng: float
    max_lng: float
    area_sq_km: float

@router.get("/clusters")
async def get_clusters():
    """Returns 500m radius clusters with recurrence and crime suspicion diagnostics."""
    spots = national_ingestion.get_realtime_24h_fires()
    return spatial_engine.cluster_fires(spots)

@router.post("/evaluate-area")
async def evaluate_delimited_area(payload: EvaluateAreaPayload):
    """
    Evaluates any custom Bounding Box or Polygon drawn on the map.
    Checks how many fire spots, recurrent clusters, or crime suspicion alignments are inside.
    """
    all_spots = national_ingestion.get_realtime_24h_fires()
    inside_spots = [
        s for s in all_spots
        if payload.min_lat <= s["latitude"] <= payload.max_lat
        and payload.min_lng <= s["longitude"] <= payload.max_lng
    ]
    
    clusters = spatial_engine.cluster_fires(inside_spots) if inside_spots else []
    
    has_crime_suspicion = any(c["alta_suspeita_crime"] for c in clusters)
    has_recurrence = any(c["reincidencia_detectada"] for c in clusters)
    
    severity = "CRÍTICA" if (has_crime_suspicion or payload.area_sq_km > 2.0) else ("ALTA" if has_recurrence else "MODERADA")
    
    return {
        "area_sq_km": payload.area_sq_km,
        "total_spots_inside": len(inside_spots),
        "clusters_count": len(clusters),
        "alta_suspeita_crime": has_crime_suspicion,
        "reincidencia_detectada": has_recurrence,
        "severidade": severity,
        "clusters": clusters
    }
