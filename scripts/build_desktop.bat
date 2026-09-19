@echo off
REM Build the Ticker desktop app: frontend bundle + Ticker.exe.
REM Produces dist\Ticker\Ticker.exe at the repo root.
setlocal
cd /d "%~dp0.."

if not exist "backend\.venv\Scripts\python.exe" (
  echo backend\.venv not found. Create it first:
  echo   python -m venv backend\.venv
  echo   backend\.venv\Scripts\pip install -r backend\requirements.txt
  exit /b 1
)

echo == 1/3 Building frontend ==
pushd frontend
call npm run build
if errorlevel 1 exit /b 1
popd

echo == 2/3 Checking desktop build deps ==
call backend\.venv\Scripts\python.exe -c "import webview, PyInstaller" 2>nul
if errorlevel 1 (
  echo Installing pywebview and pyinstaller...
  call backend\.venv\Scripts\python.exe -m pip install -q pywebview pyinstaller
  if errorlevel 1 exit /b 1
)

echo == 3/4 Creating application icon ==
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\make_icon.ps1 -OutputPath "scripts\ticker.ico"
if errorlevel 1 exit /b 1

echo == 4/4 Packaging Ticker.exe ==
call backend\.venv\Scripts\pyinstaller.exe --noconfirm --onedir --windowed --name Ticker ^
  --icon "scripts\ticker.ico" ^
  --paths backend ^
  --add-data "frontend/dist;frontend/dist" ^
  --collect-all webview ^
  --collect-all uvicorn ^
  --collect-all fastapi ^
  --collect-all anyio ^
  backend\desktop.py
if errorlevel 1 exit /b 1

echo.
echo Done. Run: dist\Ticker\Ticker.exe
powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('Ticker build complete!`n`nNavigate to:`n%CD%\dist\Ticker\Ticker.exe','Ticker build complete',[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Information) | Out-Null"
