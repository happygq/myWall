"""图像识别模块 v2.7 — LM Studio 远程视觉模型 + 布局自适应 tiling
策略：
1. 图片缩放到 MAX_IMG_SIZE(1536) 以内，兼顾密集碟脊可读性
2. 视觉模型用自然语言 prompt（覆盖货架横脊/立式竖脊/地面平铺）
3. EasyOCR + 全图视觉 + 布局自适应 tiling → 合并去重
4. 布局由宽高比 + OCR bbox 方向推断（不做写死三列）
5. 支持手工框选区域 analyze_region（裁剪后视觉+OCR）
6. LM Studio @ ericgan (192.168.1.41:1234)

切换更强视觉模型（天花板主要在模型）:
  set VISION_MODEL=google/gemma-4-31b-qat
  或 VISION_MODEL_AUTO=1；默认 glm-4.6v-flash（快，难追平云端）。
"""
import os
import re
import json
import base64
import io
import logging
import requests
from PIL import Image

_log = logging.getLogger("mywall.vision")

_reader = None
LMSTUDIO_BASE = os.environ.get("LMSTUDIO_BASE", "http://192.168.1.41:1234")
_DEFAULT_VISION = "zai-org/glm-4.6v-flash"
# 优先序：明确的视觉/多模态 > flash。Qwen3.6 文本型不会自动选用。
_VISION_PREFERENCE = [
    "google/gemma-4-31b-qat",
    "zai-org/glm-4.6v-flash",
]
MAX_IMG_SIZE = 1536


def _list_lmstudio_models() -> list:
    try:
        resp = requests.get(f"{LMSTUDIO_BASE}/v1/models", timeout=(20, 8))
        resp.raise_for_status()
        return [m.get("id", "") for m in resp.json().get("data", []) if m.get("id")]
    except Exception as e:
        _log.warning("Cannot list LM Studio models: %s", e)
        return []


def resolve_vision_model() -> str:
    """解析实际使用的视觉模型。环境变量 VISION_MODEL 优先；AUTO 时按偏好表选择。"""
    forced = (os.environ.get("VISION_MODEL") or "").strip()
    if forced:
        return forced
    available = _list_lmstudio_models()
    if os.environ.get("VISION_MODEL_AUTO", "").strip() in ("1", "true", "yes"):
        for pref in _VISION_PREFERENCE:
            if pref in available:
                _log.info("VISION_MODEL_AUTO selected %s (available=%s)", pref, available)
                return pref
    if _DEFAULT_VISION in available:
        return _DEFAULT_VISION
    for pref in _VISION_PREFERENCE:
        if pref in available:
            return pref
    return _DEFAULT_VISION


VISION_MODEL = resolve_vision_model()
VISION_MODEL_HQ = VISION_MODEL
_log.info("Vision model: %s", VISION_MODEL)

# ===== v2.4 黑名单 — 严格过滤 OCR 噪音 =====

    # 常见演员名字（大小写不敏感匹配）
ACTOR_NAMES = {
    "sean", "bean", "graham", "stephen", "sam", "tom", "ben", "jim", "dan",
    "tim", "ray", "max", "ian", "jon", "kim", "amy", "eva", "zoe", "liv",
    "mia", "ava", "leo", "eli", "ian", "colin", "hugh", "jude", "kate",
    "anne", "jane", "rose", "lily", "eric", "mark", "paul", "john", "mike",
    "dave", "steve", "bill", "jack", "ryan", "matt", "luke", "chris", "nick",
    "brad", "george", "henry", "bruce", "kevin", "adam", "josh", "alex",
    "peter", "robert", "james", "david", "michael", "william", "alice",
    "emma", "sarah", "laura", "susan", "lucy", "claire", "nancy", "helen",
    "grace", "ruby", "ella", "sophie", "chloe", "olivia", "freya",
    "edward", "arthur", "oliver", "harry", "oscar", "alfred", "louis",
    # 碟片中常见的被误读为 title 的演员姓氏
    "connery", "craig", "depp", "pitt", "hanks", "dicaprio", "freeman",
    "lawrence", "jolie", "theron", "kidman", "blanchett", "winslet",
    "nicholson", "pacino", "deniro", "streep", "hopkins", "swinton",
    # OCR 误读变体
    "claflin", "clallin", "clafin", "claffin", "sam claflin", "sam clallin",
}

# 出版商/发行商
PUBLISHERS = {
    "bbc", "uionsgate", "lionsgate", "carnaby", "curzon", "artificial",
    "eye", "studiocanal", "eureka", "arrow", "criterion", "warner",
    "universal", "paramount", "disney", "sony", "mgm", "fox", "pathe",
    "optimum", "momentum", "entertainment", "bfi", "channel", "film4",
    "working", "title", "film", "pictures", "studios", "classics",
    "release", "bros", "columbia", "tristar", "miramax", "dreamworks",
    "lions", "gate", "home", "video", "distribution", "productions",
    "second", "sight", "mubi", "curzon", "artifical", "radiance",
    "powerhouse", "indicator", "signal", "one", "88", "films",
}

# 格式/介质标签
FORMAT_LABELS = {
    "bluray", "blu-ray", "bluraydisc", "bluray-disc", "blu-raydisc",
    "blueray", "dvd", "hd", "sd", "uhd", "disc", "bd", "4k", "ultrahd",
    "hddvd", "vhs", "laserdisc", "blu", "ray", "hdr", "dolby",
    "atmos", "dts", "dtshd", "truehd", "pcm", "remastered",
    "widescreen", "fullscreen", "letterbox", "anamorphic",
    "collectors", "edition", "special", "extended", "directors",
    "cut", "uncut", "unrated", "theatrical", "steelbook",
    "digibook", "digipack", "slipcover", "slipcase",
}

# 泛化短语（宣传标语等）
GENERIC_PHRASES = {
    "from the multi award winning", "based on the incredible true story of",
    "based on the true story", "from the director of", "from the producer of",
    "starring", "featuring", "in association with", "presented by",
    "a film by", "written and directed by", "written by", "directed by",
    "produced by", "executive producer", "co producer", "music by",
    "cinematography by", "edited by", "production design by",
    "costume design by", "soundtrack", "original motion picture",
    "includes", "bonus", "features", "deleted", "scenes", "trailer",
    "behind the scenes", "the making of", "interview", "commentary",
    "audio commentary", "subtitles", "subtitled", "dubbed",
    "region", "code", "all regions", "region free",
    "widescreen", "standard", "version",
}

# 通用无意义单词
COMMON_WORDS = {
    "english", "chinese", "japanese", "french", "asian", "text",
    "language", "image", "photo", "collection", "others", "including",
    "organized", "visible", "rows", "diverse", "cover", "art",
    "featuring", "such", "these", "those", "various", "alongside",
    "followed", "mixed", "thrillers", "films", "movies",
    "and", "the", "with", "for", "from", "that", "this",
    "series", "season", "episode", "part", "volume",
}


