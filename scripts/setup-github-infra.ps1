# One-time GitHub + Cloudflare infra setup for Blinkr CI/CD
param(
    [string]$PublicUrl = "https://blinkr.sortedsh.workers.dev",
    [string]$CloudflareAccountId = "741d3f7a8265d92c78201e45be3862a5"
)

$ErrorActionPreference = "Stop"

Write-Host "Setting GitHub repository variables..."
gh variable set BLINKR_PUBLIC_URL --body $PublicUrl

Write-Host "Setting GitHub secret CLOUDFLARE_ACCOUNT_ID..."
gh secret set CLOUDFLARE_ACCOUNT_ID --body $CloudflareAccountId

if (-not (gh secret list | Select-String "CLOUDFLARE_API_TOKEN")) {
    Write-Host ""
    Write-Host "CLOUDFLARE_API_TOKEN is not set yet." -ForegroundColor Yellow
    Write-Host "Create one at: https://dash.cloudflare.com/profile/api-tokens"
    Write-Host "Use template: Edit Cloudflare Workers (or custom with:"
    Write-Host "  Account / Workers Scripts / Edit"
    Write-Host "  Account / D1 / Edit"
    Write-Host "  Account / Workers R2 Storage / Edit (optional)"
    Write-Host ""
    Write-Host "Then run:"
    Write-Host '  gh secret set CLOUDFLARE_API_TOKEN'
    Write-Host ""
}

Write-Host "Done. Push to main to trigger deploy, or run: gh workflow run Deploy"
