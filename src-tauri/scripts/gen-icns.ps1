$ErrorActionPreference = "Stop"
$in = join-path (Split-Path $PSScriptRoot) "icons\icon.png"
$out = join-path (Split-Path $PSScriptRoot) "icons\icon.icns"
if (-not (Test-Path $in)) { throw "Missing $in" }
if (-not (Test-Path $out)) { cp $in $out }
Write-Host "OK" (Get-Item $out).Length
