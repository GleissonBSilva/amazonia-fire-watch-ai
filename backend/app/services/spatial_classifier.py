import os
import json
import shapely
from shapely.geometry import shape, Point

# Path to the official IBGE simplified boundary GeoJSON
GEOJSON_PATH = os.path.join(os.path.dirname(__file__), "ibge_brazil_boundary.geojson")

_brazil_geometry = None

def _get_brazil_geometry():
    global _brazil_geometry
    if _brazil_geometry is not None:
        return _brazil_geometry

    if os.path.exists(GEOJSON_PATH):
        try:
            with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                features = data.get("features", [])
                if features:
                    raw_geom = shape(features[0]["geometry"])
                    _brazil_geometry = shapely.make_valid(raw_geom)
                    return _brazil_geometry
        except Exception as e:
            print("Aviso: Falha ao carregar GeoJSON do IBGE, usando fallback geométrico:", e)

    # Robust fallback polygon covering the Brazilian national territory
    coords = [
        (-51.6, 4.4), (-51.2, 4.0), (-50.0, 1.8), (-49.8, 0.0),
        (-48.0, -0.6), (-44.5, -2.0), (-43.0, -2.3),
        (-41.5, -2.8), (-38.5, -3.7), (-35.5, -5.0), (-34.8, -7.0),
        (-34.8, -8.0), (-35.2, -9.5), (-36.8, -11.0), (-38.0, -12.5),
        (-39.0, -15.5), (-39.2, -18.0),
        (-40.0, -20.0), (-41.0, -22.0), (-43.0, -23.0), (-44.5, -23.3),
        (-46.5, -24.0), (-48.5, -25.5), (-48.5, -28.0),
        (-50.0, -30.0), (-52.0, -32.5), (-53.4, -33.8),
        (-53.5, -33.7), (-54.5, -32.0), (-55.5, -31.0), (-56.5, -30.2), (-57.6, -30.2),
        (-57.1, -29.0), (-55.5, -28.0), (-54.0, -26.5), (-53.7, -26.2), (-54.6, -25.5),
        (-54.6, -24.0), (-55.5, -23.5), (-56.0, -22.2), (-57.8, -21.5), (-58.0, -20.0),
        (-58.2, -18.0), (-58.0, -16.5), (-60.4, -14.0), (-61.0, -13.5),
        (-62.5, -13.5), (-63.5, -12.5), (-64.7, -12.0), (-65.4, -10.8),
        (-65.4, -9.7), (-66.8, -10.0), (-68.8, -11.0), (-69.5, -11.0),
        (-71.0, -10.0), (-72.5, -9.5), (-74.0, -7.5), (-73.0, -5.0),
        (-70.0, -4.2), (-69.9, -4.2),
        (-70.0, -2.0), (-69.5, 0.0), (-67.5, 1.2), (-67.0, 1.8),
        (-66.8, 1.5), (-65.0, 1.0), (-64.0, 2.5), (-63.0, 3.5),
        (-60.8, 5.3), (-60.2, 5.3),
        (-59.0, 4.0), (-58.5, 2.0), (-56.0, 2.0), (-54.5, 2.5),
        (-52.5, 2.5), (-51.8, 3.8), (-51.6, 4.4)
    ]
    _brazil_geometry = shapely.geometry.Polygon(coords)
    return _brazil_geometry

def is_within_brazil(lat: float, lng: float) -> bool:
    """Verifica com alta precisão (malha IBGE) se uma coordenada está dentro do Brasil."""
    # Pre-filter: rápida exclusão fora da bounding box ampla da América do Sul / Brasil
    if not (-34.2 <= lat <= 5.5 and -74.2 <= lng <= -34.5):
        return False
    geom = _get_brazil_geometry()
    pt = Point(lng, lat)
    return bool(geom.contains(pt))

