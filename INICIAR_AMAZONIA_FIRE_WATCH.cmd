@echo off
setlocal
title AMAZONIA FIRE-WATCH AI - CBMAM / CIOPS
chcp 65001 >nul
cls

echo ========================================================
echo   AMAZONIA FIRE-WATCH AI - CBMAM / CIOPS
echo   ORQUESTRADOR TÁTICO FULL-STACK (LOCAL)
echo ========================================================
echo.

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

echo [1/3] Verificando Backend FastAPI (Porta 8000)...
netstat -ano | findstr :8000 >nul
if %errorlevel% neq 0 (
    echo Iniciando Backend FastAPI...
    start "AMAZONIA-BACKEND-8000" cmd /k "cd /d ""%~dp0"" && ""%PYTHON_EXE%"" -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"
    timeout /t 2 /nobreak >nul
) else (
    echo Backend ja em execucao.
)

echo [2/3] Verificando Frontend Vite (Porta 3000)...
netstat -ano | findstr :3000 >nul
if %errorlevel% neq 0 (
    echo Iniciando Frontend Vite...
    start "AMAZONIA-FRONTEND-3000" cmd /k "npm run dev"
    timeout /t 3 /nobreak >nul
) else (
    echo Frontend ja em execucao.
)

echo [3/3] Abrindo Interface Tática em http://localhost:3000...
set "APP_URL=http://localhost:3000"

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="%APP_URL%" --window-size=1440,920
    exit /b
)

if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="%APP_URL%" --window-size=1440,920
    exit /b
)

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="%APP_URL%" --window-size=1440,920
    exit /b
)

if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app="%APP_URL%" --window-size=1440,920
    exit /b
)

start "" "%APP_URL%"
exit /b
