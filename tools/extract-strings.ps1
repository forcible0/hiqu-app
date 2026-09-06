$path = 'C:\Program Files\LTK Manager\ltk_patcher_host.exe'
$bytes = [IO.File]::ReadAllBytes($path)
$text = [Text.Encoding]::ASCII.GetString($bytes)
$rx = [regex]'[ -~]{8,}'
$all = $rx.Matches($text) | ForEach-Object { $_.Value }
$keywords = 'scan|mod\b|ddl|inject|protocol|unknown|usage|overlay|profile|stdin|command|config|err|ok |ok:|ready|start|stop|missing|expect'
$matches = $all | Where-Object { $_ -match $keywords -and $_ -notmatch '(?i)microsoft|windows|rustc|\.rs[:/]|cargo|panic|thread' } | Select-Object -Unique
$matches | Select-Object -First 200
