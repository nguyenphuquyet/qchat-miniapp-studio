$src = "C:\Users\QuyetGuic\Desktop\Biểu tượng QChat xanh ngọc hiện đại (1).png"
$out = "D:\qchat-miniapp-studio\src-tauri\icons\icon.ico"
$bytes = [System.IO.File]::ReadAllBytes($src)
$ms = New-Object IO.MemoryStream(, $bytes)
$bmp = [System.Drawing.Bitmap]::FromStream($ms)
$icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
$fs = [System.IO.FileStream]::new($out, [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$bmp.Dispose()
$ms.Dispose()
Get-Item $out | Select-Object Length
