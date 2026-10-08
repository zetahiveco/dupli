# Dupli installer — https://github.com/zetahiveco/dupli
# Usage:  powershell -c "irm https://dupli-zetahive.vercel.app/install.ps1 | iex"
$ErrorActionPreference = "Stop"

$repo = "zetahiveco/dupli"
$installDir = if ($env:DUPLI_INSTALL_DIR) { $env:DUPLI_INSTALL_DIR } else { "$env:USERPROFILE\.local\bin" }
$target = "x86_64-pc-windows-msvc"
$url = "https://github.com/$repo/releases/latest/download/dupli-$target.zip"
$tmp = Join-Path $env:TEMP "dupli-install"

try {
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  Invoke-WebRequest -Uri $url -OutFile (Join-Path $tmp "dupli.zip")
  Expand-Archive -Path (Join-Path $tmp "dupli.zip") -DestinationPath $tmp -Force
  New-Item -ItemType Directory -Force -Path $installDir | Out-Null
  Move-Item -Force (Join-Path $tmp "dupli.exe") (Join-Path $installDir "dupli.exe")
  Write-Host "Installed dupli to $installDir\dupli.exe"
  if (($env:Path -split ";") -notcontains $installDir) {
    Write-Host "NOTE: add $installDir to your PATH"
  }
} catch {
  Write-Host "No prebuilt Windows binary found - installing from source with cargo."
  if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Error "cargo not found. Install Rust first: https://rustup.rs"
    exit 1
  }
  cargo install --locked --git "https://github.com/$repo" dupli
  Write-Host "Installed dupli via cargo."
} finally {
  if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue }
}
