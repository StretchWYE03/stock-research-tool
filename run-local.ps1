# Starts the backend and frontend for local development.
# Usage:  powershell -ExecutionPolicy Bypass -File run-local.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "Starting backend..." -ForegroundColor Green
Push-Location "$root/backend"
$backend = Start-Process -FilePath ".venv\Scripts\python.exe" -ArgumentList "run.py" -WorkingDirectory "$root/backend" -WindowStyle Hidden -PassThru
Pop-Location

Write-Host "Starting frontend..." -ForegroundColor Green
Push-Location "$root/frontend"
$frontend = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory "$root/frontend" -WindowStyle Hidden -PassThru
Pop-Location

Write-Host ""
Write-Host "  API:      http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "  App:      http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend pid:  $($backend.Id)   Frontend pid: $($frontend.Id)" -ForegroundColor DarkGray
Write-Host "  Stop with:   Stop-Process -Id $($backend.Id), $($frontend.Id)" -ForegroundColor DarkGray
Write-Host ""
