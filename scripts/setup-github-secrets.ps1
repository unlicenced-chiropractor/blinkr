# Add Worker secrets to GitHub so CI can sync them to production and beta.
# Use the same values already on the blinkr Cloudflare Worker.

$ErrorActionPreference = "Stop"

Write-Host "Add these GitHub secrets (same values as production Worker):" -ForegroundColor Cyan
Write-Host ""

$names = @('JWT_SECRET', 'B2_APPLICATION_KEY_ID', 'B2_APPLICATION_KEY')
foreach ($name in $names) {
    if (gh secret list | Select-String "^$name`t") {
        Write-Host "  [ok] $name" -ForegroundColor Green
    } else {
        Write-Host "  [ ] $name — run: gh secret set $name" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "After setting all three, push to beta/main or run:"
Write-Host "  gh workflow run deploy-beta.yml"
Write-Host ""
Write-Host "Or set secrets on beta Worker only (local):"
Write-Host "  .\scripts\setup-beta-secrets.ps1"
