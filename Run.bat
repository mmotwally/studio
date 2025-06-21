@echo off
ECHO =======================================
ECHO  Starting Cabinet Console Application
ECHO =======================================

ECHO.
ECHO Step 1: Cleaning up corrupted dependencies...
ECHO Clearing npm cache...
call npm cache clean --force

ECHO Removing node_modules directory...
if exist node_modules (
    rmdir /s /q node_modules
    ECHO node_modules directory removed.
) else (
    ECHO node_modules directory not found, skipping removal.
)

ECHO Removing package-lock.json...
if exist package-lock.json (
    del package-lock.json
    ECHO package-lock.json removed.
) else (
    ECHO package-lock.json not found, skipping removal.
)

ECHO.
ECHO Step 2: Installing fresh dependencies...
call npm install

ECHO.
ECHO Step 3: Initializing the database...
call npm run db:init

ECHO.
ECHO Step 4: Starting servers in separate windows...
ECHO.

START "Next.js Web App" cmd /k "npm run dev"
START "Genkit AI Services" cmd /k "npm run genkit:dev"

ECHO All servers are starting up in new command prompt windows.
ECHO Please wait a moment for them to become available.
ECHO The web application will be accessible at http://localhost:9002
ECHO You can close this window now.

pause