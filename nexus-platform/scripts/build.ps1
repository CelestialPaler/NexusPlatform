# ==========================================
# Nexus Network Analysis Platform
# Build ONLY Script
# ==========================================

$ErrorActionPreference = "Stop"

# Define Python Environment (Standard 15: Super Venv)
$PYTHON_ENV = "$env:USERPROFILE\.venvs\negentropy\Scripts\python.exe"
if (Test-Path $PYTHON_ENV) {
    $PYTHON_EXE = $PYTHON_ENV
    Write-Host "Using Standard Python Environment: $PYTHON_EXE" -ForegroundColor Green
}
else {
    $PYTHON_EXE = "python"
    Write-Warning "Standard Python Environment not found. Falling back to system python."
}

# Ensure we are in the project root directory
Set-Location "$PSScriptRoot/.."

function Print-Step {
    param([string]$Message)
    Write-Host "`n[Nexus] $Message" -ForegroundColor Cyan
}

function Print-Success {
    param([string]$Message)
    Write-Host "    -> [OK] $Message" -ForegroundColor Green
}

function Print-Error {
    param([string]$Message)
    Write-Host "    -> [ERROR] $Message" -ForegroundColor Red
}

try {
    Print-Step "Initializing Build Environment..."

    # 1. Environment Check
    Print-Success "Python Target: $PYTHON_EXE"

    if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
        throw "NPM not found. Please install Node.js."
    }
    Print-Success "NPM found: $((npm --version) 2>&1)"

    # 2. Backend Setup
    Print-Step "Checking Backend Dependencies..."
    & $PYTHON_EXE -m pip install -r requirements.txt | Out-Null
    Print-Success "Dependencies installed."

    # 3. Frontend Build
    Print-Step "Building Frontend..."
    
    Push-Location frontend
    
    if (-not (Test-Path "node_modules")) {
        Write-Host "    -> Installing NPM packages (First run)..." -ForegroundColor Gray
        npm install
    }

    Write-Host "    -> Compiling React application..." -ForegroundColor Gray
    npm run build

    if ($LASTEXITCODE -ne 0) {
        throw "Frontend build failed."
    }

    Pop-Location
    Print-Success "Frontend build complete."

}
catch {
    Print-Error $_.Exception.Message
    exit 1
}
