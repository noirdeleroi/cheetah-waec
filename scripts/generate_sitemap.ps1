$ErrorActionPreference='Stop'

$siteBase='https://cheetahwaec.com'

function Get-CanonicalUrl([string]$fullName){
  $root=(Get-Location).Path.TrimEnd('\')
  $rel=$fullName.Substring($root.Length).TrimStart('\') -replace '\\','/'

  # Legacy duplicates -> preferred URL structure
  if($rel -match '^algebra/'){
    $rel='chapters/algebra/' + $rel.Substring('algebra/'.Length)
  } elseif($rel -match '^asfsanumbers/'){
    $rel='chapters/numbers/' + $rel.Substring('asfsanumbers/'.Length)
  } elseif($rel -match '^chapters/commertial-mathematics/'){
    $rel='chapters/commercial/' + $rel.Substring('chapters/commertial-mathematics/'.Length)
  }

  if($rel -ieq 'index.html'){ return "$siteBase/" }
  if($rel -match '\.html$'){ $rel=$rel.Substring(0,$rel.Length-5) }
  return "$siteBase/$rel"
}

function ShouldInclude([System.IO.FileInfo]$f){
  $rel=$f.FullName.Substring((Get-Location).Path.Length).TrimStart('\') -replace '\\','/'
  if($rel -match '^(supabase|\.git)/'){ return $false }
  if($rel -notmatch '^[^/]+\.html$' -and $rel -notmatch '^chapters/.*\.html$'){ return $false }
  if($rel -match '^chapters/tochange/'){ return $false }
  if($rel -match '^chapters/pr/'){ return $false }
  if($rel -match '^template\d+\.html$'){ return $false }
  if($rel -in @('output.html','genius.html')){ return $false }
  if($rel -match '^chapters/commertial-mathematics/'){ return $false }
  return $true
}

$files=Get-ChildItem -Recurse -Filter *.html -File | Where-Object { ShouldInclude $_ }

$urls=@()
foreach($f in $files){
  $canonical=Get-CanonicalUrl $f.FullName
  $lastmod=$f.LastWriteTimeUtc.ToString('yyyy-MM-dd')
  $urls += [PSCustomObject]@{ loc=$canonical; lastmod=$lastmod }
}

$urls=$urls | Sort-Object loc -Unique

$lines=@()
$lines += '<?xml version="1.0" encoding="UTF-8"?>'
$lines += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
foreach($u in $urls){
  $lines += '  <url>'
  $lines += ('    <loc>{0}</loc>' -f $u.loc)
  $lines += ('    <lastmod>{0}</lastmod>' -f $u.lastmod)
  $lines += '  </url>'
}
$lines += '</urlset>'

# Write UTF-8 without BOM to avoid sitemap parsers seeing BOM bytes as "ï»¿"
[System.IO.File]::WriteAllText(
  'sitemap.xml',
  ($lines -join "`n"),
  (New-Object System.Text.UTF8Encoding($false))
)

"Generated sitemap.xml with $($urls.Count) URLs"
