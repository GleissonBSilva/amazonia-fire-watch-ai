"""
Text-to-Speech (TTS) Tactical Service using gTTS (Google Text-to-Speech).
Generates streaming speech audio directly in memory (io.BytesIO - Zero Disk)
for real-time audio announcements of fire detections and civil defense alerts.
"""

from fastapi import APIRouter, Query, HTTPException, Response
from pydantic import BaseModel
import io
from gtts import gTTS

router = APIRouter(tags=["Text-to-Speech"])

class TTSRequest(BaseModel):
    text: str
    lang: str = "pt"
    slow: bool = False

@router.post("/tts/generate")
async def generate_speech_post(payload: TTSRequest):
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=400, detail="Texto para síntese não informado.")
    
    clean_text = payload.text.strip()[:600]
    try:
        mp3_buffer = io.BytesIO()
        tts = gTTS(text=clean_text, lang=payload.lang, slow=payload.slow, tld="com.br")
        tts.write_to_fp(mp3_buffer)
        mp3_buffer.seek(0)
        
        return Response(
            content=mp3_buffer.read(),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=tactical_alert.mp3"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na síntese de voz gTTS: {str(e)}")

@router.get("/tts/speak")
async def speak_text_get(text: str = Query(..., description="Texto do anúncio tático"), lang: str = "pt"):
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Parâmetro 'text' obrigatório.")
    
    clean_text = text.strip()[:600]
    try:
        mp3_buffer = io.BytesIO()
        tts = gTTS(text=clean_text, lang=lang, slow=False, tld="com.br")
        tts.write_to_fp(mp3_buffer)
        mp3_buffer.seek(0)
        
        return Response(
            content=mp3_buffer.read(),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=tactical_alert.mp3"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro gTTS: {str(e)}")
