# Deploy Blinkr beta worker (same D1/B2 as production, separate URL)
param(
    [string]$PublicUrl = "https://blinkr-beta.sortedsh.workers.dev"
)

$ErrorActionPreference = "Stop"
$WsUrl = $PublicUrl.Replace('https://', 'wss://').Replace('http://', 'ws://').TrimEnd('/') + '/ws'

Write-Host "Deploying Blinkr beta -> $PublicUrl"

Push-Location "$PSScriptRoot\.."

$env:VITE_API_URL = $PublicUrl
$env:VITE_WS_URL = $WsUrl
npm run build:production -w @blinkr/web

Push-Location workers\api
npx wrangler d1 migrations apply blinkr-db --remote --env beta
npx wrangler deploy --env beta

Pop-Location
Pop-Location

Write-Host "Done: $PublicUrl"
