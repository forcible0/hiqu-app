# Logo PNG -> Windows .ico (PNG-in-ICO, Vista+ destekli)
Add-Type -AssemblyName System.Drawing

$src = 'D:\buck\build\logo.png'
$outIco = 'D:\buck\build\icon.ico'
$outPng256 = 'D:\buck\build\icon.png'

$img = [System.Drawing.Image]::FromFile($src)
$size = 256
$bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = 'HighQualityBicubic'
$g.SmoothingMode = 'HighQuality'
$g.PixelOffsetMode = 'HighQuality'
$g.Clear([System.Drawing.Color]::Transparent)
$g.DrawImage($img, 0, 0, $size, $size)
$g.Dispose()
$img.Dispose()

# 256px PNG kopyala (build/icon.png)
$bmp.Save($outPng256, [System.Drawing.Imaging.ImageFormat]::Png)

# PNG verisini ICO konteynerine sar (ICO, PNG sikistirilmis entri destekler)
$ms = New-Object System.IO.MemoryStream
$bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBytes = $ms.ToArray()
$ms.Dispose()
$bmp.Dispose()

$fs = New-Object System.IO.FileStream($outIco, [System.IO.FileMode]::Create)
$bw = New-Object System.IO.BinaryWriter($fs)
# ICONDIR: reserved(2), type=1(2), count(2)
$bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]1)
# ICONDIRENTRY: w(1), h(1) -- 256 icin 0; colorCount(1), reserved(1), planes(2), bitcount(2), size(4), offset(4)
$bw.Write([Byte]0); $bw.Write([Byte]0); $bw.Write([Byte]0); $bw.Write([Byte]0)
$bw.Write([UInt16]1); $bw.Write([UInt16]32)
$bw.Write([UInt32]$pngBytes.Length); $bw.Write([UInt32]22)
$bw.Flush()
$fs.Write($pngBytes, 0, $pngBytes.Length)
$fs.Close()

Write-Output "icon.ico olusturuldu: $((Get-Item $outIco).Length) bayt"