def identify_neighbor_country(lat: float, lng: float) -> tuple:
    """Identifica país sul-americano vizinho caso o ponto esteja fora do Brasil."""
    if -23.0 <= lat <= -9.5 and -70.0 <= lng <= -57.5:
        return "BO", "Bolívia"
    elif -28.0 <= lat <= -19.0 and -63.0 <= lng <= -54.0:
        return "PY", "Paraguai"
    elif -18.5 <= lat <= 0.5 and -81.5 <= lng <= -68.5:
        return "PE", "Peru"
    elif -4.5 <= lat <= 13.0 and -79.5 <= lng <= -66.5:
        return "CO", "Colômbia"
    elif 0.5 <= lat <= 13.0 and -73.5 <= lng <= -59.5:
        return "VE", "Venezuela"
    elif 1.0 <= lat <= 8.5 and -61.5 <= lng <= -56.5:
        return "GY", "Guiana"
    elif 1.5 <= lat <= 6.0 and -58.0 <= lng <= -54.0:
        return "SR", "Suriname"
    elif 2.0 <= lat <= 5.5 and -54.5 <= lng <= -51.5:
        return "GF", "Guiana Francesa"
    elif -35.5 <= lat <= -30.0 and -58.5 <= lng <= -53.0:
        if lng < -58.0 and lat > -34.5:
            return "AR", "Argentina"
        return "UY", "Uruguai"
    elif -55.0 <= lat <= -21.5 and -73.5 <= lng <= -53.5:
        return "AR", "Argentina"
    else:
        return "INT", "América do Sul (País Vizinho)"

def get_brazil_state_and_biome(lat: float, lng: float) -> tuple:
    """Classifica o estado e bioma dentro do território nacional brasileiro."""
    if -9.9 <= lat <= 2.3 and -73.8 <= lng <= -56.1:
        return "AM", "Amazonas", "Amazônia"
    elif -9.9 <= lat <= 2.5 and -58.9 <= lng <= -46.0:
        return "PA", "Pará", "Amazônia"
    elif -18.0 <= lat <= -9.0 and -61.6 <= lng <= -50.2:
        biome = "Pantanal" if (-17.8 <= lat <= -16.0 and -58.0 <= lng <= -55.0) else "Cerrado" if lat < -13.0 else "Amazônia"
        return "MT", "Mato Grosso", biome
    elif -13.7 <= lat <= -7.9 and -66.6 <= lng <= -59.7:
        return "RO", "Rondônia", "Amazônia"
    elif -11.2 <= lat <= -7.1 and -73.8 <= lng <= -66.5:
        return "AC", "Acre", "Amazônia"
    elif 1.0 <= lat <= 5.3 and -64.8 <= lng <= -58.9:
        return "RR", "Roraima", "Amazônia"
    elif -1.2 <= lat <= 4.5 and -54.9 <= lng <= -49.9:
        return "AP", "Amapá", "Amazônia"
    elif -10.3 <= lat <= -1.0 and -48.8 <= lng <= -41.8:
        biome = "Cerrado" if lat < -5.0 else "Amazônia"
        return "MA", "Maranhão", biome
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


