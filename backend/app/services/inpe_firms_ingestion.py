import os
import json
"""
Nationwide Ingestion Service for INPE BDQueimadas & NASA FIRMS VIIRS 375m.
Covers all Brazilian territory (Amazônia, Cerrado, Pantanal, Mata Atlântica, Caatinga, Pampa).
Provides real-time (24h), monthly accumulated, and historical timeline datasets.
"""

import datetime
import random
import csv
import io
import httpx
from typing import List, Dict, Any
from .spatial_classifier import classify_location

# Major monitoring hubs and critical fire zones across Brazil
BRAZIL_REGIONS = [
    # Amazônia (Amazonas)
    {"biome": "Amazônia", "state": "AM", "municipality": "Manaus (Flores/Tarumã)", "lat": -3.08920, "lng": -60.02170, "has_video": True, "address": "Av. das Torres, Bairro Flores - Manaus/AM"},
    {"biome": "Amazônia", "state": "AM", "municipality": "Lábrea", "lat": -7.25940, "lng": -64.79810, "has_video": True, "address": "BR-230 km 48, Zona Rural - Lábrea/AM"},
    {"biome": "Amazônia", "state": "AM", "municipality": "Apuí", "lat": -7.19420, "lng": -59.89220, "has_video": False, "address": "Transamazônica, Perímetro Florestal - Apuí/AM"},
    {"biome": "Amazônia", "state": "AM", "municipality": "Tefé", "lat": -3.35440, "lng": -64.71140, "has_video": True, "address": "Calha do Médio Solimões - Tefé/AM"},
    {"biome": "Amazônia", "state": "AM", "municipality": "Autazes", "lat": -3.57910, "lng": -59.13060, "has_video": False, "address": "AM-254 km 18 - Autazes/AM"},
    {"biome": "Amazônia", "state": "AM", "municipality": "Humaitá", "lat": -7.51470, "lng": -63.02470, "has_video": True, "address": "BR-319 Fronteira Agrícola - Humaitá/AM"},

    # Amazônia (Pará)
    {"biome": "Amazônia", "state": "PA", "municipality": "Novo Progresso", "lat": -7.14580, "lng": -55.42140, "has_video": True, "address": "Eixo da BR-163 - Novo Progresso/PA"},
    {"biome": "Amazônia", "state": "PA", "municipality": "Altamira", "lat": -3.20330, "lng": -52.20640, "has_video": False, "address": "Reserva Extrativista Rio Xingu - Altamira/PA"},
    {"biome": "Amazônia", "state": "PA", "municipality": "São Félix do Xingu", "lat": -6.64470, "lng": -51.98780, "has_video": True, "address": "Área de Pastagem e Floresta - São Félix do Xingu/PA"},
    {"biome": "Amazônia", "state": "PA", "municipality": "Marabá", "lat": -5.36860, "lng": -49.11780, "has_video": False, "address": "Rodovia Transamazônica - Marabá/PA"},

    # Amazônia (Rondônia / Acre / Roraima)
    {"biome": "Amazônia", "state": "RO", "municipality": "Porto Velho", "lat": -8.76190, "lng": -63.90390, "has_video": True, "address": "Estrada da Penal, km 12 - Porto Velho/RO"},
    {"biome": "Amazônia", "state": "AC", "municipality": "Rio Branco", "lat": -9.97490, "lng": -67.82430, "has_video": False, "address": "Estrada Transacreana - Rio Branco/AC"},
    {"biome": "Amazônia", "state": "RR", "municipality": "Cantá", "lat": 2.61080, "lng": -60.60190, "has_video": False, "address": "Lavrado Roraimense - Cantá/RR"},

    # Pantanal (Mato Grosso & Mato Grosso do Sul)
    {"biome": "Pantanal", "state": "MT", "municipality": "Poconé", "lat": -16.25670, "lng": -56.62280, "has_video": True, "address": "Rodovia Transpantaneira km 32 - Poconé/MT"},
    {"biome": "Pantanal", "state": "MS", "municipality": "Corumbá", "lat": -19.00940, "lng": -57.65330, "has_video": True, "address": "Parque Nacional do Pantanal Matogrossense - Corumbá/MS"},
    {"biome": "Pantanal", "state": "MS", "municipality": "Aquidauana", "lat": -20.47110, "lng": -55.78720, "has_video": False, "address": "Pantanal de Aquidauana - MS"},

    # Cerrado (MATOPIBA & Centro-Oeste)
    {"biome": "Cerrado", "state": "TO", "municipality": "Formoso do Araguaia", "lat": -11.79420, "lng": -49.52970, "has_video": False, "address": "Ilha do Bananal - TO"},
    {"biome": "Cerrado", "state": "BA", "municipality": "Formosa do Rio Preto", "lat": -11.04830, "lng": -45.19310, "has_video": True, "address": "Fronteira Agrícola MATOPIBA - BA"},
    {"biome": "Cerrado", "state": "MA", "municipality": "Balsas", "lat": -7.53220, "lng": -46.03580, "has_video": False, "address": "Chapadão do Cerrado Maranhense - Balsas/MA"},
    {"biome": "Cerrado", "state": "GO", "municipality": "Alto Paraíso de Goiás", "lat": -14.13310, "lng": -47.51470, "has_video": True, "address": "Entorno da Chapada dos Veadeiros - GO"},

    # Mata Atlântica / Sudeste / Sul
    {"biome": "Mata Atlântica", "state": "SP", "municipality": "Ribeirão Preto", "lat": -21.17040, "lng": -47.81030, "has_video": True, "address": "Rodovia Anhanguera km 312 - Ribeirão Preto/SP"},
    {"biome": "Mata Atlântica", "state": "MG", "municipality": "Belo Horizonte", "lat": -19.98800, "lng": -43.95500, "has_video": True, "address": "Serra do Curral - Belo Horizonte/MG"},
    {"biome": "Caatinga", "state": "CE", "municipality": "Sobral", "lat": -3.68920, "lng": -40.34810, "has_video": False, "address": "Sertão Central - Sobral/CE"}
]

