# Start API + web dev servers for two-client testing (browser + incognito, or browser + desktop).
# Usage: .\scripts\test-two-clients.ps1

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host "Starting Blinkr API on http://127.0.0.1:8787 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\workers\api'; npm run dev"

Start-Sleep -Seconds 3

Write-Host "Starting Blinkr web on http://localhost:5173 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; npm run dev"

Write-Host ""
Write-Host "Two-client test:" -ForegroundColor Green
Write-Host "  1. Normal browser  -> http://localhost:5173  (register user A)"
Write-Host "  2. Incognito/other -> http://localhost:5173  (register user B)"
Write-Host "  3. User A: Friends -> search for user B -> Add"
Write-Host "  4. User B: Friends -> accept request"
Write-Host ""
Write-Host "Or launch the Windows .exe twice after build:desktop (API must be running)."
