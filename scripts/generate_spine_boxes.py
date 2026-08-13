import argparse
import json
import os
import re
import sys
from dataclasses import dataclass
from hashlib import md5
from pathlib import Path

from PIL import Image

# 让脚本可在 scripts/ 下独立运行
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from image_processor import call_vision, load_and_encode, get_image_dimensions, VISION_MODEL  # noqa: E402


BOX_SCHEMA_EXAMPLE = {
    "spines": [
        {
            "id": "spine_1",
            "spine_index": 1,
            "bbox": {"x": 0.12, "y": 0.34, "w": 0.06, "h": 0.28},
            "confidence": 0.73,
            "crop_source": "spine",
        }
    ]
}


def _strip_markdown_fence(text: str) -> str:
    """去掉 ``` / ```json 代码块围栏，保留内部内容。"""
    text = text.strip()
    m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, flags=re.I)
    if m:
        return m.group(1).strip()
    # 半截 fence：开头有 ``` 但未闭合
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.I)
        text = re.sub(r"\s*```\s*$", "", text)
    return text.strip()


def _first_json_object(text: str) -> str | None:
    """截取第一个平衡的 {...} 对象（忽略字符串内的括号）。"""
    start = text.find("{")
    if start < 0:
        return None
    depth = 0
    in_str = False
    escape = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    # 未闭合：返回从 { 到末尾，交给后续修复
    return text[start:]


def _fix_trailing_commas(s: str) -> str:
    return re.sub(r",\s*([}\]])", r"\1", s)


def _salvage_truncated_json(s: str) -> str | None:
    """
    尝试从截断的 JSON 中抢救：截到最后一个完整对象后补齐括号。
    常见于 max_tokens 截断导致的 'Expecting ,' / 未闭合数组。
    """
    # 优先：spines 数组里最后一个完整 {...}
    last_obj_end = -1
    depth = 0
    in_str = False
    escape = False
    for i, ch in enumerate(s):
        if in_str:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth >= 1:
                last_obj_end = i
    if last_obj_end < 0:
        return None
    head = s[: last_obj_end + 1].rstrip()
    # 去掉末尾多余逗号
    head = re.sub(r",\s*$", "", head)
    # 统计未闭合括号并补齐
    open_curly = head.count("{") - head.count("}")
    open_square = head.count("[") - head.count("]")
    if open_curly < 0 or open_square < 0:
        return None
    return head + ("]" * open_square) + ("}" * open_curly)


def _loads_json_lenient(candidate: str) -> dict:
    """尝试多种修复后 json.loads，失败则抛出最后一次异常。"""
    last_err: Exception | None = None
    variants = [candidate, _fix_trailing_commas(candidate)]
    salvaged = _salvage_truncated_json(_fix_trailing_commas(candidate))
    if salvaged and salvaged not in variants:
        variants.append(salvaged)
        variants.append(_fix_trailing_commas(salvaged))

    for v in variants:
        try:
            obj = json.loads(v)
            if isinstance(obj, dict):
                return obj
        except Exception as e:
            last_err = e
    if last_err:
        raise last_err
    return {}


def _extract_json(text: str) -> dict:
    """
    兼容模型可能输出 markdown code fence / 额外说明 / 尾逗号 / 截断 JSON。
    返回第一个可解析的 JSON object；无法解析时抛出 JSONDecodeError。
    """
    if not text or not str(text).strip():
        return {}
    cleaned = _strip_markdown_fence(str(text))
    # 再扫一遍嵌套 fence / 前后废话
    blob = _first_json_object(cleaned)
    if not blob:
        # 有时 JSON 埋在 reasoning 长文中间，再全量扫一次
        blob = _first_json_object(str(text))
    if not blob:
        return {}
    return _loads_json_lenient(blob)


def _make_json_repair_prompt(prev_error: str, base_prompt: str) -> str:
    err = (prev_error or "invalid JSON")[:240]
    return (
        "CRITICAL: Your previous reply was NOT valid JSON.\n"
        f"Parser error: {err}\n"
        "Reply with STRICT JSON ONLY. No markdown fences, no commentary, no trailing commas.\n"
        "Start with { and end with }. Schema reminder:\n"
        '{"spines":[{"id":"spine_1","spine_index":1,"bbox":{"x":0,"y":0,"w":0,"h":0},'
        '"confidence":0.0,"crop_source":"spine"}]}\n\n'
        f"Original task:\n{base_prompt}"
    )


