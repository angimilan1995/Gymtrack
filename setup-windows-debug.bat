@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo   GymTrack Cloud - Setup DEBUG
echo ========================================
echo Cartella: %CD%
echo.

echo [CONTROLLO] Node.js...
where node
if errorlevel 1 (
  echo.
  echo ERRORE: Node.js non trovato.
  echo Installa Node.js LTS, poi richiudi e riapri questa finestra.
  echo.
  goto :end
)
node --version

echo.
echo [CONTROLLO] npm...
where npm
if errorlevel 1 (
  echo.
  echo ERRORE: npm non trovato.
  echo Reinstalla Node.js LTS con npm incluso.
  echo.
  goto :end
)
call npm --version

echo.
echo [1/4] Installazione dipendenze...
call npm install
if errorlevel 1 goto :fail

echo.
echo [2/4] Login Cloudflare...
call npx wrangler login
if errorlevel 1 goto :fail

echo.
echo [3/4] Controllo database D1...
findstr /c:"d1_databases" wrangler.jsonc >nul 2>nul
if errorlevel 1 (
  echo Creo gymtrack-db e configuro il binding DB...
  call npx wrangler d1 create gymtrack-db --jurisdiction eu --binding DB --update-config
  if errorlevel 1 goto :dbfail
) else (
  echo Binding D1 gia presente in wrangler.jsonc.
)

echo.
echo Applico lo schema del database...
call npx wrangler d1 execute DB --remote --file=./schema.sql
if errorlevel 1 goto :fail

echo.
echo [4/4] Pubblicazione...
call npx wrangler deploy
if errorlevel 1 goto :fail

echo.
echo ========================================
echo COMPLETATO
echo Cerca sopra il link https://...workers.dev
echo ========================================
goto :end

:dbfail
echo.
echo ERRORE durante la creazione del database.
echo Esegui: npx wrangler d1 list
echo Poi inviami quello che appare.
goto :end

:fail
echo.
echo ========================================
echo SETUP INTERROTTO PER UN ERRORE
echo Copia qui in chat le ultime righe visibili.
echo ========================================

:end
echo.
echo La finestra restera aperta.
echo Puoi copiare il messaggio di errore e inviarmelo.
endlocal
