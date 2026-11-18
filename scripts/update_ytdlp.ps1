# Sonora - yt-dlp Updater Script
# Upgrades yt-dlp inside the server virtual environment to the latest release
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$serverDir = Join-Path $repoRoot "apps\server"
$venvPy = Join-Path $serverDir ".venv\Scripts\python.exe"

if (-not (Test-Path $venvPy)) {
    # Fallback to posix venv if running under bash or cross-platform
    $venvPy = Join-Path $serverDir ".venv/bin/python"
}

if (-not (Test-Path $venvPy)) {
    Write-Error "Could not find Python virtual environment at $serverDir\.venv. Please create one first."
    exit 1
}

Write-Host "==> Checking current yt-dlp version..." -ForegroundColor Cyan
& $venvPy -m yt_dlp --version

Write-Host "`n==> Upgrading yt-dlp via pip..." -ForegroundColor Cyan
& $venvPy -m pip install --upgrade yt-dlp

Write-Host "`n==> Updated yt-dlp version:" -ForegroundColor Green
& $venvPy -m yt_dlp --version

Write-Host "`n[SUCCESS] yt-dlp updated successfully! If the Sonora backend is running, please restart it to load the updated extractor rules." -ForegroundColor Green
