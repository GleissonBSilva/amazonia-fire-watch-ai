"""
Alerts & WhatsApp Dispatch API Endpoints.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from ..models import DelimitedAreaPayload, WhatsAppAlertResponse
from ..services.whatsapp_dispatcher import whatsapp_dispatcher

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.post("/whatsapp", response_model=WhatsAppAlertResponse)
async def dispatch_whatsapp_alert(payload: DelimitedAreaPayload):
    """
    Dispatches automated WhatsApp alert for detected or delimited fire area.
    Target: +55 92 99374-6740
    """
    try:
        result = await whatsapp_dispatcher.dispatch_alert(
            lat=payload.latitude,
            lng=payload.longitude,
            area_sq_km=payload.area_sq_km,
            criticidade=payload.criticidade or "CRÍTICA",
            image_base64=payload.image_base64
        )
        return WhatsAppAlertResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao despachar alerta: {str(e)}")