def compute_air_quality(frp_mw: float, distance_km: float = 1.0) -> Dict[str, Any]:
    safe_frp = max(1.0, float(frp_mw))
    pm25 = round(12.0 + (safe_frp * 3.15) / (1 + distance_km * 0.22), 1)
    if pm25 <= 12.0:
        aqi = round((50 / 12.0) * pm25)
        level = "BOA"
    elif pm25 <= 35.4:
        aqi = round(51 + ((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1))
        level = "MODERADA"
    elif pm25 <= 55.4:
        aqi = round(101 + ((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5))
        level = "RUIM"
    elif pm25 <= 150.4:
        aqi = round(151 + ((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5))
        level = "MUITO RUIM"
    elif pm25 <= 250.4:
        aqi = round(201 + ((300 - 201) / (250.4 - 150.5)) * (pm25 - 150.5))
        level = "PÉSSIMA"
    else:
        aqi = min(500, round(301 + ((500 - 301) / (500.0 - 250.5)) * (pm25 - 250.5)))
        level = "PERIGOSA"
    return {"aqi": min(500, max(1, aqi)), "pm25": pm25, "air_quality_level": level}


def get_brazil_location(lat: float, lng: float):
    """
    Identifies Brazilian State (UF), State Name and Biome based on coordinates.
    """
    if -11.5 <= lat <= 2.3 and -73.8 <= lng <= -56.0:
        return "AM", "Amazonas", "Amazônia"
    elif -9.8 <= lat <= 2.5 and -58.8 <= lng <= -46.0:
        return "PA", "Pará", "Amazônia"
    elif -18.0 <= lat <= -7.3 and -61.5 <= lng <= -50.0:
        biome = "Pantanal" if (-18.0 <= lat <= -15.5 and -58.5 <= lng <= -55.0) else "Cerrado" if lng > -53.0 else "Amazônia"
        return "MT", "Mato Grosso", biome
    elif -13.7 <= lat <= -7.9 and -66.8 <= lng <= -59.7:
        return "RO", "Rondônia", "Amazônia"
    elif -11.2 <= lat <= -7.1 and -74.0 <= lng <= -66.5:
        return "AC", "Acre", "Amazônia"
    elif -1.5 <= lat <= 5.3 and -64.8 <= lng <= -58.9:
        return "RR", "Roraima", "Amazônia"
    elif -1.2 <= lat <= 4.4 and -54.9 <= lng <= -49.8:
        return "AP", "Amapá", "Amazônia"
    elif -10.3 <= lat <= -1.0 and -48.7 <= lng <= -41.8:
        return "MA", "Maranhão", "Cerrado"
    elif -13.5 <= lat <= -5.2 and -50.7 <= lng <= -45.7:
        return "TO", "Tocantins", "Cerrado"
    elif -24.1 <= lat <= -17.1 and -58.2 <= lng <= -50.9:
        biome = "Pantanal" if (-22.0 <= lat <= -17.5 and -58.2 <= lng <= -54.5) else "Cerrado"
        return "MS", "Mato Grosso do Sul", biome
    elif -19.5 <= lat <= -12.3 and -53.2 <= lng <= -45.9:
        return "GO", "Goiás", "Cerrado"
    elif -18.3 <= lat <= -8.5 and -46.6 <= lng <= -37.3:
        biome = "Caatinga" if lat > -14.0 and lng > -43.0 else "Cerrado"
        return "BA", "Bahia", biome
    elif -22.9 <= lat <= -14.2 and -51.1 <= lng <= -39.8:
        return "MG", "Minas Gerais", "Cerrado" if lng < -45.0 else "Mata Atlântica"
    elif -25.3 <= lat <= -19.7 and -53.1 <= lng <= -44.2:
        return "SP", "São Paulo", "Mata Atlântica"
    elif -10.9 <= lat <= -2.7 and -45.9 <= lng <= -40.3:
        return "PI", "Piauí", "Caatinga"
    elif -7.9 <= lat <= -2.7 and -41.4 <= lng <= -37.2:
        return "CE", "Ceará", "Caatinga"
    elif lat > -13.0 and lng < -50.0:
        return "AM", "Amazônia Legal", "Amazônia"
    elif lat < -16.0 and lng < -54.0:
        return "MS", "Pantanal", "Pantanal"
    else:
        return "BR", "Território Nacional", "Cerrado"

class NationalIngestionService:
    def __init__(self):
        self._cache_24h = []
        self._cache_monthly = []
        self._cache_historical = []
        self._cache_real_24h = []
        self._last_real_fetch = None
        self._last_refresh = None
        
        # Pré-carregamento imediato do cache real de satélite na inicialização (0ms de latência)
        cache_file = os.path.join(os.path.dirname(__file__), "..", "..", "real_firms_cache.json")
        if os.path.exists(cache_file):
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    self._cache_real_24h = json.load(f)
                    self._last_real_fetch = datetime.datetime.now(datetime.timezone.utc)
            except Exception:
                pass
                
        self._generate_national_datasets()

    def _generate_national_datasets(self):
        """Generates realistic national datasets grounded in INPE/NASA FIRMS formats."""
        now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-4)))
        self._last_refresh = now.isoformat()

        # 1. Real-Time 24h Dataset (Focos ativos com satélites NOAA-20 / Suomi-NPP VIIRS e AQUA MODIS)
        spots_24h = []
        uid = 1001

        # Intentionally create a sequential geometric alignment in Lábrea / Transamazônica (arson signature)
        # 5 spots aligned along an azimuth ignited within 90 minutes
        base_labrea_lat = -7.25940
        base_labrea_lng = -64.79810
        for i in range(5):
            ign_time = now - datetime.timedelta(minutes=15 * i + 10)
            spots_24h.append({
                "id": f"VIIRS-24H-{uid}",
                "latitude": round(base_labrea_lat + (i * 0.0075) + random.uniform(-0.0003, 0.0003), 5),
                "longitude": round(base_labrea_lng + (i * 0.0075) + random.uniform(-0.0003, 0.0003), 5),
                "biome": "Amazônia",
                "state": "AM",
                "municipality": "Lábrea",
                "address": f"BR-230 Transamazônica km {50 + i*2} - Lábrea/AM",
                "satellite": "NOAA-20 (VIIRS 375m)",
                "frp_mw": round(35.0 + i * 8.5 + random.uniform(-2, 3), 1),
                "bright_ti4_k": round(345.0 + i * 4.0, 1),
                "confidence": 0.96,
                "detected_at": ign_time.strftime("%d/%m/%Y %H:%M:%S"),
                "detected_iso": ign_time.isoformat(),
                "has_video": (i == 0 or i == 2),
                "is_arson_cluster": True,
                "is_recurrent": True,
                "is_new_outbreak": True,
                "minutes_ago": (15 * i + 10),
                "status": "PENDENTE",
                "dispatched_at": None,
                "video_url": "http://localhost:8000/api/stream/live.mjpg" if (i == 0 or i == 2) else None,
                "hover_thumbnail": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
                "is_simulated": True
            })
            uid += 1

        # Intentionally create a recurrent cluster in Manaus (Flores / Av. das Torres)
        for i in range(3):
            ign_time = now - datetime.timedelta(minutes=30 * i + 5)
            spots_24h.append({
                "id": f"VIIRS-24H-{uid}",
                "latitude": round(-3.08920 + (i * 0.0018), 5),
                "longitude": round(-60.02170 + (i * 0.0012), 5),
                "biome": "Amazônia",
                "state": "AM",
                "municipality": "Manaus",
                "address": "Rua das Laranjeiras / Av. das Torres - Bairro Flores",
                "satellite": "Suomi-NPP (VIIRS)",
                "frp_mw": round(24.5 + i * 5.0, 1),
                "bright_ti4_k": 338.2,
                "confidence": 0.94,
                "detected_at": ign_time.strftime("%d/%m/%Y %H:%M:%S"),
                "detected_iso": ign_time.isoformat(),
                "has_video": True,
                "is_arson_cluster": False,
                "is_recurrent": True,
                "is_new_outbreak": (30 * i + 5) < 180,
                "minutes_ago": (30 * i + 5),
                "status": "PENDENTE",
                "dispatched_at": None,
                "video_url": "http://localhost:8000/api/stream/live.mjpg",
                "hover_thumbnail": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
                "is_simulated": True
            })
            uid += 1

        # Populate national fire spots across regions
        for reg in BRAZIL_REGIONS:
            # 2 to 4 spots per region
            for j in range(random.randint(2, 4)):
                jitter_lat = reg["lat"] + random.uniform(-0.04, 0.04)
                jitter_lng = reg["lng"] + random.uniform(-0.04, 0.04)
                diff_mins = random.randint(15, 720)
                ign_time = now - datetime.timedelta(minutes=diff_mins)
                
                has_vid = reg["has_video"] and (j == 0)
                spots_24h.append({
                    "id": f"VIIRS-24H-{uid}",
                    "latitude": round(jitter_lat, 5),
                    "longitude": round(jitter_lng, 5),
                    "biome": reg["biome"],
                    "state": reg["state"],
                    "municipality": reg["municipality"],
                    "address": reg["address"],
                    "satellite": random.choice(["NOAA-20 (VIIRS)", "Suomi-NPP (VIIRS)", "Aqua (MODIS)", "Terra (MODIS)"]),
                    "frp_mw": round(random.uniform(15.0, 68.0), 1),
                    "bright_ti4_k": round(random.uniform(320.0, 365.0), 1),
                    "confidence": round(random.uniform(0.75, 0.98), 2),
                    "detected_at": ign_time.strftime("%d/%m/%Y %H:%M:%S"),
                    "detected_iso": ign_time.isoformat(),
                    "has_video": has_vid,
                    "is_arson_cluster": False,
                    "is_recurrent": (reg["state"] in ["AM", "PA", "MT"]),
                    "is_new_outbreak": (diff_mins < 180),
                    "minutes_ago": diff_mins,
                    "status": "PENDENTE",
                    "dispatched_at": None,
                    "video_url": "http://localhost:8000/api/stream/live.mjpg" if has_vid else None,
                    "hover_thumbnail": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
                "is_simulated": True
                })
                uid += 1

        # Attach computed air quality metrics (AQI & PM2.5) to all spots
        for s in spots_24h:
            aq = compute_air_quality(s.get("frp_mw", 25.0))
            s["aqi"] = aq["aqi"]
            s["pm25"] = aq["pm25"]
            s["air_quality_level"] = aq["air_quality_level"]

        self._cache_24h = spots_24h

        # 2. Monthly Accumulated Dataset (~350 points for Heatmap across Brazil)
        monthly_spots = []
        for s in spots_24h:
            monthly_spots.append(s)
            
        for k in range(250):
            reg = random.choice(BRAZIL_REGIONS)
            m_lat = reg["lat"] + random.uniform(-0.15, 0.15)
            m_lng = reg["lng"] + random.uniform(-0.15, 0.15)
            monthly_spots.append({
                "latitude": round(m_lat, 5),
                "longitude": round(m_lng, 5),
                "intensity": round(random.uniform(0.4, 1.0), 2),
                "biome": reg["biome"],
                "state": reg["state"]
            })
        self._cache_monthly = monthly_spots

        # 3. Multi-Year Historical Timeline (2020-2026)
        timeline = []
        for year in range(2020, 2027):
            count = random.randint(18000, 48000) if year != 2026 else 14200
            timeline.append({
                "year": year,
                "total_fires": count,
                "critical_biome": "Amazônia (52%)",
                "pantanal_pct": "18%",
                "cerrado_pct": "22%"
            })
        self._cache_historical = timeline

    def get_realtime_24h_fires(self, filter_brazil_only: bool = False) -> List[Dict[str, Any]]:
        spots = self._cache_24h
        if filter_brazil_only:
            return [s for s in spots if s.get("is_brazil", True)]
        return spots

    async def get_real_satellite_fires(self, limit: int = 2000, filter_brazil_only: bool = False) -> List[Dict[str, Any]]:
        """
        Fetches real-time 24h satellite observations directly from NASA FIRMS VIIRS 375m & INPE.
        Filters for Brazilian territory, computes real air quality from satellite FRP,
        geolocates states and calculates true acquisition timestamps.
        Zero mock data: is_simulated=False, has_video=False, video_url=None.
        """
        now = datetime.datetime.now(datetime.timezone.utc)
        
        # Check cache (15 minutes expiry)
        if self._cache_real_24h and self._last_real_fetch:
            time_diff = (now - self._last_real_fetch).total_seconds()
            if time_diff < 900:
                spots = self._cache_real_24h[:limit]
                if filter_brazil_only:
                    return [s for s in spots if s.get("is_brazil", True)]
                return spots

        cache_file = os.path.join(os.path.dirname(__file__), "..", "..", "real_firms_cache.json")
        if not self._cache_real_24h and os.path.exists(cache_file):
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    self._cache_real_24h = json.load(f)
                    self._last_real_fetch = now
                    spots = self._cache_real_24h[:limit]
                    if filter_brazil_only:
                        return [s for s in spots if s.get("is_brazil", True)]
                    return spots
            except Exception:
                pass

        try:
            url = "https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_South_America_24h.csv"
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    content = resp.text
                    reader = csv.DictReader(io.StringIO(content))
                    real_spots = []
                    uid = 20000

                    for row in reader:
                        try:
                            lat = float(row["latitude"])
                            lng = float(row["longitude"])
                        except (ValueError, KeyError):
                            continue

                        # Strict Brazil bounding polygon
                        if -34.0 <= lat <= 5.5 and -74.0 <= lng <= -34.0:
                            frp = float(row.get("frp", 10.0))
                            bright_ti4 = float(row.get("bright_ti4", 320.0))
                            confidence_str = str(row.get("confidence", "nominal")).lower()
                            confidence = 0.98 if "high" in confidence_str else 0.88 if "nominal" in confidence_str else 0.75
                            acq_date = row.get("acq_date", "")
                            acq_time = row.get("acq_time", "0000").zfill(4)

                            # Calculate true elapsed time from satellite pass
                            try:
                                det_dt = datetime.datetime.strptime(f"{acq_date} {acq_time}", "%Y-%m-%d %H%M").replace(tzinfo=datetime.timezone.utc)
                                diff_min = max(1, int((now - det_dt).total_seconds() / 60))
                                local_dt = det_dt.astimezone(datetime.timezone(datetime.timedelta(hours=-4)))
                                det_str = local_dt.strftime("%d/%m/%Y às %H:%M:%S")
                                iso_str = det_dt.isoformat()
                            except Exception:
                                diff_min = 60
                                det_str = f"{acq_date} {acq_time[:2]}:{acq_time[2:]}:00 UTC"
                                iso_str = now.isoformat()

                            loc = classify_location(lat, lng)
                            aq = compute_air_quality(frp)

                            real_spots.append({
                                "id": f"FIRMS-REAL-{uid}",
                                "latitude": round(lat, 5),
                                "longitude": round(lng, 5),
                                "is_brazil": loc["is_brazil"],
                                "country_code": loc["country_code"],
                                "country_name": loc["country_name"],
                                "biome": loc["biome"],
                                "state": loc["state"],
                                "municipality": loc["municipality"],
                                "address": loc["address"],
                                "satellite": "Suomi-NPP (VIIRS 375m)",
                                "frp_mw": round(frp, 1),
                                "bright_ti4_k": round(bright_ti4, 1),
                                "confidence": confidence,
                                "detected_at": det_str,
                                "detected_iso": iso_str,
                                "has_video": False,
                                "is_arson_cluster": False,
                                "is_recurrent": False,
                                "is_simulated": False,
                                "is_new_outbreak": (diff_min <= 180),
                                "minutes_ago": diff_min,
                                "status": "PENDENTE",
                                "dispatched_at": None,
                                "video_url": None,
                                "hover_thumbnail": None,
                                "aqi": aq["aqi"],
                                "pm25": aq["pm25"],
                                "air_quality_level": aq["air_quality_level"],
                                "is_estimated_aqi": True
                            })
                            uid += 1

                    if real_spots:
                        real_spots.sort(key=lambda x: x["frp_mw"], reverse=True)
                        self._cache_real_24h = real_spots
                        self._last_real_fetch = now

                        # Persist to disk cache
                        try:
                            with open(cache_file, "w", encoding="utf-8") as cf:
                                json.dump(real_spots[:800], cf)
                        except Exception:
                            pass

                        if filter_brazil_only:
                            return [s for s in self._cache_real_24h if s.get("is_brazil", True)][:limit]
                        return self._cache_real_24h[:limit]
        except Exception as e:
            print("Erro ao consumir satélite real NASA FIRMS:", e)

        # Fallback to local persisted cache file if offline
        if not self._cache_real_24h and os.path.exists(cache_file):
            try:
                with open(cache_file, "r", encoding="utf-8") as cf:
                    self._cache_real_24h = json.load(cf)
                    self._last_real_fetch = now
                    spots = self._cache_real_24h[:limit]
                    if filter_brazil_only:
                        return [s for s in spots if s.get("is_brazil", True)]
                    return spots
            except Exception:
                pass

        spots = (self._cache_real_24h or [])[:limit]
        if filter_brazil_only:
            return [s for s in spots if s.get("is_brazil", True)]
        return spots

    def get_monthly_heatmap_data(self, simulation: bool = True) -> List[Dict[str, Any]]:
        if not simulation and self._cache_real_24h:
            return [
                {
                    "latitude": s["latitude"],
                    "longitude": s["longitude"],
                    "intensity": min(1.0, max(0.2, s["frp_mw"] / 100.0)),
                    "biome": s.get("biome", "Amazônia"),
                    "state": s.get("state", "BR")
                }
                for s in self._cache_real_24h[:300]
            ]
        return self._cache_monthly

    def get_historical_timeline(self) -> List[Dict[str, Any]]:
        return self._cache_historical

national_ingestion = NationalIngestionService()
