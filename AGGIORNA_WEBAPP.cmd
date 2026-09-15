@echo off
setlocal
cd /d "%~dp0"
title GymTrack - Aggiornamento Web App

echo ========================================
echo   GYMTRACK - AGGIORNAMENTO WEB APP
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERRORE: Node.js non e' installato o non e' nel PATH.
  echo Installa Node.js LTS e riprova.
  pause
  exit /b 1
)

if not exist node_modules\wrangler (
  echo Installazione dipendenze...
  call npm.cmd install
  if errorlevel 1 goto :errore
)

echo.
echo Pubblicazione su Cloudflare...
call npx.cmd wrangler deploy
if errorlevel 1 goto :errore

echo.
echo ========================================
echo AGGIORNAMENTO COMPLETATO
 echo Apri l'indirizzo workers.dev mostrato qui sopra.
echo ========================================
pause
exit /b 0

:errore
echo.
echo ========================================
echo AGGIORNAMENTO INTERROTTO PER UN ERRORE
 echo Copia le ultime righe e inviale in chat.
echo ========================================
pause
exit /b 1
