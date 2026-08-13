# -*- coding: utf-8 -*-
"""Serial stage2 batch for scheme B."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)

# TMDb needs local proxy (direct times out)
PROXY = "http://127.0.0.1:10808"
os.environ["HTTP_PROXY"] = PROXY
os.environ["HTTPS_PROXY"] = PROXY
os.environ["http_proxy"] = PROXY
os.environ["https_proxy"] = PROXY

TESTS = [1, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13]
LOG = ROOT / "out_b_stage2_batch_log.txt"
SUMMARY = ROOT / "out_b_stage2_batch_summary.json"


def log(msg: str) -> None:
    line = f"{datetime.now().isoformat(timespec='seconds')} {msg}"
    print(line, flush=True)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def latest_boxes(d: Path) -> Path | None:
    files = sorted(d.glob("spine_boxes_*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    return files[0] if files else None


def latest_results(d: Path) -> Path | None:
    files = sorted(d.glob("spine_results_*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    return files[0] if files else None


def stats(results_path: Path) -> tuple[int, int, int]:
    data = json.loads(results_path.read_text(encoding="utf-8"))
    spines = data.get("spines") or []
    match = 0
    fail = 0
    for s in spines:
        m = s.get("match")
        tid = None
        if isinstance(m, dict):
            tid = m.get("tmdb_id") or m.get("id")
        if tid:
            match += 1
        else:
            fail += 1
    return len(spines), match, fail


def main() -> int:
    LOG.write_text(f"=== stage2 batch start {datetime.now().isoformat()} ===\n", encoding="utf-8")
    rows = []
    for n in TESTS:
        d = ROOT / f"out_b_stage1_test{n}"
        boxes = latest_boxes(d)
        if not boxes:
            log(f"SKIP test{n} NO_BOXES")
            continue
        img = ROOT / "photos" / f"test{n}.jpg"
        if not img.exists():
            log(f"SKIP test{n} NO_IMAGE {img}")
            continue
        log(f"START test{n} boxes={boxes.name}")
        out_log = d / "stage2_run.log"
        t0 = time.time()
        cmd = [
            sys.executable,
            "-X",
            "utf8",
            str(ROOT / "scripts" / "recognize_spines_with_tmdb.py"),
            "--spine-boxes-json",
            str(boxes),
            "--out-dir",
            str(d),
            "--image-path",
            str(img),
        ]
        with out_log.open("w", encoding="utf-8") as lf:
            proc = subprocess.run(cmd, stdout=lf, stderr=subprocess.STDOUT, cwd=str(ROOT), env=os.environ.copy())
        sec = round(time.time() - t0, 1)
        results = latest_results(d)
        spines = match = fail = 0
        rpath = ""
        if results:
            rpath = str(results)
            spines, match, fail = stats(results)
        log(
            f"DONE test{n} exit={proc.returncode} sec={sec} spines={spines} match={match} fail={fail} results={results.name if results else 'NONE'}"
        )
        rows.append(
            {
                "test": n,
                "spines": spines,
                "match": match,
                "fail": fail,
                "sec": sec,
                "exit": proc.returncode,
                "results": rpath,
                "boxes": str(boxes),
            }
        )
        SUMMARY.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"=== stage2 batch end ===")
    SUMMARY.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
