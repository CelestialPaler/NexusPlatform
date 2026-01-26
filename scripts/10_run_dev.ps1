<#
.SYNOPSIS
    Run Nexus Platform in Development Mode.
    No compilation, direct python execution.
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

# Go to Platform Dir
Set-Location "$PSScriptRoot/../nexus-platform"

Write-Host "`n[Nexus] Starting Platform (Dev Mode)..." -ForegroundColor Cyan
Write-Host "    -> Target: run.py" -ForegroundColor Gray

# Check if frontend is built
if (-not (Test-Path "dist/index.html")) {
    Write-Warning "Frontend build (dist/) not found. UI might be blank."
    Write-Warning "Please run 'npm run build' in nexus-platform/frontend first."
}

# Run
& $PYTHON_EXE run.py
