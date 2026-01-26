<#
.SYNOPSIS
    Build Nexus Platform (Frontend + Backend) in RELEASE mode.
    Output: Single EXE WITHOUT Console Window (Windowed).
#>

$ErrorActionPreference = "Stop"

# Define Python Environment
$PYTHON_ENV = "$env:USERPROFILE\.venvs\negentropy\Scripts\python.exe"
if (Test-Path $PYTHON_ENV) {
    $PYTHON_EXE = $PYTHON_ENV
    Write-Host "Using Standard Python Environment: $PYTHON_EXE" -ForegroundColor Green
} else {
    $PYTHON_EXE = "python"
    Write-Warning "Standard Python Environment not found. Falling back to system python."
}

# Go to Root
Set-Location "$PSScriptRoot/.."
$ROOT_DIR = Get-Location
$PLATFORM_DIR = "$ROOT_DIR/nexus-platform"

# 1. Build Frontend
Write-Host "`n[Nexus] Building Frontend..." -ForegroundColor Cyan
Set-Location "$PLATFORM_DIR/frontend"
if (Test-Path "node_modules") {
    npm run build
} else {
    npm install
    npm run build
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend Build Failed"
}

# 2. Build Backend (PyInstaller)
Write-Host "`n[Nexus] Building Backend (RELEASE)..." -ForegroundColor Cyan
Set-Location $PLATFORM_DIR

Write-Host "    -> Executing PyInstaller..." -ForegroundColor Gray
# Note: specific command for Release (Windowed/Noconsole)
& $PYTHON_EXE -m PyInstaller `
    --name "NexusPlatform" `
    --onefile `
    --noconsole `
    --clean `
    --add-data "dist;dist" `
    --add-data "backend;backend" `
    --add-data "config;config" `
    --hidden-import "engineio.async_drivers.threading" `
    --hidden-import "nexus_core" `
    --hidden-import "nexus_sdk" `
    run.py

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[Nexus] Build Success! ✅" -ForegroundColor Green
    Write-Host "    -> Output: $PLATFORM_DIR/dist/NexusPlatform.exe" -ForegroundColor Gray
} else {
    Write-Error "Backend Build Failed"
}
