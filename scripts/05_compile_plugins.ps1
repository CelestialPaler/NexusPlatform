<#
.SYNOPSIS
    Compile Plugins only (nexus-core, nexus-sdk).
    Actually creates wheel distributions for them.
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

# Install 'build' if not present
& $PYTHON_EXE -m pip install build | Out-Null

function Build-Wheel {
    param([string]$Path, [string]$Name)
    Write-Host "`n[Nexus] Building Wheel for $Name..." -ForegroundColor Cyan
    Set-Location $Path
    & $PYTHON_EXE -m build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    -> [OK] Wheel built in $Path/dist" -ForegroundColor Green
    } else {
        Write-Error "Build Failed for $Name"
    }
    Set-Location "$PSScriptRoot/.."
}

Build-Wheel "nexus-sdk" "Nexus SDK"
Build-Wheel "nexus-core" "Nexus Core"

Write-Host "`n[Nexus] Plugin Compilation Complete! 📦" -ForegroundColor Green
