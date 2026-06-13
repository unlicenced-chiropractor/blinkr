# Deploy Blinkr to Cloudflare (same steps as GitHub Actions)
param(
    [string]$PublicUrl = "https://blinkr.sortedsh.workers.dev"
)

$ErrorActionPreference = "Stop"
$WsUrl = $PublicUrl.Replace('https://', 'wss://').Replace('http://', 'ws://').TrimEnd('/') + '/ws'

Write-Host "Deploying Blinkr -> $PublicUrl"

Push-Location "$PSScriptRoot\.."

$env:VITE_API_URL = $PublicUrl
$env:VITE_WS_URL = $WsUrl
npm run build:production -w @blinkr/web

Push-Location workers\api
npx wrangler d1 migrations apply blinkr-db --remote
npx wrangler deploy

Pop-Location
Pop-Location

Write-Host "Done: $PublicUrl"
