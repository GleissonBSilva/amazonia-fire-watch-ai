@echo off
setlocal
chcp 65001 >nul
title AMAZONIA FIRE-WATCH AI - FRONTEND REACT
cls

echo ========================================================
echo   AMAZONIA FIRE-WATCH AI - CBMAM / CIOPS
echo   FRONTEND REACT + VITE + LEAFLET-DRAW (ANTI-403)
echo ========================================================
echo.

cd frontend

if not exist "node_modules\" (
    echo Instalando dependencias do React (npm install --legacy-peer-deps)...
    call npm install --legacy-peer-deps
)

echo Iniciando Vite Dev Server em http://localhost:3000...
call npm run dev
pause
