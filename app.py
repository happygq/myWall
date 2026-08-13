"""myWall - 光碟墙管理系统 主应用 v4.0
核心改进：
- 异步处理：上传立即返回，OCR+视觉模型后台运行
- 双通道识别：EasyOCR 文本 + 视觉模型图像理解
- 多模态匹配：文本 + 图像特征 + 视觉验证
- TMDb 查询规范化：双语拆分 / 版本噪音剥离 / 多路搜索
- 匹配列表真正可滚动（flex 子项不 shrink + max-height 兜底）
- 置信度可视：vision/ocr 来源颜色编码 + 拒绝按钮
- 手工标定碟脊 / 框选区域重识别 / 手动 TMDb 搜索回填
- v2.9：详情内重新框选 bbox；列表卡片编辑片名/年份/TMDb
- v3.0：卡片手工标记识别错误（flagged）+ 双重确认删除
- v3.1：卡片操作图标与框选高亮配色对比度增强
- v3.2：树形分组缩略图可编辑该特写在总布局墙上的 placement
- v3.3：列表/树形卡片定位针按原照片 bbox 是否标定显示灰/绿
- v3.4：编辑碟片允许空 TMDb；按片名搜索候选再挑选/拉取详情
- v3.5：TMDb/API 错误脱敏，禁止 api_key 等泄漏到前端
- v3.6：首页壳按 DESIGN.md Spotify 风格重做（色板/侧栏媒体库布局）
- v3.7：碟片卡片操作改为线描 SVG（深灰圆底，克制强调态）
- v3.8：上传窗集成手工碟脊框编辑 + 所选图异步 stage2 识别入库
- v3.9：碟片卡片个人喜好心形标注（三色）+ 喜好筛选
- v3.10：按已有 tmdb_id 批量补海报/简介/演职（不改片名与框位）
- v3.11：TMDb 共用搜索入口 + 全部|电影|剧集范围；tmdb_media_type；TV 详情/刷新/补海报
- v3.12：侧栏「手工建卡」— 无 Stage2 从零新建碟片（可空源图 / TMDb 搜索）
- v3.13：片名搜索合并 TMDb + OMDb(IMDb) + TheTVDB；imdb_id / tvdb_id；来源 badge
- v3.15：编辑碟片弹窗维护本机 API Key（TMDb / OMDb / TVDB），热读无需重启
- v4.0：定稿发布；统一页面/手册/后端版本号；API key 仅从环境变量或 data/api_keys.json 读取
"""
import os
import uuid
import json
import base64
import io
import re
import hashlib
import threading
import logging
import time

import requests
from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
from PIL import Image
from werkzeug.exceptions import HTTPException

import sys

from config import (
    UPLOAD_FOLDER, PHOTOS_FOLDER, WALL_IMAGE, SECRET_KEY, DEBUG, BASE_DIR,
    SPINE_BOXES_FOLDER, SPINE_RESULTS_FOLDER,
)
from database import (init_db, add_disc, update_disc, delete_disc, get_disc,
                       get_all_discs, search_discs, get_all_genres, get_all_years,
                       get_stats, add_wall_image, get_all_wall_images, get_wall_image,
                       update_wall_image, delete_wall_image, clear_image_records,
                       save_ocr_result, get_discs_by_source_image,
                       find_wall_image_by_hash, find_wall_image_by_original_filename,
                       find_wall_image_by_filename)
from tmdb_client import tmdb, TMDbError, sanitize_sensitive, build_search_queries
from omdb_client import omdb, OMDbError
from meta_search import search_multi_source, providers_status, normalize_source_filter
from api_keys import (
    public_keys_status,
    update_source as update_api_key_source,
    is_attempt_enabled,
    ensure_applied,
)
from image_processor import (analyze_disc_spine, analyze_region, verify_disc_match,
                              get_image_dimensions, load_and_encode,
                              encode_pil_to_b64, extract_tile,
                              VISION_MODEL, LMSTUDIO_BASE, call_vision)

# 离线脚本入口：保持 CLI 可用，Flask 直接复用同一套 stage2 / import
_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)
from scripts.recognize_spines_with_tmdb import recognize_spines  # noqa: E402
from scripts.import_spines_to_db import import_spine_results  # noqa: E402

APP_VERSION = "4.0"

# 仅补全 TMDb 元数据时允许写入的字段（禁止片名 / 年份 / 框 / 墙坐标）
_TMDB_ENRICH_KEYS = (
    "poster_url", "backdrop_url", "synopsis_cn", "synopsis_en",
    "directors", "cast", "rating", "genres", "runtime", "original_language",
)
# 素材策略（已确认，勿擅自改跑批范围）：
# - test3 与 test10 重复 → stage1 只跑一份
# - test-05 是布局照，不识别；墙面目前只用 test-wall.jpg（test-01~04、test-05 暂不用）
# - 识别范围：test1–test13 跳过重复那张，且 test2 已完成可跳过
# - 未说「开始跑」前不要批量跑 stage1

# ===== 日志配置 =====
LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app.log")
logging.basicConfig(
    level=logging.DEBUG if DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger("myWall")

app = Flask(__name__)
app.secret_key = SECRET_KEY
# DEBUG=False 时默认缓存模板；开发改 HTML 后仍希望立即生效
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.jinja_env.auto_reload = True
CORS(app)


def client_safe_error(exc: BaseException, fallback: str = "操作失败，请稍后重试") -> str:
    """生成可安全返回前端的错误文案（无密钥）；详细异常由调用方 logger.exception。"""
    if isinstance(exc, TMDbError):
        return sanitize_sensitive(exc.user_message) or fallback
    raw = str(exc) or ""
    low = raw.lower()
    if "timed out" in low or "timeout" in low:
        return "TMDb 连接超时，请检查网络/代理"
    if "api.themoviedb.org" in low or "themoviedb" in low:
        return "搜索失败，请稍后重试"
    sanitized = sanitize_sensitive(raw)
    if re.search(r"(?i)api[_-]?key=|access[_-]?token=|authorization|bearer\s+\S+", sanitized):
        return fallback
    if "http://" in sanitized or "https://" in sanitized:
        return fallback
    return sanitized or fallback


def jsonify_error(message, status=500):
    """所有 error JSON 出口统一脱敏。"""
    return jsonify({"error": sanitize_sensitive(str(message))}), status


def _normalize_tmdb_media_type(value) -> str:
    return tmdb.normalize_media_type(value)


def _normalize_search_scope(value) -> str:
    return tmdb.normalize_search_scope(value)


def _normalize_imdb_id(value):
    if value in (None, "", 0, "0"):
        return None
    s = str(value).strip()
    if not s:
        return None
    if s.isdigit():
        return f"tt{s}"
    return s


def _normalize_tvdb_id(value):
    if value in (None, "", 0, "0"):
        return None
    try:
        n = int(value)
    except (TypeError, ValueError):
        return None
    return n if n > 0 else None


def _apply_external_ids_from_payload(data: dict) -> tuple[dict | None, tuple | None]:
    """规范化 imdb_id / tvdb_id；失败返回 (None, (error_json, status))."""
    if "imdb_id" in data:
        data["imdb_id"] = _normalize_imdb_id(data.get("imdb_id"))
    if "tvdb_id" in data:
        raw = data.get("tvdb_id")
        if raw in (None, "", 0, "0"):
            data["tvdb_id"] = None
        else:
            try:
                data["tvdb_id"] = _normalize_tvdb_id(raw)
            except (TypeError, ValueError):
                return None, (jsonify({"error": "TVDB 编号无效"}), 400)
            if data["tvdb_id"] is None and raw not in (None, "", 0, "0"):
                return None, (jsonify({"error": "TVDB 编号无效"}), 400)
    return data, None


# ===== 请求日志中间件 =====

@app.before_request
def log_request():
    logger.info(f"→ {request.method} {request.path}")

@app.after_request
def log_response(response):
    logger.info(f"← {request.method} {request.path} {response.status_code}")
    return response

@app.errorhandler(Exception)
def handle_exception(e):
    # 路由未匹配等 HTTPException 必须按原状态码返回，勿一律 500
    if isinstance(e, HTTPException):
        code = e.code or 500
        if code == 404:
            logger.warning("Route not found: %s %s", request.method, request.path)
            return jsonify_error(
                f"接口不存在 {request.method} {request.path}"
                "（本地 Flask 未注册该路由，通常需重启服务；不是 TMDb 网站故障）",
                404,
            )
        return jsonify_error(e.description or e.name, code)
    logger.exception(f"Unhandled exception at {request.method} {request.path}: {e}")
    status = 502 if isinstance(e, TMDbError) else 500
    return jsonify_error(client_safe_error(e), status)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}

# ===== 异步处理任务存储 =====
# {task_id: {"status": "processing|done|error", "result": {...}, "progress": 0-100}}
processing_tasks = {}
tasks_lock = threading.Lock()


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def preserve_original_filename(filename):
    """保留可读原始文件名（允许中文），仅去掉路径与危险字符"""
    if not filename:
        return "unnamed"
    name = os.path.basename(filename.replace("\\", "/"))
    name = name.replace("\0", "").strip()
    return name[:200] or "unnamed"


def resolve_image_url(filename):
    """按磁盘位置返回可访问 URL"""
    if not filename:
        return ""
    if os.path.exists(os.path.join(PHOTOS_FOLDER, filename)):
        return f"/photos/{filename}"
    if os.path.exists(os.path.join(UPLOAD_FOLDER, filename)):
        return f"/uploads/{filename}"
    return f"/uploads/{filename}"


def find_duplicate_image(file_hash, original_filename):
    """优先按内容哈希去重，其次按原始文件名"""
    if file_hash:
        existing = find_wall_image_by_hash(file_hash)
        if existing:
            return existing, "hash"
    if original_filename:
        existing = find_wall_image_by_original_filename(original_filename)
        if existing:
            return existing, "filename"
    return None, None


