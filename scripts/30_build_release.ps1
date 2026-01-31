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
# paths: Explicitly include local source packages (nexus-core, nexus-sdk)
& $PYTHON_EXE -m PyInstaller `
    --name "NexusPlatform" `
    --onefile `
    --noconsole `
    --clean `
    --distpath "bin/release_temp" `
    --workpath "build/release" `
    --paths "$ROOT_DIR/nexus-core" `
    --paths "$ROOT_DIR/nexus-sdk/src" `
    --add-data "dist;dist" `
    --add-data "backend;backend" `
    --hidden-import "engineio.async_drivers.threading" `
    --hidden-import "nexus_core" `
    --hidden-import "nexus_sdk" `
    run.py

if ($LASTEXITCODE -eq 0) {
    # --- Distribution Packaging ---
    
    # 1. Get Version
    if (Test-Path "config/versions.json") {
        $verData = Get-Content "config/versions.json" -Raw | ConvertFrom-Json
        $VERSION = "v" + $verData.app
    } else {
        $VERSION = "v1.0.0"
    }

    $DIST_DIR = "$PLATFORM_DIR/bin/release/NexusPlatform_$VERSION"
    Write-Host "`n[Nexus] Packaging into: $DIST_DIR" -ForegroundColor Cyan

    # 2. Prepare Directory
    if (Test-Path $DIST_DIR) { Remove-Item -Recurse -Force $DIST_DIR }
    New-Item -ItemType Directory -Force -Path $DIST_DIR | Out-Null
    
    # 3. Move Executable
    Move-Item "$PLATFORM_DIR/bin/release_temp/NexusPlatform.exe" "$DIST_DIR/" -Force
    Remove-Item -Recurse -Force "$PLATFORM_DIR/bin/release_temp"

    # 4. Copy External Resources (Config is critical for editing, Tools for execution)
    Write-Host "    -> Copying Config, Tools, Data..." -ForegroundColor Gray
    
    # Config (Externalize for user editing)
    if (Test-Path "config") { Copy-Item -Recurse "config" "$DIST_DIR/" }
    
    # Tools (External binaries like iperf) - Located in Project Root usually, or nexus-platform/tools?
    # Checking both locations
    if (Test-Path "$ROOT_DIR/tools") { 
        Copy-Item -Recurse "$ROOT_DIR/tools" "$DIST_DIR/" 
    } elseif (Test-Path "tools") {
        Copy-Item -Recurse "tools" "$DIST_DIR/"
    }

    # Data (Maps etc)
    if (Test-Path "data") { Copy-Item -Recurse "data" "$DIST_DIR/" }
    
    # Logs (Empty)
    if (-not (Test-Path "$DIST_DIR/logs")) { New-Item -ItemType Directory -Path "$DIST_DIR/logs" | Out-Null }

    Write-Host "`n[Nexus] Release Build Success! ✅" -ForegroundColor Green
    Write-Host "    -> Output: $DIST_DIR" -ForegroundColor Gray
    Write-Host "    -> Exe: $DIST_DIR/NexusPlatform.exe" -ForegroundColor Gray
} else {
    Write-Error "Backend Build Failed"
}
