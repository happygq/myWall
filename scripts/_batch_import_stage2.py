# -*- coding: utf-8 -*-
from __future__ import annotations
import hashlib, json, os, sys, time, traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from config import DATABASE_PATH, PHOTOS_FOLDER, TMDB_ACCESS_TOKEN, TMDB_API_KEY, UPLOAD_FOLDER
from database import (
    add_disc, add_wall_image, delete_disc, find_wall_image_by_hash,
    get_all_discs, get_discs_by_source_image, get_wall_image, init_db,
)
from image_processor import get_image_dimensions
from scripts.import_spines_to_db import resolve_wall_image
from tmdb_client import TMDBClient, TMDbError

TESTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13]

def md5_file(p: Path) -> str:
    h = hashlib.md5()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def find_upload_by_md5(digest: str):
    for p in Path(UPLOAD_FOLDER).glob("*.jpg"):
        if md5_file(p) == digest:
            return p
    return None

def ensure_wall(test_n: int, digest: str):
    wall = find_wall_image_by_hash(digest)
    if wall:
        return wall, False
    upload = find_upload_by_md5(digest)
    if upload:
        src_path, filename = upload, upload.name
    else:
        src_path = Path(PHOTOS_FOLDER) / f"test{test_n}.jpg"
        filename = src_path.name
    try:
        width, height = get_image_dimensions(str(src_path))
    except Exception:
        width, height = 0, 0
    wid = add_wall_image(
        filename, str(src_path.resolve()), "closeup", 0, 0, 0, 0,
        width, height, file_hash=digest, original_filename=f"test{test_n}.jpg",
    )
    return get_wall_image(wid), True

def import_resilient(data: dict, wall_image_id: int, confirmed: int = 1) -> dict:
    init_db()
    spines = list(data.get("spines") or [])
    wall = resolve_wall_image(data, wall_image_id, "")
    if not wall:
        raise ValueError(f"wall_image_id={wall_image_id} not found")

    enrich = os.environ.get("MYWALL_ENRICH_TMDB", "0") == "1"
    tmdb = TMDBClient(api_key=TMDB_API_KEY, access_token=TMDB_ACCESS_TOKEN) if enrich else None
    source_image = wall.get("filename") or ""
    if not source_image:
        raise ValueError("empty wall filename")

    existing = get_discs_by_source_image(source_image)
    for d in existing:
        delete_disc(d["id"])
    deleted = len(existing)
    print(f"deleted existing discs source_image={source_image} count={deleted}", flush=True)

    width_ratio = float(wall.get("width_ratio") or 0)
    height_ratio = float(wall.get("height_ratio") or 0)
    created, tmdb_ok, tmdb_fail = [], 0, 0

    for spine in spines:
        bbox = spine.get("bbox") or {}
        photo_offset_x = float(bbox.get("x") or 0)
        photo_offset_y = float(bbox.get("y") or 0)
        bbox_w = float(bbox.get("w") or 0)
        bbox_h = float(bbox.get("h") or 0)
        spine_index = int(spine.get("spine_index") or 0)
        rec = spine.get("recognition") or {}
        title_cn = (rec.get("title_cn") or "").strip()
        title_en = (rec.get("title_en") or "").strip()
        year = (rec.get("year") or "").strip()
        match = spine.get("match") or {}
        tmdb_id = match.get("tmdb_id")
        media_type = match.get("media_type") or match.get("tmdb_media_type") or "movie"
        if match.get("title_cn"):
            title_cn = title_cn or str(match.get("title_cn") or "").strip()
        if match.get("title_en"):
            title_en = title_en or str(match.get("title_en") or "").strip()
        if match.get("year"):
            year = year or str(match.get("year") or "").strip()

        wall_x = float(wall.get("pos_x") or 0) + (photo_offset_x * width_ratio if width_ratio > 0 else 0)
        wall_y = float(wall.get("pos_y") or 0) + (photo_offset_y * height_ratio if height_ratio > 0 else 0)

        disc_data = {
            "tmdb_id": tmdb_id,
            "tmdb_media_type": media_type,
            "title_cn": title_cn or title_en or f"unrecognized#{spine_index}",
            "title_en": title_en,
            "year": year,
            "pos_x": round(wall_x, 4),
            "pos_y": round(wall_y, 4),
            "photo_offset_x": round(photo_offset_x, 4),
            "photo_offset_y": round(photo_offset_y, 4),
            "bbox_w": round(bbox_w, 4),
            "bbox_h": round(bbox_h, 4),
            "source_image": source_image,
            "confirmed": int(confirmed),
        }

        if tmdb_id and tmdb is not None:
            movie_full = None
            for attempt in range(3):
                try:
                    movie_full = tmdb.get_media_full(tmdb_id, media_type)
                    break
                except Exception as e:
                    print(f"  TMDb retry spine={spine_index} id={tmdb_id} attempt={attempt+1}: {e}", flush=True)
                    time.sleep(2 * (attempt + 1))
            if movie_full:
                tmdb_ok += 1
                disc_data.update({
                    "tmdb_id": movie_full.get("tmdb_id", tmdb_id),
                    "tmdb_media_type": movie_full.get("media_type") or media_type,
                    "title_cn": movie_full.get("title_cn", title_cn) or disc_data["title_cn"],
                    "title_en": movie_full.get("title_en", title_en),
                    "year": movie_full.get("year", year),
                    "directors": movie_full.get("directors", []),
                    "cast": movie_full.get("cast", []),
                    "synopsis_cn": movie_full.get("synopsis_cn", ""),
                    "synopsis_en": movie_full.get("synopsis_en", ""),
                    "rating": movie_full.get("rating", 0),
                    "genres": movie_full.get("genres", []),
                    "poster_url": movie_full.get("poster_url") or "",
                    "backdrop_url": movie_full.get("backdrop_url") or "",
                    "runtime": movie_full.get("runtime", 0),
                    "original_language": movie_full.get("original_language", ""),
                })
            else:
                tmdb_fail += 1

        disc_id = add_disc(disc_data)
        created.append({"disc_id": disc_id, "spine_index": spine_index, "tmdb_id": tmdb_id})

    return {
        "created": created,
        "count": len(created),
        "deleted": deleted,
        "wall_image_id": wall.get("id"),
        "source_image": source_image,
        "layout_ready": bool(width_ratio > 0 and height_ratio > 0),
        "tmdb_ok": tmdb_ok,
        "tmdb_fail": tmdb_fail,
        "enrich": enrich,
    }

