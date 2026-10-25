"""
OSINT (Open Source Intelligence) Social Media Monitoring Service.
Filters keywords, geocodes Manaus neighborhoods if coords missing, and stores metadata in SQLite.
"""

import datetime
from typing import List, Dict, Any, Optional
from ..database import get_db_connection
from ..config import settings

# Geocoding dictionary for popular Manaus urban zones & municipalities
MANAUS_GEOCODING = {
    "flores": (-3.08920, -60.02170),
    "tarumã": (-3.03140, -60.08910),
    "taruma": (-3.03140, -60.08910),
    "são josé": (-3.08110, -59.95420),
    "sao jose": (-3.08110, -59.95420),
    "aleixo": (-3.09630, -59.99220),
    "centro": (-3.13170, -60.02420),
    "ponta negra": (-3.06120, -60.10300),
    "coroado": (-3.09840, -59.98140),
    "torres": (-3.07890, -59.99650),
    "autazes": (-3.57910, -59.13060),
    "tefé": (-3.35440, -64.71140),
    "tefe": (-3.35440, -64.71140),
    "coari": (-4.08470, -63.14140)
}

class OSINTService:
    def process_incoming_post(self, source: str, author: Optional[str], original_url: str,
                              text: str, latitude: Optional[float] = None, 
                              longitude: Optional[float] = None) -> Optional[Dict[str, Any]]:
        """
        Filters incoming social post by keywords. If matched, extracts/geocodes coordinates
        and saves metadata into SQLite.
        """
        text_lower = text.lower()
        matched_keywords = [kw for kw in settings.OSINT_KEYWORDS if kw in text_lower]
        
        if not matched_keywords:
            return None # Post not related to fire monitoring
        
        # Geocode if latitude and longitude are missing
        lat, lng = latitude, longitude
        if lat is None or lng is None:
            for place, coords in MANAUS_GEOCODING.items():
                if place in text_lower:
                    lat, lng = coords
                    break
        
        # Default fallback to central Manaus if no location found
        if lat is None or lng is None:
            lat, lng = -3.11900, -60.02100
            
        now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-4))).isoformat()
        keywords_str = ", ".join(matched_keywords)
        confidence = min(0.98, 0.70 + len(matched_keywords) * 0.08)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO osint_alerts 
            (source, author, original_url, text, latitude, longitude, confidence, keywords_matched, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (source, author, original_url, text, lat, lng, confidence, keywords_str, now))
        conn.commit()
        alert_id = cursor.lastrowid
        conn.close()
        
        return {
            "id": alert_id,
            "source": source,
            "author": author,
            "original_url": original_url,
            "text": text,
            "latitude": lat,
            "longitude": lng,
            "confidence": confidence,
            "keywords_matched": keywords_str,
            "created_at": now
        }

    def list_alerts(self, limit: int = 25) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, source, author, original_url, text, latitude, longitude, confidence, keywords_matched, created_at
            FROM osint_alerts
            ORDER BY id DESC
            LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

osint_service = OSINTService()
