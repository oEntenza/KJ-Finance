@echo off
setlocal
cd /d "%~dp0"

title Instalador K&J Finance
color 0E

echo ==============================================
echo            INSTALADOR K^&J FINANCE
echo ==============================================
echo.
echo Este assistente vai preparar o sistema para uso.
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado neste computador.
  echo.
  echo Instale primeiro a versao LTS do Node.js em:
  echo https://nodejs.org/
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo NPM nao encontrado. Verifique a instalacao do Node.js.
  pause
  exit /b 1
)

echo [1/4] Verificando versoes...
node -v
npm -v
echo.

echo [2/4] Instalando dependencias do frontend...
call npm --prefix KJ_Front install
if errorlevel 1 (
  echo.
  echo Falha ao instalar as dependencias do frontend.
  pause
  exit /b 1
)

echo.
echo [3/4] Instalando dependencias do backend...
call npm --prefix KJ_Back install
if errorlevel 1 (
  echo.
  echo Falha ao instalar as dependencias do backend.
  pause
  exit /b 1
)

echo.
echo [4/4] Verificando configuracao do banco...
if not exist "KJ_Back\.env" (
  copy /Y "KJ_Back\.env.example" "KJ_Back\.env" >nul
  echo Arquivo .env criado em KJ_Back\.env
  echo.
  echo IMPORTANTE:
  echo Abra o arquivo KJ_Back\.env e cole sua DATABASE_URL do Neon.
  echo.
  start "" notepad "%~dp0KJ_Back\.env"
  echo Depois de salvar esse arquivo, execute "Iniciar KJ Finance.bat".
  echo.
  pause
  exit /b 0
)

echo Arquivo .env ja existe. Nenhuma alteracao foi feita nele.
echo.
echo Instalacao concluida com sucesso.
echo.
echo Proximo passo:
echo Clique em "Iniciar KJ Finance.bat" para abrir o sistema.
echo.
pause
exit /b 0