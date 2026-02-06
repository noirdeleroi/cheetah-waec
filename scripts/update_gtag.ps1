$ErrorActionPreference='Stop'

$newId='G-1CQNXCWHX7'

$snippet=@"
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=$newId"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '$newId');
</script>

"@

$patternSrc='https://www\.googletagmanager\.com/gtag/js\?id=G-[A-Z0-9]+'
$patternConfig='gtag\(\s*[''"]config[''"]\s*,\s*[''"]G-[A-Z0-9]+[''"]\s*\)'
$patternOldId='G-VX6VXK0L0H'

$files=Get-ChildItem -Recurse -Filter *.html -File | ?{
  $_.FullName -notmatch '\\supabase\\' -and
  $_.FullName -notmatch '\\.git\\'
}

$changed=0
$inserted=0
$updated=0

foreach($f in $files){
  $t=Get-Content -LiteralPath $f.FullName -Raw
  $o=$t

  if($t -match 'googletagmanager\.com/gtag/js\?id='){
    $t=[regex]::Replace($t,$patternSrc,"https://www.googletagmanager.com/gtag/js?id=$newId")
    $t=[regex]::Replace($t,$patternConfig,"gtag('config', '$newId')")
    $t=$t.Replace($patternOldId,$newId)
    if($t -ne $o){ $updated++ }
  } else {
    if($t -match '(?is)<head\s*>'){
      $t=[regex]::Replace($t,'(?is)(<head\s*>)',('$1' + "`n" + $snippet),1)
      if($t -ne $o){ $inserted++ }
    }
  }

  if($t -ne $o){
    Set-Content -LiteralPath $f.FullName -Value $t -Encoding utf8
    $changed++
  }
}

"Updated GA tag in $updated files; inserted in $inserted files; total changed $changed"
