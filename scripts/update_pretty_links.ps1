$ErrorActionPreference='Stop'

function Replace-Href([string]$html,[string]$name,[string]$newHref){
  # Replace href="/name.html" and href="../../name.html" variants (double quotes only; matches current site markup)
  $pattern='href="(?:\.\./)*' + [regex]::Escape($name) + '\.html"'
  $html=[regex]::Replace($html,$pattern,'href="' + $newHref + '"')

  $patternAbs='href="/' + [regex]::Escape($name) + '\.html"'
  $html=[regex]::Replace($html,$patternAbs,'href="' + $newHref + '"')
  return $html
}

$files=Get-ChildItem -Recurse -Filter *.html -File | ?{
  $_.FullName -notmatch '\\supabase\\' -and
  $_.FullName -notmatch '\\.git\\'
}

$changed=0
foreach($f in $files){
  $t=Get-Content -LiteralPath $f.FullName -Raw
  $o=$t

  # Home
  $t=[regex]::Replace($t,'href="(?:\.\./)*index\.html"','href="/"')
  $t=$t.Replace('href="/index.html"','href="/"')

  # Main pages
  $t=Replace-Href $t 'study-guide' '/study-guide'
  $t=Replace-Href $t 'past-papers' '/past-papers'
  $t=Replace-Href $t 'practice' '/practice'
  $t=Replace-Href $t 'contact' '/contact'
  $t=Replace-Href $t 'subscribe' '/subscribe'
  $t=Replace-Href $t 'login' '/login'

  if($t -ne $o){
    Set-Content -LiteralPath $f.FullName -Value $t -Encoding utf8
    $changed++
  }
}

"Updated pretty links in $changed files"
