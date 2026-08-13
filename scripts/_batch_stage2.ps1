# batch stage2 runner
$ErrorActionPreference = "Continue"
$root = "D:\iCloudDrive\iCloud~md~obsidian\Eric_Vault\02_Projects\myWall"
Set-Location $root
$env:HTTP_PROXY = "http://127.0.0.1:10808"
$env:HTTPS_PROXY = "http://127.0.0.1:10808"
$env:http_proxy = "http://127.0.0.1:10808"
$env:https_proxy = "http://127.0.0.1:10808"
$log = Join-Path $root "out_b_stage2_batch_log.txt"
$summary = Join-Path $root "out_b_stage2_batch_summary.json"
"=== stage2 batch start $(Get-Date -Format o) ===" | Tee-Object -FilePath $log
$tests = @(1,3,4,5,6,7,8,9,11,12,13)
$rows = @()
foreach ($n in $tests) {
  $dir = "out_b_stage1_test$n"
  $boxes = Get-ChildItem $dir -Filter "spine_boxes_*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $boxes) {
    "SKIP test$n NO_BOXES" | Tee-Object -FilePath $log -Append
    continue
  }
  $img = "photos/test$n.jpg"
  ">>> START test$n boxes=$($boxes.Name) $(Get-Date -Format o)" | Tee-Object -FilePath $log -Append
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $outLog = Join-Path $dir "stage2_run.log"
  python -X utf8 scripts/recognize_spines_with_tmdb.py --spine-boxes-json $boxes.FullName --out-dir $dir --image-path $img 2>&1 | Tee-Object -FilePath $outLog
  $code = $LASTEXITCODE
  $sw.Stop()
  $sec = [math]::Round($sw.Elapsed.TotalSeconds,1)
  $results = Get-ChildItem $dir -Filter "spine_results_*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  $spines=0; $matches=0; $fails=0; $rpath=""
  if ($results) {
    $rpath = $results.FullName
    $stats = python -X utf8 -c @"
import json
from pathlib import Path
p=Path(r'$($results.FullName)')
d=json.loads(p.read_text(encoding='utf-8'))
sp=d.get('spines') or []
match=0; fail=0
for s in sp:
    m=s.get('match') or s.get('tmdb_match') or {}
    tid=None
    if isinstance(m,dict):
        tid=m.get('tmdb_id') or m.get('id')
    if tid is None:
        tid=s.get('tmdb_id')
    ok=bool(tid)
    # also accept nested best
    if not ok and isinstance(s.get('tmdb'),dict):
        ok=bool(s['tmdb'].get('tmdb_id') or s['tmdb'].get('id'))
    if not ok:
        cands=s.get('candidates') or []
        if cands and (cands[0].get('tmdb_id') or cands[0].get('id')) and s.get('status') not in ('fail','error','unmatched'):
            # prefer explicit matched flag
            pass
    status=(s.get('status') or '').lower()
    title=(s.get('title_raw') or s.get('read_title') or s.get('title') or '')
    matched_flag=s.get('matched')
    if matched_flag is True or (tid and status not in ('fail','error')):
        match += 1
    elif status in ('fail','error','unmatched') or matched_flag is False or not tid:
        # count as fail if no tmdb_id
        if not tid:
            fail += 1
        else:
            match += 1
    else:
        fail += 1
print(len(sp), match, fail)
"@
    $parts = ($stats -split '\s+')
    if ($parts.Count -ge 3) { $spines=[int]$parts[0]; $matches=[int]$parts[1]; $fails=[int]$parts[2] }
  }
  $line = "<<< DONE test$n exit=$code sec=$sec spines=$spines match=$matches fail=$fails results=$rpath"
  $line | Tee-Object -FilePath $log -Append
  $rows += [PSCustomObject]@{test=$n; spines=$spines; match=$matches; fail=$fails; sec=$sec; exit=$code; results=$rpath; boxes=$boxes.FullName}
}
$rows | ConvertTo-Json | Set-Content -Path $summary -Encoding utf8
"=== stage2 batch end $(Get-Date -Format o) ===" | Tee-Object -FilePath $log -Append
$rows | Format-Table -AutoSize | Out-String | Tee-Object -FilePath $log -Append
