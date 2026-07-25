@echo off
setlocal
chcp 65001 >nul

echo ==========================================
echo     OpenHostMC - Avvio Completo
echo ==========================================
echo.

cd /d "%~dp0"
echo [INFO] Sono nella cartella: %CD%
echo.

REM 0. Verifica prerequisiti
echo [0/6] Verifica prerequisiti...
where node >nul 2>nul
if errorlevel 1 (
    echo [ERRORE] Node.js non trovato nel PATH.
    echo Installa Node.js 20 LTS e riapri il terminale.
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERRORE] npm non trovato nel PATH.
    echo Reinstalla Node.js includendo npm e riapri il terminale.
    pause
    exit /b 1
)

where docker >nul 2>nul
if errorlevel 1 (
    echo [ERRORE] Docker non trovato nel PATH.
    echo Installa Docker Desktop e verifica che sia avviato.
    pause
    exit /b 1
)
echo [OK] Prerequisiti trovati!
echo.

REM 1. Installa dipendenze workspace se mancano
echo [1/6] Verifica dipendenze npm...
if not exist "node_modules" (
    echo [INFO] Dipendenze non trovate. Avvio npm install...
    call npm.cmd install
    if errorlevel 1 (
        echo [ERRORE] Installazione dipendenze fallita!
        pause
        exit /b 1
    )
) else (
    echo [OK] Dipendenze gia presenti.
)
echo.

REM 2. Avvia i servizi Docker
echo [2/6] Avvio servizi Docker...
docker compose -f docker-compose.yml up -d
if errorlevel 1 (
    echo [ERRORE] Docker non funziona!
    echo Verifica che Docker Desktop sia avviato.
    pause
    exit /b 1
)
echo [OK] Docker avviato!
echo.

REM 3. Attendi
echo [3/6] Attesa 10 secondi per PostgreSQL...
timeout /t 10 /nobreak >nul
echo [OK] Pronto!
echo.

REM 4. Migrazioni
echo [4/6] Esecuzione migrazioni database...
call npm.cmd exec prisma -- db push --schema=packages/database/prisma/schema.prisma --accept-data-loss
if errorlevel 1 (
    echo [ERRORE] Migrazioni fallite!
    pause
    exit /b 1
)
echo [OK] Database aggiornato!
echo.

REM 5. Orchestrator
echo [5/6] Avvio Orchestrator...
start "Orchestrator" powershell.exe -NoExit -Command "Set-Location '%~dp0apps\orchestrator-service'; npm.cmd run start:dev"
echo [OK] Orchestrator avviato!
echo.

REM 6. Frontend
echo [6/6] Avvio Frontend...
start "Frontend" powershell.exe -NoExit -Command "Set-Location '%~dp0apps\frontend'; npm.cmd run dev"
echo [OK] Frontend avviato!
echo.

echo ==========================================
echo   TUTTO PRONTO!
echo ==========================================
echo.
echo Servizi:
echo   - Orchestrator API: http://localhost:3005
echo   - Frontend: http://localhost:3000
echo.
pause
