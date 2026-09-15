@echo off
cd /d "%~dp0"
echo ========================================
echo   GymTrack Cloud - Avvio guidato
echo ========================================
echo.
echo Questa finestra restera aperta anche in caso di errore.
echo.
cmd /k call setup-windows-debug.bat
