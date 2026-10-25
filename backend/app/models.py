"""
Data models and schemas for API requests and responses.
"""

from pydantic import BaseModel, Field
from typing import Optional, List

class DelimitedAreaPayload(BaseModel):
    latitude: float = Field(..., example=-3.08920)
    longitude: float = Field(..., example=-60.02170)
    area_sq_km: float = Field(..., example=1.45)
    criticidade: Optional[str] = Field("CRÍTICA", example="CRÍTICA")
    image_base64: Optional[str] = None
    observacoes: Optional[str] = None

class WhatsAppAlertResponse(BaseModel):
    success: bool
    status: str
    target_number: str
    formatted_message: str
    whatsapp_url: str
    image_attached: bool

class OSINTWebhookPayload(BaseModel):
    source: str = Field(..., example="Telegram (@manaus_urgente)")
    author: Optional[str] = "@usuario_am"
    original_url: str = Field(..., example="https://t.me/manaus_urgente/1042")
    text: str = Field(..., example="Muita fumaça e fogo subindo perto da área verde em Manaus")
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class OSINTItemResponse(BaseModel):
    id: int
    source: str
    author: Optional[str]
    original_url: str
    text: str
    latitude: Optional[float]
    longitude: Optional[float]
    confidence: float
    keywords_matched: Optional[str]
    created_at: str

class VideoDetectionStatus(BaseModel):
    camera_id: str
    timestamp: str
    fps: float
    fire_detected: bool
    confidence: float
    expansion_rate: float
    has_snapshot: bool
    snapshot_base64: Optional[str] = None
