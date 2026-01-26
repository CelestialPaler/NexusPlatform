<#
.SYNOPSIS
    Clean build artifacts (dist, build, __pycache__).
#>

$ErrorActionPreference = "Continue"

# Go to Root
Set-Location "$PSScriptRoot/.."
$ROOT_DIR = Get-Location

function Remove-IfExist {
    param([string]$Path)
    if (Test-Path $Path) {
        Write-Host "Removing $Path..." -ForegroundColor Yellow
        Remove-Item -Path $Path -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "`n[Nexus] Cleaning Artifacts..." -ForegroundColor Cyan

# Clean Core
Remove-IfExist "nexus-core/build"
Remove-IfExist "nexus-core/dist"
Remove-IfExist "nexus-core/*.egg-info"

# Clean SDK
Remove-IfExist "nexus-sdk/build"
Remove-IfExist "nexus-sdk/dist"
Remove-IfExist "nexus-sdk/*.egg-info"

# Clean Platform Backend
Remove-IfExist "nexus-platform/build"
Remove-IfExist "nexus-platform/dist/*.exe"
# Avoid deleting frontend build unless necessary? User usually wants fresh build.
Remove-IfExist "nexus-platform/dist/assets"
Remove-IfExist "nexus-platform/dist/index.html"

# Clean PyCache
Get-ChildItem -Path . -Recurse -Include "__pycache__" | Remove-Item -Recurse -Force

Write-Host "`n[Nexus] Clean Complete! ✨" -ForegroundColor Green
