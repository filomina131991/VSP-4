@echo off
title Vijayasree Palakkad App Launcher
REM One-click Windows launcher for Vijayasree Palakkad App
cd /d "%~dp0"

echo Stopping any existing processes on port 5000 and 5173...
call stop-project.bat nocallexit

if not exist node_modules (
  echo Installing project dependencies...
  call npm install
)

echo Starting Vijayasree Palakkad Backend and Frontend...
echo Launching application in browser at http://127.0.0.1:5173 ...
start http://127.0.0.1:5173

call npm run dev:all
pause
