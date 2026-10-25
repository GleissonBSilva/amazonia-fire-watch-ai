"""
Configuration settings for AMAZÔNIA FIRE-WATCH AI backend.
"""

import os

class Settings:
    # Target phone number for CBMAM / CIOPS dispatch
    WHATSAPP_TARGET_PHONE: str = os.getenv("WHATSAPP_TARGET_PHONE", "5592993746740")
    
    # Evolution API / Baileys webhook endpoint (optional local or remote bridge)
    WHATSAPP_API_URL: str = os.getenv("WHATSAPP_API_URL", "http://localhost:8080/message/sendText/cbmam")
    WHATSAPP_API_KEY: str = os.getenv("WHATSAPP_API_KEY", "cbmam_secret_token_2026")
    
    # Vision pipeline parameters
    VISION_SAMPLE_INTERVAL_SECONDS: float = 1.5
    VISION_CONFIDENCE_THRESHOLD: float = 0.70
    
    # OSINT filtering keywords
    OSINT_KEYWORDS: list = [
        "incêndio", "incendio", "fumaça", "fumaca", "queimada", "fogo", "manaus",
        "floresta", "cbmam", "ciops", "florestal", "calor", "arredores"
    ]
    
    # SQLite Database
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", "osint_alerts.db")
    
    # Host and Port
    HOST: str = "0.0.0.0"
    PORT: int = 8000

settings = Settings()
