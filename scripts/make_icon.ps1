param(
    [Parameter(Mandatory = $true)]
    [string]$OutputPath
)

Add-Type -AssemblyName System.Drawing

$size = 256
$bitmap = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::Transparent)

$background = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#0F1520'))
$border = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#1C2634')), 8
$line = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#17C784')), 20
$line.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$line.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$line.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$radius = 64
$path.AddArc(0, 0, $radius, $radius, 180, 90)
$path.AddArc($size - $radius, 0, $radius, $radius, 270, 90)
$path.AddArc($size - $radius, $size - $radius, $radius, $radius, 0, 90)
$path.AddArc(0, $size - $radius, $radius, $radius, 90, 90)
$path.CloseFigure()
$graphics.FillPath($background, $path)
$graphics.DrawPath($border, $path)

$points = [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF (48, 176)),
    (New-Object System.Drawing.PointF (104, 96)),
    (New-Object System.Drawing.PointF (144, 136)),
    (New-Object System.Drawing.PointF (208, 64))
)
$graphics.DrawLines($line, $points)

$directory = Split-Path -Parent $OutputPath
if ($directory -and -not (Test-Path $directory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
}

$pngStream = New-Object System.IO.MemoryStream
$bitmap.Save($pngStream, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBytes = $pngStream.ToArray()
$icoStream = New-Object System.IO.FileStream($OutputPath, [System.IO.FileMode]::Create)
$writer = New-Object System.IO.BinaryWriter($icoStream)
$writer.Write([uint16]0)
$writer.Write([uint16]1)
$writer.Write([uint16]1)
$writer.Write([byte]0)
$writer.Write([byte]0)
$writer.Write([byte]0)
$writer.Write([byte]0)
$writer.Write([uint16]1)
$writer.Write([uint16]32)
$writer.Write([uint32]$pngBytes.Length)
$writer.Write([uint32]22)
$writer.Write($pngBytes)
$writer.Close()
$icoStream.Close()
$pngStream.Close()
$graphics.Dispose()
$bitmap.Dispose()
$background.Dispose()
$border.Dispose()
$line.Dispose()
$path.Dispose()

Write-Host "Created $OutputPath"