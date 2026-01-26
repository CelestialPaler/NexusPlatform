# ==========================================
# Nexus Network Analysis Platform
# Run Script (PowerShell Edition)
# ==========================================

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

# Ensure we are in the project root directory
Set-Location "$PSScriptRoot/.."

# Launch Application
Write-Host "Launching Application..." -ForegroundColor Cyan
& $PYTHON_EXE run.py
