"""
OSINT Monitoring & Social Feed Webhook Endpoints.
"""

from fastapi import APIRouter, HTTPException
from typing import List
from ..models import OSINTWebhookPayload, OSINTItemResponse
from ..services.osint_service import osint_service

router = APIRouter(prefix="/osint", tags=["OSINT Social Feed"])

@router.post("/webhook", response_model=dict)
async def receive_osint_post(payload: OSINTWebhookPayload):
    """
    Receives incoming public posts from Telegram / X monitoring bots.
    Filters keywords and stores metadata into SQLite.
    """
    result = osint_service.process_incoming_post(
        source=payload.source,
        author=payload.author,
        original_url=payload.original_url,
        text=payload.text,
        latitude=payload.latitude,
        longitude=payload.longitude
    )
    if not result:
        return {"status": "IGNORED", "reason": "No relevant fire keywords matched"}
    return {"status": "STORED", "alert": result}

@router.get("/alerts", response_model=List[OSINTItemResponse])
async def get_osint_alerts(limit: int = 25):
    """
    Returns latest stored OSINT alerts to plot on map and display in floating window.
    """
    alerts = osint_service.list_alerts(limit=limit)
    return alerts
