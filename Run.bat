@echo off
ECHO =======================================
ECHO  Starting Cabinet Console Application
ECHO =======================================

ECHO.
ECHO Step 1: Installing dependencies...
call npm install

ECHO.
ECHO Step 2: Initializing the database...
call npm run db:init

ECHO.
ECHO Step 3: Starting servers in separate windows...
ECHO.

START "Next.js Web App" cmd /k "npm run dev"
START "Genkit AI Services" cmd /k "npm run genkit:dev"

ECHO All servers are starting up in new command prompt windows.
ECHO Please wait a moment for them to become available.
ECHO The web application will be accessible at http://localhost:9002
ECHO You can close this window now.

pause
