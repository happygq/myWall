import argparse
import base64
import json
import os
import re
import sys
from hashlib import md5
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from image_processor import call_vision, encode_pil_to_b64, VISION_MODEL  # noqa: E402
from tmdb_client import TMDBClient  # noqa: E402


def _extract_json(text: str) -> dict:
    if not text:
        return {}
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, flags=re.S | re.I)
    if m:
        return json.loads(m.group(1))
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        return json.loads(text[start : end + 1])
    return {}


def _clamp01(x: float) -> float:
    try:
        x = float(x)
    except Exception:
        return 0.0
    return max(0.0, min(1.0, x))


def _crop_spine(image: Image.Image, bbox: dict, pad_ratio: float = 0.12) -> Image.Image:
    W, H = image.size
    x = float(bbox.get("x") or 0)
    y = float(bbox.get("y") or 0)
    w = float(bbox.get("w") or 0)
    h = float(bbox.get("h") or 0)

    # clamp
    x = max(0.0, min(0.999, x))
    y = max(0.0, min(0.999, y))
    w = max(0.001, min(1.0 - x, w))
    h = max(0.001, min(1.0 - y, h))

    pad_x = w * pad_ratio
    pad_y = h * pad_ratio
    x2 = max(0.0, x - pad_x)
    y2 = max(0.0, y - pad_y)
    w2 = min(1.0 - x2, w + 2 * pad_x)
    h2 = min(1.0 - y2, h + 2 * pad_y)

    left = int(x2 * W)
    top = int(y2 * H)
    right = int((x2 + w2) * W)
    bottom = int((y2 + h2) * H)
    right = max(left + 1, right)
    bottom = max(top + 1, bottom)
    return image.crop((left, top, right, bottom))


def _make_title_prompt() -> str:
    # NOTE: 这里不使用 OCR；依赖视觉模型从裁剪图读取标题
    return (
        "You are a vision model. Read the movie spine/title text from this cropped image.\n"
        "Output STRICT JSON ONLY with keys:\n"
        "{\n"
        "  \"title_cn\": string (Chinese title if visible, else empty),\n"
        "  \"title_en\": string (English/original title if visible, else empty),\n"
        "  \"year\": string (YYYY if clearly visible in parentheses, else empty),\n"
        "  \"confidence\": number between 0 and 1\n"
        "}\n"
        "Rules:\n"
        "- Do not hallucinate; if unreadable, return empty strings and low confidence.\n"
        "- Prefer Chinese title when both languages are present.\n"
    )


def _normalize_year(y: str) -> str:
    y = (y or "").strip()
    m = re.search(r"((?:19|20)\\d{2})", y)
    return m.group(1) if m else ""


def _choose_best_match(title_cn: str, title_en: str, year: str, candidates: list[dict]) -> dict | None:
    if not candidates:
        return None
    # TMDb 搜索结果本身已按 vote_count/popularity 排序；我们只做少量规则加权
    target_year = (year or "").strip()
    best = None
    best_score = -1.0

    for c in candidates:
        c_year = (c.get("year") or "").strip()
        score = float(c.get("vote_count") or 0) * 0.00001 + float(c.get("rating") or 0) * 0.2
        if target_year:
            if c_year == target_year:
                score += 5.0
            elif c_year and abs(int(c_year) - int(target_year)) <= 1:
                score += 1.0
        # 粗略标题命中（避免完全离谱候选）
        tc = (title_cn or "").lower()
        te = (title_en or "").lower()
        cc = (c.get("title_cn") or "").lower()
        ce = (c.get("title_en") or "").lower()
        if tc and (tc in cc or cc in tc):
            score += 1.5
        if te and (te in ce or ce in te):
            score += 1.0

        if score > best_score:
            best_score = score
            best = c

    if not best:
        return None
    return {
        "tmdb_id": best.get("tmdb_id"),
        "media_type": best.get("media_type") or "movie",
        "title_cn": best.get("title_cn", ""),
        "title_en": best.get("title_en", ""),
        "year": best.get("year", ""),
        "score": round(best_score, 4),
    }


