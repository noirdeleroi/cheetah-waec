$ErrorActionPreference='Stop'

$year=(Get-Date).Year

$footerInner=@"
  <p style="margin: 10px 0 6px 0;">
    <a href="/about" style="color:#fff; text-decoration: none;">About</a> |
    <a href="/contact" style="color:#fff; text-decoration: none;">Contact</a> |
    <a href="/privacy-policy" style="color:#fff; text-decoration: none;">Privacy Policy</a> |
    <a href="/terms" style="color:#fff; text-decoration: none;">Terms</a>
  </p>
  <p style="margin: 0 0 10px 0;">&copy; $year CheetahWAEC</p>
"@

$footerFull=@"
<footer>
$footerInner
</footer>
"@

$files=Get-ChildItem -Recurse -Filter *.html -File | ?{
  $_.FullName -notmatch '\\supabase\\' -and
  $_.FullName -notmatch '\\.git\\'
}

$changed=0
$normalized=0
$added=0

foreach($f in $files){
  $t=Get-Content -LiteralPath $f.FullName -Raw
  $o=$t

  $footerMatches=[regex]::Matches($t,'(?is)<footer\b[^>]*>.*?</footer>')

  if($footerMatches.Count -gt 0){
    # Remove all existing footers (prevents duplicates and makes the site consistent).
    $t=[regex]::Replace($t,'(?is)<footer\b[^>]*>.*?</footer>\s*','')
    $normalized++
  }

  # Ensure exactly one footer, inserted right before </body>
  if($t -match '(?is)</body>'){
    $t=[regex]::Replace($t,'(?is)</body>',($footerFull + "`n</body>"),1)
    if($footerMatches.Count -eq 0){ $added++ }
  }

  if($t -ne $o){
    Set-Content -LiteralPath $f.FullName -Value $t -Encoding utf8
    $changed++
  }
}

"Normalized existing footers in $normalized files; added footer to $added files; total changed $changed"
