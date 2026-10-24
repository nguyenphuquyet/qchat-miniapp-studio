$ErrorActionPreference = "Stop"
$src = [string]::Copy("C:\Users\QuyetGuic\Desktop\Biểu tượng QChat xanh ngọc hiện đại (1).png")
$bytes = [System.IO.File]::ReadAllBytes($src)
$ms = New-Object System.IO.MemoryStream(, $bytes)
$bmp = [System.Drawing.Bitmap]::FromStream($ms)
$ico = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
$out = join-path $PSScriptRoot "icons\icon.ico"
$fs = [System.IO.FileStream]::new($out, [System.IO.FileMode]::Create)
$ico.Save($fs)
$fs.Close()
$ico.Dispose()
$bmp.Dispose()
$ms.Dispose()
Write-Host "OK" (Get-Item $out).Length