def coerce_image_ids(raw_ids):
    """将请求中的 image_ids 规范为 int 列表"""
    if not isinstance(raw_ids, list):
        return None
    ids = []
    for x in raw_ids:
        try:
            ids.append(int(x))
        except (TypeError, ValueError):
            continue
    return ids


def backfill_file_hashes():
    """为历史记录补算 file_hash，避免去重失效"""
    images = get_all_wall_images()
    updated = 0
    for img in images:
        needs_hash = not img.get("file_hash")
        needs_name = not img.get("original_filename")
        if not needs_hash and not needs_name:
            continue
        updates = {}
        path = img.get("path") or ""
        if needs_hash and path and os.path.exists(path):
            try:
                with open(path, "rb") as f:
                    updates["file_hash"] = hashlib.md5(f.read()).hexdigest()
            except OSError:
                pass
        if needs_name:
            updates["original_filename"] = img.get("filename") or ""
        if updates:
            update_wall_image(img["id"], updates)
            updated += 1
    if updated:
        logger.info(f"已补全 {updated} 条图片的 hash/原始文件名")


def duplicate_response(existing_image, reason="hash"):
    filename = existing_image["filename"]
    return {
        "image_id": existing_image["id"],
        "filename": filename,
        "original_filename": existing_image.get("original_filename") or filename,
        "url": resolve_image_url(filename),
        "width": existing_image.get("width", 0),
        "height": existing_image.get("height", 0),
        "status": "duplicate",
        "dedupe_by": reason,
        "message": "文件已存在，跳过上传",
    }


# ===== 页面路由 =====

@app.route("/")
def index():
    return render_template("index.html")


# ===== 静态文件服务 =====

@app.route("/photos/<path:filename>")
def serve_photo(filename):
    return send_from_directory(PHOTOS_FOLDER, filename)


