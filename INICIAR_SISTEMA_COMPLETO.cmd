@echo off
setlocal
chcp 65001 >nul
title AMAZONIA FIRE-WATCH AI - ORQUESTRADOR FULL-STACK
cls

echo ========================================================
echo   AMAZONIA FIRE-WATCH AI - CBMAM / CIOPS
echo   ORQUESTRADOR FULL-STACK COMPLETO (ZERO-DISK + REACT + FASTAPI)
echo ========================================================
echo.

echo [1/3] Iniciando Backend FastAPI (Visao em Memoria e WhatsApp)...
start "AMAZONIA-BACKEND-8000" cmd /k "python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/3] Aguardando inicializacao dos servicos...
timeout /t 2 /nobreak >nul

echo [3/3] Iniciando Frontend React / Vite (Porta 3000)...
start "AMAZONIA-FRONTEND-3000" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo   ECOSSISTEMA INICIADO COM SUCESSO!
echo   - Backend API: http://localhost:8000
echo   - Documentacao Swagger: http://localhost:8000/docs
echo   - Stream em Memoria: http://localhost:8000/api/stream/live.mjpg
echo   - Frontend React: http://localhost:3000
echo   - WhatsApp Destino: +55 92 99146-3640
echo ========================================================
echo.
pause
