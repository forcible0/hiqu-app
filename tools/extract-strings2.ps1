param([string]$Path, [string]$Pattern = '(?i)fantome|wad|ready|\.cfg|\.cbor|\.config|overlay')
$bytes = [IO.File]::ReadAllBytes($Path)
$text = [Text.Encoding]::ASCII.GetString($bytes)
$rx = [regex]'[ -~]{5,}'
$all = $rx.Matches($text) | ForEach-Object { $_.Value }
$matches = $all | Where-Object { $_ -match $Pattern -and $_ -notmatch '(?i)crates|runneradmin|rustc|cargo|src\\lib|forward|reward' } | Select-Object -Unique
Write-Host "== $Path =="
$matches | Select-Object -First 120