@app.route("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


# ===== Disc API =====

@app.route("/api/discs")
def api_get_discs():
    keyword = request.args.get("keyword", "").strip()
    genre = request.args.get("genre", "").strip()
    year = request.args.get("year", "").strip()
    confirmed = request.args.get("confirmed")
    preference_raw = request.args.get("preference", "").strip()
    if confirmed is not None:
        confirmed = int(confirmed)

    preference = None
    if preference_raw != "":
        try:
            preference = int(preference_raw)
        except ValueError:
            return jsonify({"error": "喜好筛选无效"}), 400
        if preference not in (0, 1, 2, 3):
            return jsonify({"error": "喜好筛选无效"}), 400

    if keyword or genre or year or confirmed is not None or preference is not None:
        discs = search_discs(
            keyword=keyword or None, genre=genre or None,
            year=year or None, confirmed=confirmed, preference=preference
        )
    else:
        discs = get_all_discs()

    return jsonify({"discs": discs, "count": len(discs)})


@app.route("/api/discs/<int:disc_id>")
def api_get_disc(disc_id):
    disc = get_disc(disc_id)
    if not disc:
        return jsonify({"error": "碟片不存在"}), 404

    # 附加源图片信息用于 AR 叠加显示
    source_image = disc.get("source_image", "")
    if source_image:
        disc["source_image_url"] = resolve_image_url(source_image)
    else:
        disc["source_image_url"] = None

    return jsonify(disc)


@app.route("/api/discs", methods=["POST"])
def api_add_disc():
    """手工建卡 / 识别入库：无照片也可建；source_image 可空，框位可后补。"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "无效数据"}), 400

    title_cn = (data.get("title_cn") or "").strip()
    title_en = (data.get("title_en") or "").strip()
    if not title_cn and not title_en:
        return jsonify({"error": "片名不能为空"}), 400
    data["title_cn"] = title_cn or title_en
    data["title_en"] = title_en
    if "year" in data and data["year"] is not None:
        data["year"] = str(data.get("year") or "").strip()

    # tmdb_id 允许为空："" / null / 0 → None
    if "tmdb_id" in data:
        tid = data.get("tmdb_id")
        if tid in (None, "", 0, "0"):
            data["tmdb_id"] = None
        else:
            try:
                data["tmdb_id"] = int(tid)
            except (TypeError, ValueError):
                return jsonify({"error": "TMDb 编号无效"}), 400
            if data["tmdb_id"] <= 0:
                data["tmdb_id"] = None

    if "tmdb_media_type" in data or "media_type" in data:
        data["tmdb_media_type"] = _normalize_tmdb_media_type(
            data.get("tmdb_media_type", data.get("media_type"))
        )
        data.pop("media_type", None)
    elif data.get("tmdb_id") is None:
        data["tmdb_media_type"] = "movie"

    data, err = _apply_external_ids_from_payload(data)
    if err:
        return err

    # 源图可空；「未归类」视为无关联
    if "source_image" in data:
        src = (data.get("source_image") or "").strip()
        data["source_image"] = "" if src in ("", "未归类") else src

    # 若关联了已在墙上的源图且带了 offset，尽量算出墙面坐标
    if data.get("source_image") and "pos_x" not in data and "pos_y" not in data:
        recalc = _recalc_wall_pos_from_offset(
            data["source_image"],
            data.get("photo_offset_x", 0),
            data.get("photo_offset_y", 0),
        )
        if recalc:
            data = {**data, **recalc}

    disc_id = add_disc(data)
    disc = get_disc(disc_id)
    return jsonify({"id": disc_id, "message": "添加成功", "disc": disc})


def _find_wall_photo_for_source(source_image):
    """按 discs.source_image 匹配 wall_images（filename 优先，其次 original_filename）。"""
    if not source_image:
        return None
    return find_wall_image_by_filename(source_image)


def _wall_pos_from_photo(photo, photo_offset_x, photo_offset_y):
    """用特写在墙上的 placement + 片内 offset 算碟片墙面坐标。"""
    if not photo:
        return None
    wr = float(photo.get("width_ratio") or 0)
    hr = float(photo.get("height_ratio") or 0)
    if wr <= 0 or hr <= 0:
        return None
    return {
        "pos_x": round(float(photo.get("pos_x") or 0) + float(photo_offset_x or 0) * wr, 4),
        "pos_y": round(float(photo.get("pos_y") or 0) + float(photo_offset_y or 0) * hr, 4),
    }


def _recalc_wall_pos_from_offset(source_image, photo_offset_x, photo_offset_y):
    """若源图已在墙上有 placement，用 offset 重算墙面 pos_x/pos_y；否则返回 None。"""
    return _wall_pos_from_photo(
        _find_wall_photo_for_source(source_image),
        photo_offset_x,
        photo_offset_y,
    )


def _recalc_discs_for_wall_image(photo, extra_source_keys=None):
    """按 photo_offset 重算该特写下所有 discs 的墙面坐标，返回更新条数。"""
    if not photo:
        return 0
    keys = {photo.get("filename") or "", photo.get("original_filename") or ""}
    if extra_source_keys:
        for k in extra_source_keys:
            if k:
                keys.add(k)
    keys.discard("")
    seen_ids = set()
    updated = 0
    for key in keys:
        for disc in get_discs_by_source_image(key):
            did = disc.get("id")
            if did in seen_ids:
                continue
            seen_ids.add(did)
            recalc = _wall_pos_from_photo(
                photo,
                disc.get("photo_offset_x", 0),
                disc.get("photo_offset_y", 0),
            )
            if not recalc:
                continue
            update_disc(did, recalc)
            updated += 1
    return updated


def ensure_wall_image_from_source_file(source_filename):
    """若 uploads/photos 已有该文件但未入库，自动登记为 wall_image。"""
    if not source_filename or source_filename == "未归类":
        return None
    existing = find_wall_image_by_filename(source_filename)
    if existing:
        return existing

    candidates = [
        os.path.join(UPLOAD_FOLDER, source_filename),
        os.path.join(PHOTOS_FOLDER, source_filename),
    ]
    filepath = next((p for p in candidates if os.path.exists(p)), None)
    if not filepath:
        return None

    try:
        width, height = get_image_dimensions(filepath)
    except Exception as e:
        logger.warning(f"无法读取源图尺寸 {filepath}: {e}")
        width, height = 0, 0

    image_id = add_wall_image(
        source_filename, filepath, "closeup", 0, 0, 0, 0, width, height,
        original_filename=source_filename,
    )
    logger.info(f"已从磁盘自动关联 wall_image id={image_id} file={source_filename}")
    return get_wall_image(image_id)


def serialize_wall_image(img):
    """API 返回用的 wall_image 字典。"""
    filename = img.get("filename") or ""
    return {
        "id": img["id"],
        "filename": filename,
        "original_filename": img.get("original_filename") or filename,
        "display_name": img.get("original_filename") or filename,
        "url": resolve_image_url(filename),
        "image_type": img.get("image_type") or "closeup",
        "pos_x": float(img.get("pos_x") or 0),
        "pos_y": float(img.get("pos_y") or 0),
        "width_ratio": float(img.get("width_ratio") or 0),
        "height_ratio": float(img.get("height_ratio") or 0),
        "width": img.get("width") or 0,
        "height": img.get("height") or 0,
    }


@app.route("/api/discs/<int:disc_id>", methods=["PUT", "PATCH"])
def api_update_disc(disc_id):
    """更新碟片字段。若改了 photo_offset/bbox 且未显式传 pos，尽量按源图 placement 重算墙面坐标。"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "无效数据"}), 400

    disc = get_disc(disc_id)
    if not disc:
        return jsonify({"error": "碟片不存在"}), 404

    # tmdb_id 允许为空："" / null / 0 → None（与 DB INTEGER NULL 一致）
    if "tmdb_id" in data:
        tid = data.get("tmdb_id")
        if tid in (None, "", 0, "0"):
            data["tmdb_id"] = None
        else:
            try:
                data["tmdb_id"] = int(tid)
            except (TypeError, ValueError):
                return jsonify({"error": "TMDb 编号无效"}), 400
            if data["tmdb_id"] <= 0:
                data["tmdb_id"] = None

    if "tmdb_media_type" in data or "media_type" in data:
        raw_mt = data.get("tmdb_media_type", data.get("media_type"))
        data["tmdb_media_type"] = _normalize_tmdb_media_type(raw_mt)
        data.pop("media_type", None)
    elif data.get("tmdb_id") is None and "tmdb_id" in data:
        # 清空编号时一并回到默认 movie，避免残留 tv 类型
        data["tmdb_media_type"] = "movie"

    data, err = _apply_external_ids_from_payload(data)
    if err:
        return err

    bbox_touched = any(k in data for k in (
        "photo_offset_x", "photo_offset_y", "bbox_w", "bbox_h",
    ))
    if bbox_touched and "pos_x" not in data and "pos_y" not in data:
        source = data.get("source_image") or disc.get("source_image") or ""
        ox = data.get("photo_offset_x", disc.get("photo_offset_x", 0))
        oy = data.get("photo_offset_y", disc.get("photo_offset_y", 0))
        recalc = _recalc_wall_pos_from_offset(source, ox, oy)
        if recalc:
            data = {**data, **recalc}

    update_disc(disc_id, data)
    updated = get_disc(disc_id)
    return jsonify({"message": "更新成功", "disc": updated})


@app.route("/api/discs/<int:disc_id>", methods=["DELETE"])
def api_delete_disc(disc_id):
    disc = get_disc(disc_id)
    if not disc:
        return jsonify({"error": "碟片不存在"}), 404
    delete_disc(disc_id)
    return jsonify({"message": "删除成功", "id": disc_id})


@app.route("/api/discs/<int:disc_id>/position", methods=["PUT"])
def api_update_position(disc_id):
    data = request.get_json()
    if data is None:
        return jsonify({"error": "无效数据"}), 400
    update_disc(disc_id, {"pos_x": data.get("pos_x", 0), "pos_y": data.get("pos_y", 0)})
    return jsonify({"message": "位置更新成功"})


def _disc_meta_from_tmdb(movie: dict) -> dict:
    """从 get_media_full 结果抽出可安全写入的元数据（不含片名/年份/框/坐标）。"""
    patch = {}
    for key in _TMDB_ENRICH_KEYS:
        if key not in movie:
            continue
        val = movie.get(key)
        if key in ("poster_url", "backdrop_url") and not val:
            val = ""
        patch[key] = val
    return patch


@app.route("/api/discs/enrich-posters", methods=["POST"])
def api_enrich_posters():
    """
    按已有 tmdb_id 批量拉取海报/简介/演职人员等元数据。
    不改 title_* / year / tmdb_id / photo_offset_* / bbox_* / pos_* / source_image。
    body: {
      disc_ids?: number[],   # 缺省=全部有 tmdb_id 的碟
      only_missing?: true,   # 默认 true：仅 poster_url 为空的
      include_credits?: true # 默认 true：写入 directors/cast/synopsis 等；false 则只写海报相关
    }
    """
    body = request.get_json(silent=True) or {}
    only_missing = bool(body.get("only_missing", True))
    include_credits = bool(body.get("include_credits", True))
    raw_ids = body.get("disc_ids") or []
    id_set = None
    if raw_ids:
        try:
            id_set = {int(x) for x in raw_ids if int(x) > 0}
        except (TypeError, ValueError):
            return jsonify_error("disc_ids 无效", 400)

    targets = []
    for disc in get_all_discs():
        tid = disc.get("tmdb_id")
        try:
            tid = int(tid) if tid not in (None, "", 0, "0") else 0
        except (TypeError, ValueError):
            tid = 0
        if tid <= 0:
            continue
        if id_set is not None and int(disc["id"]) not in id_set:
            continue
        poster = (disc.get("poster_url") or "").strip()
        if only_missing and poster:
            continue
        targets.append({
            "id": int(disc["id"]),
            "tmdb_id": tid,
            "tmdb_media_type": _normalize_tmdb_media_type(disc.get("tmdb_media_type")),
        })

    if not targets:
        return jsonify({
            "message": "没有需要补全的碟片",
            "task_id": None,
            "total": 0,
        })

    task_id = f"enrich_posters_{uuid.uuid4().hex[:12]}"
    with tasks_lock:
        processing_tasks[task_id] = {
            "status": "processing",
            "progress": 0,
            "total": len(targets),
            "completed": 0,
            "ok": 0,
            "fail": 0,
            "skipped": 0,
            "message": f"开始补全海报 0/{len(targets)}",
            "result": None,
            "errors": [],
        }

    thread = threading.Thread(
        target=_do_enrich_posters,
        args=(task_id, targets, include_credits),
        daemon=True,
    )
    thread.start()
    return jsonify({
        "message": "已开始按 tmdb_id 补全海报/元数据（不改片名与框位）",
        "task_id": task_id,
        "total": len(targets),
    })


def _do_enrich_posters(task_id, targets, include_credits=True):
    ok = fail = skipped = 0
    errors = []
    total = len(targets)
    for i, item in enumerate(targets):
        disc_id = item["id"]
        tmdb_id = item["tmdb_id"]
        media_type = _normalize_tmdb_media_type(item.get("tmdb_media_type"))
        try:
            movie = tmdb.get_media_full(tmdb_id, media_type)
            if not movie:
                fail += 1
                errors.append({
                    "disc_id": disc_id, "tmdb_id": tmdb_id,
                    "media_type": media_type, "error": "TMDb 无数据",
                })
            else:
                patch = _disc_meta_from_tmdb(movie)
                if not include_credits:
                    patch = {
                        k: patch[k] for k in ("poster_url", "backdrop_url")
                        if k in patch
                    }
                if not patch.get("poster_url") and not patch.get("backdrop_url"):
                    skipped += 1
                else:
                    update_disc(disc_id, patch)
                    ok += 1
        except Exception as e:
            fail += 1
            err_msg = client_safe_error(e, "TMDb 拉取失败")
            errors.append({
                "disc_id": disc_id, "tmdb_id": tmdb_id,
                "media_type": media_type, "error": err_msg,
            })
            logger.exception(
                "enrich poster disc=%s tmdb=%s type=%s: %s",
                disc_id, tmdb_id, media_type, e,
            )

        with tasks_lock:
            processing_tasks[task_id]["completed"] = i + 1
            processing_tasks[task_id]["ok"] = ok
            processing_tasks[task_id]["fail"] = fail
            processing_tasks[task_id]["skipped"] = skipped
            processing_tasks[task_id]["progress"] = int((i + 1) / total * 100) if total else 100
            processing_tasks[task_id]["message"] = (
                f"补全海报 {i + 1}/{total}（成功 {ok}，失败 {fail}）"
            )
            processing_tasks[task_id]["errors"] = errors[-20:]
        # 轻微节流，降低 TMDb 限流概率
        time.sleep(0.15)

    with tasks_lock:
        processing_tasks[task_id]["status"] = "done"
        processing_tasks[task_id]["progress"] = 100
        processing_tasks[task_id]["message"] = (
            f"补全完成：成功 {ok}，失败 {fail}，无海报跳过 {skipped}"
        )
        processing_tasks[task_id]["result"] = {
            "ok": ok,
            "fail": fail,
            "skipped": skipped,
            "total": total,
            "errors": errors[:50],
        }


# ===== 图片上传（异步版） =====

@app.route("/api/images/upload", methods=["POST"])
def api_upload_image():
    """上传图片，立即返回，OCR 后台处理"""
    if "image" not in request.files:
        return jsonify({"error": "请选择图片"}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "请选择图片"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "不支持的图片格式"}), 400

    # 读取文件内容并计算 MD5
    file_data = file.read()
    file_hash = hashlib.md5(file_data).hexdigest()
    original_filename = preserve_original_filename(file.filename)

    existing, reason = find_duplicate_image(file_hash, original_filename)
    if existing:
        # 补全缺失的 hash / 原始名
        patch = {}
        if not existing.get("file_hash") and file_hash:
            patch["file_hash"] = file_hash
        if not existing.get("original_filename") and original_filename:
            patch["original_filename"] = original_filename
        if patch:
            update_wall_image(existing["id"], patch)
            existing.update(patch)
        return jsonify(duplicate_response(existing, reason or "hash"))

    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)

    with open(filepath, "wb") as f:
        f.write(file_data)

    width, height = get_image_dimensions(filepath)
    image_type = request.form.get("type", "closeup")
    image_id = add_wall_image(
        filename, filepath, image_type, 0, 0, 0, 0, width, height,
        file_hash=file_hash, original_filename=original_filename,
    )

    return jsonify({
        "image_id": image_id,
        "filename": filename,
        "original_filename": original_filename,
        "url": f"/uploads/{filename}",
        "width": width,
        "height": height,
        "status": "uploaded",
        "message": "图片已上传，后台分析中..."
    })


# ===== 异步处理 API =====

@app.route("/api/images/<int:image_id>/analyze", methods=["POST"])
def api_analyze_image(image_id):
    """触发图像分析（双通道：OCR + 视觉模型）"""
    images = get_all_wall_images()
    target = None
    for img in images:
        if img["id"] == image_id:
            target = img
            break

    if not target:
        return jsonify({"error": "图片不存在"}), 404

    # 创建任务
    task_id = f"analyze_{image_id}_{uuid.uuid4().hex[:8]}"
    with tasks_lock:
        processing_tasks[task_id] = {"status": "processing", "progress": 0, "result": None}

    # 启动后台处理
    thread = threading.Thread(target=_do_analyze_image, args=(task_id, target), daemon=True)
    thread.start()

    return jsonify({"task_id": task_id, "status": "processing"})