MAJOR_HUBS = [
    # Amazonas (AM)
    {"name": "Barcelos", "state": "AM", "biome": "Amazônia", "lat": -1.6075, "lng": -61.7471, "region": "Médio Rio Negro"},
    {"name": "Manaus", "state": "AM", "biome": "Amazônia", "lat": -3.1019, "lng": -60.0250, "region": "Região Metropolitana"},
    {"name": "Lábrea", "state": "AM", "biome": "Amazônia", "lat": -7.2594, "lng": -64.7981, "region": "Sul do Amazonas / BR-230"},
    {"name": "Apuí", "state": "AM", "biome": "Amazônia", "lat": -7.1942, "lng": -59.8922, "region": "Fronteira Agrícola Transamazônica"},
    {"name": "Tefé", "state": "AM", "biome": "Amazônia", "lat": -3.3544, "lng": -64.7114, "region": "Médio Solimões"},
    {"name": "Humaitá", "state": "AM", "biome": "Amazônia", "lat": -7.5147, "lng": -63.0247, "region": "BR-319"},
    {"name": "Novo Airão", "state": "AM", "biome": "Amazônia", "lat": -2.6206, "lng": -60.9439, "region": "Baixo Rio Negro"},
    {"name": "Santa Isabel do Rio Negro", "state": "AM", "biome": "Amazônia", "lat": -0.4139, "lng": -65.0192, "region": "Alto Rio Negro"},
    {"name": "São Gabriel da Cachoeira", "state": "AM", "biome": "Amazônia", "lat": -0.1303, "lng": -67.0892, "region": "Cabeça do Cachorro"},
    {"name": "Manicoré", "state": "AM", "biome": "Amazônia", "lat": -5.8094, "lng": -61.2994, "region": "Calha do Madeira"},
    {"name": "Boca do Acre", "state": "AM", "biome": "Amazônia", "lat": -8.7522, "lng": -67.3978, "region": "Fronteira AC/AM"},
    {"name": "Parintins", "state": "AM", "biome": "Amazônia", "lat": -2.6289, "lng": -56.7361, "region": "Baixo Amazonas"},
    {"name": "Itacoatiara", "state": "AM", "biome": "Amazônia", "lat": -3.1431, "lng": -58.4442, "region": "Médio Amazonas"},
    {"name": "Coari", "state": "AM", "biome": "Amazônia", "lat": -4.0850, "lng": -63.1414, "region": "Bacia de Urucu / Solimões"},
    {"name": "Presidente Figueiredo", "state": "AM", "biome": "Amazônia", "lat": -2.0506, "lng": -60.0250, "region": "Norte de Manaus / BR-174"},

    # Pará (PA)
    {"name": "Novo Progresso", "state": "PA", "biome": "Amazônia", "lat": -7.1458, "lng": -55.4214, "region": "Eixo da BR-163"},
    {"name": "Altamira", "state": "PA", "biome": "Amazônia", "lat": -3.2033, "lng": -52.2064, "region": "Bacia do Xingu"},
    {"name": "São Félix do Xingu", "state": "PA", "biome": "Amazônia", "lat": -6.6447, "lng": -51.9878, "region": "Sul do Pará"},
    {"name": "Santarém", "state": "PA", "biome": "Amazônia", "lat": -2.4431, "lng": -54.7083, "region": "Foz do Tapajós"},
    {"name": "Itaituba", "state": "PA", "biome": "Amazônia", "lat": -4.2761, "lng": -55.9836, "region": "Vale do Tapajós"},
    {"name": "Marabá", "state": "PA", "biome": "Amazônia", "lat": -5.3686, "lng": -49.1178, "region": "Carajás / Tocantins"},

    # Mato Grosso (MT) & Pantanal
    {"name": "Colniza", "state": "MT", "biome": "Amazônia", "lat": -9.4139, "lng": -60.0167, "region": "Noroeste de Mato Grosso"},
    {"name": "Aripuanã", "state": "MT", "biome": "Amazônia", "lat": -9.1667, "lng": -60.6333, "region": "Norte de Mato Grosso"},
    {"name": "Sinop", "state": "MT", "biome": "Amazônia", "lat": -11.8642, "lng": -55.5050, "region": "Norte / BR-163"},
    {"name": "Corumbá", "state": "MS", "biome": "Pantanal", "lat": -19.0094, "lng": -57.6533, "region": "Pantanal Sul"},
    {"name": "Poconé", "state": "MT", "biome": "Pantanal", "lat": -16.2567, "lng": -56.6228, "region": "Transpantaneira"},

    # Rondônia & Acre
    {"name": "Porto Velho", "state": "RO", "biome": "Amazônia", "lat": -8.7619, "lng": -63.9039, "region": "Rio Madeira / BR-364"},
    {"name": "Rio Branco", "state": "AC", "biome": "Amazônia", "lat": -9.9749, "lng": -67.8243, "region": "Vale do Acre"},
]

def find_nearest_municipality(lat: float, lng: float, state_code: str):
    best_hub = None
    min_dist = 999.0
    for hub in MAJOR_HUBS:
        if hub["state"] == state_code or (state_code in ["AM", "PA", "MT", "RO", "AC"] and hub["biome"] == "Amazônia"):
            d = ((lat - hub["lat"]) ** 2 + (lng - hub["lng"]) ** 2) ** 0.5
            if d < min_dist:
                min_dist = d
                best_hub = hub
    
    # Se estiver a até ~85 km (aprox 0.78 graus)
    if best_hub and min_dist <= 0.78:
        return best_hub
    return None

