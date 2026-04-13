@echo off
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3333 ^| findstr LISTENING') do (
  taskkill /PID %%a /F >nul 2>nul
)
echo K^&J Finance encerrado.
pause