def _do_analyze_image(task_id, image_info):
    """后台分析图片"""
    try:
        with tasks_lock:
            processing_tasks[task_id]["progress"] = 20

        # 双通道分析
        analysis = analyze_disc_spine(image_info["path"], fast=True)

        with tasks_lock:
            processing_tasks[task_id]["progress"] = 60

        # 搜索 TMDb 候选
        best_title = analysis.get("best_title", "")
        best_year = analysis.get("best_year", "")
        title_en = analysis.get("vision_analysis", {}).get("title_en", "")
        spine_desc = analysis.get("spine_description", "")

        candidates = []
        if best_title:
            candidates = tmdb.search_by_title_and_visual_clues(
                title_cn=best_title,
                title_en=title_en,
                year=best_year,
                spine_colors=analysis.get("spine_colors", []),
                publisher=analysis.get("publisher", "")
            )

        with tasks_lock:
            processing_tasks[task_id]["progress"] = 90

        result = {
            "image_id": image_info["id"],
            "filename": image_info["filename"],
            "analysis": analysis,
            "candidates": candidates[:15],
            "candidate_count": len(candidates),
        }

        with tasks_lock:
            processing_tasks[task_id]["status"] = "done"
            processing_tasks[task_id]["progress"] = 100
            processing_tasks[task_id]["result"] = result

    except Exception as e:
        logger.exception("task %s failed: %s", task_id, e)
        with tasks_lock:
            processing_tasks[task_id]["status"] = "error"
            processing_tasks[task_id]["result"] = {"error": client_safe_error(e)}


@app.route("/api/tasks/<task_id>")
def api_get_task_status(task_id):
    """获取任务状态"""
    with tasks_lock:
        task = processing_tasks.get(task_id)

    if not task:
        return jsonify({"error": "任务不存在"}), 404

    return jsonify(task)


# ===== TMDb 多模态匹配 =====

@app.route("/api/settings/keys", methods=["GET"])
def api_settings_keys_get():
    """返回各源掩码 key 与尝试调用开关（不含完整 key）。"""
    try:
        return jsonify({"keys": public_keys_status()})
    except Exception as e:
        logger.exception("settings keys get failed: %s", e)
        return jsonify_error(client_safe_error(e, "读取 API Key 失败"), 500)


@app.route("/api/settings/keys", methods=["PUT"])
def api_settings_keys_put():
    """更新某源 key 和/或 enabled。api_key 省略则不改；空字符串清除。"""
    data = request.get_json(silent=True) or {}
    source = (data.get("source") or data.get("provider") or "").strip().lower()
    if not source:
        return jsonify({"error": "请指定 source（tmdb / imdb / tvdb）"}), 400
    enabled = data["enabled"] if "enabled" in data else None
    if enabled is not None:
        enabled = bool(enabled)
    api_key = data["api_key"] if "api_key" in data else None
    if api_key is not None and not isinstance(api_key, str):
        api_key = str(api_key)
    if isinstance(api_key, str) and len(api_key) > 2048:
        return jsonify({"error": "API Key 过长"}), 400
    try:
        keys = update_api_key_source(source, api_key=api_key, enabled=enabled)
    except ValueError:
        return jsonify({"error": "未知来源"}), 400
    except Exception as e:
        logger.exception("settings keys put failed: %s", e)
        return jsonify_error(client_safe_error(e, "保存 API Key 失败"), 500)
    return jsonify({"keys": keys, "providers": providers_status()})


@app.route("/api/meta/providers")
def api_meta_providers():
    """返回各片名搜索来源是否可用（无 key 或已关闭则 disabled + hint）。"""
    return jsonify({"providers": providers_status()})


@app.route("/api/meta/search", methods=["POST"])
def api_meta_search():
    """
    多源片名搜索：并行 TMDb + OMDb(IMDb) + TheTVDB。
    body: title_cn, title_en, year, media_type(all|movie|tv), source(all|tmdb|imdb|tvdb)
    无 key 或已关闭的源不会假搜索。source=all 时跳过禁用源，始终 200。
    仅当用户明确点选某个「开关开但无 key」的源时才 400；开关关闭则跳过且不 400。
    """
    data = request.get_json() or {}
    title_cn = (data.get("title_cn") or "").strip()
    title_en = (data.get("title_en") or "").strip()
    year = (data.get("year") or "").strip()
    media_type = _normalize_search_scope(
        data.get("media_type") or data.get("scope") or "all"
    )
    source = normalize_source_filter(
        data.get("source") or data.get("sources") or "all"
    )

    if not title_cn and not title_en:
        return jsonify({"error": "请提供片名"}), 400

    try:
        result = search_multi_source(
            title_cn=title_cn,
            title_en=title_en,
            year=year,
            media_type=media_type,
            source=source,
        )
    except Exception as e:
        logger.exception("meta search unexpected: %s", e)
        return jsonify_error(client_safe_error(e, "搜索失败，请稍后重试"), 500)

    # 明确选了「开但无 key」的源且无结果 → 400；开关关闭或「全部」跳过源 → 200
    src_info = (result.get("providers") or {}).get(source) or {}
    attempt_off = src_info.get("attempt") is False
    if (
        source != "all"
        and source in (result.get("disabled") or [])
        and not result.get("candidates")
        and not attempt_off
    ):
        if not result.get("error") and not result.get("message"):
            result["error"] = "所选来源不可用"
        return jsonify(result), 400

    return jsonify(result)


@app.route("/api/meta/imdb/<imdb_id>")
def api_meta_imdb_detail(imdb_id):
    """OMDb 按 imdb_id 拉详情（无 key 时 503）。"""
    if not is_attempt_enabled("imdb"):
        return jsonify({"error": "已关闭该来源的 API 调用"}), 503
    if not omdb.enabled:
        return jsonify({"error": "未配置 OMDB_API_KEY，无法拉取 IMDb 详情"}), 503
    try:
        data = omdb.get_by_imdb_id(imdb_id)
    except OMDbError as e:
        logger.exception("OMDb detail failed: %s", e.cause or e)
        return jsonify_error(e.user_message, 502)
    except Exception as e:
        logger.exception("OMDb detail unexpected: %s", e)
        return jsonify_error(client_safe_error(e, "获取失败，请稍后重试"), 500)
    if not data:
        return jsonify({"error": "获取失败"}), 404
    return jsonify(data)


@app.route("/api/tmdb/search-multi", methods=["POST"])
def api_tmdb_search_multi():
    """多查询策略搜索 TMDb（支持 media_type: all|movie|tv，默认 all）"""
    data = request.get_json()
    title_cn = data.get("title_cn", "").strip()
    title_en = data.get("title_en", "").strip()
    year = data.get("year", "").strip()
    media_type = _normalize_search_scope(
        data.get("media_type") or data.get("scope") or "all"
    )

    if not title_cn and not title_en:
        return jsonify({"error": "请提供片名"}), 400

    try:
        candidates = tmdb.search_by_title_and_visual_clues(
            title_cn=title_cn,
            title_en=title_en,
            year=year,
            media_type=media_type,
        )
        # 与 meta/search 对齐：补 source 字段
        for c in candidates:
            c.setdefault("source", "tmdb")
            c.setdefault("imdb_id", None)
            c.setdefault("tvdb_id", None)
    except TMDbError as e:
        logger.exception("TMDb search-multi failed: %s", e.cause or e)
        return jsonify_error(e.user_message, 502)
    except Exception as e:
        logger.exception("TMDb search-multi unexpected: %s", e)
        return jsonify_error(client_safe_error(e, "搜索失败，请稍后重试"), 500)

    return jsonify({
        "candidates": candidates,
        "count": len(candidates),
        "media_type": media_type,
    })


@app.route("/api/tmdb/search")
def api_tmdb_search():
    """简单搜索（支持可选 year；media_type=all|movie|tv，默认 all）"""
    query = request.args.get("q", "").strip()
    year = request.args.get("year", "").strip() or None
    media_type = _normalize_search_scope(
        request.args.get("media_type") or request.args.get("scope") or "all"
    )
    if not query:
        return jsonify({"results": []})
    try:
        # 与 search-multi 一致：去噪多路查询（剥离 BBC: / 收藏版 / 目录号等）
        queries = build_search_queries(query, "") or [query]
        raw = tmdb.search_media_multi(queries, year=year, media_type=media_type)
    except TMDbError as e:
        logger.exception("TMDb search failed: %s", e.cause or e)
        return jsonify_error(e.user_message, 502)
    except Exception as e:
        logger.exception("TMDb search unexpected: %s", e)
        return jsonify_error(client_safe_error(e, "搜索失败，请稍后重试"), 500)
    formatted = []
    for r in raw[:10]:
        item = tmdb._format_search_candidate(r)
        formatted.append({
            "tmdb_id": item.get("tmdb_id"),
            "media_type": item.get("media_type", "movie"),
            "title": item.get("title_cn", ""),
            "original_title": item.get("title_en", ""),
            "year": item.get("year", ""),
            "overview": item.get("overview", ""),
            "poster_url": item.get("poster_url"),
            "rating": item.get("rating", 0),
            "vote_count": item.get("vote_count", 0),
        })
    return jsonify({"results": formatted, "media_type": media_type})


@app.route("/api/tmdb/detail/<int:tmdb_id>")
def api_tmdb_media_detail(tmdb_id):
    """获取电影或剧集详情；?media_type=movie|tv，缺省 movie（兼容旧数据）。"""
    media_type = _normalize_tmdb_media_type(
        request.args.get("media_type") or request.args.get("type") or "movie"
    )
    try:
        data = tmdb.get_media_full(tmdb_id, media_type)
    except TMDbError as e:
        logger.exception("TMDb detail failed id=%s type=%s: %s", tmdb_id, media_type, e.cause or e)
        return jsonify_error(e.user_message, 502)
    except Exception as e:
        logger.exception("TMDb detail unexpected id=%s type=%s: %s", tmdb_id, media_type, e)
        return jsonify_error(client_safe_error(e, "获取失败，请稍后重试"), 500)
    if not data:
        return jsonify({"error": "获取失败"}), 404
    return jsonify(data)


