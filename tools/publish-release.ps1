param(
  [string]$Token,
  [string]$Repo = 'forcible0/hiqu-app',
  [string]$Tag = 'v1.0.0',
  [string]$ReleaseDir = 'D:\buck\release'
)

$h = @{
  Authorization = "Bearer $Token"
  'User-Agent' = 'hiqu-release'
  Accept = 'application/vnd.github+json'
}

# 1) Mevcut release'i ve assetleri bul
$rel = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/tags/$Tag" -Headers $h
Write-Output "Release id=$($rel.id) tag=$($rel.tag_name)"

# 2) Eski (Buck) assetleri sil
foreach ($a in $rel.assets) {
  Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/assets/$($a.id)" -Method Delete -Headers $h | Out-Null
  Write-Output "silindi: $($a.name)"
}

# 3) Yeni (Hiqu) assetleri yukle
$files = @(
  @{ Path = Join-Path $ReleaseDir 'Hiqu Setup 1.0.0.exe'; Name = 'Hiqu-Setup-1.0.0.exe' },
  @{ Path = Join-Path $ReleaseDir 'Hiqu Setup 1.0.0.exe.blockmap'; Name = 'Hiqu-Setup-1.0.0.exe.blockmap' },
  @{ Path = Join-Path $ReleaseDir 'latest.yml'; Name = 'latest.yml' }
)

foreach ($f in $files) {
  $bytes = [System.IO.File]::ReadAllBytes($f.Path)
  $uh = @{ Authorization = "Bearer $Token"; 'User-Agent' = 'hiqu-release'; 'Content-Type' = 'application/octet-stream' }
  $uri = "https://uploads.github.com/repos/$Repo/releases/$($rel.id)/assets?name=$([uri]::EscapeDataString($f.Name))"
  $res = Invoke-RestMethod -Uri $uri -Method Post -Headers $uh -Body $bytes
  Write-Output "yuklendi: $($res.name) ($($res.size) bayt, durum=$($res.state))"
}

# 4) Release basligini guncelle
Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/$($rel.id)" -Method Patch -Headers $h -Body '{"name":"Hiqu 1.0.0"}' | Out-Null
Write-Output "Release basligi guncellendi: Hiqu 1.0.0"
