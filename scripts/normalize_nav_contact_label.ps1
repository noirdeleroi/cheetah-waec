$ErrorActionPreference = 'Stop'

function Write-Utf8NoBom([string]$path, [string]$text) {
  [System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
}

$root = (Get-Location).Path.TrimEnd('\')
$files =
  Get-ChildItem -Recurse -File -Filter *.html |
  Where-Object {
    $rel = $_.FullName.Substring($root.Length).TrimStart('\') -replace '\\','/'
    $rel -notmatch '^(supabase|\.git)/'
  }

$ulRegex = New-Object System.Text.RegularExpressions.Regex(
  '(<ul\s+class="nav-links"[^>]*>)([\s\S]*?)(</ul>)',
  [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
)

$aRegex = New-Object System.Text.RegularExpressions.Regex(
  '(<a\b[^>]*\bhref="(?:/contact(?:\.html)?|contact(?:\.html)?)"[^>]*>)([\s\S]*?)(</a>)',
  ([System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Singleline)
)

$changed = 0
foreach ($f in $files) {
  $text = Get-Content -LiteralPath $f.FullName -Raw
  $updated = $ulRegex.Replace($text, {
    param($m)
    $inner = $m.Groups[2].Value
    $inner2 = $aRegex.Replace($inner, {
      param($am)
      # Force label text to "Contacts" for any nav link pointing to contact page.
      return $am.Groups[1].Value + 'Contacts' + $am.Groups[3].Value
    })
    return $m.Groups[1].Value + $inner2 + $m.Groups[3].Value
  })

  if ($updated -ne $text) {
    Write-Utf8NoBom $f.FullName $updated
    $changed++
  }
}

"Updated nav contact label in $changed file(s)."

