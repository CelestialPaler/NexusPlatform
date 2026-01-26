# ==========================================
# Nexus Network Analysis Platform
# Test Launch Script (Auto-Close)
# ==========================================

$ErrorActionPreference = "Stop"

# Define Python Environment (Standard 15: Super Venv)
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

Write-Host "`n[Nexus] Testing Startup Logic..." -ForegroundColor Cyan

# 1. Kill any existing instances
$existing = Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*Network Analysis Platform*" }
if ($existing) {
    Write-Host "    -> Killing existing instances..." -ForegroundColor Yellow
    $existing | Stop-Process -Force
}

# 2. Launch in background
Write-Host "    -> Launching Application..." -ForegroundColor Gray
$process = Start-Process $PYTHON_EXE -ArgumentList "run.py" -PassThru -WindowStyle Minimized

# 3. Wait 
Write-Host "    -> Waiting 10 seconds for GUI..." -ForegroundColor Gray
Start-Sleep -Seconds 10

# 4. Check if still running
if (-not $process.HasExited) {
    Write-Host "    -> [SUCCESS] Process is running. Stopping now." -ForegroundColor Green
    Stop-Process -Id $process.Id -Force
} else {
    Write-Host "    -> [FAILURE] Process crashed on startup." -ForegroundColor Red
    exit 1
}