def _vision_json(model: str, prompt: str, img_b64: str, retries: int, timeout: int = 240) -> dict:
    """
    调视觉模型并解析 JSON；失败时自动重试并用更严的 JSON ONLY 纠错 prompt。
    retries: 额外纠错次数（默认脚本 --retries=1 → 共 2 次尝试）。
    """
    last_err: Exception | None = None
    cur_prompt = prompt
    # 至少再多 1 次纠错机会；上限与 retries 对齐（1–2 次重试）
    max_attempts = max(2, retries + 1)
    for attempt in range(max_attempts):
        try:
            # 外层已做 JSON 纠错重试，单次 HTTP 少叠一层
            resp = call_vision(model, cur_prompt, img_b64, timeout=timeout, retries=min(1, retries))
            data = _extract_json(resp or "")
            if isinstance(data, dict):
                return data
            raise json.JSONDecodeError("empty or non-object JSON", resp or "", 0)
        except Exception as e:
            last_err = e
            if attempt >= max_attempts - 1:
                break
            print(f"WARNING: JSON parse failed (attempt {attempt + 1}/{max_attempts}): {e}")
            cur_prompt = _make_json_repair_prompt(str(e), prompt)
            import time

            time.sleep(1.5 * (attempt + 1))
    assert last_err is not None
    raise last_err


def _clamp01(x: float) -> float:
    if x is None:
        return 0.0
    try:
        x = float(x)
    except Exception:
        return 0.0
    return max(0.0, min(1.0, x))


def _validate_and_normalize_spines(raw_spines: list, max_spines: int) -> list:
    out = []
    for i, s in enumerate(raw_spines or []):
        if len(out) >= max_spines:
            break
        if not isinstance(s, dict):
            continue
        bbox = s.get("bbox") or {}
        x = _clamp01(bbox.get("x"))
        y = _clamp01(bbox.get("y"))
        w = _clamp01(bbox.get("w"))
        h = _clamp01(bbox.get("h"))
        # 纠偏：如果 w/h 为 0 或导致越界则丢弃
        if w <= 0.002 or h <= 0.002:
            continue
        if x + w > 1.001:
            w = max(0.0, 1.0 - x)
        if y + h > 1.001:
            h = max(0.0, 1.0 - y)
        if w <= 0.002 or h <= 0.002:
            continue
        out.append(
            {
                "id": str(s.get("id") or f"spine_{i+1}"),
                "spine_index": int(s.get("spine_index") or (len(out) + 1)),
                "bbox": {"x": round(x, 4), "y": round(y, 4), "w": round(w, 4), "h": round(h, 4)},
                "confidence": float(s.get("confidence") or 0.0),
                "crop_source": str(s.get("crop_source") or "spine"),
            }
        )
    # 稳定排序：按 bbox center
    out.sort(key=lambda it: (it["bbox"]["y"] + it["bbox"]["h"] * 0.5, it["bbox"]["x"] + it["bbox"]["w"] * 0.5))
    # 重排 spine_index（保证 1..N）
    for idx, it in enumerate(out, start=1):
        it["spine_index"] = idx
        it["id"] = f"spine_{idx}"
    return out


def _make_prompt_one_shot() -> str:
    return (
        "You are a vision model. Output STRICT JSON ONLY (no markdown, no extra text).\n"
        "Task: detect ALL visible Blu-ray/DVD movie disc spines / title strips in the provided shelf photo.\n"
        "Spines may be horizontal, vertical/rotated, or title strips on the floor. Treat each visible title strip the same.\n"
        "Return bboxes that tightly cover the title strip area (not the whole spine if too wide), aiming to include the main title text.\n\n"
        "Output schema:\n"
        f"{json.dumps({'spines': [{'id':'spine_1','spine_index':1,'bbox':{'x':0,'y':0,'w':0,'h':0},'confidence':0.0,'crop_source':'spine'}]}, ensure_ascii=False)}\n\n"
        "Rules:\n"
        "- bbox fields are normalized to the input image size: x,y are top-left in [0,1]; w,h are widths/heights in [0,1].\n"
        "- spine_index MUST start at 1 and follow ordering: top-to-bottom by bbox center y, then left-to-right by bbox center x.\n"
        "- If uncertain, still include the spine with low confidence.\n"
        "- Include between 5 and 40 items if the photo quality allows.\n"
        "- Do NOT hallucinate non-spines.\n"
    )


