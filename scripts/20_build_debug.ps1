<#
.SYNOPSIS
    Build Nexus Platform (Frontend + Backend) in DEBUG mode.
    Output: Single EXE with Console Window enabled.
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
$OUTPUT_DIR = "$ROOT_DIR/artifacts/windows/debug/NexusPlatform_Debug"
$OUTPUT_EXE = "$OUTPUT_DIR/NexusPlatform_Debug.exe"

Write-Host "`n[Nexus] Building windows-debug/full via unified build system..." -ForegroundColor Cyan
& $PYTHON_EXE "$ROOT_DIR/build-system/build.py" `
    --build-profile windows-debug `
    --feature-profile full `
    --execute

if ($LASTEXITCODE -ne 0) {
    Write-Error "Unified Build Failed"
}

Write-Host "`n[Nexus] Build Success! ✅" -ForegroundColor Green
Write-Host "    -> Artifact: $OUTPUT_EXE" -ForegroundColor Gray