def load_and_encode(path: str, max_size=MAX_IMG_SIZE, quality=70) -> tuple:
    """加载图片并编码为 base64，返回 (b64_str, PIL.Image)"""
    img = Image.open(path).convert("RGB")
    img.thumbnail((max_size, max_size), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    return base64.b64encode(buf.getvalue()).decode("utf-8"), img


def encode_pil_to_b64(img_pil, max_size=MAX_IMG_SIZE, quality=75):
    """将 PIL Image 编码为 base64 JPEG 字符串"""
    img = img_pil.copy()
    img.thumbnail((max_size, max_size), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def extract_tile(img_pil, x_ratio, y_ratio, w_ratio, h_ratio):
    """按比例坐标裁剪子区域 (0.0~1.0)，返回 PIL Image"""
    w, h = img_pil.size
    x = int(x_ratio * w)
    y = int(y_ratio * h)
    tw = int(w_ratio * w)
    th = int(h_ratio * h)
    return img_pil.crop((x, y, x + tw, y + th))


def _extract_message_text(message: dict) -> str:
    """从 chat completion message 提取可用文本。

    GLM-4.6V 等模型在 LM Studio 上常把几乎全部 token 写进 reasoning_content，
    导致 content 为空；此时回退到 reasoning 字段。
    """
    content = message.get("content")
    if isinstance(content, str) and content.strip():
        return content
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text" and part.get("text"):
                parts.append(part["text"])
            elif isinstance(part, str):
                parts.append(part)
        joined = "\n".join(parts).strip()
        if joined:
            return joined

    for key in ("reasoning_content", "reasoning", "reasoning_text"):
        alt = message.get(key)
        if isinstance(alt, str) and alt.strip():
            print(f"WARNING: vision content empty, falling back to message.{key}")
            return alt
    return content if isinstance(content, str) else ""


def call_vision(model: str, prompt: str, img_b64: str, timeout=180, retries=2, extra_images=None) -> str:
    """调用 LM Studio 视觉模型（OpenAI 兼容 API）
    extra_images: 可选的额外 base64 图片列表（用于碟脊 vs 海报等多图比对）
    """
    for attempt in range(retries + 1):
        try:
            content = [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}},
            ]
            for extra in (extra_images or []):
                if extra:
                    content.append({
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{extra}"},
                    })
            payload = {
                "model": model,
                "messages": [{
                    "role": "user",
                    "content": content,
                }],
                "temperature": 0.1,
                "max_tokens": 4096,
            }
            # 尽量限制/关闭 thinking；不支持则去掉字段重试一次
            thinking_opts = {"enable_thinking": False, "thinking": {"type": "disabled"}}
            resp = requests.post(
                f"{LMSTUDIO_BASE}/v1/chat/completions",
                json={**payload, **thinking_opts},
                timeout=(30, timeout),
            )
            if resp.status_code >= 400:
                resp = requests.post(
                    f"{LMSTUDIO_BASE}/v1/chat/completions",
                    json=payload,
                    timeout=(30, timeout),
                )
            resp.raise_for_status()
            message = resp.json()["choices"][0]["message"]
            return _extract_message_text(message)
        except Exception as e:
            if attempt < retries:
                print(f"Vision call retry {attempt+1}/{retries}: {e}")
                continue
            raise


def get_reader():
    global _reader
    if _reader is None:
        import easyocr
        _reader = easyocr.Reader(["ch_sim", "en"], gpu=False)
    return _reader


def clean_title(text: str) -> str | None:
    """清理文本 — v2.4 更严格的过滤"""
    text = text.strip()
    if len(text) < 2:
        return None
    # 必须包含至少一个字母（防止纯符号/数字）
    if not re.search(r"[A-Za-z\u4e00-\u9fff]", text):
        return None
    patterns = [
        r"^ISBN[\s\d\-]*", r"^\d{10,13}$",
        r"^[A-Z]{2}\d+$", r"^BD\d+$", r"^DVD\d+$",
        r"(?i)ALL\s+RIGHTS\s+RESERVED", r"©.*",
        r"^\d+[xX×]\d+$",  # 分辨率如 1920x1080
        r"^www\.", r"^http",  # URL
        r"^\d{1,3}%$",  # 百分比
        r"^[+\-]?\d+[\.,]\d+$",  # 纯数字带小数点
    ]
    for p in patterns:
        if re.match(p, text, re.IGNORECASE):
            return None
    text = re.sub(r"[【】「」『』〔〕]", "", text)
    text = text.strip("- _,.，。、：:；;！!？?()（）\"\"''\"'\\/—–")
    return text if len(text) >= 2 else None


# ===== 视觉模型 Prompt =====

BULK_PROMPT = (
    "This photo shows movie discs / Blu-ray / DVD spines. Layout varies: "
    "(A) shelf stacks with horizontal spines in columns, "
    "(B) upright discs on a wall shelf with vertical spines (text may be rotated), "
    "(C) caseless discs laid flat on the floor in rows, only title strips visible. "
    "Treat every visible spine/title strip the same regardless of orientation. "
    "Enumerate ALL visible titles from top to bottom, left to right. "
    "For each, read whatever text is legible (full title or partial fragment). "
    "List one title per line with a dash prefix. "
    "Do NOT invent titles; mark uncertain reads with a trailing '?'."
)

TILE_PROMPT = (
    "This is one crop of a larger photo of movie disc spines / title strips. "
    "Spines may be horizontal, vertical/rotated, or floor-laid title strips. "
    "Read ALL visible movie titles in this crop (Chinese and/or English). "
    "List one title per line with a dash prefix. "
    "Partial reads are OK. Do not skip spines. Do not invent titles."
)


def _normalize_candidate_title(raw: str) -> str | None:
    """清理列表行中的片名候选（去掉编号/?/括号注释）。"""
    t = raw.strip()
    t = re.sub(r"^[\-\*•\d\.\)\]]+\s*", "", t)
    t = re.sub(r"\?\s*$", "", t)
    t = re.sub(r"\s*[\(（][^）\)]{0,40}[\)）]\s*$", "", t)
    t = re.sub(r"^[\*_]{1,2}|[\*_]{1,2}$", "", t)
    return clean_title(t)