def _make_prompt_tile(tile_note: str) -> str:
    return (
        "You are a vision model. Output STRICT JSON ONLY (no markdown, no extra text).\n"
        f"{tile_note}\n"
        "Detect ALL visible disc spines / title strips in this crop.\n"
        "Return schema: {\"spines\": [ {\"id\":\"spine_1\",\"spine_index\":1,\"bbox\":{\"x\":0,\"y\":0,\"w\":0,\"h\":0},\"confidence\":0.0,\"crop_source\":\"spine\"} ... ]}\n"
        "bbox normalized to the crop.\n"
    )


def _iou(a: dict, b: dict) -> float:
    ax1, ay1, aw, ah = a["bbox"]["x"], a["bbox"]["y"], a["bbox"]["w"], a["bbox"]["h"]
    bx1, by1, bw, bh = b["bbox"]["x"], b["bbox"]["y"], b["bbox"]["w"], b["bbox"]["h"]
    ax2, ay2 = ax1 + aw, ay1 + ah
    bx2, by2 = bx1 + bw, by1 + bh
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
    inter = iw * ih
    if inter <= 0:
        return 0.0
    area_a = aw * ah
    area_b = bw * bh
    union = max(1e-9, area_a + area_b - inter)
    return inter / union


def _dedupe_spines(spines: list, iou_threshold: float = 0.62) -> list:
    spines = list(spines)
    out = []
    for s in sorted(spines, key=lambda it: float(it.get("confidence") or 0.0), reverse=True):
        dup = False
        for kept in out:
            if _iou(s, kept) >= iou_threshold:
                dup = True
                break
        if not dup:
            out.append(s)
    out.sort(key=lambda it: (it["bbox"]["y"] + it["bbox"]["h"] * 0.5, it["bbox"]["x"] + it["bbox"]["w"] * 0.5))
    for idx, it in enumerate(out, start=1):
        it["spine_index"] = idx
        it["id"] = f"spine_{idx}"
    return out


def _crop_tile(img: Image.Image, x: float, y: float, w: float, h: float) -> Image.Image:
    # x,y,w,h are normalized in [0,1]
    W, H = img.size
    left = int(x * W)
    top = int(y * H)
    right = int((x + w) * W)
    bottom = int((y + h) * H)
    right = max(left + 1, right)
    bottom = max(top + 1, bottom)
    return img.crop((left, top, right, bottom))


def _generate_one_shot(image_path: str, model: str, retries: int, max_spines: int) -> list:
    img_b64, _ = load_and_encode(image_path)
    prompt = _make_prompt_one_shot()
    # retries 同时驱动 JSON 纠错次数（1–2 次）
    data = _vision_json(model, prompt, img_b64, retries=max(2, retries), timeout=240)
    return _validate_and_normalize_spines(data.get("spines") or [], max_spines=max_spines)