@app.route("/api/tmdb/movie/<int:movie_id>")
def api_tmdb_detail(movie_id):
    """获取完整电影信息（兼容旧路径；可用 ?media_type=tv 拉剧集）。"""
    media_type = _normalize_tmdb_media_type(
        request.args.get("media_type") or request.args.get("type") or "movie"
    )
    try:
        data = tmdb.get_media_full(movie_id, media_type)
    except TMDbError as e:
        logger.exception("TMDb movie detail failed: %s", e.cause or e)
        return jsonify_error(e.user_message, 502)
    except Exception as e:
        logger.exception("TMDb movie detail unexpected: %s", e)
        return jsonify_error(client_safe_error(e, "获取失败，请稍后重试"), 500)
    if not data:
        return jsonify({"error": "获取失败"}), 404
    return jsonify(data)


@app.route("/api/tmdb/tv/<int:tv_id>")
def api_tmdb_tv_detail(tv_id):
    """获取完整剧集信息。"""
    try:
        data = tmdb.get_tv_full(tv_id)
    except TMDbError as e:
        logger.exception("TMDb tv detail failed: %s", e.cause or e)
        return jsonify_error(e.user_message, 502)
    except Exception as e:
        logger.exception("TMDb tv detail unexpected: %s", e)
        return jsonify_error(client_safe_error(e, "获取失败，请稍后重试"), 500)
    if not data:
        return jsonify({"error": "获取失败"}), 404
    return jsonify(data)


# ===== 视觉验证匹配（解决同名/不完整问题） =====

@app.route("/api/images/<int:image_id>/verify-match", methods=["POST"])
def api_verify_match(image_id):
    """用视觉模型验证碟脊是否匹配某个 TMDb 结果"""
    data = request.get_json()
    tmdb_id = data.get("tmdb_id")
    media_type = _normalize_tmdb_media_type(
        data.get("tmdb_media_type") or data.get("media_type") or "movie"
    )

    images = get_all_wall_images()
    target = None
    for img in images:
        if img["id"] == image_id:
            target = img
            break

    if not target:
        return jsonify({"error": "图片不存在"}), 404

    if not tmdb_id:
        return jsonify({"error": "请提供 tmdb_id"}), 400

    try:
        movie_data = tmdb.get_media_full(tmdb_id, media_type)
    except TMDbError as e:
        logger.exception("TMDb verify get_media_full failed: %s", e.cause or e)
        return jsonify_error(e.user_message, 502)
    except Exception as e:
        logger.exception("TMDb verify get_media_full unexpected: %s", e)
        return jsonify_error(client_safe_error(e, "TMDb 数据获取失败"), 500)
    if not movie_data:
        return jsonify({"error": "TMDb 数据获取失败"}), 404

    # 创建异步任务
    task_id = f"verify_{image_id}_{tmdb_id}_{uuid.uuid4().hex[:8]}"
    with tasks_lock:
        processing_tasks[task_id] = {"status": "processing", "progress": 0, "result": None}

    thread = threading.Thread(target=_do_verify_match, args=(task_id, target["path"], movie_data), daemon=True)
    thread.start()

    return jsonify({"task_id": task_id, "status": "processing"})


def _do_verify_match(task_id, image_path, movie_data):
    """后台视觉验证"""
    try:
        result = verify_disc_match(image_path, movie_data)
        with tasks_lock:
            processing_tasks[task_id]["status"] = "done"
            processing_tasks[task_id]["progress"] = 100
            processing_tasks[task_id]["result"] = result
    except Exception as e:
        logger.exception("verify-match %s failed: %s", task_id, e)
        with tasks_lock:
            processing_tasks[task_id]["status"] = "error"
            processing_tasks[task_id]["result"] = {"error": client_safe_error(e)}


# ===== 批量处理：上传 → 分析 → 匹配 =====

@app.route("/api/batch/process", methods=["POST"])
def api_batch_process():
    """
    批量处理流水线：
    1. 上传图片 → 立即返回 image_ids
    2. 后台逐个分析
    3. 前端轮询 /api/batch/process/<batch_id> 获取进度
    """
    if "images" not in request.files:
        # 检查是否有多个文件
        files = request.files.getlist("images") if len(request.files) > 1 else [request.files.get("image")]
        if not files or not files[0]:
            return jsonify({"error": "请选择图片"}), 400
    else:
        files = request.files.getlist("images")

    if not files or files[0].filename == "":
        return jsonify({"error": "请选择图片"}), 400

    batch_id = uuid.uuid4().hex
    image_type = request.form.get("type", "closeup")

    # 保存所有图片（内容哈希优先去重）
    uploaded = []
    seen_hashes = set()
    for file in files:
        if not file or not file.filename or not allowed_file(file.filename):
            continue

        file_data = file.read()
        file_hash = hashlib.md5(file_data).hexdigest()
        original_filename = preserve_original_filename(file.filename)

        # 批次内去重
        if file_hash in seen_hashes:
            continue
        seen_hashes.add(file_hash)

        existing, reason = find_duplicate_image(file_hash, original_filename)
        if existing:
            patch = {}
            if not existing.get("file_hash") and file_hash:
                patch["file_hash"] = file_hash
            if not existing.get("original_filename") and original_filename:
                patch["original_filename"] = original_filename
            if patch:
                update_wall_image(existing["id"], patch)
                existing.update(patch)
            uploaded.append({
                "image_id": existing["id"],
                "filename": existing["filename"],
                "original_filename": existing.get("original_filename") or original_filename,
                "url": resolve_image_url(existing["filename"]),
                "status": "duplicate",
                "dedupe_by": reason or "hash",
            })
            continue

        ext = file.filename.rsplit(".", 1)[1].lower()
        filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)

        with open(filepath, "wb") as f:
            f.write(file_data)

        width, height = get_image_dimensions(filepath)
        image_id = add_wall_image(
            filename, filepath, image_type, 0, 0, 0, 0, width, height,
            file_hash=file_hash, original_filename=original_filename,
        )

        uploaded.append({
            "image_id": image_id,
            "filename": filename,
            "original_filename": original_filename,
            "url": f"/uploads/{filename}",
            "status": "uploaded",
        })

    if not uploaded:
        return jsonify({"error": "没有可处理的图片"}), 400

    # 启动后台批处理
    with tasks_lock:
        processing_tasks[batch_id] = {
            "status": "processing",
            "progress": 0,
            "total": len(uploaded),
            "completed": 0,
            "results": [],
        }

    thread = threading.Thread(
        target=_do_batch_analyze,
        args=(batch_id, uploaded),
        daemon=True
    )
    thread.start()

    return jsonify({
        "batch_id": batch_id,
        "total": len(uploaded),
        "images": uploaded,
        "status": "processing",
    })


def _do_batch_analyze(batch_id, images):
    """后台批量分析 — 支持一张照片识别多张碟片"""
    results = []
    total = len(images)

    for i, img in enumerate(images):
        try:
            wall_images = get_all_wall_images()
            target = None
            for wi in wall_images:
                if wi["id"] == img["image_id"]:
                    target = wi
                    break
            if not target:
                continue

            if not img.get("original_filename"):
                img["original_filename"] = target.get("original_filename") or target.get("filename")

            analysis = analyze_disc_spine(target["path"], fast=True)

            # 提取所有识别到的碟片（多碟片照片）
            all_discs = analysis.get("all_discs", [])
            disc_results = []

            for disc in all_discs:
                title_cn = disc.get("title_cn", "")
                title_en = disc.get("title_en", "")
                year = disc.get("year", "")
                confidence = disc.get("confidence", "low")

                # 搜索 TMDb
                candidates = []
                if title_cn or title_en:
                    candidates = tmdb.search_by_title_and_visual_clues(
                        title_cn=title_cn,
                        title_en=title_en,
                        year=year,
                    )

                # 高置信 + 合理票数 → 建议自动选中（候选已按 vote_count 排序）
                auto_matched = None
                if confidence == "high" and candidates:
                    top = candidates[0]
                    votes = top.get("vote_count", 0) or 0
                    if votes > 100 and (
                        len(candidates) == 1
                        or votes >= (candidates[1].get("vote_count", 0) or 0) * 2
                    ):
                        auto_matched = {"tmdb_id": top["tmdb_id"]}

                disc_results.append({
                    "title_cn": title_cn,
                    "title_en": title_en,
                    "year": year,
                    "confidence": confidence,
                    "source": disc.get("source", "unknown"),
                    "photo_offset_x": disc.get("bbox_x", 0),
                    "photo_offset_y": disc.get("bbox_y", 0),
                    "bbox_w": disc.get("bbox_w", 0),
                    "bbox_h": disc.get("bbox_h", 0),
                    "candidates": candidates[:10],
                    "auto_matched": auto_matched,
                })

            results.append({
                "image_id": img["image_id"],
                "filename": img["filename"],
                "original_filename": img.get("original_filename") or img["filename"],
                "url": img["url"],
                "disc_count": len(disc_results),
                "discs": disc_results,
                "spine_colors": analysis.get("spine_colors", []),
                "status": "done",
            })

        except Exception as e:
            logger.exception("batch image %s failed: %s", img.get("image_id"), e)
            results.append({
                "image_id": img["image_id"],
                "filename": img["filename"],
                "original_filename": img.get("original_filename") or img["filename"],
                "url": img["url"],
                "error": client_safe_error(e, "识别失败，请稍后重试"),
                "disc_count": 0,
                "discs": [],
                "status": "error",
            })

        with tasks_lock:
            processing_tasks[batch_id]["completed"] = i + 1
            processing_tasks[batch_id]["progress"] = int((i + 1) / total * 100) if total > 0 else 100
            processing_tasks[batch_id]["results"] = json.loads(json.dumps(results, default=str))

    with tasks_lock:
        processing_tasks[batch_id]["status"] = "done"
        processing_tasks[batch_id]["progress"] = 100
        processing_tasks[batch_id]["results"] = json.loads(json.dumps(results, default=str))