def parse_title_list(response: str) -> list:
    """从视觉模型回复提取片名：优先 dash/编号列表，兼顾引号与散文列举。"""
    titles = []
    seen = set()

    def _add(title: str, raw: str):
        if not title:
            return
        key = title.lower()
        # 近重复：更短的被更长的覆盖
        for existing in list(seen):
            if key == existing:
                return
            if key in existing or existing in key:
                if len(key) <= len(existing):
                    return
                # 用更长标题替换
                titles[:] = [x for x in titles if x["title"].lower() != existing]
                seen.discard(existing)
                break
            if _fuzzy_match(key, existing) and abs(len(key) - len(existing)) <= 2:
                return
        if not _is_real_title(title):
            return
        seen.add(key)
        titles.append({"title": title, "raw": raw})

    normalized = response or ""
    for q in ['\u201c', '\u201d', '\u2018', '\u2019', '\u00ab', '\u00bb']:
        normalized = normalized.replace(q, '"')

    # 方法1（优先）: dash / 编号列表 — 视觉模型标准输出
    list_hits = 0
    for line in normalized.split("\n"):
        line = line.strip()
        if not line or len(line) > 100:
            continue
        m = re.match(r"^(?:[-*•]|\d+[\.\)])\s+(.+)$", line)
        if not m:
            continue
        list_hits += 1
        title = _normalize_candidate_title(m.group(1))
        if title:
            _add(title, line)

    # 方法2: 引号包裹
    if list_hits < 3:
        for m in re.finditer(r'(?:\*{1,2})?\s*"([^"]{2,60})"\s*(?:\*{1,2})?', normalized):
            title = _normalize_candidate_title(m.group(1))
            if title:
                _add(title, m.group(0))

    # 方法3: **加粗**
    if len(titles) < 3:
        for m in re.finditer(r"\*\*([^*\n]{2,60})\*\*", normalized):
            title = _normalize_candidate_title(m.group(1))
            if title:
                _add(title, m.group(0))

    # 方法4: "titles like A, B and C"
    if len(titles) < 3:
        for prefix in ("titles like ", "such as ", "featuring ", "including "):
            idx = normalized.lower().find(prefix)
            if idx < 0:
                continue
            segment = normalized[idx + len(prefix):]
            for end in [". ", ".\n", "\n\n", "; "]:
                eidx = segment.find(end)
                if eidx > 5:
                    segment = segment[:eidx]
                    break
            for part in re.split(r",| and |, and ", segment):
                title = _normalize_candidate_title(part.strip(' "\'*.'))
                if title:
                    _add(title, part.strip())

    return titles


def _is_real_title(text: str) -> bool:
    """判断是否像真实片名。保留 The/A/全大写英文片名；过滤明显噪音。"""
    if len(text) < 2:
        return False

    lower = text.lower().strip()

    if re.match(r"^[\d\s\-\.\/\\:,;]+$", text):
        return False

    word_count = len(text.split())
    # 中文可无空格；英文超过 10 词多半是描述句
    if word_count > 10:
        return False
    if word_count > 8 and not re.search(r"[\u4e00-\u9fff]", text):
        return False

    if lower in COMMON_WORDS or lower in ACTOR_NAMES or lower in PUBLISHERS or lower in FORMAT_LABELS:
        return False
    # 单独冠词 / 介词不是片名
    if lower in {"the", "a", "an", "and", "or", "of", "with", "from", "like"}:
        return False

    for phrase in GENERIC_PHRASES:
        if lower.startswith(phrase) or phrase in lower:
            return False

    lower_nospace = lower.replace(" ", "")
    for phrase in GENERIC_PHRASES:
        phrase_nospace = phrase.replace(" ", "")
        if len(phrase_nospace) >= 6 and phrase_nospace in lower_nospace:
            return False

    bad = [
        r"(?i)^blu.?ray.*$",
        r"(?i)^dvd$|^hd$|^sd$|^uhd$",
        r"(?i)^disc\s*\d*$",
        r"(?i)^top\s*row|^bottom\s*row",
        r"(?i)^this\s+image",
        r"(?i)^the\s+(image|photo|collection|following|above|below)\b",
        r"^\d+x\d+$",
        r"^[A-Z]{2,3}[\s\-]?\d{3,}$",
        r"(?i)^(FROM|BASED|WRITER|DIRECTOR|STARRING|FEATURING|PRODUCED)\s",
        # 仅拒绝描述性开头，不再误杀 "The Matrix" / "A Quiet Place"
        r"(?i)^(like|with|and)\s+(the\s+)?(films?|movies?|titles?|others?)\b",
        r"(?i)\b(text|language|shelves|cover art)\b",
        r"(?i)^(films|movies|mix|others)\s",
        # 仅整词是 edition 类标签时拒绝；允许片名里偶然出现
        r"(?i)^(collector'?s?|special|limited)\s+(edition|set)$",
        r"(?i)^steelbook$|^box\s*set$",
        r"(?i)^would\s", r"(?i)^also\s", r"(?i)^not\s",
        # 极短全大写乱码（≤3 字母且字符种类极少）
        r"^[A-Z]{2,3}$",
    ]
    for p in bad:
        if re.match(p, text):
            return False
        # 对含 text/language 等用 search；其余用 match 避免误伤
        if p.startswith(r"(?i)\b") and re.search(p, text):
            return False
    return True


# ===== 核心分析 =====

LAYOUT_SHELF_COLUMNS = "shelf_columns"
LAYOUT_GROUND_ROWS = "ground_rows"
LAYOUT_UPRIGHT_SHELF = "upright_shelf"
LAYOUT_UNKNOWN = "unknown"

GROUND_TILE_PROMPT = (
    "This crop shows movie discs on a floor or flat surface. "
    "Most are upright spines with rotated/vertical text; some may be face-up covers "
    "with large title lettering. Read EVERY visible movie title — both vertical spines "
    "and face-up covers. List one title per line with a dash prefix. "
    "Partial reads OK. Do not invent titles."
)

SHELF_TILE_PROMPT = (
    "This crop is part of a shelf of stacked discs with mostly horizontal spines. "
    "Read ALL spine titles top-to-bottom in each column. "
    "List one title per line with a dash prefix. Partial reads OK."
)

UPRIGHT_TILE_PROMPT = (
    "This crop shows upright discs on a shelf (vertical spines; text often rotated 90°). "
    "Read ALL visible spine titles left-to-right. "
    "List one title per line with a dash prefix. Partial reads OK."
)


