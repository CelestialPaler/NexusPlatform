<#
.SYNOPSIS
    Build Nexus Platform in RELEASE mode via the unified profile-driven build system.
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

Set-Location "$PSScriptRoot/.."
$ROOT_DIR = Get-Location
$PLATFORM_DIR = "$ROOT_DIR/nexus-platform"

try {
    $jsonContent = Get-Content "$PLATFORM_DIR/config/versions.json" -Raw
    if ($jsonContent -match '"app":\s*"([^"]+)"') {
        $VERSION = $matches[1]
    }
    else {
        throw "Version not found"
    }
}
catch {
    Write-Warning "Could not read version from nexus-platform/config/versions.json. Defaulting to 0.0.0"
    $VERSION = "0.0.0"
}

$OUTPUT_DIR = "$ROOT_DIR/artifacts/windows/release/NexusPlatform_v$VERSION"
$OUTPUT_EXE = "$OUTPUT_DIR/NexusPlatform.exe"

Write-Host "`n[Nexus] Building windows-release/full via unified build system..." -ForegroundColor Cyan
& $PYTHON_EXE "$ROOT_DIR/build-system/build.py" `
    --build-profile windows-release `
    --feature-profile full `
    --execute

if ($LASTEXITCODE -ne 0) {
    Write-Error "Unified Build Failed"
}

Write-Host "`n[Nexus] Release Build Success! ✅" -ForegroundColor Green
Write-Host "    -> Artifact: $OUTPUT_EXE" -ForegroundColor Gray
