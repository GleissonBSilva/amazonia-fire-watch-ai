@echo off
setlocal
chcp 65001 >nul
title AMAZONIA FIRE-WATCH AI - BACKEND FASTAPI
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
echo   BACKEND FASTAPI - PIPELINE DE VISAO EM MEMORIA (ZERO-DISK)
echo ========================================================
echo.
echo [1/2] Verificando dependencias essenciais do FastAPI...
"%PYTHON_EXE%" -c "import fastapi, uvicorn, shapely" >nul 2>&1
if %errorlevel% neq 0 (
    echo Instalando dependencias essenciais do servidor...
    "%PYTHON_EXE%" -m pip install fastapi uvicorn httpx pydantic python-multipart gTTS shapely
)

echo.
echo [2/2] Iniciando Servidor FastAPI em http://localhost:8000...
echo - Visao em Memoria: io.BytesIO (Zero Disco)
echo - Despacho WhatsApp: +55 92 99374-6740
echo - OSINT Banco de Dados: SQLite (osint_alerts.db)
echo.

"%PYTHON_EXE%" -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
pause