def _make_grid(cols: int, rows: int, overlap: float = 0.06) -> list:
    """生成 cols×rows 网格，带边缘 overlap（比例）。"""
    tiles = []
    ow = overlap / max(cols, 1)
    oh = overlap / max(rows, 1)
    for r in range(rows):
        for c in range(cols):
            x0 = c / cols - (ow if c > 0 else 0)
            y0 = r / rows - (oh if r > 0 else 0)
            x1 = (c + 1) / cols + (ow if c < cols - 1 else 0)
            y1 = (r + 1) / rows + (oh if r < rows - 1 else 0)
            x0, y0 = max(0.0, x0), max(0.0, y0)
            x1, y1 = min(1.0, x1), min(1.0, y1)
            tiles.append({"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0})
    return tiles


def _find_horizontal_gap(ocr_regions: list, band=(0.35, 0.65)) -> float | None:
    """在中间水平带找文字稀少的 y 空隙，用于 ground_rows 切分。返回切分线 y∈(0,1)。"""
    lo, hi = band
    ys = []
    for r in ocr_regions:
        cy = float(r.get("bbox_y", 0)) + float(r.get("bbox_h", 0)) * 0.5
        if lo <= cy <= hi:
            ys.append(cy)
    if len(ys) < 3:
        return 0.5
    # 在 band 内找密度最低的 0.04 宽窗口中心
    best_y, best_score = 0.5, 1e9
    steps = 20
    for i in range(steps + 1):
        y = lo + (hi - lo) * i / steps
        score = sum(1 for cy in ys if abs(cy - y) < 0.04)
        if score < best_score:
            best_score = score
            best_y = y
    return best_y


def _ocr_orientation_stats(ocr_regions: list) -> dict:
    tall = wide = 0
    for r in ocr_regions:
        bw = float(r.get("bbox_w") or 0)
        bh = float(r.get("bbox_h") or 0)
        if bw <= 0 or bh <= 0:
            continue
        ratio = bw / bh
        if ratio <= 0.7:
            tall += 1
        elif ratio >= 1.4:
            wide += 1
    total = tall + wide
    return {
        "tall": tall,
        "wide": wide,
        "total": total,
        "tall_frac": (tall / total) if total else 0.5,
        "wide_frac": (wide / total) if total else 0.5,
    }


def detect_layout(w: int, h: int, ocr_regions: list | None = None) -> str:
    """布局启发式：A shelf_columns / B ground_rows / C upright_shelf / D unknown。"""
    ocr_regions = ocr_regions or []
    aspect = w / max(h, 1)
    stats = _ocr_orientation_stats(ocr_regions)
    gap = _find_horizontal_gap(ocr_regions) if ocr_regions else None

    vertical_text = stats["tall_frac"] >= 0.48 and stats["total"] >= 4
    horizontal_text = stats["wide_frac"] >= 0.55 and stats["total"] >= 4

    has_mid_gap = False
    if ocr_regions and aspect >= 1.1 and stats["total"] >= 6:
        g = gap if gap is not None else 0.5
        above = sum(
            1 for r in ocr_regions
            if (float(r.get("bbox_y", 0)) + float(r.get("bbox_h", 0)) * 0.5) < g - 0.04
        )
        below = sum(
            1 for r in ocr_regions
            if (float(r.get("bbox_y", 0)) + float(r.get("bbox_h", 0)) * 0.5) > g + 0.04
        )
        mid = sum(
            1 for r in ocr_regions
            if abs((float(r.get("bbox_y", 0)) + float(r.get("bbox_h", 0)) * 0.5) - g) < 0.04
        )
        has_mid_gap = above >= 3 and below >= 3 and mid <= max(2, (above + below) * 0.15)

    bimodal_rows = False
    if len(ocr_regions) >= 20:
        bins = [0] * 10
        for r in ocr_regions:
            cy = float(r.get("bbox_y", 0)) + float(r.get("bbox_h", 0)) * 0.5
            bins[min(9, max(0, int(cy * 10)))] += 1
        top = sum(bins[0:4])
        bot = sum(bins[6:10])
        seam = bins[4] + bins[5]
        if top >= 8 and bot >= 8 and seam <= max(top, bot) * 0.55:
            bimodal_rows = True

    # A: 横脊货架列 — 宽幅 + 横排文字占优时优先（避免被 ground 误吃）
    if aspect >= 1.35 and horizontal_text and stats["wide_frac"] >= stats["tall_frac"]:
        if not (bimodal_rows and vertical_text and stats["tall_frac"] >= 0.5):
            return LAYOUT_SHELF_COLUMNS

    # B: 地面/平面多排（竖脊为主，或明显上下两排）
    if aspect >= 1.12 and (
        has_mid_gap
        or bimodal_rows
        or (vertical_text and stats["tall_frac"] >= stats["wide_frac"])
    ):
        return LAYOUT_GROUND_ROWS

    # C: 立式插架
    if vertical_text and aspect <= 1.35:
        return LAYOUT_UPRIGHT_SHELF

    if horizontal_text and aspect >= 1.25:
        return LAYOUT_SHELF_COLUMNS

    if aspect >= 1.55:
        return LAYOUT_SHELF_COLUMNS if not vertical_text else LAYOUT_GROUND_ROWS
    if aspect <= 0.9:
        return LAYOUT_UPRIGHT_SHELF
    if min(w, h) >= 900 or (w * h) >= 1_200_000:
        return LAYOUT_UNKNOWN
    return LAYOUT_UNKNOWN


def tiles_for_layout(layout: str, w: int, h: int, ocr_regions: list | None = None) -> list:
    """按布局生成 tiling 方案（比例坐标）。"""
    aspect = w / max(h, 1)
    ocr_regions = ocr_regions or []

    if layout == LAYOUT_GROUND_ROWS:
        # 上下两行（空隙处切 + overlap），每行左右对半 → 最多 4 tiles
        gap = _find_horizontal_gap(ocr_regions) or 0.5
        # 若 gap 太靠边，回退 50/50（地面两排通常接近中线）
        if gap < 0.38 or gap > 0.62:
            gap = 0.5
        ov = 0.07
        rows = [
            (0.0, min(1.0, gap + ov)),
            (max(0.0, gap - ov), 1.0),
        ]
        tiles = []
        for y0, y1 in rows:
            tiles.append({"x": 0.0, "y": y0, "w": 0.5 + ov, "h": y1 - y0})
            tiles.append({"x": 0.5 - ov, "y": y0, "w": 0.5 + ov, "h": y1 - y0})
        return tiles

    if layout == LAYOUT_SHELF_COLUMNS:
        # 只按列竖切（2–3 列）；避免再横切把一列脊切断
        cols = 3 if aspect >= 1.5 else 2
        return _make_grid(cols, 1, overlap=0.05)

    if layout == LAYOUT_UPRIGHT_SHELF:
        if aspect < 0.85:
            return _make_grid(1, 3, overlap=0.06)
        if aspect > 1.3:
            return _make_grid(3, 1, overlap=0.05)
        return _make_grid(2, 2, overlap=0.06)

    if min(w, h) >= 900 or (w * h) >= 1_200_000:
        return _make_grid(2, 2, overlap=0.05)
    return []


def _tile_prompt_for_layout(layout: str) -> str:
    if layout == LAYOUT_GROUND_ROWS:
        return GROUND_TILE_PROMPT
    if layout == LAYOUT_SHELF_COLUMNS:
        return SHELF_TILE_PROMPT
    if layout == LAYOUT_UPRIGHT_SHELF:
        return UPRIGHT_TILE_PROMPT
    return TILE_PROMPT


def _cover_like_ocr_regions(ocr_regions: list) -> list:
    """较大近似正方形/横向块 + 高置信 → 可能是正面封面大字，提高为 title。"""
    boosted = []
    for r in ocr_regions:
        bw = float(r.get("bbox_w") or 0)
        bh = float(r.get("bbox_h") or 0)
        conf = float(r.get("confidence") or 0)
        text = r.get("text") or ""
        if not text or conf < 0.35:
            continue
        area = bw * bh
        # 封面标题通常比细脊文字块更大
        if area >= 0.008 and bw >= 0.04 and _is_likely_title(text, conf):
            item = dict(r)
            item["is_title"] = True
            item["source_hint"] = "cover"
            boosted.append(item)
    return boosted


def analyze_multi_disc_photo(image_path: str) -> dict:
    """
    分析一张可能包含多张碟片的照片
    策略：OCR bbox → 布局检测 → 全图视觉 + 自适应 tiling → 合并（vision 为主）
    """
    img_full = Image.open(image_path).convert("RGB")
    full_w, full_h = img_full.width, img_full.height
    img_b64, img_pil = load_and_encode(image_path, max_size=MAX_IMG_SIZE, quality=75)

    # 通道1: EasyOCR
    ocr_regions = []
    try:
        reader = get_reader()
        ocr_results = reader.readtext(image_path)
        for bbox, text, confidence in ocr_results:
            cleaned = clean_title(text)
            xs = [p[0] for p in bbox]
            ys = [p[1] for p in bbox]
            region = {
                "text": cleaned or text.strip(),
                "raw_text": text.strip(),
                "confidence": round(float(confidence), 3),
                "bbox_x": round(min(xs) / full_w, 4) if full_w else 0,
                "bbox_y": round(min(ys) / full_h, 4) if full_h else 0,
                "bbox_w": round((max(xs) - min(xs)) / full_w, 4) if full_w else 0,
                "bbox_h": round((max(ys) - min(ys)) / full_h, 4) if full_h else 0,
                "is_title": bool(cleaned and _is_likely_title(cleaned, float(confidence))),
            }
            ocr_regions.append(region)
    except Exception as e:
        print(f"EasyOCR error: {e}")
        _log.warning("EasyOCR error: %s", e)

    layout = detect_layout(full_w, full_h, ocr_regions)
    tiles = tiles_for_layout(layout, full_w, full_h, ocr_regions)
    tile_prompt = _tile_prompt_for_layout(layout)
    print(f"Layout={layout} image={full_w}x{full_h} tiles={len(tiles)}")
    _log.info("Layout=%s image=%sx%s tiles=%s", layout, full_w, full_h, len(tiles))

    # 通道2: 全图视觉
    vision_titles = []
    try:
        description = call_vision(VISION_MODEL, BULK_PROMPT, img_b64, timeout=180)
        if description and not description.strip():
            _log.warning("Full-image vision returned empty text")
        parsed = parse_title_list(description or "")
        vision_titles = [{"title": p["title"], "raw": p["raw"]} for p in parsed]
        print(f"Full-image vision: {len(vision_titles)} titles (raw_len={len(description or '')})")
        _log.info("Full-image vision: %s titles", len(vision_titles))
    except Exception as e:
        print(f"Vision model error: {e}")
        _log.warning("Vision model error: %s", e)
        vision_titles = []

    # 通道3: 布局自适应 tiling
    tile_titles = []
    if tiles:
        print(f"Tiling ({layout}): {len(tiles)} tile(s)")
        for i, tile in enumerate(tiles):
            try:
                tile_img = extract_tile(img_full, tile["x"], tile["y"], tile["w"], tile["h"])
                tile_b64 = encode_pil_to_b64(tile_img, max_size=MAX_IMG_SIZE, quality=78)
                tile_response = call_vision(VISION_MODEL, tile_prompt, tile_b64, timeout=180)
                tile_parsed = parse_title_list(tile_response or "")
                for p in tile_parsed:
                    tile_titles.append({"title": p["title"], "raw": f"[tile{i+1}/{layout}] {p['raw']}"})
                print(f"  Tile {i+1} ({tile_img.width}x{tile_img.height}): {len(tile_parsed)} titles")
                _log.info("Tile %s: %s titles", i + 1, len(tile_parsed))
            except Exception as e:
                print(f"  Tile {i+1} error: {e}")
                _log.warning("Tile %s error: %s", i + 1, e)

    vision_titles = _merge_title_lists(vision_titles, tile_titles)
    if tile_titles:
        print(f"After merging tiles: {len(vision_titles)} total vision titles")

    # 通道2b: 结果过少时 fallback
    FALLBACK_TEXT_PROMPT = (
        "List every movie title visible on disc spines or covers in this photo, "
        "including rotated/vertical spine text. One title per line with a dash."
    )
    if len(vision_titles) <= 3 and len(ocr_regions) >= 5:
        try:
            fallback_text = call_vision(VISION_MODEL, FALLBACK_TEXT_PROMPT, img_b64, timeout=180)
            fallback_parsed = [
                {"title": p["title"], "raw": f"[fallback] {p['raw']}"}
                for p in parse_title_list(fallback_text or "")
            ]
            before = len(vision_titles)
            vision_titles = _merge_title_lists(vision_titles, fallback_parsed)
            print(f"Fallback vision pass: added {len(vision_titles) - before} new titles")
        except Exception as e:
            print(f"Fallback vision pass error: {e}")

    # OCR 标题 + 封面大字候选；竖排 OCR 不可靠，vision 优先
    title_regions = [r for r in ocr_regions if r.get("is_title")]
    for cover in _cover_like_ocr_regions(ocr_regions):
        if not any((c.get("text") or "").lower() == (cover.get("text") or "").lower() for c in title_regions):
            title_regions.append(cover)

    # vision 已较充分时，OCR 只保留封面大字 / 高置信，减少乱码噪声
    if len(vision_titles) >= 12:
        title_regions = [
            r for r in title_regions
            if r.get("source_hint") == "cover"
            or float(r.get("confidence") or 0) >= 0.72
            or re.search(r"[\u4e00-\u9fff]", r.get("text") or "")
        ]

    identified = _merge_ocr_and_vision(title_regions, vision_titles)

    return {
        "ocr_regions": ocr_regions,
        "vision_titles": vision_titles,
        "identified_discs": identified,
        "layout": layout,
        "tiles": tiles,
        "spine_colors": [],
    }


def _determine_tiles(w: int, h: int, ocr_regions: list | None = None) -> list:
    """兼容旧接口：先 detect_layout 再 tiles_for_layout。"""
    layout = detect_layout(w, h, ocr_regions)
    return tiles_for_layout(layout, w, h, ocr_regions)

def _is_likely_title(text: str, confidence: float) -> bool:
    """判断 OCR 文本是否可能是电影片名（略放宽以保留英文片名）。"""
    if len(text) < 2:
        return False

    lower = text.lower().strip()

    # 全是数字/符号
    if re.match(r"^[\d\s\-\.\/\\:,;]+$", text):
        return False

    # 必须包含至少一个字母或中文
    if not re.search(r"[A-Za-z\u4e00-\u9fff]", text):
        return False

    # 置信度：竖排/艺术字常偏低，放宽到 0.32
    if confidence < 0.32:
        return False

    # ===== 黑名单精确匹配 =====
    if lower in ACTOR_NAMES or lower in PUBLISHERS or lower in FORMAT_LABELS or lower in COMMON_WORDS:
        return False

    # 出版商变体模糊匹配（短词跳过，避免误伤）
    for pub in PUBLISHERS:
        if len(pub) >= 5 and _fuzzy_match(lower, pub):
            return False

    # ===== 模式过滤 =====

    # 全大写短标签（≤4）；更长全大写可能是片名（TIME / FIGHT CLUB）
    if len(text) <= 4 and text.isupper() and " " not in text and not re.search(r"[\u4e00-\u9fff]", text):
        # 常见短片名白名单外才拒
        if lower not in {"time", "jaws", "up", "it", "her", "him", "us", "soul", "coco", "room", "heat", "rush"}:
            if len(text) <= 3:
                return False

    # 杂乱的字符（OCR 误识别，如 TIIIII, UJISOA）
    if re.match(r"^[A-Z]{3,}$", text) and len(set(text)) <= 2:
        return False

    # 纯大写 + 数字混合（编目号: TV0GG4, 2B0）
    if re.match(r"^[\dA-Z\.\-\s]{3,10}$", text) and re.search(r"\d", text):
        return False

    # 编目号模式: XX 0000, XX-0000, XX0000
    if re.match(r"^[A-Z]{2,4}[\s\-]?\d{3,}$", text):
        return False

    # 单个英文单词 < 3 字符（允许 3+）
    if re.match(r"^[A-Za-z]{1,2}$", text):
        return False

    # 大部分是数字和符号
    alpha_ratio = len(re.sub(r"[^A-Za-z\u4e00-\u9fff]", "", text)) / max(len(text), 1)
    if alpha_ratio < 0.35 and len(text) < 8:
        return False

    # 泛化短语检查
    for phrase in GENERIC_PHRASES:
        if phrase in lower:
            return False

    # 泛化短语的连写变体（如 "FROM THE" → "FROMTHE"）
    lower_nospace = lower.replace(" ", "")
    for phrase in GENERIC_PHRASES:
        phrase_nospace = phrase.replace(" ", "")
        if len(phrase_nospace) >= 6 and phrase_nospace in lower_nospace:
            return False

    # 全大写且无元音字母的 OCR 乱码（如 UJISOA）
    if text.isupper() and len(text) >= 5 and " " not in text:
        vowels = sum(1 for c in text if c in "AEIOU")
        if vowels <= 1:
            return False

    # 明显的非片名模式
    bad_patterns = [
        r"^\d{3,}$",
        r"^[A-Z]{1,2}\d{2,}",
        r"^[A-Z]{2,3}[\s\-]?\d{3,}",
        r"^[\d\.\-\s]+$",
        r"(?i)^blu.?ray",
        r"(?i)^disc\s*\d*$",
        r"(?i)bluray.?disc",
        r"^\d+x\d+$",
        r"(?i)^hd$|^sd$|^uhd$",
        r"(?i)^dvd$|^all$",
        r"^[\s\d\.\,\;\:\-\/\\]+$",
        r"^\W+$",
        r"(?i)^(from|writer|director|starring|featuring|produced|based\s+on)\b",
        r"(?i)^the\s+(incredible|true|multi|award|winning)\b",
        r"(?i)^(lionsgate|warner|universal|paramount|disney|sony|fox|mgm|bbc)\b",
        r"(?i)^(carnaby|curzon|artificial|eye|studiocanal|eureka|arrow|criterion)\b",
        r"(?i)^(collectors|special|limited|ultimate|definitive|deluxe)\s+(edition|set)?$",
        r"(?i)^(remastered|restored|digitally|enhanced)$",
        r"(?i)^(format|widescreen|full.?screen|anamorphic)$",
        r"(?i)^(audio|commentary|subtitles?|english|french|spanish|german)$",
        r"(?i)^(region|regions?|all.regions?|region.free)$",
        r"(?i)^(bonus|extras?|deleted.scenes|making.of)$",
        r"(?i)^(the|a|an|and|or|of|in|on|to|for|with|is|at|by|as)\b\s*$",
        r"(?i)^(dolby|dts|surround|stereo|mono|digital|atmos)$",
        r"(?i)^(mpaa|rated|pg|pg-?13|nc-?17)$",
        r"(?i)^(closed|captioned|subtitled|dubbed)$",
        r"(?i)^(disc\s*\d+|volume|vol\.?|part|chapter)\s*\d*$",
        r"(?i)^(ntsc|pal|secam)$",
        r"(?i)^(16:?9|4:?3)$",
        r"(?i)^(slip.?cover|slip.?case|amaray|digi.?pak)$",
    ]
    for p in bad_patterns:
        if re.match(p, text):
            return False

    # 纯数字+标点（如 "12.", "3:"）
    if re.match(r"^[\d\W_]+$", text):
        return False

    return True


def _fuzzy_match(a: str, b: str) -> bool:
    """简单的模糊匹配：编辑距离 ≤ 1 或 一个字符串包含另一个"""
    a, b = a.lower(), b.lower()
    if len(a) < 3 or len(b) < 3:
        return False
    if a in b or b in a:
        return True
    if len(a) == len(b):
        diffs = sum(1 for i in range(len(a)) if a[i] != b[i])
        return diffs <= 1
    if abs(len(a) - len(b)) == 1:
        longer, shorter = (a, b) if len(a) > len(b) else (b, a)
        for i in range(len(longer)):
            if longer[:i] + longer[i+1:] == shorter:
                return True
    return False


def _ocr_bbox_for_title(title: str, ocr: list) -> dict:
    """从 OCR 区域中为片名找最匹配的 bbox（分数相对坐标）。"""
    title_l = (title or "").lower().strip()
    empty = {"bbox_x": 0, "bbox_y": 0, "bbox_w": 0, "bbox_h": 0}
    if not title_l or not ocr:
        return empty

    best = None
    best_score = -1.0
    for item in ocr:
        text = (item.get("text") or "").lower().strip()
        if len(text) < 2:
            continue
        matched = (
            text == title_l
            or text in title_l
            or title_l in text
            or _fuzzy_match(text, title_l)
        )
        if not matched:
            continue
        bw = float(item.get("bbox_w") or 0)
        bh = float(item.get("bbox_h") or 0)
        if bw <= 0 or bh <= 0:
            continue
        # 优先更大区域 + 更高置信度
        score = bw * bh * 10 + float(item.get("confidence") or 0)
        if score > best_score:
            best_score = score
            best = item

    if not best:
        return empty
    return {
        "bbox_x": best.get("bbox_x", 0),
        "bbox_y": best.get("bbox_y", 0),
        "bbox_w": best.get("bbox_w", 0),
        "bbox_h": best.get("bbox_h", 0),
    }


def _title_keys_similar(a: str, b: str) -> bool:
    """判断两个片名是否实质相同（含子串/模糊/双语混排）。"""
    a, b = (a or "").lower().strip(), (b or "").lower().strip()
    if not a or not b:
        return False
    if a == b:
        return True
    if a in b or b in a:
        return True
    if _fuzzy_match(a, b):
        return True
    def eng(s):
        return " ".join(re.findall(r"[a-z0-9']+", s))
    ea, eb = eng(a), eng(b)
    if ea and eb and len(ea) >= 4 and (ea == eb or ea in eb or eb in ea):
        return True
    return False


def _merge_title_lists(*lists) -> list:
    """多路标题合并：更长/更完整优先，近重复去重。"""
    merged = []
    for lst in lists:
        for item in lst or []:
            title = item.get("title") or ""
            if len(title) < 2:
                continue
            replaced = False
            for i, existing in enumerate(merged):
                if _title_keys_similar(title, existing["title"]):
                    if len(title) > len(existing["title"]):
                        merged[i] = item
                    replaced = True
                    break
            if not replaced:
                merged.append(item)
    return merged


def _attach_bbox(target: dict, bbox: dict) -> None:
    """仅在 target 尚无有效 bbox 时写入。"""
    if float(target.get("bbox_w") or 0) > 0 and float(target.get("bbox_h") or 0) > 0:
        return
    if float(bbox.get("bbox_w") or 0) <= 0 or float(bbox.get("bbox_h") or 0) <= 0:
        return
    target["bbox_x"] = bbox.get("bbox_x", 0)
    target["bbox_y"] = bbox.get("bbox_y", 0)
    target["bbox_w"] = bbox.get("bbox_w", 0)
    target["bbox_h"] = bbox.get("bbox_h", 0)


def _merge_ocr_and_vision(ocr: list, vision: list) -> list:
    """合并 OCR 和视觉结果：vision 优先；OCR 补漏并给 vision 挂 bbox。"""
    merged = []

    # 先对 vision 自身去重
    vision = _merge_title_lists(vision)

    for item in vision:
        title = item["title"]
        if len(title) < 2:
            continue
        bbox = _ocr_bbox_for_title(title, ocr)
        conf = "high" if "[tile" in (item.get("raw") or "") else "medium"
        if (item.get("raw") or "").startswith("[fallback]"):
            conf = "medium"
        merged.append({
            "title_cn": title,
            "title_en": "",
            "year": "",
            "confidence": conf,
            "source": "vision",
            "bbox_x": bbox["bbox_x"],
            "bbox_y": bbox["bbox_y"],
            "bbox_w": bbox["bbox_w"],
            "bbox_h": bbox["bbox_h"],
        })

    for item in ocr:
        title = item["text"]
        if len(title) < 2:
            continue
        is_dup = False
        ocr_bbox = {
            "bbox_x": item.get("bbox_x", 0),
            "bbox_y": item.get("bbox_y", 0),
            "bbox_w": item.get("bbox_w", 0),
            "bbox_h": item.get("bbox_h", 0),
        }
        for m in merged:
            if _title_keys_similar(title, m["title_cn"]):
                _attach_bbox(m, ocr_bbox)
                is_dup = True
                break
        if not is_dup:
            src = "cover" if item.get("source_hint") == "cover" else "ocr"
            merged.append({
                "title_cn": title,
                "title_en": "",
                "year": "",
                "confidence": "medium" if src == "cover" else "low",
                "source": src,
                "bbox_x": ocr_bbox["bbox_x"],
                "bbox_y": ocr_bbox["bbox_y"],
                "bbox_w": ocr_bbox["bbox_w"],
                "bbox_h": ocr_bbox["bbox_h"],
            })

    return merged


# ===== 兼容旧接口 =====

def analyze_disc_spine(image_path: str, fast: bool = True) -> dict:
    """兼容旧调用 — v2.4 传递完整 OCR regions（含 bbox）"""
    result = analyze_multi_disc_photo(image_path)
    discs = result.get("identified_discs", [])
    ocr_regions = result.get("ocr_regions", [])

    if discs:
        first = discs[0]
        return {
            "ocr_texts": [r["text"] for r in ocr_regions],
            "ocr_titles": [{"text": r["text"], "confidence": r["confidence"], "is_title": r.get("is_title", False),
                            "bbox_x": r.get("bbox_x", 0), "bbox_y": r.get("bbox_y", 0),
                            "bbox_w": r.get("bbox_w", 0), "bbox_h": r.get("bbox_h", 0)}
                           for r in ocr_regions],
            "ocr_regions": ocr_regions,
            "vision_analysis": {"title_cn": first.get("title_cn", ""), "confidence": first.get("confidence", "low")},
            "vision_raw": str(result.get("vision_titles", [])),
            "best_title": first.get("title_cn", ""),
            "best_year": "",
            "all_discs": discs,
            "disc_count": len(discs),
            "spine_colors": [],
            "spine_description": f"识别到 {len(discs)} 张",
            "publisher": "",
            "format": "",
        }

    return {
        "ocr_texts": [], "ocr_titles": [], "ocr_regions": [],
        "vision_analysis": {}, "vision_raw": "",
        "best_title": "", "best_year": "", "all_discs": [], "disc_count": 0,
        "spine_colors": [], "spine_description": "", "publisher": "", "format": "",
    }


# ===== 区域裁剪识别（手工框选） =====

REGION_TITLE_PROMPT = (
    "This image is a cropped Blu-ray/DVD disc spine or cover region from a shelf photo.\n"
    "Read the movie title(s) visible on this crop. Prefer Chinese title if present, else English.\n"
    "Ignore publisher logos, format labels (Blu-ray/DVD/UHD), actors, and edition badges.\n"
    "Output one title per line with a leading dash. Include year in parentheses if clearly visible.\n"
    "Example:\n"
    "- 盗梦空间 (2010)\n"
    "- Inception\n"
)


def _crop_region_pil(image_path: str, bbox: dict, pad_ratio: float = 0.1):
    """按分数 bbox 裁剪区域，略微外扩；返回 (crop_pil, used_bbox_frac)。"""
    img = Image.open(image_path).convert("RGB")
    x = float(bbox.get("x", bbox.get("photo_offset_x", bbox.get("bbox_x", 0))) or 0)
    y = float(bbox.get("y", bbox.get("photo_offset_y", bbox.get("bbox_y", 0))) or 0)
    w = float(bbox.get("w", bbox.get("bbox_w", 0)) or 0)
    h = float(bbox.get("h", bbox.get("bbox_h", 0)) or 0)
    if w <= 0.001 or h <= 0.001:
        raise ValueError("invalid bbox")
    x = max(0.0, min(x, 0.999))
    y = max(0.0, min(y, 0.999))
    w = max(0.001, min(w, 1.0 - x))
    h = max(0.001, min(h, 1.0 - y))
    pad_x = w * pad_ratio
    pad_y = h * pad_ratio
    x2 = max(0.0, x - pad_x)
    y2 = max(0.0, y - pad_y)
    w2 = min(1.0 - x2, w + 2 * pad_x)
    h2 = min(1.0 - y2, h + 2 * pad_y)
    used = {"x": round(x2, 4), "y": round(y2, 4), "w": round(w2, 4), "h": round(h2, 4)}
    crop = extract_tile(img, used["x"], used["y"], used["w"], used["h"])
    if min(crop.size) < 64:
        scale = max(2, int(128 / max(min(crop.size), 1)))
        crop = crop.resize((crop.width * scale, crop.height * scale), Image.LANCZOS)
    return crop, used


def _parse_year_from_title(title: str) -> tuple[str, str]:
    """从标题中拆出可选年份，返回 (clean_title, year)。"""
    m = re.search(r"[\(（]\s*((?:19|20)\d{2})\s*[\)）]\s*$", title or "")
    if not m:
        return (title or "").strip(), ""
    year = m.group(1)
    clean = (title[: m.start()] + title[m.end():]).strip()
    return clean, year


def analyze_region(image_path: str, bbox: dict, pad_ratio: float = 0.1) -> dict:
    """分析照片中指定分数区域：视觉提标题 + 可选 EasyOCR，返回 discs 列表。

    bbox 可用 {x,y,w,h} 或 photo_offset_*/bbox_* 字段。
    返回的 discs 使用用户原始框（非外扩后）作为 photo_offset / bbox。
    """
    user_x = float(bbox.get("x", bbox.get("photo_offset_x", bbox.get("bbox_x", 0))) or 0)
    user_y = float(bbox.get("y", bbox.get("photo_offset_y", bbox.get("bbox_y", 0))) or 0)
    user_w = float(bbox.get("w", bbox.get("bbox_w", 0)) or 0)
    user_h = float(bbox.get("h", bbox.get("bbox_h", 0)) or 0)
    user_x = max(0.0, min(user_x, 0.999))
    user_y = max(0.0, min(user_y, 0.999))
    user_w = max(0.001, min(user_w, 1.0 - user_x))
    user_h = max(0.001, min(user_h, 1.0 - user_y))

    crop, used = _crop_region_pil(image_path, {
        "x": user_x, "y": user_y, "w": user_w, "h": user_h,
    }, pad_ratio=pad_ratio)

    vision_titles = []
    try:
        crop_b64 = encode_pil_to_b64(crop, max_size=768, quality=78)
        response = call_vision(VISION_MODEL, REGION_TITLE_PROMPT, crop_b64, timeout=120)
        vision_titles = [
            {"title": p["title"], "raw": p.get("raw", p["title"])}
            for p in parse_title_list(response or "")
        ]
        _log.info("analyze_region vision: %s titles", len(vision_titles))
    except Exception as e:
        _log.warning("analyze_region vision error: %s", e)

    ocr_titles = []
    try:
        import numpy as np
        reader = get_reader()
        ocr_results = reader.readtext(np.array(crop))
        for _bbox, text, confidence in ocr_results:
            cleaned = clean_title(text) or (text or "").strip()
            if cleaned and _is_likely_title(cleaned, float(confidence)):
                ocr_titles.append({
                    "title": cleaned,
                    "raw": f"[ocr] {text}",
                    "confidence": float(confidence),
                })
    except Exception as e:
        _log.warning("analyze_region OCR error: %s", e)

    merged_titles = _merge_title_lists(vision_titles, [
        {"title": t["title"], "raw": t["raw"]} for t in ocr_titles
    ])

    discs = []
    for item in merged_titles:
        title, year = _parse_year_from_title(item["title"])
        if len(title) < 2:
            continue
        source = "ocr" if (item.get("raw") or "").startswith("[ocr]") else "vision"
        conf = "medium"
        if source == "vision":
            conf = "high" if len(merged_titles) == 1 else "medium"
        discs.append({
            "title_cn": title,
            "title_en": "",
            "year": year,
            "confidence": conf,
            "source": source,
            "bbox_x": round(user_x, 4),
            "bbox_y": round(user_y, 4),
            "bbox_w": round(user_w, 4),
            "bbox_h": round(user_h, 4),
            "photo_offset_x": round(user_x, 4),
            "photo_offset_y": round(user_y, 4),
        })

    return {
        "discs": discs,
        "used_bbox": used,
        "user_bbox": {
            "x": round(user_x, 4),
            "y": round(user_y, 4),
            "w": round(user_w, 4),
            "h": round(user_h, 4),
        },
        "vision_count": len(vision_titles),
        "ocr_count": len(ocr_titles),
    }


# ===== 视觉验证 =====

def verify_disc_match(image_path: str, tmdb_result: dict) -> dict:
    img_b64, _ = load_and_encode(image_path, max_size=512, quality=70)
    prompt = f"""Does this disc spine image match the movie '{tmdb_result.get('title_cn','')}' ({tmdb_result.get('year','')})?
Reply ONLY with: YES or NO, followed by a brief reason."""

    try:
        response = call_vision(VISION_MODEL, prompt, img_b64)
        is_match = "YES" in response.upper()[:10]
        return {"match": is_match, "confidence": 0.8 if is_match else 0.3, "reasoning": response.strip(), "raw_response": response}
    except Exception as e:
        return {"match": False, "confidence": 0, "reasoning": str(e), "error": str(e)}


def get_image_dimensions(image_path: str) -> tuple:
    try:
        img = Image.open(image_path)
        return img.width, img.height
    except Exception:
        return 0, 0
