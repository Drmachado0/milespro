$root = "C:\Users\Machado\Milespro\miles-pro-hub\src"
$files = Get-ChildItem -Path $root -Recurse -Include *.tsx,*.ts,*.css -File |
  Where-Object {
    $_.FullName -notmatch 'redesign-kit' -and
    $_.FullName -notmatch '\.test\.' -and
    $_.FullName -notmatch '__tests__' -and
    $_.FullName -notmatch 'locales' -and
    $_.FullName -notmatch 'data.badges\.' -and
    $_.FullName -notmatch 'quickActionsRegistry'
  }

$pairs = @(
  @('(?<pre>bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|shadow)-emerald-(?<grade>\d+)','${pre}-success'),
  @('(?<pre>bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|shadow)-green-(?<grade>\d+)','${pre}-success'),
  @('(?<pre>bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|shadow)-rose-(?<grade>\d+)','${pre}-destructive'),
  @('(?<pre>bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|shadow)-red-(?<grade>\d+)','${pre}-destructive'),
  @('(?<pre>bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|shadow)-amber-(?<grade>\d+)','${pre}-warning'),
  @('(?<pre>bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|shadow)-yellow-(?<grade>\d+)','${pre}-warning'),
  @('(?<pre>bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|shadow)-blue-(?<grade>\d+)','${pre}-info'),
  @('(?<pre>bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|shadow)-sky-(?<grade>\d+)','${pre}-info'),
  @('(?<pre>bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|shadow)-cyan-(?<grade>\d+)','${pre}-info'),
  @('(?<pre>bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|shadow)-orange-(?<grade>\d+)','${pre}-primary')
)

$summary = @{}
foreach ($f in $files) {
  $content = Get-Content -Raw -Encoding UTF8 $f.FullName
  if ($null -eq $content) { continue }
  $orig = $content
  $count = 0
  foreach ($pair in $pairs) {
    $regex = $pair[0]
    $repl = $pair[1]
    $m = [regex]::Matches($content, $regex)
    if ($m.Count -gt 0) {
      $count += $m.Count
      $content = [regex]::Replace($content, $regex, $repl)
    }
  }
  if ($content -ne $orig) {
    Set-Content -Path $f.FullName -Value $content -Encoding UTF8 -NoNewline
    $rel = $f.FullName.Replace("C:\Users\Machado\Milespro\miles-pro-hub\", "")
    $summary[$rel] = $count
  }
}
$summary.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 80 | ForEach-Object { "{0,-70} {1}" -f $_.Key, $_.Value }
$total = ($summary.Values | Measure-Object -Sum).Sum
"TOTAL: $total replacements across $($summary.Count) files"
