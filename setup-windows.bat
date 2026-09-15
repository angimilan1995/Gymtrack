@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo   GymTrack Cloud - Setup Windows
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERRORE: Node.js non risulta installato.
  echo Installa Node.js LTS da https://nodejs.org/ e poi riapri questo file.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERRORE: npm non risulta disponibile.
  echo Reinstalla Node.js LTS includendo npm.
  pause
  exit /b 1
)

echo [1/5] Versioni...
node --version
npm --version

echo.
echo [2/5] Installazione dipendenze...
call npm install
if errorlevel 1 goto :fail

echo.
echo [3/5] Login Cloudflare...
call npx wrangler login
if errorlevel 1 goto :fail

echo.
echo [4/5] Database D1...
findstr /c:"d1_databases" wrangler.jsonc >nul 2>nul
if errorlevel 1 (
  echo Creo gymtrack-db e aggiungo automaticamente il binding DB...
  call npx wrangler d1 create gymtrack-db --jurisdiction eu --binding DB --update-config
  if errorlevel 1 goto :dbfail
) else (
  echo Binding D1 gia presente in wrangler.jsonc: salto la creazione.
)

echo.
echo Creo/aggiorno le tabelle...
call npx wrangler d1 execute DB --remote --file=./schema.sql
if errorlevel 1 goto :fail

echo.
echo [5/5] Pubblicazione...
call npx wrangler deploy
if errorlevel 1 goto :fail

echo.
echo ========================================
echo COMPLETATO. Cerca sopra l'indirizzo https://...workers.dev
echo ========================================
pause
exit /b 0

:dbfail
echo.
echo La creazione del database non e riuscita.
echo Se gymtrack-db esiste gia, esegui nel terminale:
echo   npx wrangler d1 list
echo e incollami qui il risultato.
pause
exit /b 1

:fail
echo.
echo Si e verificato un errore. Copia le ultime righe del terminale e inviale in chat.
pause
exit /b 1
