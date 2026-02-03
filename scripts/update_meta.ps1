$ErrorActionPreference='Stop'

$special=@{
 'index.html'='Free WAEC Math study guide, past papers, and Practice mode with instant AI-powered feedback. Best math practice tool for WAEC and completely FREE.'
 'study-guide.html'='WAEC math study guide: simple explanations, worked examples, and topic-by-topic notes to help you pass faster.'
 'past-papers.html'='Download WAEC math past papers and use Practice to solve real questions with instant MCQ checks and AI feedback for written answers.'
 'practice.html'='Practice real WAEC math past questions by topic or year. Get instant feedback for MCQ and AI feedback for written answers (FRQ).'
 'login.html'='Sign in with Google (or email) to unlock Practice mode on Cheetah WAEC and get real-time feedback on WAEC past questions.'
 'contact.html'='Contact Cheetah WAEC, join our community, and help us build the best free WAEC math learning platform.'
 'subscribe.html'='Become a donor to support Cheetah WAEC and help keep WAEC math study materials and Practice mode free for everyone.'
 'telegram.html'='Use Practice on the website for real-time feedback and AI help on WAEC past questions. Fast, simple, and free.'
}

$files=Get-ChildItem -Recurse -Filter *.html -File|?{$_.FullName -notmatch '\\supabase\\' -and $_.FullName -notmatch '\\.git\\'}
$changed=0

foreach($f in $files){
 $t=gc -LiteralPath $f.FullName -Raw
 $o=$t

 if($special.ContainsKey($f.Name)){
  $d=$special[$f.Name]
 } else {
  $m=[regex]::Match($t,'(?is)<title>(.*?)</title>')
  $ti=if($m.Success){$m.Groups[1].Value}else{$f.BaseName}
  $ti=($ti -replace '\s+',' ').Trim()
  $ti=($ti -split '\s+\p{Pd}\s+|\s+\|\s+')[0]
  $ti=($ti -replace '_',' ' -replace '-',' ')
  $ti=($ti -replace '\s+',' ').Trim()
  if($ti -match '\{\{TITLE\}\}'){ $ti=$f.BaseName }
  if(-not $ti){$ti=$f.BaseName}
    $parts = $f.FullName.Substring((Get-Location).Path.Length + 1).Split("\\")
  $sec = $parts[0]
  if($sec -eq 'chapters' -and $parts.Length -gt 1){ $sec = 'chapters ' + $parts[1] }
  $sec = ($sec -replace '-',' ').Trim()
  if($sec -and $sec -ne $f.Name){ $prefix = 'WAEC Math (' + $sec + '): ' } else { $prefix = 'WAEC Math: ' }
  $d = $prefix + $ti + '. Simple explanation, worked examples, and exam-style practice.'
 }

 if($d.Length -gt 170){$d=($d.Substring(0,167).TrimEnd()+'...')}
 $d=($d -replace '&','&amp;' -replace '"','&quot;')
 $tag='<meta name="description" content="' + $d + '">'

 if($t -match '(?is)<meta\s+name="description"\s+content=".*?"\s*/?>'){
  $t=[regex]::Replace($t,'(?is)<meta\s+name="description"\s+content=".*?"\s*/?>',$tag,1)
 } elseif($t -match '(?is)<title>.*?</title>'){
  $t=[regex]::Replace($t,'(?is)(<title>.*?</title>)',"`$1`n  $tag",1)
 }

 if($t -ne $o){sc -LiteralPath $f.FullName -Value $t -Encoding utf8;$changed++}
}

"Updated meta descriptions in $changed files"


