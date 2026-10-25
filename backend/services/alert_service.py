"""
Módulo de Despacho Automatizado de Alertas via WhatsApp
Compatível com Baileys / Evolution API com fallback direto para URL Web/App.
Destino padrão fixado: +55 92 99146-3640
"""
from typing import Dict, Any, Optional
from backend.app.services.whatsapp_dispatcher import whatsapp_dispatcher, WhatsAppDispatcher


class AlertService:
    def __init__(self):
        self._dispatcher = whatsapp_dispatcher

    async def dispatch_fire_alert(
        self,
        latitude: float = -3.119027,
        longitude: float = -60.021731,
        area_km2: float = 0.0,
        criticidade: str = "CRÍTICA",
        snapshot_base64: Optional[str] = None
    ) -> Dict[str, Any]:
        return await self._dispatcher.dispatch_alert(
            lat=latitude,
            lng=longitude,
            area_sq_km=area_km2,
            criticidade=criticidade,
            image_base64=snapshot_base64
        )


alert_service = AlertService()
