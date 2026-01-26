Write-Host "Starting DEBUG Build Process for Nexus Platform..." -ForegroundColor Magenta

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
        if ($jsonContent -match '"app":\s*"([^"]+)"') {
            $VERSION = "v" + $matches[1]
            Write-Host "Detected App Version: $VERSION" -ForegroundColor Magenta
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
    Write-Warning "Could not read version. Defaulting to v1.0.0"
    $VERSION = "v1.0.0"
}

# Output to bin/debug/
$OUTPUT_DIR = "bin\debug\NexusPlatform_${VERSION}_DEBUG"

# Check if dist (frontend build) exists, if not, build it
if (-not (Test-Path "dist")) {
    Write-Warning "'dist' folder not found. Triggering Frontend Build..."
    Push-Location frontend
    try {
        if (-not (Test-Path "node_modules")) {
            cmd /c "npm install"
        }
        cmd /c "npm run build"
        if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
    }
    catch {
        Write-Error "Frontend Build Failed: $_"
        Pop-Location
        exit 1
    }
    Pop-Location
}

Write-Host "Packaging application with PyInstaller (Console Mode)..." -ForegroundColor Yellow

# Clean previous builds
if (Test-Path "build") { Remove-Item -Recurse -Force "build" }
if (Test-Path "dist\NexusPlatform_Debug.exe") { Remove-Item -Force "dist\NexusPlatform_Debug.exe" }

# Run PyInstaller
# Changed to --onedir for better debugging and inspection
# Use a temp dist folder to avoid collision with frontend 'dist' folder
$TEMP_DIST = "bin\temp_dist"
if (Test-Path $TEMP_DIST) { Remove-Item -Recurse -Force $TEMP_DIST }

& $PYTHON_EXE -m PyInstaller --noconfirm `
    --onedir `
    --console `
    --distpath $TEMP_DIST `
    --name "NexusPlatform_Debug" `
    --add-data "dist;dist" `
    --collect-all "webview" `
    --hidden-import "engineio.async_drivers.threading" `
    --clean `
    run.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nPyInstaller Build Failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`nOrganizing Portable Debug Distribution..." -ForegroundColor Yellow

# Create Output Directory
if (Test-Path $OUTPUT_DIR) { Remove-Item -Recurse -Force $OUTPUT_DIR }
New-Item -ItemType Directory -Force -Path $OUTPUT_DIR | Out-Null

# 1. Copy Executable and Dependencies (OneDir content)
Copy-Item -Recurse "$TEMP_DIST\NexusPlatform_Debug\*" -Destination "$OUTPUT_DIR\"

# Clean up temp
Remove-Item -Recurse -Force $TEMP_DIST

# 1.5. FIX: Manually copy missing DLLs (libffi, ssl) that PyInstaller missed
$PYTHON_BASE_DLLS = "C:\Users\CelestialPaler\AppData\Local\Programs\Python\Python313\DLLs"
$MISSING_DLLS = @("libffi-8.dll", "libssl-3.dll", "libcrypto-3.dll")

foreach ($dll in $MISSING_DLLS) {
    if (Test-Path "$PYTHON_BASE_DLLS\$dll") {
        Write-Host "Manually copying missing dependency: $dll" -ForegroundColor Cyan
        Copy-Item "$PYTHON_BASE_DLLS\$dll" "$OUTPUT_DIR\_internal\"
    } else {
        Write-Warning "Could not find $dll in $PYTHON_BASE_DLLS"
    }
}

# 2. Copy Config Resources
if (Test-Path "config") { Copy-Item -Recurse "config" "$OUTPUT_DIR\" }

# 3. Copy Data Resources (Maps, Profiles, etc.)
if (Test-Path "data") { Copy-Item -Recurse "data" "$OUTPUT_DIR\" }

# 4. Copy External Tools (iperf, adb, etc.)
if (Test-Path "tools") { Copy-Item -Recurse "tools" "$OUTPUT_DIR\" }

# 5. Create Empty Logs Directory
if (-not (Test-Path "$OUTPUT_DIR\logs")) { New-Item -ItemType Directory -Path "$OUTPUT_DIR\logs" | Out-Null }

Write-Host "`nDEBUG Build Success!" -ForegroundColor Green
Write-Host "Location: $OUTPUT_DIR" -ForegroundColor Gray
