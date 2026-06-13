# One-time: copy production Worker secrets to the beta Worker (same values).
# Run from repo root after the beta worker exists (first deploy-beta or wrangler deploy --env beta).

$ErrorActionPreference = "Stop"

Write-Host "Set the same secrets on blinkr-beta as production." -ForegroundColor Cyan
Write-Host "Use the identical values you set for the main blinkr worker."
Write-Host ""

Push-Location "$PSScriptRoot\..\workers\api"

$secrets = @('JWT_SECRET', 'B2_APPLICATION_KEY_ID', 'B2_APPLICATION_KEY')
foreach ($name in $secrets) {
    Write-Host "Setting $name on beta..." -ForegroundColor Yellow
    npx wrangler secret put $name --env beta
}

Pop-Location

Write-Host ""
Write-Host "Done. Beta auth and media will use the same backend credentials as production."
