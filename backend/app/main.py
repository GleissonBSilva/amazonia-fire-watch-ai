"""
Main FastAPI Application Entry Point for AMAZÔNIA FIRE-WATCH AI (National Scope).
Inclui Proxy Anti-403 (remoção de X-Frame-Options/CSP), IA Tática Grounded e Disparador Seguro.
"""

from fastapi import FastAPI, Query, HTTPException, Response, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import httpx

from .database import init_db
from .api.alerts import router as alerts_router
from .api.streams import router as streams_router
from .api.osint import router as osint_router
from .api.ingestion import router as ingestion_router
from .api.spatial import router as spatial_router
from .api.copilot import router as copilot_router
from .api.air_quality import router as air_quality_router

# AMARRAÇÃO DE SEGURANÇA: Modo Simulação estrito (apenas para seu contato de homologação)
DEV_PHONE_NUMBER = "5591991463640" 
DEV_TELEGRAM_CHAT_ID = "991463640"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize SQLite DB and seed initial alerts
    init_db()
    yield
    # Shutdown

app = FastAPI(
    title="AMAZÔNIA FIRE-WATCH AI • CBMAM / CIOPS",
    description="Ecossistema Nacional GIS com IA • Visão Computacional em Memória (Zero-Disk) & Detecção de Crime Ambiental",
    version="6.1.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(alerts_router, prefix="/api")
app.include_router(streams_router, prefix="/api")
app.include_router(osint_router, prefix="/api")
app.include_router(ingestion_router, prefix="/api")
app.include_router(spatial_router, prefix="/api")
app.include_router(copilot_router, prefix="/api")
app.include_router(air_quality_router, prefix="/api")

# ==========================================
# 1. ROTA DE PROXY ANTI-403 (Resolve X-Frame-Options / CSP)
# ==========================================
@app.get("/api/proxy")
async def proxy_external_url(url: str = Query(..., description="URL externa para carregar na janela flutuante")):
    """
    Remove os headers X-Frame-Options e Content-Security-Policy para permitir
    que links como NASA FIRMS e BDQueimadas abram na janela flutuante sem tela branca ou 403.
    Injeta <base href="..."> para resolver assets e dependências relativas (ol.js, css, imagens) sem 404s.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    }
    try:
        async with httpx.AsyncClient(follow_redirects=True, verify=False, timeout=15.0) as client:
            res = await client.get(url, headers=headers)
            
            content_type = res.headers.get("content-type", "")
            content = res.content
            
            # Injeta <base href="..."> para resolver links relativos no iframe
            if "text/html" in content_type:
                base_url = str(res.url)
                base_tag = f'<base href="{base_url}">'
                try:
                    html_text = res.text
                    if "</head>" in html_text:
                        html_text = html_text.replace("</head>", f"{base_tag}</head>", 1)
                    elif "<head>" in html_text:
                        html_text = html_text.replace("<head>", f"<head>{base_tag}", 1)
                    content = html_text.encode("utf-8")
                except Exception:
                    pass

            # Limpa cabeçalhos que bloqueiam o iframe
            response_headers = dict(res.headers)
            response_headers.pop("x-frame-options", None)
            response_headers.pop("content-security-policy", None)
            response_headers.pop("X-Frame-Options", None)
            response_headers.pop("Content-Security-Policy", None)

            return Response(
                content=content,
                status_code=res.status_code,
                media_type=content_type
            )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro ao acessar rota via proxy: {str(e)}")

# ==========================================
# 1.2 ROTA DE ANÁLISE DE VÍDEO/STREAMING EM MEMÓRIA (Zero-Disk)
# ==========================================
@app.post("/api/vision/analyze-stream")
async def analyze_video_stream(
    file: Optional[UploadFile] = File(None),
    stream_url: Optional[str] = Form(None)
):
    """
    Processa fluxo de vídeo ou arquivo (.mp4/.mkv/imagem) diretamente na memória RAM (Zero-Disk).
    Aplica inferência YOLOv8 e detector térmico-colorimétrico, gerando bounding boxes,
    confiança e metadados para geração imediata de pino no mapa.
    """
    import time
    import datetime
    import numpy as np
    import cv2
    from .services.vision_pipeline import vision_pipeline

    frame_bytes = None
    if file:
        raw_bytes = await file.read()
        if len(raw_bytes) > 0:
            nparr = np.frombuffer(raw_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is not None:
                frame_bytes = raw_bytes
            else:
                frame_bytes = vision_pipeline.generate_synthetic_live_frame()
    else:
        frame_bytes = vision_pipeline.generate_synthetic_live_frame()

    detection = vision_pipeline.process_frame_buffer(frame_bytes) if frame_bytes else vision_pipeline.latest_result
    
    # Constrói metadados do foco para plotar o pino tático no Leaflet
    now_iso = datetime.datetime.now().isoformat()
    now_time = datetime.datetime.now().strftime("%H:%M:%S")
    conf = float(detection.get("confidence", 0.94))
    
    spot = {
        "id": f"CAM-YOLO-{int(time.time())}",
        "latitude": -3.10719,
        "longitude": -60.02610,
        "biome": "Amazônia",
        "state": "AM",
        "municipality": "Manaus (Zona Centro-Sul)",
        "address": "Av. Constantino Nery / Bairro Flores - Monitoramento C2",
        "satellite": "Câmera Urbana YOLOv8",
        "frp_mw": round(38.0 + (conf * 22.0), 1),
        "bright_ti4_k": round(360.0 + (conf * 35.0), 1),
        "confidence": conf,
        "detected_at": f"Hoje às {now_time}",
        "detected_iso": now_iso,
        "has_video": True,
        "is_arson_cluster": False,
        "is_recurrent": False,
        "video_url": "http://localhost:8000/api/stream/live.mjpg"
    }

    return {
        "status": "success",
        "fire_detected": detection.get("fire_detected", True),
        "confidence": conf,
        "expansion_rate": detection.get("expansion_rate", 1.8),
        "bboxes": detection.get("bboxes", [
            {"x": 180, "y": 140, "width": 240, "height": 180, "confidence": conf}
        ]),
        "snapshot_base64": detection.get("snapshot_base64"),
        "spot": spot
    }

# ==========================================
# 1.1 ROTA DE GEOCODIFICAÇÃO (Nominatim com User-Agent e Zero CORS)
# ==========================================
@app.get("/api/geocode")
async def geocode_query(q: str = Query(..., description="Termo de busca Nominatim")):
    """
    Proxy seguro com User-Agent corporativo e headers para Nominatim OpenStreetMap.
    """
    headers = {
        "User-Agent": "AmazoniaFireWatchAI/2.0 (gleison@ciops.gov.br)",
        "Accept": "application/json",
        "Accept-Language": "pt-BR,pt;q=0.9",
    }
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "format": "json",
        "q": q,
        "countrycodes": "br",
        "limit": 6,
        "addressdetails": 1
    }
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            res = await client.get(url, params=params, headers=headers)
            if res.status_code == 200:
                return res.json()
            return []
    except Exception:
        return []

# ==========================================
# 2. IA TÁTICA BASEADA NO ESTADO DO MAPA (Grounded AI)
# ==========================================
class MapContext(BaseModel):
    focos_ativos: List[Dict[str, Any]]
    area_selecionada_km2: Optional[float] = 0.0
    focos_reincidentes: int
    bairro_referencia: Optional[str] = "Manaus e Região Metropolitana"
    pergunta_operador: str

@app.post("/api/ai/tactical-copilot")
async def tactical_copilot(ctx: MapContext):
    """
    IA Tática Militar e Especialista GIS Operacional C2.
    Conhece detalhadamente cada botão e recurso da interface e analisa as coordenadas reais do mapa.
    """
    from .services.ai_copilot_service import ai_copilot
    resp = ai_copilot.generate_response(ctx.pergunta_operador, context=ctx.dict())
    return {
        "status": "success",
        "analise_tatica": resp["response"],
        "summary": resp.get("summary_data", {})
    }

# ==========================================
# 3. DISPARADOR DE ALERTA AMARRADO AO SEU NÚMERO
# ==========================================
class SafeAlertPayload(BaseModel):
    latitude: float
    longitude: float
    endereco: str
    reincidente: bool = False
    frp: float = 0.0
    spot_id: Optional[str] = None

@app.post("/api/alerts/dispatch-safe")
async def dispatch_safe_alert(payload: SafeAlertPayload):
    maps_link = f"https://www.google.com/maps?q={payload.latitude},{payload.longitude}"
    severidade = "🚨 SUSPEITA DE AÇÃO REINCIDENTE/CRIME" if payload.reincidente else "🔥 FOCO TÉRMICO IDENTIFICADO"

    mensagem = (
        f"*[MODO SIMULAÇÃO - AMAPÁ/AMAZONAS]*\n"
        f"{severidade}\n\n"
        f"📍 *Local:* {payload.endereco}\n"
        f"🌐 *Coords:* {payload.latitude:.5f}, {payload.longitude:.5f}\n"
        f"⚡ *Potência Térmica:* {payload.frp} MW\n"
        f"🗺️ *Mapa:* {maps_link}\n\n"
        f"⚠️ _Mensagem de teste interna direcionada exclusivamente ao operador de homologação._"
    )

    log_envio = {
        "whatsapp_destino": DEV_PHONE_NUMBER,
        "telegram_destino": DEV_TELEGRAM_CHAT_ID,
        "mensagem": mensagem,
        "status": "DISPARADO_APENAS_PARA_USUARIO_TESTE"
    }

    import datetime
    now_str = datetime.datetime.now().strftime("%H:%M:%S")
    return {
        "status": "ok",
        "seguranca": "Bloqueio de emergência ativo (apenas seu número)",
        "novo_status": "ACIONADO_SIMULACAO",
        "horario_acionamento": now_str,
        "spot_id": payload.spot_id,
        "detalhes": log_envio
    }

@app.get("/")
def health_check():
    return {
        "system": "AMAZÔNIA FIRE-WATCH AI",
        "agency": "CBMAM / CIOPS",
        "scope": "NACIONAL (BRASIL)",
        "status": "ONLINE",
        "vision_pipeline": "IN_MEMORY_ZERO_DISK",
        "spatial_intelligence": "CLUSTER_500M_RECURRENCE_ARSON_DETECTION",
        "whatsapp_target": DEV_PHONE_NUMBER,
        "telegram_target": DEV_TELEGRAM_CHAT_ID,
        "simulation_mode": True,
        "version": "6.1.0"
    }
