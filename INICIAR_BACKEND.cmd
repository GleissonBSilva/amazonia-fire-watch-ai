@echo off
setlocal
chcp 65001 >nul
title AMAZONIA FIRE-WATCH AI - BACKEND FASTAPI
cls

echo ========================================================
echo   AMAZONIA FIRE-WATCH AI - CBMAM / CIOPS
echo   BACKEND FASTAPI - PIPELINE DE VISAO EM MEMORIA (ZERO-DISK)
echo ========================================================
echo.
echo [1/2] Verificando dependencias Python...
python -m pip install -r backend\requirements.txt --quiet

echo [2/2] Iniciando Servidor FastAPI em http://localhost:8000...
echo - Visao em Memoria: io.BytesIO (Zero Disco)
echo - Despacho WhatsApp: +55 92 99146-3640
echo - OSINT Banco de Dados: SQLite (osint_alerts.db)
echo.

python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
pause
