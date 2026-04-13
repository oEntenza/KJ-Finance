@echo off
setlocal
cd /d "%~dp0"

echo ==============================================
echo           Iniciando K^&J Finance
echo ==============================================

echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale o Node.js antes de iniciar o sistema.
  pause
  exit /b 1
)

if not exist "KJ_Front\node_modules" (
  echo Dependencias do frontend nao encontradas. Execute npm install em KJ_Front.
  pause
  exit /b 1
)

if not exist "KJ_Back\node_modules" (
  echo Dependencias do backend nao encontradas. Execute npm install em KJ_Back.
  pause
  exit /b 1
)

echo Encerrando processo antigo na porta 3333, se existir...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3333 ^| findstr LISTENING') do (
  taskkill /PID %%a /F >nul 2>nul
)

echo Gerando build do frontend...
call npm --prefix KJ_Front run build
if errorlevel 1 (
  echo Falha ao gerar o build do frontend.
  pause
  exit /b 1
)

echo Iniciando servidor...
start "KJ Finance Server" /min powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%~dp0KJ_Back'; npm run start"

echo Aguardando o servidor responder...
powershell -NoProfile -Command "for($i=0;$i -lt 40;$i++){ try { Invoke-WebRequest -UseBasicParsing http://localhost:3333/health | Out-Null; exit 0 } catch { Start-Sleep -Seconds 1 } }; exit 1"
if errorlevel 1 (
  echo O servidor nao respondeu a tempo.
  echo Verifique o .env do backend e se o banco esta acessivel.
  pause
  exit /b 1
)

echo Abrindo navegador...
powershell -NoProfile -Command "Start-Process 'http://localhost:3333'"
exit /b 0
