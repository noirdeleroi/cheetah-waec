$ErrorActionPreference = 'Stop'

$scriptTag = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5521008112693483" crossorigin="anonymous"></script>'
$matchAnyAdsense = 'pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'

function Write-Utf8NoBom([string]$path, [string]$text) {
  [System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
}

$root = (Get-Location).Path.TrimEnd('\')
$htmlFiles =
  Get-ChildItem -Recurse -File -Filter *.html |
  Where-Object {
    $rel = $_.FullName.Substring($root.Length).TrimStart('\') -replace '\\','/'
    $rel -notmatch '^(supabase|\.git)/'
  } |
  Sort-Object FullName

$modified = New-Object System.Collections.Generic.List[string]
$skipped = New-Object System.Collections.Generic.List[string]
$malformed = New-Object System.Collections.Generic.List[string]
$duplicates = New-Object System.Collections.Generic.List[string]

$headCloseRegex = New-Object System.Text.RegularExpressions.Regex('(?i)</head\s*>')
$headOpenRegex = New-Object System.Text.RegularExpressions.Regex('(?i)<head\b[^>]*>')

foreach ($f in $htmlFiles) {
  $path = $f.FullName
  $rel = $path.Substring($root.Length).TrimStart('\') -replace '\\','/'
  $text = Get-Content -LiteralPath $path -Raw

  $occ = ([regex]::Matches($text, [regex]::Escape($matchAnyAdsense), 'IgnoreCase')).Count
  if ($occ -gt 1) { $duplicates.Add($rel) | Out-Null }

  if ($text -match [regex]::Escape($matchAnyAdsense)) {
    $skipped.Add($rel) | Out-Null
    continue
  }

  if (-not $headOpenRegex.IsMatch($text) -or -not $headCloseRegex.IsMatch($text)) {
    $malformed.Add($rel) | Out-Null
    continue
  }

  $m = $headCloseRegex.Match($text)
  $idx = $m.Index

  # Preserve indentation of the </head> line if possible
  $lineStart = $text.LastIndexOf("`n", [Math]::Max(0, $idx - 1))
  if ($lineStart -lt 0) { $lineStart = 0 } else { $lineStart = $lineStart + 1 }
  $indentLen = 0
  while (($lineStart + $indentLen) -lt $text.Length) {
    $ch = $text[$lineStart + $indentLen]
    if ($ch -ne ' ' -and $ch -ne "`t") { break }
    $indentLen++
  }
  $indent = $text.Substring($lineStart, $indentLen)

  $insertion = "$indent$scriptTag`n"
  $updated = $text.Insert($idx, $insertion)

  if ($updated -ne $text) {
    Write-Utf8NoBom $path $updated
    $modified.Add($rel) | Out-Null
  }
}

Write-Host ("Modified: {0}" -f $modified.Count)
foreach ($p in $modified) { Write-Host ("  + {0}" -f $p) }

Write-Host ("Skipped (already had AdSense loader): {0}" -f $skipped.Count)
foreach ($p in $skipped) { Write-Host ("  = {0}" -f $p) }

Write-Host ("Malformed (missing <head> or </head>): {0}" -f $malformed.Count)
foreach ($p in $malformed) { Write-Host ("  ! {0}" -f $p) }

Write-Host ("Duplicates (had loader more than once): {0}" -f $duplicates.Count)
foreach ($p in $duplicates) { Write-Host ("  * {0}" -f $p) }
