<#
.SYNOPSIS
    Nexus 自动签名脚本 (Auto Signer)
    1. 自动检查/创建代码签名证书 (Nexus Developer)
    2. 对 dist/NexusPlatform.exe 进行数字签名
    3. 导出公钥用于本地信任
#>

$ErrorActionPreference = "Stop"
$CertSubject = "CN=Nexus Networks, O=Negentropy, C=CN"
# 指向 nexus-platform/dist/NexusPlatform.exe
$ExePath = "$PSScriptRoot/../nexus-platform/dist/NexusPlatform.exe"
$CerPath = "$PSScriptRoot/../nexus-platform/dist/NexusNetworks.cer"

Write-Host "🔐 Nexus Auto Signer Initiated..." -ForegroundColor Cyan

# 1. 检查是否存在已有证书
$cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | Where-Object { $_.Subject -match "Nexus Networks" } | Select-Object -First 1

if (-not $cert) {
    Write-Host "[-] 未检测到证书，正在创建自签名证书..." -ForegroundColor Yellow
    # 创建有效期 5 年的代码签名证书
    $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject $certSubject -CertStoreLocation Cert:\CurrentUser\My -NotAfter (Get-Date).AddYears(5)
    Write-Host "[+] 证书已创建: $($cert.Thumbprint)" -ForegroundColor Green
} else {
    Write-Host "[+] 检测到已有证书: $($cert.Thumbprint)" -ForegroundColor Green
}

# 2. 执行签名
if (Test-Path $ExePath) {
    Write-Host "[-] 正在对文件进行签名: $ExePath" -ForegroundColor Cyan
    try {
        $sig = Set-AuthenticodeSignature -Certificate $cert -FilePath $ExePath -HashAlgorithm SHA256
        if ($sig.Status -eq 'Valid') {
            Write-Host "[+] 签名成功! (Status: Valid)" -ForegroundColor Green
        } else {
            Write-Host "[!] 签名警告: $($sig.StatusMessage)" -ForegroundColor Yellow
        }
    } catch {
        Write-Error "签名失败: $_"
    }
} else {
    Write-Warning "文件未找到: $ExePath`n请先运行 'Nexus: 构建Release版本' (30_build_release.ps1)"
}

# 3. 导出公钥 (用于信任)
Write-Host "[-] 正在导出公钥..." -ForegroundColor Cyan
Export-Certificate -Cert $cert -FilePath $CerPath -Type CERT -Force | Out-Null
Write-Host "[+] 公钥已导出至: $CerPath" -ForegroundColor Green

Write-Host "`n⚠️  【关键步骤】如何通过 Smart App Control:" -ForegroundColor Magenta
Write-Host "1. 双击打开 '$CerPath'"
Write-Host "2. 点击 [安装证书]"
Write-Host "3. 存储位置选择 [本地计算机] (需要管理员权限)"
Write-Host "4. 选择 [将所有的证书都放入下列存储]"
Write-Host "5. 浏览并选择 [受信任的根证书颁发机构]"
Write-Host "6. 完成安装后，再次运行 exe 即可。"
