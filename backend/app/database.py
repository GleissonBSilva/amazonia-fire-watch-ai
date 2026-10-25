"""
SQLite database engine for OSINT and Alert metadata storage.
Stores only lightweight metadata (zero video/image files on disk).
"""

import sqlite3
import datetime
from .config import settings

def get_db_connection():
    conn = sqlite3.connect(settings.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    # Ensure tables exist
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS osint_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        author TEXT,
        original_url TEXT NOT NULL,
        text TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        confidence REAL DEFAULT 0.85,
        keywords_matched TEXT,
        created_at TEXT NOT NULL
    );
    """)
    conn.commit()
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS osint_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        author TEXT,
        original_url TEXT NOT NULL,
        text TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        confidence REAL DEFAULT 0.85,
        keywords_matched TEXT,
        created_at TEXT NOT NULL
    );
    """)
    
    # Check if empty, seed initial verified OSINT alerts for Manaus
    cursor.execute("SELECT COUNT(*) FROM osint_alerts")
    count = cursor.fetchone()[0]
    
    if count == 0:
        now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-4))).isoformat()
        sample_alerts = [
            (
                "Telegram (Canal Alerta Manaus)",
                "@manaustransito_oficial",
                "https://t.me/s/manausalertas",
                "Fumaça densa e foco de queimada de lixo atingindo fiação na Av. das Torres próximo a Flores.",
                -3.08920,
                -60.02170,
                0.92,
                "fumaça, queimada, manaus",
                now
            ),
            (
                "X / Twitter (@MonitoramentoAM)",
                "@defesacivilam",
                "https://twitter.com/search?q=queimada+manaus",
                "Moradores do Tarumã relatam alta concentração de calor e princípio de incêndio em capoeira.",
                -3.03140,
                -60.08910,
                0.88,
                "calor, incêndio, manaus",
                now
            ),
            (
                "Canal CBMAM Comunidade",
                "@cbmam_plantao",
                "https://t.me/s/cbmam_noticias",
                "Equipe enviada para controle de foco confinado em terreno baldio na Zona Leste (São José).",
                -3.08110,
                -59.95420,
                0.78,
                "foco, confinado, cbmam",
                now
            ),
            (
                "INPE Alerta Satélite",
                "BDQueimadas Sensor VIIRS",
                "https://terrabrasilis.dpi.inpe.br/queimadas/bdqueimadas/",
                "Anomalia térmica com FRP de 42.6 MW detectada na calha Tefé/Coari.",
                -4.96610,
                -65.18093,
                0.95,
                "anomalia térmica, satélite",
                now
            )
        ]
        
        cursor.executemany("""
        INSERT INTO osint_alerts 
        (source, author, original_url, text, latitude, longitude, confidence, keywords_matched, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, sample_alerts)
        conn.commit()
        
    conn.close()
