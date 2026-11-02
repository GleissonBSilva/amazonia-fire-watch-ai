@echo off
setlocal
chcp 65001 >nul
title AMAZONIA FIRE-WATCH AI - ORQUESTRADOR FULL-STACK
cls

set "PROJ_DIR=%~dp0"
if "%PROJ_DIR:~-1%"=="\" set "PROJ_DIR=%PROJ_DIR:~0,-1%"
cd /d "%PROJ_DIR%"

set "PYTHON_EXE="
if exist "%LOCALAPPDATA%\Programs\Python\Python314\python.exe" (
    set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
) else if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
) else (
    py -V >nul 2>&1 && (
        set "PYTHON_EXE=py"
    ) || (
        set "PYTHON_EXE=python"
    )
)

echo ========================================================
echo   AMAZONIA FIRE-WATCH AI - CBMAM / CIOPS
echo   ORQUESTRADOR FULL-STACK COMPLETO (ZERO-DISK + REACT + FASTAPI)
echo ========================================================
echo.

echo [1/3] Verificando dependencias essenciais do backend...
"%PYTHON_EXE%" -c "import fastapi, uvicorn, shapely" >nul 2>&1
if %errorlevel% neq 0 (
    echo Instalando dependencias essenciais do backend...
    "%PYTHON_EXE%" -m pip install fastapi uvicorn httpx pydantic python-multipart gTTS shapely
)

echo Iniciando Backend FastAPI (Visao em Memoria e WhatsApp)...
start "AMAZONIA-BACKEND-8000" cmd /k "cd /d "%PROJ_DIR%" && "%PYTHON_EXE%" -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/3] Aguardando inicializacao dos servicos...
timeout /t 2 /nobreak >nul

echo [3/3] Iniciando Frontend React / Vite (Porta 3000)...
start "AMAZONIA-FRONTEND-3000" cmd /k "cd /d "%PROJ_DIR%" && npm run dev"

echo.
echo ========================================================
echo   ECOSSISTEMA INICIADO COM SUCESSO!
echo   - Backend API: http://localhost:8000
echo   - Documentacao Swagger: http://localhost:8000/docs
echo   - Stream em Memoria: http://localhost:8000/api/stream/live.mjpg
echo   - Frontend React: http://localhost:3000
echo   - WhatsApp Destino: +55 92 99374-6740
echo ========================================================
echo.
pause