@app.route("/api/batch/process/<batch_id>")
def api_batch_status(batch_id):
    """获取批处理进度"""
    with tasks_lock:
        task = processing_tasks.get(batch_id, {}).copy()

    if not task:
        return jsonify({"error": "任务不存在"}), 404

    return jsonify(task)


@app.route("/api/batch/confirm", methods=["POST"])
def api_batch_confirm():
    """
    批量确认：用户从候选列表中选择匹配 → 保存碟片
    自动计算碟片在墙上的位置（照片位置 + 碟片在照片中的偏移）
    输入: {items: [{title_cn, title_en, year, tmdb_id, source_image, photo_offset_x, photo_offset_y}]}
    """
    data = request.get_json()
    items = data.get("items", [])

    # 预加载所有墙面图片，建立 filename → image_data 的映射
    all_images = get_all_wall_images()
    image_map = {img["filename"]: img for img in all_images}

    created = []
    for item in items:
        source_image = item.get("source_image", "")
        photo_offset_x = item.get("photo_offset_x", 0)
        photo_offset_y = item.get("photo_offset_y", 0)
        bbox_w = item.get("bbox_w", 0)
        bbox_h = item.get("bbox_h", 0)

        # 自动计算墙面位置：disc.pos = photo.pos + offset * photo.size_ratio
        wall_x = item.get("pos_x", 0)
        wall_y = item.get("pos_y", 0)
        if source_image and source_image in image_map:
            photo = image_map[source_image]
            if photo.get("width_ratio") and photo.get("height_ratio"):
                wall_x = photo["pos_x"] + photo_offset_x * photo["width_ratio"]
                wall_y = photo["pos_y"] + photo_offset_y * photo["height_ratio"]

        tmdb_id = item.get("tmdb_id")
        media_type = _normalize_tmdb_media_type(
            item.get("tmdb_media_type") or item.get("media_type") or "movie"
        )
        if tmdb_id:
            movie_data = tmdb.get_media_full(tmdb_id, media_type)
            if movie_data:
                movie_data.update({
                    "tmdb_media_type": movie_data.get("media_type") or media_type,
                    "pos_x": round(wall_x, 4),
                    "pos_y": round(wall_y, 4),
                    "photo_offset_x": photo_offset_x,
                    "photo_offset_y": photo_offset_y,
                    "bbox_w": bbox_w,
                    "bbox_h": bbox_h,
                    "source_image": source_image,
                    "confirmed": 1
                })
                disc_id = add_disc(movie_data)
                created.append({"id": disc_id, "title_cn": movie_data["title_cn"]})
                continue

        disc_id = add_disc({
            "title_cn": item.get("title_cn", ""),
            "title_en": item.get("title_en", ""),
            "year": item.get("year", ""),
            "source_image": source_image,
            "pos_x": round(wall_x, 4),
            "pos_y": round(wall_y, 4),
            "photo_offset_x": photo_offset_x,
            "photo_offset_y": photo_offset_y,
            "bbox_w": bbox_w,
            "bbox_h": bbox_h,
            "confirmed": item.get("confirmed", 0),
        })
        created.append({"id": disc_id, "title_cn": item.get("title_cn", "")})

    return jsonify({"created": created, "count": len(created)})


# ===== 图片管理 =====

@app.route("/api/images")
def api_get_images():
    images = get_all_wall_images()
    for img in images:
        filename = img["filename"]
        img["url"] = resolve_image_url(filename)
        img["display_name"] = img.get("original_filename") or filename
        boxes = _load_spine_boxes(img["id"])
        img["has_spine_boxes"] = bool(boxes and (boxes.get("spines") or []))
        img["spine_box_count"] = len((boxes or {}).get("spines") or [])
    return jsonify({"images": images})


@app.route("/api/images/resolve-source")
def api_resolve_source_image():
    """按 source_image 文件名解析 wall_image；若不在库则尝试从 uploads/photos 自动关联。"""
    filename = (request.args.get("filename") or "").strip()
    if not filename or filename == "未归类":
        return jsonify({"error": "无效文件名"}), 400

    created = False
    img = find_wall_image_by_filename(filename)
    if not img:
        img = ensure_wall_image_from_source_file(filename)
        created = img is not None

    if not img:
        return jsonify({
            "error": "not_found",
            "message": "未找到对应特写图记录。请先在「图片管理」上传，或确认 uploads/photos 中有同名文件。",
            "filename": filename,
        }), 404

    return jsonify({
        "image": serialize_wall_image(img),
        "created": created,
        "source_filename": filename,
    })


@app.route("/api/images/<int:image_id>", methods=["DELETE"])
def api_delete_image(image_id):
    delete_wall_image(image_id)
    return jsonify({"message": "删除成功"})


