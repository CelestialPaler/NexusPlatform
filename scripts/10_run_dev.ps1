<#
.SYNOPSIS
    Run Nexus Platform in Development Mode.
    No compilation, direct python execution.
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

# Go to Platform Dir
Set-Location "$PSScriptRoot/../nexus-platform"

Write-Host "`n[Nexus] Starting Platform (Dev Mode)..." -ForegroundColor Cyan
Write-Host "    -> Target: run.py" -ForegroundColor Gray

# Check for Vite Dev Server (Hot Reload)
$VitePort = 5173
$PortOpen = $false

# Try to check port (Fast check using .NET sockets instead of slow Test-NetConnection)
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $result = $tcp.BeginConnect("localhost", $VitePort, $null, $null)
    $success = $result.AsyncWaitHandle.WaitOne(200, $false)
    if ($success) {
        $tcp.EndConnect($result)
        $tcp.Close()
        $PortOpen = $true
    }
} catch {
    $PortOpen = $false
}

if ($PortOpen) {
    Write-Host "✅ Vite Dev Server detected on port $VitePort" -ForegroundColor Green
    Write-Host "   -> Hot Module Replacement (HMR) Enabled!" -ForegroundColor Green
    $env:NEXUS_DEV_MODE = "true"
} else {
    Write-Warning "⚠️  Vite Dev Server NOT found on port $VitePort."
    Write-Warning "   -> Running in Static Mode (dist/index.html)."
    Write-Warning "   -> To enable Hot Reload, run 'Nexus: Start Frontend' task first."
    $env:NEXUS_DEV_MODE = "false"
    
    # Check if frontend is built
    if (-not (Test-Path "dist/index.html")) {
        Write-Warning "Frontend build (dist/) not found. UI might be blank."
        Write-Warning "Please run 'npm run build' in nexus-platform/frontend first."
    }
}

# Run
& $PYTHON_EXE run.py