def classify_location(lat: float, lng: float) -> dict:
    """
    Classifica espacialmente um ponto geográfico:
    - Se dentro do Brasil (IBGE): is_brazil=True, estado, bioma e município.
    - Se fora do Brasil: is_brazil=False, país vizinho, sem rotular como Cerrado/Amazônia brasileira.
    """
    in_brazil = is_within_brazil(lat, lng)

    if in_brazil:
        state_code, state_name, biome = get_brazil_state_and_biome(lat, lng)
        nearest = find_nearest_municipality(lat, lng, state_code)
        if nearest:
            mun = f"{nearest['name']} / {nearest['state']}"
            addr = f"Detecção Orbital NASA FIRMS VIIRS 375m • {nearest['name']} ({nearest['region']})"
            final_biome = nearest["biome"]
        else:
            mun = f"{state_name} ({biome})"
            addr = f"Detecção Orbital NASA FIRMS VIIRS 375m • {state_name}"
            final_biome = biome

        return {
            "is_brazil": True,
            "country_code": "BR",
            "country_name": "Brasil",
            "state": state_code,
            "state_name": state_name,
            "biome": final_biome,
            "municipality": mun,
            "address": addr
        }
    else:
        country_code, country_name = identify_neighbor_country(lat, lng)
        return {
            "is_brazil": False,
            "country_code": country_code,
            "country_name": country_name,
            "state": country_code,
            "state_name": country_name,
            "biome": "Internacional (País Vizinho)",
            "municipality": f"{country_name} (América do Sul)",
            "address": f"Detecção Orbital NASA FIRMS • {country_name} (Foco Transfronteiriço / Internacional)"
        }


# =========================================================================
# MOTOR IA DE DIFERENCIAÇÃO: CALOR INDUSTRIAL vs INCÊNDIO FLORESTAL REAL
# Análise Termodinâmica Multivariada (FRP + Temperatura + PM2.5 + PTR)
# =========================================================================

KNOWN_INDUSTRIAL_SITES = [
    {
        "id": "reman-petrobras",
        "name": "Refinaria Isaac Sabbá (REMAN / Petrobras)",
        "type": "REFINARIA_FLARE",
        "lat": -3.1465,
        "lng": -59.9482,
        "radius_km": 2.5,
        "desc": "Flares de tocha contínua de gases residuais e refino de petróleo."
    },
    {
        "id": "pim-distrito-1",
        "name": "Polo Industrial de Manaus (Distrito Industrial I)",
        "type": "POLO_FABRIL_PIM",
        "lat": -3.1250,
        "lng": -59.9750,
        "radius_km": 5.0,
        "desc": "Parque fabril de eletroeletrônicos, caldeiras e metalurgia."
    },
    {
        "id": "pim-distrito-2",
        "name": "Polo Industrial de Manaus (Distrito Industrial II)",
        "type": "POLO_FABRIL_PIM",
        "lat": -3.0780,
        "lng": -59.9050,
        "radius_km": 6.0,
        "desc": "Polo químico, usinas térmicas e indústrias pesadas."
    },
    {
        "id": "termo-maua",
        "name": "Complexo Termelétrico Mauá / Aparecida",
        "type": "TERMOELETRICA",
        "lat": -3.1360,
        "lng": -59.9650,
        "radius_km": 2.0,
        "desc": "Geração termelétrica a gás natural com turbinas e exaustores."
    },
    {
        "id": "petro-urucu",
        "name": "Polo Petrolífero de Urucu (Petrobras)",
        "type": "PETROQUIMICA_GAS",
        "lat": -4.8850,
        "lng": -65.2900,
        "radius_km": 12.0,
        "desc": "Flares industriais de gás natural em bacia de extração petrolífera."
    },
    {
        "id": "polo-barcarena",
        "name": "Complexo Industrial de Barcarena (Albras / Alunorte)",
        "type": "SIDERURGICA",
        "lat": -1.5100,
        "lng": -48.7500,
        "radius_km": 7.0,
        "desc": "Metalurgia pesada de bauxita/alumina e fornos contínuos."
    },
    {
        "id": "siderurgia-maraba",
        "name": "Distrito Metalúrgico de Marabá (Carajás)",
        "type": "SIDERURGICA",
        "lat": -5.3400,
        "lng": -49.0900,
        "radius_km": 6.0,
        "desc": "Siderurgia de ferro-gusa e fornos metalúrgicos."
    }
]