def main():
    init_db()
    before_total = len(get_all_discs())
    print(f"DB={DATABASE_PATH}", flush=True)
    print(f"before_total_discs={before_total}", flush=True)
    print(f"MYWALL_ENRICH_TMDB={os.environ.get('MYWALL_ENRICH_TMDB', '0')}", flush=True)

    report = []
    for t in TESTS:
        item = {"test": f"test{t}", "ok": False}
        try:
            out_dir = ROOT / f"out_b_stage1_test{t}"
            results_files = sorted(out_dir.glob("spine_results_*.json"))
            if not results_files:
                raise FileNotFoundError(f"no spine_results in {out_dir}")
            results_path = results_files[0]
            data = json.loads(results_path.read_text(encoding="utf-8"))
            spines = data.get("spines") or []
            matched = sum(1 for s in spines if (s.get("match") or {}).get("tmdb_id"))
            photo = Path(PHOTOS_FOLDER) / f"test{t}.jpg"
            if not photo.exists():
                raise FileNotFoundError(str(photo))
            digest = md5_file(photo)
            wall, created_wall = ensure_wall(t, digest)
            src = wall.get("filename") or ""
            old_count = len(get_discs_by_source_image(src))
            item.update({
                "results": str(results_path.relative_to(ROOT)),
                "spines": len(spines),
                "matched": matched,
                "md5": digest,
                "wall_image_id": wall["id"],
                "source_image": src,
                "created_wall": created_wall,
                "old_discs": old_count,
                "layout_ready": bool(float(wall.get("width_ratio") or 0) > 0 and float(wall.get("height_ratio") or 0) > 0),
            })
            print(
                f"\n=== test{t} wall_id={wall['id']} source={src} old={old_count} "
                f"spines={len(spines)} matched={matched} layout={item['layout_ready']} ===",
                flush=True,
            )
            summary = import_resilient(data, wall["id"], confirmed=1)
            item.update({
                "ok": True,
                "deleted": summary["deleted"],
                "created": summary["count"],
                "tmdb_ok": summary["tmdb_ok"],
                "tmdb_fail": summary["tmdb_fail"],
                "layout_ready_after": summary["layout_ready"],
                "enrich": summary["enrich"],
            })
            print(
                f"OK test{t}: deleted={item['deleted']} created={item['created']} "
                f"tmdb_ok={item['tmdb_ok']} tmdb_fail={item['tmdb_fail']}",
                flush=True,
            )
        except Exception as e:
            item["error"] = str(e)
            item["traceback"] = traceback.format_exc()
            print(f"FAIL test{t}: {e}", flush=True)
            print(item["traceback"], flush=True)
        report.append(item)

    after = get_all_discs()
    related_sources = {r.get("source_image") for r in report if r.get("source_image")}
    related_count = sum(1 for d in after if d.get("source_image") in related_sources)
    out = {
        "before_total": before_total,
        "after_total": len(after),
        "related_sources": sorted(s for s in related_sources if s),
        "related_disc_count": related_count,
        "per_image": [{k: v for k, v in r.items() if k != "traceback"} for r in report],
        "sum_deleted": sum(r.get("deleted") or 0 for r in report),
        "sum_created": sum(r.get("created") or 0 for r in report),
        "sum_tmdb_ok": sum(r.get("tmdb_ok") or 0 for r in report),
        "sum_tmdb_fail": sum(r.get("tmdb_fail") or 0 for r in report),
        "failures": [r.get("test") for r in report if not r.get("ok")],
        "note": "TMDb live enrich disabled unless MYWALL_ENRICH_TMDB=1; used stage2 match/recognition fields",
    }
    out_path = ROOT / "out_stage2_import_summary.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("\n==== SUMMARY ====", flush=True)
    print(json.dumps({k: out[k] for k in out if k != "per_image"}, ensure_ascii=False, indent=2), flush=True)
    for r in report:
        print(
            f"{r.get('test')}: ok={r.get('ok')} deleted={r.get('deleted')} created={r.get('created')} "
            f"wall={r.get('wall_image_id')} layout={r.get('layout_ready')} err={r.get('error')}",
            flush=True,
        )
    print(f"wrote {out_path}", flush=True)

if __name__ == "__main__":
    main()