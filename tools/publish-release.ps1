param(
  [string]$Token,
  [string]$Repo = 'forcible0/hiqu-app',
  [string]$Version = '1.0.0',
  [string]$ReleaseDir = 'D:\buck\release',
  [switch]$CreateIfMissing
)

$Tag = "v$Version"

$h = @{
  Authorization = "Bearer $Token"
  'User-Agent' = 'hiqu-release'
  Accept = 'application/vnd.github+json'
}

# 1) Mevcut release'i ve assetleri bul (yoksa olustur)
try {
  $rel = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/tags/$Tag" -Headers $h
} catch {
  if (-not $CreateIfMissing) { throw "Release $Tag bulunamadi." }
  $rel = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases" -Method Post -Headers $h -Body (@{
    tag_name = $Tag; target_commitish = 'master'; name = "Hiqu $Version"
  } | ConvertTo-Json)
  Write-Output "Release olusturuldu: $Tag"
}
Write-Output "Release id=$($rel.id) tag=$($rel.tag_name)"

# 2) Eski (Buck) assetleri sil
foreach ($a in $rel.assets) {
  Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/assets/$($a.id)" -Method Delete -Headers $h | Out-Null
  Write-Output "silindi: $($a.name)"
}

# 3) Yeni (Hiqu) assetleri yukle
$files = @(
  @{ Path = Join-Path $ReleaseDir "Hiqu Setup $Version.exe"; Name = "Hiqu-Setup-$Version.exe" },
  @{ Path = Join-Path $ReleaseDir "Hiqu Setup $Version.exe.blockmap"; Name = "Hiqu-Setup-$Version.exe.blockmap" },
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
Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/$($rel.id)" -Method Patch -Headers $h -Body (@{ name = "Hiqu $Version" } | ConvertTo-Json) | Out-Null
Write-Output "Release basligi guncellendi: Hiqu $Version"