@app.route("/api/images/<int:image_id>/position", methods=["PUT"])
def api_update_image_position(image_id):
    """更新照片在墙上的位置和尺寸；可选按 photo_offset 重算关联碟片墙面坐标。"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "无效数据"}), 400

    img = get_wall_image(image_id)
    if not img:
        return jsonify({"error": "图片不存在"}), 404

    update_wall_image(image_id, {
        "pos_x": data.get("pos_x", 0),
        "pos_y": data.get("pos_y", 0),
        "width_ratio": data.get("width_ratio", 0),
        "height_ratio": data.get("height_ratio", 0),
    })

    recalc_count = 0
    if data.get("recalc_discs"):
        photo = get_wall_image(image_id)
        extra = data.get("source_filename") or ""
        recalc_count = _recalc_discs_for_wall_image(photo, [extra] if extra else None)

    return jsonify({
        "message": "位置更新成功",
        "recalc_discs": recalc_count,
    })


def _parse_bbox_frac(data):
    """解析前端传入的分数 bbox，无效则返回 None。"""
    try:
        x = float(data.get("photo_offset_x", data.get("bbox_x", 0)) or 0)
        y = float(data.get("photo_offset_y", data.get("bbox_y", 0)) or 0)
        w = float(data.get("bbox_w", 0) or 0)
        h = float(data.get("bbox_h", 0) or 0)
    except (TypeError, ValueError):
        return None
    if w <= 0.001 or h <= 0.001:
        return None
    # clamp to image
    x = max(0.0, min(x, 0.999))
    y = max(0.0, min(y, 0.999))
    w = max(0.001, min(w, 1.0 - x))
    h = max(0.001, min(h, 1.0 - y))
    return {"x": x, "y": y, "w": w, "h": h}


def _crop_spine_region(spine_path, bbox, pad_ratio=0.12):
    """按分数 bbox 裁剪碟脊区域，略微外扩；返回 (crop_pil, used_bbox)。"""
    img = Image.open(spine_path).convert("RGB")
    x, y, w, h = bbox["x"], bbox["y"], bbox["w"], bbox["h"]
    pad_x = w * pad_ratio
    pad_y = h * pad_ratio
    x2 = max(0.0, x - pad_x)
    y2 = max(0.0, y - pad_y)
    w2 = min(1.0 - x2, w + 2 * pad_x)
    h2 = min(1.0 - y2, h + 2 * pad_y)
    used = {"x": round(x2, 4), "y": round(y2, 4), "w": round(w2, 4), "h": round(h2, 4)}
    crop = extract_tile(img, used["x"], used["y"], used["w"], used["h"])
    # 过小则放大，便于视觉模型看清
    if min(crop.size) < 64:
        scale = max(2, int(128 / max(min(crop.size), 1)))
        crop = crop.resize((crop.width * scale, crop.height * scale), Image.LANCZOS)
    return crop, used


@app.route("/api/images/<int:image_id>/compare-poster", methods=["POST"])
def api_compare_poster(image_id):
    """用视觉模型比对【裁剪后的碟脊区域】与 TMDb 海报"""
    data = request.get_json() or {}
    poster_url = data.get("poster_url", "").strip()
    movie_title = data.get("title", "").strip()
    movie_year = str(data.get("year", "") or "").strip()
    disc_index = data.get("disc_index")

    if not poster_url:
        return jsonify({"error": "请提供海报 URL"}), 400

    bbox = _parse_bbox_frac(data)
    if not bbox:
        return jsonify({
            "error": "该碟片尚未标定碟脊区域，无法精确比对",
            "code": "missing_bbox",
        }), 400

    img = get_wall_image(image_id)
    if not img:
        return jsonify({"error": "图片不存在"}), 404

    task_id = f"compare_poster_{image_id}_{uuid.uuid4().hex[:8]}"
    with tasks_lock:
        processing_tasks[task_id] = {"status": "processing", "progress": 0, "result": None}

    thread = threading.Thread(
        target=_do_compare_poster,
        args=(task_id, img["path"], poster_url, movie_title, movie_year, bbox, disc_index),
        daemon=True
    )
    thread.start()

    return jsonify({"task_id": task_id, "status": "processing"})


@app.route("/api/images/<int:image_id>/analyze-region", methods=["POST"])
def api_analyze_region(image_id):
    """对原图指定分数区域做裁剪识别（视觉+OCR），并搜索 TMDb 候选。

    Body: { photo_offset_x, photo_offset_y, bbox_w, bbox_h }
    """
    data = request.get_json() or {}
    bbox = _parse_bbox_frac(data)
    if not bbox:
        return jsonify({"error": "请提供有效的框选区域", "code": "missing_bbox"}), 400

    img = get_wall_image(image_id)
    if not img:
        return jsonify({"error": "图片不存在"}), 404

    try:
        region = analyze_region(img["path"], bbox, pad_ratio=0.1)
    except Exception as e:
        logger.exception("analyze-region failed: %s", e)
        return jsonify_error(client_safe_error(e, "区域识别失败，请稍后重试"), 500)

    discs_out = []
    for disc in region.get("discs") or []:
        title_cn = disc.get("title_cn", "")
        title_en = disc.get("title_en", "")
        year = disc.get("year", "")
        candidates = []
        if title_cn or title_en:
            try:
                candidates = tmdb.search_by_title_and_visual_clues(
                    title_cn=title_cn,
                    title_en=title_en,
                    year=year,
                )
            except Exception as e:
                logger.exception("analyze-region TMDb search failed: %s", e)
                candidates = []
        ox = disc.get("photo_offset_x", bbox["x"])
        oy = disc.get("photo_offset_y", bbox["y"])
        bw = disc.get("bbox_w", bbox["w"])
        bh = disc.get("bbox_h", bbox["h"])
        discs_out.append({
            "title_cn": title_cn,
            "title_en": title_en,
            "year": year,
            "confidence": disc.get("confidence", "medium"),
            "source": disc.get("source", "vision"),
            "photo_offset_x": ox,
            "photo_offset_y": oy,
            "bbox_w": bw,
            "bbox_h": bh,
            "candidates": candidates[:10],
            "auto_matched": None,
        })

    # 若视觉/OCR 都没读出标题，仍返回带 bbox 的占位条目，方便用户再手动搜
    if not discs_out:
        discs_out.append({
            "title_cn": "（区域未识别到片名）",
            "title_en": "",
            "year": "",
            "confidence": "low",
            "source": "manual_region",
            "photo_offset_x": round(bbox["x"], 4),
            "photo_offset_y": round(bbox["y"], 4),
            "bbox_w": round(bbox["w"], 4),
            "bbox_h": round(bbox["h"], 4),
            "candidates": [],
            "auto_matched": None,
        })

    return jsonify({
        "discs": discs_out,
        "user_bbox": region.get("user_bbox"),
        "used_bbox": region.get("used_bbox"),
    })


def _do_compare_poster(task_id, spine_path, poster_url, movie_title, movie_year, bbox, disc_index=None):
    """后台视觉比对：裁剪碟脊区域 vs 海报（必须同时送两张图）"""
    try:
        poster_resp = requests.get(poster_url, timeout=30)
        poster_resp.raise_for_status()
        poster_img = Image.open(io.BytesIO(poster_resp.content)).convert("RGB")
        poster_img.thumbnail((512, 512), Image.LANCZOS)
        poster_buf = io.BytesIO()
        poster_img.save(poster_buf, format="JPEG", quality=70)
        poster_b64 = base64.b64encode(poster_buf.getvalue()).decode("utf-8")

        # 裁剪目标碟脊，禁止送整张货架图
        crop_img, used_bbox = _crop_spine_region(spine_path, bbox)
        spine_b64 = encode_pil_to_b64(crop_img, max_size=512, quality=70)

        title_bits = movie_title or "未知影片"
        if movie_year:
            title_bits = f"{title_bits} ({movie_year})"

        prompt = (
            "第一张图是从货架照片中裁剪出的单张 Blu-ray/DVD 碟脊区域，"
            "第二张图是 TMDb 电影海报。\n"
            f"候选影片：{title_bits}\n"
            "请判断该碟脊外观（颜色、标题文字、图案）是否与海报属于同一部电影。\n"
            "只按以下格式回答：\n"
            "第一行：YES 或 NO\n"
            "第二行：用一两句中文说明理由（不超过 40 字）。"
        )
        description = call_vision(
            VISION_MODEL,
            prompt,
            spine_b64,
            extra_images=[poster_b64],
            timeout=120,
        )

        upper = (description or "").strip().upper()
        is_match = upper.startswith("YES")
        if upper.startswith("NO"):
            is_match = False

        lines = [ln.strip() for ln in (description or "").splitlines() if ln.strip()]
        summary = ""
        if lines:
            if re.match(r"^(YES|NO)\b", lines[0], re.I):
                summary = " ".join(lines[1:]).strip() or lines[0]
            else:
                summary = " ".join(lines).strip()
        if len(summary) > 80:
            summary = summary[:80] + "…"

        with tasks_lock:
            processing_tasks[task_id]["status"] = "done"
            processing_tasks[task_id]["progress"] = 100
            processing_tasks[task_id]["result"] = {
                "description": description,
                "summary": summary,
                "match": is_match,
                "poster_url": poster_url,
                "title": movie_title,
                "year": movie_year,
                "disc_index": disc_index,
                "bbox": used_bbox,
                "spine_crop_b64": spine_b64,
            }

    except Exception as e:
        logger.exception("compare task %s failed: %s", task_id, e)
        with tasks_lock:
            processing_tasks[task_id]["status"] = "error"
            processing_tasks[task_id]["result"] = {"error": client_safe_error(e)}


# ===== 筛选 & 统计 =====

@app.route("/api/filters")
def api_get_filters():
    return jsonify({"genres": get_all_genres(), "years": get_all_years()})


@app.route("/api/stats")
def api_get_stats():
    return jsonify(get_stats())


@app.route("/api/wall-image")
def api_wall_image():
    images = get_all_wall_images()
    for img in images:
        if img.get("image_type") == "panoramic":
            return jsonify({
                "url": f"/uploads/{img['filename']}",
                "width": img.get("width", 0),
                "height": img.get("height", 0),
            })
    if os.path.exists(WALL_IMAGE):
        return jsonify({"url": "/photos/test-wall.jpg", "width": 0, "height": 0})
    return jsonify({"url": "", "width": 0, "height": 0})


# ===== 重新识别已上传图片 =====

@app.route("/api/images/<int:image_id>/reprocess", methods=["POST"])
def api_reprocess_image(image_id):
    """重新识别已上传的图片：清除旧 OCR/disc 记录，重新分析"""
    img = get_wall_image(image_id)
    if not img:
        return jsonify({"error": "图片不存在"}), 404

    # 清除旧记录
    clear_image_records(image_id)

    # 构建图片信息（与 _do_batch_analyze 期望的格式一致）
    filename = img["filename"]
    image_entry = [{
        "image_id": image_id,
        "filename": filename,
        "original_filename": img.get("original_filename") or filename,
        "url": resolve_image_url(filename),
    }]

    # 创建异步批处理任务
    batch_id = f"reprocess_{image_id}_{uuid.uuid4().hex[:8]}"
    with tasks_lock:
        processing_tasks[batch_id] = {
            "status": "processing",
            "progress": 0,
            "total": 1,
            "completed": 0,
            "results": [],
        }

    thread = threading.Thread(
        target=_do_batch_analyze,
        args=(batch_id, image_entry),
        daemon=True
    )
    thread.start()

    return jsonify({"task_id": batch_id, "status": "processing", "image_id": image_id})


# ===== 批量删除图片 =====

@app.route("/api/images/batch-delete", methods=["POST"])
def api_batch_delete_images():
    """批量删除图片及其关联的所有碟片和 OCR 结果"""
    data = request.get_json(silent=True) or {}
    image_ids = coerce_image_ids(data.get("image_ids"))
    if not image_ids:
        return jsonify({"error": "请提供 image_ids 列表"}), 400

    deleted = []
    failed = []
    images = get_all_wall_images()
    image_map = {img["id"]: img for img in images}

    for image_id in image_ids:
        img = image_map.get(image_id)
        if not img:
            failed.append({"image_id": image_id, "error": "图片不存在"})
            continue

        filename = img["filename"]
        filepath = img["path"]

        try:
            delete_wall_image(image_id)
        except Exception as e:
            logger.exception("delete wall image %s failed: %s", image_id, e)
            failed.append({"image_id": image_id, "error": client_safe_error(e, "删除失败")})
            continue

        try:
            if filepath and os.path.exists(filepath):
                os.remove(filepath)
            photos_path = os.path.join(PHOTOS_FOLDER, filename)
            if os.path.exists(photos_path):
                os.remove(photos_path)
            uploads_path = os.path.join(UPLOAD_FOLDER, filename)
            if filepath != uploads_path and os.path.exists(uploads_path):
                os.remove(uploads_path)
        except Exception:
            pass

        deleted.append(image_id)

    return jsonify({
        "deleted": deleted,
        "failed": failed,
        "count": len(deleted),
    })


# ===== 批量重新识别 =====

@app.route("/api/images/batch-reprocess", methods=["POST"])
def api_batch_reprocess():
    """批量重新识别图片：清除旧记录，创建统一批处理任务"""
    data = request.get_json(silent=True) or {}
    image_ids = coerce_image_ids(data.get("image_ids"))
    if not image_ids:
        return jsonify({"error": "请提供 image_ids 列表"}), 400

    images = get_all_wall_images()
    image_map = {img["id"]: img for img in images}

    # 先清除所有旧记录
    for image_id in image_ids:
        img = image_map.get(image_id)
        if img:
            clear_image_records(image_id)

    # 构建图像条目列表
    image_entries = []
    for image_id in image_ids:
        img = image_map.get(image_id)
        if not img:
            continue
        filename = img["filename"]
        image_entries.append({
            "image_id": image_id,
            "filename": filename,
            "original_filename": img.get("original_filename") or filename,
            "url": resolve_image_url(filename),
        })

    if not image_entries:
        return jsonify({"error": "没有找到有效图片"}), 404

    # 创建异步批处理任务
    batch_id = f"batch_reprocess_{uuid.uuid4().hex[:12]}"
    with tasks_lock:
        processing_tasks[batch_id] = {
            "status": "processing",
            "progress": 0,
            "total": len(image_entries),
            "completed": 0,
            "results": [],
        }

    thread = threading.Thread(
        target=_do_batch_analyze,
        args=(batch_id, image_entries),
        daemon=True
    )
    thread.start()

    return jsonify({
        "batch_id": batch_id,
        "total": len(image_entries),
        "images": image_entries,
        "status": "processing",
    })


# ===== 碟脊框 / Stage2（手工框 → 识别 → 入库） =====

def _spine_boxes_path(image_id: int) -> str:
    return os.path.join(SPINE_BOXES_FOLDER, f"{int(image_id)}.json")


def _spine_results_path(image_id: int) -> str:
    return os.path.join(SPINE_RESULTS_FOLDER, f"{int(image_id)}.json")


def _load_spine_boxes(image_id: int):
    path = _spine_boxes_path(image_id)
    if not os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        logger.exception("读取 spine boxes 失败 image_id=%s", image_id)
        return None


def _empty_spine_boxes(wall_img: dict) -> dict:
    path = wall_img.get("path") or ""
    filename = wall_img.get("original_filename") or wall_img.get("filename") or ""
    w = float(wall_img.get("width") or 0)
    h = float(wall_img.get("height") or 0)
    if (w <= 0 or h <= 0) and path and os.path.isfile(path):
        try:
            w, h = get_image_dimensions(path)
        except Exception:
            w, h = 0, 0
    return {
        "image_filename": filename,
        "image_path": path,
        "image_w": int(w or 0),
        "image_h": int(h or 0),
        "image_id": str(wall_img.get("id")),
        "wall_image_id": wall_img.get("id"),
        "model": "",
        "spines": [],
        "source": "empty_template",
    }


def _save_spine_boxes(image_id: int, data: dict) -> dict:
    os.makedirs(SPINE_BOXES_FOLDER, exist_ok=True)
    path = _spine_boxes_path(image_id)
    payload = dict(data or {})
    payload["wall_image_id"] = int(image_id)
    payload["edited_at"] = payload.get("edited_at") or __import__("datetime").datetime.utcnow().isoformat() + "Z"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    return payload


@app.route("/api/images/<int:image_id>/spine-boxes", methods=["GET"])
def api_get_spine_boxes(image_id):
    """获取与 wall_image 关联的碟脊框 JSON；无则返回空模板。"""
    wall = get_wall_image(image_id)
    if not wall:
        return jsonify_error("图片不存在", 404)
    boxes = _load_spine_boxes(image_id)
    created = False
    if boxes is None:
        boxes = _empty_spine_boxes(wall)
        created = True
    # 始终用当前磁盘路径 / URL，避免离线 json 里的绝对路径过期
    boxes = dict(boxes)
    boxes["image_path"] = wall.get("path") or boxes.get("image_path") or ""
    boxes["image_filename"] = wall.get("original_filename") or wall.get("filename") or boxes.get("image_filename")
    boxes["wall_image_id"] = image_id
    boxes["image_url"] = resolve_image_url(wall.get("filename") or "")
    return jsonify({
        "image_id": image_id,
        "exists": not created,
        "boxes": boxes,
        "spine_count": len(boxes.get("spines") or []),
    })


@app.route("/api/images/<int:image_id>/spine-boxes", methods=["PUT", "POST"])
def api_save_spine_boxes(image_id):
    """保存手工修正后的碟脊框 JSON。"""
    wall = get_wall_image(image_id)
    if not wall:
        return jsonify_error("图片不存在", 404)
    body = request.get_json(silent=True) or {}
    boxes = body.get("boxes") if isinstance(body.get("boxes"), dict) else body
    if not isinstance(boxes, dict):
        return jsonify_error("请提交 boxes JSON 对象", 400)
    spines = boxes.get("spines")
    if spines is not None and not isinstance(spines, list):
        return jsonify_error("spines 必须是数组", 400)
    boxes = dict(boxes)
    boxes["image_path"] = wall.get("path") or ""
    boxes["image_filename"] = wall.get("original_filename") or wall.get("filename") or ""
    boxes["wall_image_id"] = image_id
    boxes["edited_by"] = boxes.get("edited_by") or "spine_boxes_editor"
    saved = _save_spine_boxes(image_id, boxes)
    return jsonify({
        "ok": True,
        "image_id": image_id,
        "spine_count": len(saved.get("spines") or []),
        "path": _spine_boxes_path(image_id),
    })


@app.route("/api/batch/stage2", methods=["POST"])
def api_batch_stage2():
    """
    对所选 wall_image 跑 stage2（识别 + TMDb），可选导入 DB。
    body: { image_ids: [], reset_existing?: true, import?: true, confirmed?: 1 }
    """
    body = request.get_json(silent=True) or {}
    image_ids = coerce_image_ids(body.get("image_ids") or [])
    if not image_ids:
        return jsonify_error("请提供 image_ids", 400)

    reset_existing = bool(body.get("reset_existing", True))
    do_import = bool(body.get("import", True))
    confirmed = int(body.get("confirmed", 1))
    require_layout = bool(body.get("require_layout", False))

    entries = []
    for iid in image_ids:
        wall = get_wall_image(iid)
        if not wall:
            continue
        boxes = _load_spine_boxes(iid)
        if not boxes or not (boxes.get("spines") or []):
            return jsonify_error(
                f"图片 #{iid} 尚无碟脊框，请先打开「修正碟脊框」保存至少一个框",
                400,
            )
        entries.append({"image_id": iid, "wall": wall, "boxes": boxes})

    if not entries:
        return jsonify_error("没有有效图片", 404)

    batch_id = f"stage2_{uuid.uuid4().hex[:12]}"
    with tasks_lock:
        processing_tasks[batch_id] = {
            "status": "processing",
            "progress": 0,
            "total": len(entries),
            "completed": 0,
            "results": [],
            "message": "准备 stage2…",
            "kind": "stage2",
        }

    thread = threading.Thread(
        target=_do_batch_stage2,
        args=(batch_id, entries, reset_existing, do_import, confirmed, require_layout),
        daemon=True,
    )
    thread.start()

    return jsonify({
        "batch_id": batch_id,
        "total": len(entries),
        "status": "processing",
        "kind": "stage2",
    })


def _do_batch_stage2(batch_id, entries, reset_existing, do_import, confirmed, require_layout):
    results = []
    total = len(entries)
    try:
        for i, entry in enumerate(entries):
            iid = entry["image_id"]
            wall = entry["wall"]
            boxes = entry["boxes"]
            label = wall.get("original_filename") or wall.get("filename") or str(iid)
            with tasks_lock:
                processing_tasks[batch_id]["message"] = f"识别中 {i + 1}/{total}：{label}"
                processing_tasks[batch_id]["progress"] = int(i / total * 100) if total else 0

            item = {
                "image_id": iid,
                "label": label,
                "ok": False,
                "spine_count": 0,
                "matched": 0,
                "imported": 0,
                "error": None,
                "results_path": None,
            }
            try:
                img_path = wall.get("path") or ""
                if not img_path or not os.path.isfile(img_path):
                    raise FileNotFoundError(f"原图文件不存在: {img_path}")

                def _progress(done, n, _sid):
                    # 单图内部进度折算到批次
                    base = i / total
                    frac = (done / n) if n else 1
                    pct = int((base + frac / total) * 100)
                    with tasks_lock:
                        processing_tasks[batch_id]["progress"] = min(99, pct)
                        processing_tasks[batch_id]["message"] = (
                            f"识别中 {i + 1}/{total}：{label}（脊 {done}/{n}）"
                        )

                out = recognize_spines(
                    boxes,
                    image_path=img_path,
                    progress_cb=_progress,
                )
                os.makedirs(SPINE_RESULTS_FOLDER, exist_ok=True)
                out_path = _spine_results_path(iid)
                with open(out_path, "w", encoding="utf-8") as f:
                    json.dump(out, f, ensure_ascii=False, indent=2)

                spines = out.get("spines") or []
                matched = sum(1 for s in spines if (s.get("match") or {}).get("tmdb_id"))
                item["spine_count"] = len(spines)
                item["matched"] = matched
                item["results_path"] = out_path

                if do_import:
                    summary = import_spine_results(
                        out,
                        wall_image_id=iid,
                        reset_existing=reset_existing,
                        confirmed=confirmed,
                        require_layout=require_layout,
                    )
                    item["imported"] = summary.get("count", 0)
                    item["layout_ready"] = summary.get("layout_ready", False)

                item["ok"] = True
            except Exception as e:
                logger.exception("stage2 failed image_id=%s", iid)
                item["error"] = client_safe_error(e, "stage2 失败")

            results.append(item)
            with tasks_lock:
                processing_tasks[batch_id]["completed"] = i + 1
                processing_tasks[batch_id]["results"] = json.loads(json.dumps(results, default=str))
                processing_tasks[batch_id]["progress"] = int((i + 1) / total * 100) if total else 100

        with tasks_lock:
            processing_tasks[batch_id]["status"] = "done"
            processing_tasks[batch_id]["progress"] = 100
            processing_tasks[batch_id]["message"] = "stage2 完成"
            processing_tasks[batch_id]["results"] = json.loads(json.dumps(results, default=str))
    except Exception as e:
        logger.exception("stage2 batch crashed")
        with tasks_lock:
            processing_tasks[batch_id]["status"] = "error"
            processing_tasks[batch_id]["message"] = client_safe_error(e)
            processing_tasks[batch_id]["results"] = json.loads(json.dumps(results, default=str))


# ===== 启动 =====

# 启动时灌入本机 api_keys.json（保存后也可热读）
try:
    ensure_applied()
except Exception:
    logger.exception("apply api keys on import failed")


if __name__ == "__main__":
    init_db()
    backfill_file_hashes()
    logger.info(f"myWall v{APP_VERSION} 启动中...")
    logger.info(f"日志文件: {LOG_FILE}")
    logger.info("访问地址: http://127.0.0.1:5000")
    logger.info("视觉模型: LM Studio (glm-4.6v-flash)")
    logger.info("TMDb proxies: %s", dict(getattr(tmdb.session, "proxies", {}) or {}))
    app.run(host="0.0.0.0", port=5000, debug=DEBUG)
