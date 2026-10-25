"""
Serviço de Ingestão de Queimadas e Satélites em Escala Nacional
Conecta com INPE BDQueimadas e NASA FIRMS VIIRS (375m)
"""
from typing import List, Dict, Any, Optional
from backend.app.services.inpe_firms_ingestion import national_ingestion, NationalIngestionService


class InpeService:
    def __init__(self):
        self._service = national_ingestion

    def get_national_active_fires_24h(self) -> List[Dict[str, Any]]:
        return self._service.get_realtime_24h_fires()

    def get_monthly_heatmap(self) -> List[Dict[str, Any]]:
        return self._service.get_monthly_heatmap_data()

    def get_multiyear_timeline(self) -> List[Dict[str, Any]]:
        return self._service.get_historical_timeline()


inpe_service = InpeService()
