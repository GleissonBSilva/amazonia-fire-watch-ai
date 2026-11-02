@echo off
setlocal
chcp 65001 >nul
title AMAZONIA FIRE-WATCH AI - FRONTEND REACT
cls

set "PROJ_DIR=%~dp0"
if "%PROJ_DIR:~-1%"=="\" set "PROJ_DIR=%PROJ_DIR:~0,-1%"
cd /d "%PROJ_DIR%"

echo ========================================================
echo   AMAZONIA FIRE-WATCH AI - CBMAM / CIOPS
echo   FRONTEND REACT + VITE + LEAFLET-DRAW (ANTI-403)
echo ========================================================
echo.

if not exist "node_modules" (
    echo Instalando dependencias do React...
    call npm install --legacy-peer-deps
)

echo Iniciando Vite Dev Server em http://localhost:3000...
call npm run dev
pause
