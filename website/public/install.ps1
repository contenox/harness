# Contenox Harness installer for Windows.
#
#   irm https://contenox.com/install.ps1 | iex
#
# Resolution order:
#   1. a prebuilt asset on the latest release of the repository, named
#      contenox-windows-<arch>.exe;
#   2. `go install` of the module, which is the path that works before any
#      release has been published;
#   3. an explicit error naming the manual options.
#requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Repo = 'contenox/harness'
$Module = 'github.com/contenox/harness'
$Bin = 'contenox'
$Version = if ($env:CONTENOX_VERSION) { $env:CONTENOX_VERSION } else { 'latest' }

switch ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture) {
    'X64'   { $Arch = 'amd64' }
    'Arm64' { $Arch = 'arm64' }
    default { throw "unsupported architecture: $([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture)" }
}

$Dest = Join-Path $env:LOCALAPPDATA 'Contenox\bin'
if (-not (Test-Path $Dest)) { New-Item -ItemType Directory -Force -Path $Dest | Out-Null }
$DestExe = Join-Path $Dest "$Bin.exe"

$Installed = $null

# 1. Prebuilt asset from the repository's latest release.
try {
    $Release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/$Version" `
        -Headers @{ 'User-Agent' = 'contenox-installer' } -TimeoutSec 30
    $AssetName = "$Bin-windows-$Arch.exe"
    $Asset = $Release.assets | Where-Object { $_.name -eq $AssetName } | Select-Object -First 1
    if ($Asset) {
        Write-Host "Downloading $AssetName..."
        $Tmp = Join-Path ([System.IO.Path]::GetTempPath()) "$Bin-download.exe"
        Invoke-WebRequest -Uri $Asset.browser_download_url -OutFile $Tmp -UseBasicParsing
        Move-Item -Force $Tmp $DestExe
        $Installed = $DestExe
    }
} catch {
    # No release, no network, or no matching asset: fall through to the
    # toolchain path rather than failing here.
}

# 2. Build from source with the Go toolchain.
if (-not $Installed) {
    $Go = Get-Command go -ErrorAction SilentlyContinue
    if ($Go) {
        Write-Host "Building $Bin with the Go toolchain (no release asset found)..."
        $env:GOBIN = $Dest
        & go install "$Module/cmd/$Bin@$Version"
        if ($LASTEXITCODE -ne 0) { throw "go install failed" }
        $Installed = $DestExe
    }
}

if (-not $Installed) {
    throw "no release asset for windows-$Arch and no Go toolchain found.`nInstall Go 1.25+ from https://go.dev/dl/ or download a build from https://github.com/$Repo/releases"
}

# Put the directory on the user PATH once, so the next shell finds it.
$UserPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not ($UserPath -split ';' | Where-Object { $_ -eq $Dest })) {
    [Environment]::SetEnvironmentVariable('Path', ($UserPath.TrimEnd(';') + ';' + $Dest), 'User')
    Write-Host "Added $Dest to the user PATH; open a new terminal to use $Bin."
}

Write-Host ""
Write-Host "$([char]0x2713) $Bin installed at $Installed"
Write-Host ""
Write-Host "Get started:"
Write-Host "  contenox setup        # choose a provider and a model"
Write-Host "  contenox init         # mark this repository as a workspace"
Write-Host "  contenox `"summarise this repository`""
Write-Host "  contenox acp          # serve the agent to an ACP editor"
