@echo off
title AMAZONIA FIRE-WATCH AI - CBMAM / CIOPS
chcp 65001 >nul
cls

echo ========================================================
echo   AMAZONIA FIRE-WATCH AI - CBMAM / CIOPS
echo   MODULO DE ELASTICIDADE TERMICA & TAXA DE ALASTRATAMENTO
echo ========================================================
echo.
echo Iniciando aplicacao tatica...

set "HTML_PATH=%~dp0index.html"

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="%HTML_PATH%" --window-size=1440,920
    exit /b
)

if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="%HTML_PATH%" --window-size=1440,920
    exit /b
)

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="%HTML_PATH%" --window-size=1440,920
    exit /b
)

if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app="%HTML_PATH%" --window-size=1440,920
    exit /b
)

start "" "%HTML_PATH%"
exit /b
