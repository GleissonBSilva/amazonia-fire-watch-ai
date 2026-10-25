"""
Emergency Response & Civil Defense Infrastructure for Amazonas / Brazil.
Calculates nearest CBMAM Fire Battalion, Rural Airstrips and Water Intake Sources.
"""

import math
from typing import Dict, Any, List

EMERGENCY_BASES = [
    {"name": "Pelotão CBMAM Flores", "type": "bombeiros", "lat": -3.0645, "lng": -60.0210, "city": "Manaus/AM"},
    {"name": "1º Batalhão de Incêndio CBMAM (Centro)", "type": "bombeiros", "lat": -3.1250, "lng": -60.0150, "city": "Manaus/AM"},
    {"name": "Pelotão CBMAM Mauazinho / Distrito", "type": "bombeiros", "lat": -3.1380, "lng": -59.9450, "city": "Manaus/AM"},
    {"name": "Posto Avançado CBMAM Iranduba", "type": "bombeiros", "lat": -3.2800, "lng": -60.1800, "city": "Iranduba/AM"},
    {"name": "Companhia CBMAM Manacapuru", "type": "bombeiros", "lat": -3.2980, "lng": -60.6200, "city": "Manacapuru/AM"},
    {"name": "Pelotão CBMAM Itacoatiara", "type": "bombeiros", "lat": -3.1430, "lng": -58.4440, "city": "Itacoatiara/AM"},
    {"name": "Pelotão CBMAM Humaitá", "type": "bombeiros", "lat": -7.5080, "lng": -63.0250, "city": "Humaitá/AM"},
    {"name": "Pelotão CBMAM Parintins", "type": "bombeiros", "lat": -2.6280, "lng": -56.7350, "city": "Parintins/AM"},
    {"name": "Pelotão CBMAM Tefé", "type": "bombeiros", "lat": -3.3550, "lng": -64.7110, "city": "Tefé/AM"},
    {"name": "Companhia CBMAM Tabatinga", "type": "bombeiros", "lat": -4.2480, "lng": -69.9380, "city": "Tabatinga/AM"},
    {"name": "Base de Defesa Civil Lábrea", "type": "defesa_civil", "lat": -7.2600, "lng": -64.7900, "city": "Lábrea/AM"},
    {"name": "Base de Defesa Civil Apuí", "type": "defesa_civil", "lat": -7.1950, "lng": -59.8900, "city": "Apuí/AM"},
    {"name": "Base de Defesa Civil Novo Progresso", "type": "defesa_civil", "lat": -7.1400, "lng": -55.4200, "city": "Novo Progresso/PA"},
]

WATER_SOURCES = [
    {"name": "Rio Negro (Orla Urbana)", "lat": -3.1400, "lng": -60.0300},
    {"name": "Rio Solimões (Encontro das Águas)", "lat": -3.1350, "lng": -59.9050},
    {"name": "Rio Madeira (Calha Principal)", "lat": -7.5000, "lng": -63.0200},
    {"name": "Rio Purus (Lábrea)", "lat": -7.2650, "lng": -64.7950},
    {"name": "Rio Amazonas (Itacoatiara)", "lat": -3.1500, "lng": -58.4300},
    {"name": "Represa de Balbina", "lat": -1.9160, "lng": -59.4830},
    {"name": "Rio Tapajós (Itaituba/Santarém)", "lat": -4.2700, "lng": -55.9800},
]

AIRFIELDS = [
    {"name": "Aeródromo de Flores (SWFN)", "lat": -3.0760, "lng": -60.0220},
    {"name": "Aeroporto Internacional Eduardo Gomes (SBEG)", "lat": -3.0380, "lng": -60.0490},
    {"name": "Pista Rural Humaitá", "lat": -7.5300, "lng": -63.0500},
    {"name": "Aeródromo de Lábrea", "lat": -7.2600, "lng": -64.7800},
    {"name": "Pista Rural Apuí", "lat": -7.2000, "lng": -59.8700},
]

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates geodesic distance between two points in kilometers."""
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def find_nearest_infrastructure(lat: float, lng: float) -> Dict[str, Any]:
    """Finds nearest fire station, water source, and airfield from coordinates."""
    # 1. Nearest Fire Base
    nearest_station = min(EMERGENCY_BASES, key=lambda b: haversine_distance(lat, lng, b["lat"], b["lng"]))
    dist_station = haversine_distance(lat, lng, nearest_station["lat"], nearest_station["lng"])
    # Estimate time (avg 38 km/h on urban/rural unpaved roads + dispatch)
    est_minutes = max(8, int(round((dist_station / 38.0) * 60.0)))

    # 2. Nearest Water Source
    nearest_water = min(WATER_SOURCES, key=lambda w: haversine_distance(lat, lng, w["lat"], w["lng"]))
    dist_water = haversine_distance(lat, lng, nearest_water["lat"], nearest_water["lng"])

    # 3. Nearest Airfield
    nearest_air = min(AIRFIELDS, key=lambda a: haversine_distance(lat, lng, a["lat"], a["lng"]))
    dist_air = haversine_distance(lat, lng, nearest_air["lat"], nearest_air["lng"])

    return {
        "unidade_proxima": {
            "nome": nearest_station["name"],
            "distancia_km": round(dist_station, 1),
            "tempo_estimado_min": est_minutes,
            "cidade": nearest_station["city"]
        },
        "manancial_proximo": {
            "nome": nearest_water["name"],
            "distancia_km": round(dist_water, 1)
        },
        "pista_pouso": {
            "nome": nearest_air["name"],
            "distancia_km": round(dist_air, 1)
        }
    }