def _generate_with_tiling(image_path: str, model: str, retries: int, max_spines: int) -> list:
    img = Image.open(image_path).convert("RGB")
    full_w, full_h = img.size

    # 2x2 + overlap；模型仍然输出 normalized-to-crop bboxes
    ov = 0.08
    tiles = []
    for ty in [0.0, 1.0]:
        for tx in [0.0, 1.0]:
            x0 = max(0.0, tx - ov) if tx < 1 else 0.5
            y0 = max(0.0, ty - ov) if ty < 1 else 0.5
            # 简化：固定成左右/上下各一半再补 overlap
            if tx < 1 and ty < 1:
                x, y, w, h = 0.0, 0.0, 0.5 + ov, 0.5 + ov
            elif tx >= 1 and ty < 1:
                x, y, w, h = 0.5 - ov, 0.0, 0.5 + ov, 0.5 + ov
            elif tx < 1 and ty >= 1:
                x, y, w, h = 0.0, 0.5 - ov, 0.5 + ov, 0.5 + ov
            else:
                x, y, w, h = 0.5 - ov, 0.5 - ov, 0.5 + ov, 0.5 + ov
            # clamp
            x = max(0.0, min(1.0 - 0.001, x))
            y = max(0.0, min(1.0 - 0.001, y))
            w = max(0.001, min(1.0 - x, w))
            h = max(0.001, min(1.0 - y, h))
            tiles.append({"x": x, "y": y, "w": w, "h": h})

    # 去重容器
    all_spines = []
    for idx, t in enumerate(tiles, start=1):
        crop = _crop_tile(img, t["x"], t["y"], t["w"], t["h"])
        # 将 crop 保存到临时内存编码（复用 image_processor 的 thumbnail 逻辑也可以，但这里直接用 PIL）
        # 为了保持 normalized 的不变性，直接用 PIL crop 后 encode。
        # 复用 image_processor.load_and_encode 的逻辑不方便（需要 path），所以直接二次调用 call_vision 输入 crop 编码。
        import io
        import base64

        buf = io.BytesIO()
        crop.thumbnail((1536, 1536), Image.LANCZOS)
        crop.save(buf, format="JPEG", quality=75)
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        prompt = _make_prompt_tile(f"This crop is tile {idx}/4 at normalized region x={t['x']}, y={t['y']}, w={t['w']}, h={t['h']} in the original photo.")
        try:
            data = _vision_json(model, prompt, b64, retries=max(2, retries), timeout=240)
        except Exception as e:
            print(f"WARNING: tile {idx}/4 JSON failed, skipping tile: {e}")
            continue
        tile_spines = _validate_and_normalize_spines(data.get("spines") or [], max_spines=max_spines)
        # 将 crop-normalized bbox 映射回全图-normalized
        for s in tile_spines:
            bb = s["bbox"]
            gx = t["x"] + bb["x"] * t["w"]
            gy = t["y"] + bb["y"] * t["h"]
            gw = bb["w"] * t["w"]
            gh = bb["h"] * t["h"]
            s["bbox"] = {"x": round(_clamp01(gx), 4), "y": round(_clamp01(gy), 4), "w": round(_clamp01(gw), 4), "h": round(_clamp01(gh), 4)}
            all_spines.append(s)

    return _dedupe_spines(all_spines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--image-path", required=True, help="输入照片路径")
    ap.add_argument("--out-dir", default=".", help="输出目录")
    ap.add_argument("--out-json", default="", help="输出 json 路径（可选）")
    ap.add_argument("--model", default=VISION_MODEL, help="LM Studio 视觉模型 id")
    ap.add_argument("--retries", type=int, default=1, help="单次调用失败的重试次数")
    ap.add_argument("--min-spines", type=int, default=8, help="期望最少碟脊数量（低于它会触发平铺 fallback）")
    ap.add_argument("--max-spines", type=int, default=40, help="允许最多碟脊数量")
    ap.add_argument("--fallback-tiling", action="store_true", help="当输出数量不符合期望时，改用模型分块检测")
    args = ap.parse_args()

    image_path = str(Path(args.image_path).resolve())
    image_filename = os.path.basename(image_path)
    out_dir = Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    w, h = get_image_dimensions(image_path)
    if w <= 0 or h <= 0:
        raise SystemExit(f"无法读取图片尺寸: {image_path}")

    # 稳定 image_id：用文件内容 hash（小图时仍可接受）
    try:
        content_hash = md5(Path(image_path).read_bytes()).hexdigest()[:10]
    except Exception:
        st = os.stat(image_path)
        content_hash = md5(f"{image_path}:{st.st_mtime}".encode("utf-8")).hexdigest()[:10]
    image_id = content_hash

    if args.out_json:
        out_path = Path(args.out_json).resolve()
    else:
        out_path = out_dir / f"spine_boxes_{image_id}.json"

    spines = []
    try:
        spines = _generate_one_shot(image_path, args.model, retries=args.retries, max_spines=args.max_spines)
        if args.fallback_tiling and len(spines) < args.min_spines:
            spines = _generate_with_tiling(image_path, args.model, retries=args.retries, max_spines=args.max_spines)
    except Exception:
        if args.fallback_tiling:
            spines = _generate_with_tiling(image_path, args.model, retries=args.retries, max_spines=args.max_spines)
        else:
            raise

    if not spines:
        raise SystemExit("模型没有输出可用 spines（建议启用 --fallback-tiling 或更换图片/模型）")

    result = {
        "image_filename": image_filename,
        "image_path": image_path,
        "image_w": int(w),
        "image_h": int(h),
        "image_id": image_id,
        "model": args.model,
        "tiling_fallback": bool(args.fallback_tiling),
        "spines": spines,
    }

    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK -> {out_path}")


if __name__ == "__main__":
    main()

