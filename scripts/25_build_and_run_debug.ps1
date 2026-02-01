<#
.SYNOPSIS
    Build Debug Version and Run it immediately.
#>

$ErrorActionPreference = "Stop"

# Go to Scripts Dir
Set-Location "$PSScriptRoot"

# 1. Build
write-host "`n[Nexus] Logic: Build Debug..." -ForegroundColor Cyan
./20_build_debug.ps1

# 2. Run
write-host "`n[Nexus] Logic: Launching..." -ForegroundColor Cyan
$EXE_PATH = "../../bin/debug/NexusPlatform_Debug.exe"

if (Test-Path $EXE_PATH) {
    Start-Process -FilePath $EXE_PATH -Wait
} else {
    Write-Error "Executable not found: $EXE_PATH"
}
