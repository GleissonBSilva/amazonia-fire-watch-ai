"""
API Endpoints for AI Copilot & Real-Time GIS Assistant.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from ..services.ai_copilot_service import ai_copilot

router = APIRouter(prefix="/copilot", tags=["AI Copilot"])

class ChatRequest(BaseModel):
    prompt: str

@router.get("/status")
async def get_copilot_status():
    """Returns real-time executive situational status across Brazil."""
    return ai_copilot.get_current_situational_summary()

@router.post("/chat")
async def chat_with_copilot(req: ChatRequest):
    """Processes user query and returns AI Copilot tactical assessment."""
    return ai_copilot.generate_response(req.prompt)
