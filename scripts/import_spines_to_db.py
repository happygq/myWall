import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from database import (
    init_db,
    get_wall_image,
    get_all_wall_images,
    find_wall_image_by_original_filename,
    get_discs_by_source_image,
    delete_disc,
    add_disc,
)  # noqa: E402
from tmdb_client import TMDBClient  # noqa: E402


def resolve_wall_image(data: dict, wall_image_id: int = 0, wall_image_original_filename: str = ""):
    wall = None
    if wall_image_id and wall_image_id > 0:
        wall = get_wall_image(wall_image_id)
    if not wall and wall_image_original_filename:
        wall = find_wall_image_by_original_filename(wall_image_original_filename)
    if not wall:
        image_filename = data.get("image_filename") or ""
        all_images = get_all_wall_images()
        for wi in all_images:
            if wi.get("filename") == image_filename or wi.get("original_filename") == image_filename:
                wall = wi
                break
    return wall


def import_spine_results(
    data: dict,
    *,
    wall_image_id: int = 0,
    wall_image_original_filename: str = "",
    reset_existing: bool = False,
    confirmed: int = 1,
    tmdb_api_key: str | None = None,
    tmdb_access_token: str | None = None,
    limit_spines: int = 0,
    require_layout: bool = True,
) -> dict:
    """
    将 stage2 spine_results 写入 discs。
    require_layout=False 时：即使未标定 width/height_ratio 也写入（pos 仅用 photo_offset）。
    """
    init_db()

    spines = list(data.get("spines") or [])
    if limit_spines and limit_spines > 0:
        spines = spines[:limit_spines]

    wall = resolve_wall_image(data, wall_image_id, wall_image_original_filename)
    if not wall:
        raise ValueError("无法定位 wall_images 记录：请提供 wall_image_id（推荐）或原始文件名。")

    api_key = (tmdb_api_key or "").strip() or None
    access_token = (tmdb_access_token or "").strip() or None
    tmdb = TMDBClient(api_key=api_key, access_token=access_token)

    source_image = wall.get("filename") or ""
    if not source_image:
        raise ValueError("wall_images.filename 为空，无法写入 discs.source_image。")

    deleted = 0
    if reset_existing:
        existing = get_discs_by_source_image(source_image)
        for d in existing:
            delete_disc(d["id"])
        deleted = len(existing)
        print(f"已删除现有 discs：source_image={source_image} count={deleted}")

    width_ratio = float(wall.get("width_ratio") or 0)
    height_ratio = float(wall.get("height_ratio") or 0)

    if require_layout and (width_ratio <= 0 or height_ratio <= 0) and confirmed:
        raise ValueError("wall_image 的 width_ratio/height_ratio 为空（请先在网页端完成墙面图片的布局标定）。")

    created = []

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
        media_type = (match.get("media_type") or match.get("tmdb_media_type") or "movie")

        wall_x = float(wall.get("pos_x") or 0) + (photo_offset_x * width_ratio if width_ratio > 0 else 0)
        wall_y = float(wall.get("pos_y") or 0) + (photo_offset_y * height_ratio if height_ratio > 0 else 0)

        disc_data = {
            "tmdb_id": tmdb_id,
            "tmdb_media_type": media_type,
            "title_cn": title_cn or title_en or f"未识别 #{spine_index}",
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

        if tmdb_id:
            movie_full = tmdb.get_media_full(tmdb_id, media_type)
            if movie_full:
                disc_data.update({
                    "tmdb_id": movie_full.get("tmdb_id", tmdb_id),
                    "tmdb_media_type": movie_full.get("media_type") or media_type,
                    "title_cn": movie_full.get("title_cn", title_cn),
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

        disc_id = add_disc(disc_data)
        created.append({"disc_id": disc_id, "spine_index": spine_index, "tmdb_id": tmdb_id})

    return {
        "created": created,
        "count": len(created),
        "deleted": deleted,
        "wall_image_id": wall.get("id"),
        "source_image": source_image,
        "layout_ready": bool(width_ratio > 0 and height_ratio > 0),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--spine-results-json", required=True, help="stage2 输出 spine_results_xxx.json")
    ap.add_argument("--wall-image-id", type=int, default=0, help="要导入的墙面图片 id（推荐）")
    ap.add_argument("--wall-image-original-filename", default="", help="可选：原始文件名，用于匹配 wall_images.original_filename")
    ap.add_argument("--out-summary", default="", help="可选：导出简要结果 json 路径")
    ap.add_argument("--reset-existing", action="store_true", help="如果开启：先删除该 wall_image 的已存在 discs（source_image 相同）")
    ap.add_argument("--confirmed", type=int, default=1, help="写入 confirmed 值（建议 1）")
    ap.add_argument("--tmdb-api-key", default="", help="TMDb API key（可选）")
    ap.add_argument("--tmdb-access-token", default="", help="TMDb Access token（可选）")
    ap.add_argument("--limit-spines", type=int, default=0, help="测试：只导入前 N 根脊（0=全量）")
    args = ap.parse_args()

    results_path = Path(args.spine_results_json).resolve()
    with open(results_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    try:
        summary = import_spine_results(
            data,
            wall_image_id=args.wall_image_id,
            wall_image_original_filename=args.wall_image_original_filename,
            reset_existing=args.reset_existing,
            confirmed=args.confirmed,
            tmdb_api_key=args.tmdb_api_key or None,
            tmdb_access_token=args.tmdb_access_token or None,
            limit_spines=args.limit_spines,
            require_layout=True,
        )
    except ValueError as e:
        raise SystemExit(str(e)) from e

    print(f"OK: 已导入 discs count={summary['count']} from={results_path.name} wall_image_id={summary['wall_image_id']}")

    if args.out_summary:
        Path(args.out_summary).resolve().write_text(
            json.dumps({"created": summary["created"], "count": summary["count"]}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )


if __name__ == "__main__":
    main()