def classify_thermal_anomaly_ai(lat: float, lng: float, frp_mw: float, bright_ti4_k: float, pm25: float = 15.0) -> dict:
    safe_frp = max(float(frp_mw or 0), 3.0)
    safe_pm25 = float(pm25 or 15.0)
    safe_temp_k = float(bright_ti4_k or 300.0)
    temp_c = round(safe_temp_k - 273.15, 1)

    ptr = round(safe_pm25 / safe_frp, 2)

    matched_site = None
    for site in KNOWN_INDUSTRIAL_SITES:
        d_km = (((lat - site["lat"]) ** 2 + ((lng - site["lng"]) * 0.95) ** 2) ** 0.5) * 111.0
        if d_km <= site["radius_km"]:
            matched_site = site
            break

    is_industrial_zone = matched_site is not None

    industrial_score = 10
    wildfire_score = 90

    if is_industrial_zone:
        industrial_score += 45
        wildfire_score -= 40

    if safe_temp_k >= 355:
        if ptr < 1.8:
            industrial_score += 30
            wildfire_score -= 25
        else:
            wildfire_score += 15

    if ptr < 1.2 and safe_frp >= 15:
        industrial_score += 25
        wildfire_score -= 25
    elif ptr >= 2.5 and safe_pm25 >= 35:
        wildfire_score += 30
        industrial_score -= 30

    industrial_score = min(100, max(0, industrial_score))
    wildfire_score = min(100, max(0, wildfire_score))

    if is_industrial_zone and (safe_pm25 >= 120 or (safe_frp >= 45 and safe_pm25 >= 75)):
        return {
            "nature": "INCENDIO_ESTRUTURAL_FABRIL",
            "is_wildfire": False,
            "is_industrial_heat": True,
            "is_emergency": True,
            "label": "Incêndio Estrutural Fabril (Emergência)",
            "ptr": ptr,
            "matched_facility": matched_site["name"] if matched_site else "Complexo Industrial",
            "ai_verdict": f"Alerta Crítico em Polo Fabril: FRP {safe_frp} MW com particulado massivo ({safe_pm25} µg/m³). Sugere combustão estrutural ativa em instalação industrial."
        }

    if industrial_score >= 60 or (is_industrial_zone and ptr < 1.8 and safe_pm25 < 75):
        facility_name = matched_site["name"] if matched_site else "Polo Industrial"
        return {
            "nature": "CALOR_INDUSTRIAL",
            "is_wildfire": False,
            "is_industrial_heat": True,
            "is_emergency": False,
            "label": "Calor Industrial / Flare Antrópico",
            "ptr": ptr,
            "matched_facility": facility_name,
            "ai_verdict": f"Falso Positivo Florestal: Foco pontual de alta temperatura ({temp_c}°C / {safe_temp_k}K) e FRP {safe_frp} MW, com baixa emissão difusa de particulado de biomassa (PTR {ptr}, PM2.5 {safe_pm25} µg/m³). Coincide com {facility_name}."
        }

    if safe_frp >= 45 or (safe_frp >= 25 and safe_pm25 >= 50):
        return {
            "nature": "VEGETACAO_CRITICA",
            "is_wildfire": True,
            "is_industrial_heat": False,
            "is_emergency": True,
            "label": "Incêndio Florestal Crítico (Biomassa Densa)",
            "ptr": ptr,
            "matched_facility": None,
            "ai_verdict": f"Incêndio Florestal Confirmado: Potência de {safe_frp} MW correlacionada a alta densidade de fuligem (PM2.5 {safe_pm25} µg/m³). Razão PTR {ptr} atesta queima descontrolada de vegetação nativa."
        }

    if safe_frp >= 20:
        return {
            "nature": "VEGETACAO_MODERADA",
            "is_wildfire": True,
            "is_industrial_heat": False,
            "is_emergency": False,
            "label": "Queimada Ativa de Vegetação",
            "ptr": ptr,
            "matched_facility": None,
            "ai_verdict": f"Foco de Queimada de Vegetação: FRP {safe_frp} MW e PM2.5 {safe_pm25} µg/m³ (PTR {ptr}). Assinatura térmica compatível com frente de fogo aberta."
        }

    return {
        "nature": "RUIDO_TERMICO_SOLAR",
        "is_wildfire": False,
        "is_industrial_heat": False,
        "is_emergency": False,
        "label": "Ruído Térmico Solar (Falso Positivo)",
        "ptr": ptr,
        "matched_facility": None,
        "ai_verdict": f"Ruído de baixa energia: FRP {safe_frp} MW com atmosfera limpa (PM2.5 {safe_pm25} µg/m³). Compatível com aquecimento de solo exposto ou telhado."
    }
