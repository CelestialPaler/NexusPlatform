<#
.SYNOPSIS
    Setup the development environment for Nexus Platform.
    Installs nexus-sdk, nexus-core, and platform dependencies in editable mode.
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

function Install-Package {
    param([string]$Path, [string]$Name)
    Write-Host "`n[Nexus] Installing $Name..." -ForegroundColor Cyan
    if (Test-Path $Path) {
        & $PYTHON_EXE -m pip install -e $Path
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    -> [OK] $Name Installed" -ForegroundColor Green
        } else {
            Write-Host "    -> [ERROR] Failed to install $Name" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "    -> [ERROR] Path not found: $Path" -ForegroundColor Red
    }
}

# 1. Install SDK
Install-Package "nexus-sdk" "Nexus SDK"

# 2. Install Core
Install-Package "nexus-core" "Nexus Core"

# 3. Install Platform Deps
Write-Host "`n[Nexus] Installing Platform Dependencies..." -ForegroundColor Cyan
$PLATFORM_REQ = "nexus-platform/requirements.txt"
if (Test-Path $PLATFORM_REQ) {
    & $PYTHON_EXE -m pip install -r $PLATFORM_REQ
    Write-Host "    -> [OK] Dependencies Installed" -ForegroundColor Green
} else {
    Write-Host "    -> [WARNING] requirements.txt not found in nexus-platform" -ForegroundColor Yellow
}

Write-Host "`n[Nexus] Development Environment Setup Complete! 🚀" -ForegroundColor Green
