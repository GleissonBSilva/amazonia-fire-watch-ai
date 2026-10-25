"""
Módulo de Dados Geográficos Mock / Seed Nacional
Fornece conjuntos geoespaciais e dados de teste para biomas brasileiros (Amazônia, Pantanal, Cerrado, etc.)
"""
from typing import List, Dict, Any

BIOMES_BOUNDS = {
    "amazonia": {"center": [-4.2, -63.0], "zoom": 6},
    "cerrado": {"center": [-12.5, -46.5], "zoom": 6},
    "pantanal": {"center": [-17.5, -56.8], "zoom": 7},
    "mata_atlantica": {"center": [-22.5, -45.0], "zoom": 7},
    "caatinga": {"center": [-8.0, -39.0], "zoom": 6},
    "pampa": {"center": [-30.0, -53.5], "zoom": 7}
}

SEED_CAMERAS_NATIONAL = [
    {
        "id": "CAM-AM-01",
        "name": "Câmera Mauazinho - Porto Fluvial Manaus",
        "latitude": -3.14159,
        "longitude": -59.94218,
        "address": "Av. Autaz Mirim - Mauazinho, Manaus/AM",
        "type": "Câmera Térmica PTZ 360",
        "stream_url": "http://localhost:8000/api/stream/live.mjpg"
    },
    {
        "id": "CAM-AM-02",
        "name": "Drone Patrulha Rodoviária BR-230 km 50",
        "latitude": -7.25931,
        "longitude": -64.79824,
        "address": "BR-230 Transamazônica km 50 - Lábrea/AM",
        "type": "Drone Tático com Sensor Flir",
        "stream_url": "http://localhost:8000/api/stream/live.mjpg"
    },
    {
        "id": "CAM-MT-01",
        "name": "Estação Transpantaneira km 45",
        "latitude": -17.5214,
        "longitude": -56.8421,
        "address": "Rodovia Transpantaneira km 45 - Poconé/MT",
        "type": "Torre de Vigilância Florestal",
        "stream_url": "http://localhost:8000/api/stream/live.mjpg"
    }
]
