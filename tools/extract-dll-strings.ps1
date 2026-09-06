$path = 'C:\Program Files\LTK Manager\ltk_patcher_dll.dll'
$bytes = [IO.File]::ReadAllBytes($path)
$text = [Text.Encoding]::ASCII.GetString($bytes)
$rx = [regex]'[ -~]{6,}'
$all = $rx.Matches($text) | ForEach-Object { $_.Value }
$matches = $all | Where-Object { $_ -match '(?i)fantome|overlay|config|prefix|\.ini|\.json|\.toml|mod_|mods|index|wininet|read dir|scan' -and $_ -notmatch '(?i)microsoft|windows|r?tl|kernel|api-ms|ntdll' } | Select-Object -Unique
$matches | Select-Object -First 150