def recognize_spines(
    boxes_data: dict,
    image_path: str = "",
    *,
    model: str = VISION_MODEL,
    tmdb_api_key: str | None = None,
    tmdb_access_token: str | None = None,
    limit_spines: int = 0,
    crop_pad: float = 0.12,
    timeout: int = 240,
    progress_cb=None,
) -> dict:
    """
    Stage2：根据 spine_boxes JSON 裁剪识别标题并匹配 TMDb。
    返回与 CLI 写出文件相同结构的 dict（不强制写盘）。
    """
    image_path = (image_path or "").strip() or (boxes_data.get("image_path") or "")
    if not image_path:
        raise ValueError("缺少 image_path：请传入 image_path 或在 boxes json 里提供 image_path。")
    image_path = str(Path(image_path).resolve())
    if not Path(image_path).is_file():
        raise FileNotFoundError(f"原图不存在: {image_path}")

    image_filename = boxes_data.get("image_filename") or os.path.basename(image_path)
    image_id = boxes_data.get("image_id") or md5(image_path.encode("utf-8")).hexdigest()[:10]

    api_key = (tmdb_api_key or "").strip() or None
    access_token = (tmdb_access_token or "").strip() or None
    client = TMDBClient(api_key=api_key, access_token=access_token)

    img = Image.open(image_path).convert("RGB")

    spines = list(boxes_data.get("spines") or [])
    if limit_spines and limit_spines > 0:
        spines = spines[:limit_spines]
    if not spines:
        raise ValueError("boxes 中没有 spines，请先手工加框或跑 stage1")

    title_prompt = _make_title_prompt()
    results_spines = []
    total = len(spines)

    for idx, spine in enumerate(spines, start=1):
        if progress_cb:
            try:
                progress_cb(idx - 1, total, spine.get("id") or f"spine_{idx}")
            except Exception:
                pass

        sid = spine.get("id") or f"spine_{idx}"
        spine_index = int(spine.get("spine_index") or idx)
        bbox = spine.get("bbox") or {}

        crop = _crop_spine(img, bbox, pad_ratio=crop_pad)
        crop_b64 = encode_pil_to_b64(crop, max_size=768, quality=78)

        vision_json = None
        model_conf = 0.0
        for _attempt in range(2):
            try:
                resp = call_vision(model, title_prompt, crop_b64, timeout=timeout, retries=0)
                vision_json = _extract_json(resp or "")
                if vision_json:
                    model_conf = _clamp01(vision_json.get("confidence"))
                    break
            except Exception:
                continue
        vision_json = vision_json or {}

        title_cn = (vision_json.get("title_cn") or "").strip()
        title_en = (vision_json.get("title_en") or "").strip()
        year = _normalize_year(vision_json.get("year") or "")

        candidates = []
        if title_cn or title_en:
            cands = client.search_by_title_and_visual_clues(title_cn=title_cn, title_en=title_en, year=year)
            for c in cands[:15]:
                candidates.append(
                    {
                        "tmdb_id": c.get("tmdb_id"),
                        "media_type": c.get("media_type") or "movie",
                        "title_cn": c.get("title_cn", ""),
                        "title_en": c.get("title_en", ""),
                        "year": c.get("year", ""),
                        "rating": c.get("rating", 0),
                        "vote_count": c.get("vote_count", 0),
                        "overview": c.get("overview", "")[:120],
                    }
                )

        match = _choose_best_match(title_cn, title_en, year, candidates)

        results_spines.append(
            {
                "id": sid,
                "spine_index": spine_index,
                "bbox": {
                    "x": bbox.get("x", 0),
                    "y": bbox.get("y", 0),
                    "w": bbox.get("w", 0),
                    "h": bbox.get("h", 0),
                },
                "recognition": {
                    "title_cn": title_cn,
                    "title_en": title_en,
                    "year": year,
                    "confidence": round(float(model_conf), 4),
                },
                "candidates": candidates,
                "match": match,
            }
        )

        print(f"[{idx}/{total}] {sid}: {title_cn or title_en} ({year}) candidates={len(candidates)} match={bool(match)}")

    if progress_cb:
        try:
            progress_cb(total, total, "done")
        except Exception:
            pass

    return {
        "image_filename": image_filename,
        "image_id": image_id,
        "image_path": image_path,
        "model": model,
        "tmdb": {"used_override_keys": bool(api_key or access_token)},
        "spines": results_spines,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--spine-boxes-json", required=True, help="stage1 输出 spine_boxes_xxx.json")
    ap.add_argument("--image-path", default="", help="可选：原图路径；若省略则从 json 的 image_path 读取")
    ap.add_argument("--out-dir", default=".", help="输出目录")
    ap.add_argument("--out-json", default="", help="输出 json 路径（可选）")
    ap.add_argument("--model", default=VISION_MODEL, help="LM Studio 视觉模型 id")
    ap.add_argument("--tmdb-api-key", default="", help="TMDb API key（可选：为空则使用 config 内默认）")
    ap.add_argument("--tmdb-access-token", default="", help="TMDb Access token（可选：为空则使用 config 内默认）")
    ap.add_argument("--limit-spines", type=int, default=0, help="测试：只处理前 N 根脊（0=全量）")
    ap.add_argument("--crop-pad", type=float, default=0.12, help="裁剪外扩比例")
    ap.add_argument("--timeout", type=int, default=240, help="视觉模型超时（秒）")
    args = ap.parse_args()

    boxes_path = str(Path(args.spine_boxes_json).resolve())
    with open(boxes_path, "r", encoding="utf-8") as f:
        boxes_data = json.load(f)

    image_path = args.image_path.strip() or (boxes_data.get("image_path") or "")
    if not image_path:
        raise SystemExit("缺少 image_path：请用 --image-path 或在 stage1 json 里提供 image_path。")
    image_path = str(Path(image_path).resolve())

    out_dir = Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    image_id = boxes_data.get("image_id") or md5(image_path.encode("utf-8")).hexdigest()[:10]
    if args.out_json:
        out_path = Path(args.out_json).resolve()
    else:
        out_path = out_dir / f"spine_results_{image_id}.json"

    out = recognize_spines(
        boxes_data,
        image_path=image_path,
        model=args.model,
        tmdb_api_key=args.tmdb_api_key or None,
        tmdb_access_token=args.tmdb_access_token or None,
        limit_spines=args.limit_spines,
        crop_pad=args.crop_pad,
        timeout=args.timeout,
    )
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK -> {out_path}")


if __name__ == "__main__":
    main()

