Write-Host "Starting RELEASE Build Process for Nexus Platform..." -ForegroundColor Cyan

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

# Ensure we are in the project root directory (parent of scripts/)
Set-Location "$PSScriptRoot/.."

# Read Version from config/versions.json
try {
    if (Test-Path "config\versions.json") {
        $jsonContent = Get-Content "config\versions.json" -Raw
        # Simple regex parse to avoid ConvertFrom-Json encoding issues if any
        if ($jsonContent -match '"app":\s*"([^"]+)"') {
            $VERSION = "v" + $matches[1]
            Write-Host "Detected App Version: $VERSION" -ForegroundColor Cyan
        }
        else {
            throw "Version not found"
        }
    }
    else {
        throw "Config file not found"
    }
}
catch {
    Write-Warning "Could not read version from config/versions.json. Defaulting to v1.0.0"
    $VERSION = "v1.0.0"
}

# Output to bin/release/
$OUTPUT_DIR = "bin\release\NexusPlatform_$VERSION"

# Check if dist (frontend build) exists, if not, build it
if (-not (Test-Path "dist")) {
    Write-Warning "'dist' folder not found. Triggering Frontend Build..."
    
    Push-Location frontend
    try {
        if (-not (Test-Path "node_modules")) {
            Write-Host "Installing NPM packages..." -ForegroundColor Gray
            npm install
        }
        Write-Host "Building React Frontend..." -ForegroundColor Gray
        npm run build
        
        if ($LASTEXITCODE -ne 0) {
            throw "Frontend build failed"
        }
    }
    catch {
        Write-Error "Frontend Build Failed: $_"
        Pop-Location
        exit 1
    }
    Pop-Location
}

Write-Host "Packaging application with PyInstaller (Windowed Mode)..." -ForegroundColor Yellow

# Clean previous builds
if (Test-Path "build") { Remove-Item -Recurse -Force "build" }
if (Test-Path "dist\NexusPlatform.exe") { Remove-Item -Force "dist\NexusPlatform.exe" }

# Run PyInstaller
# Use the .spec file which contains the critical DLL fixes (libffi-8.dll)
& $PYTHON_EXE -m PyInstaller --noconfirm `
    --clean `
    NexusPlatform.spec

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nPyInstaller Build Failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`nOrganizing Portable Distribution ($VERSION)..." -ForegroundColor Yellow

# Create Output Directory
if (Test-Path $OUTPUT_DIR) { Remove-Item -Recurse -Force $OUTPUT_DIR }
New-Item -ItemType Directory -Force -Path $OUTPUT_DIR | Out-Null

# 1. Copy Executable
Copy-Item "dist\NexusPlatform.exe" -Destination "$OUTPUT_DIR\"

# 2. Copy Config Resources
if (Test-Path "config") { Copy-Item -Recurse "config" "$OUTPUT_DIR\" }

# 3. Copy Data Resources (Maps, Profiles, etc.)
if (Test-Path "data") { Copy-Item -Recurse "data" "$OUTPUT_DIR\" }

# 4. Copy External Tools (iperf, adb, etc.)
if (Test-Path "tools") { Copy-Item -Recurse "tools" "$OUTPUT_DIR\" }

# 5. Create Empty Logs Directory
if (-not (Test-Path "$OUTPUT_DIR\logs")) { New-Item -ItemType Directory -Path "$OUTPUT_DIR\logs" | Out-Null }

Write-Host "`nRELEASE Build Success!" -ForegroundColor Green
Write-Host "Location: $OUTPUT_DIR" -ForegroundColor Gray
