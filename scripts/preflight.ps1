# AssetVerse — Solana Devnet Preflight Runner for Windows PowerShell
Write-Host "Running AssetVerse Preflight Inspection..." -ForegroundColor Cyan
node (Join-Path $PSScriptRoot "preflight.js")
$exitCode = $LASTEXITCODE
if ($exitCode -eq 0) {
    Write-Host "`nPreflight Completed Successfully!" -ForegroundColor Green
} elseif ($exitCode -eq 2) {
    Write-Host "`nPreflight Verified: System ready, awaiting Devnet wallet funding." -ForegroundColor Yellow
} else {
    Write-Host "`nPreflight Failed with Errors." -ForegroundColor Red
}
exit $exitCode
