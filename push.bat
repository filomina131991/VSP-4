@echo off
echo Adding all changes...
git add .
set /p msg="Enter commit message: "
if "%msg%"=="" set msg="Update project"
echo Committing changes...
git commit -m "%msg%"
echo Pushing to GitHub...
git push origin main
echo Done!
pause
