@echo off
REM Stop any local project servers running on typical ports.
cd /d "%~dp0"
echo Stopping local project servers...

REM Kill all node processes first to ensure background watchers (like tsx) are terminated.
REM This prevents the watcher from immediately restarting the server on port 5000.
echo Terminating Node.js processes...
taskkill /F /IM node.exe >nul 2>&1

for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":5000" ^| findstr LISTENING') do (
  echo Killing process on port 5000: PID %%A
  taskkill /PID %%A /F >nul 2>&1
)
for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":5173" ^| findstr LISTENING') do (
  echo Killing process on port 5173: PID %%A
  taskkill /PID %%A /F >nul 2>&1
)
echo Stop complete.
if "%~1"=="nocallexit" goto :eof
exit
