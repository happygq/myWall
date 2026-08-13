"""本机 API Key 存储（未入库）：data/api_keys.json。

优先级：json 里显式写了 api_key（含空字符串=已清除）> 启动时的 env/config 回退。
enabled 为「是否尝试调用」开关，与有没有 key 独立。
GET 只暴露掩码，绝不回显完整 key。
"""
from __future__ import annotations

import json
import logging
import os
import threading

import config as cfg

logger = logging.getLogger("myWall.api_keys")

SOURCES = ("tmdb", "imdb", "tvdb")
SOURCE_LABELS = {
    "tmdb": "TMDb",
    "imdb": "IMDb (OMDb)",
    "tvdb": "TVDB",
}
MISSING_HINTS = {
    "tmdb": "未配置 TMDB_API_KEY，TMDb 搜索已禁用",
    "imdb": "未配置 OMDB_API_KEY，IMDb 搜索已禁用",
    "tvdb": "未配置 TVDB_API_KEY，TheTVDB 搜索已禁用",
}
DISABLED_HINT = "已关闭该来源的 API 调用"

_lock = threading.RLock()
_mtime: float | None = None

# 进程启动时的 env/config 回退值（apply 会改 config 模块全局，不能事后再读）
_FALLBACK_KEYS = {
    "tmdb": (getattr(cfg, "TMDB_API_KEY", None) or "").strip(),
    "imdb": (getattr(cfg, "OMDB_API_KEY", None) or "").strip(),
    "tvdb": (getattr(cfg, "TVDB_API_KEY", None) or "").strip(),
}
_FALLBACK_TMDB_TOKEN = (getattr(cfg, "TMDB_ACCESS_TOKEN", None) or "").strip()


def keys_path() -> str:
    return getattr(cfg, "API_KEYS_PATH", None) or os.path.join(
        cfg.BASE_DIR, "data", "api_keys.json"
    )


def mask_key(key: str | None) -> str:
    """完整 key 不回显：长 key 显示 •••• + 末 4 位；短 key 仅 ••••。"""
    s = (key or "").strip()
    if not s:
        return ""
    if len(s) <= 4:
        return "••••"
    return "••••" + s[-4:]


def _empty_store() -> dict:
    return {s: {"enabled": True} for s in SOURCES}


def _normalize_store(raw) -> dict:
    store = _empty_store()
    if not isinstance(raw, dict):
        return store
    for src in SOURCES:
        rec = raw.get(src)
        if not isinstance(rec, dict):
            rec = raw.get("omdb" if src == "imdb" else src)
        if not isinstance(rec, dict):
            continue
        out = {"enabled": True}
        if "enabled" in rec:
            out["enabled"] = bool(rec.get("enabled"))
        if "api_key" in rec:
            out["api_key"] = "" if rec.get("api_key") is None else str(rec.get("api_key"))
        store[src] = out
    return store


def _read_store_unlocked() -> dict:
    path = keys_path()
    if not os.path.isfile(path):
        return _empty_store()
    try:
        with open(path, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except (OSError, ValueError) as e:
        logger.warning("failed to read api keys file: %s", e)
        return _empty_store()
    return _normalize_store(raw)


def load_store() -> dict:
    with _lock:
        return _read_store_unlocked()


def _write_store_unlocked(store: dict) -> None:
    path = keys_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    payload = _normalize_store(store)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp, path)


def fallback_key(source: str) -> str:
    return _FALLBACK_KEYS.get(source, "") or ""


def effective_key(source: str, store: dict | None = None) -> str:
    rec = (store or load_store()).get(source) or {}
    if "api_key" in rec:
        return (rec.get("api_key") or "").strip()
    return fallback_key(source)


def is_attempt_enabled(source: str, store: dict | None = None) -> bool:
    rec = (store or load_store()).get(source) or {}
    if "enabled" not in rec:
        return True
    return bool(rec.get("enabled"))


def has_credentials(source: str, store: dict | None = None) -> bool:
    key = effective_key(source, store)
    if key:
        return True
    # 未在 json 覆盖时，TMDb 仍可能只用 Access Token
    if source == "tmdb" and "api_key" not in ((store or load_store()).get("tmdb") or {}):
        return bool(_FALLBACK_TMDB_TOKEN)
    return False


def apply_runtime_keys(store: dict | None = None) -> dict:
    """把有效 key 写入 config 全局与已创建的客户端，供搜索热读。"""
    with _lock:
        data = store if store is not None else _read_store_unlocked()
        tmdb_key = effective_key("tmdb", data)
        omdb_key = effective_key("imdb", data)
        tvdb_key = effective_key("tvdb", data)

        tmdb_overridden = "api_key" in (data.get("tmdb") or {})
        if tmdb_overridden:
            tmdb_token = tmdb_key if tmdb_key.startswith("eyJ") else ""
        else:
            tmdb_token = _FALLBACK_TMDB_TOKEN
            if tmdb_key.startswith("eyJ") and not tmdb_token:
                tmdb_token = tmdb_key

        cfg.TMDB_API_KEY = tmdb_key
        cfg.TMDB_ACCESS_TOKEN = tmdb_token
        cfg.OMDB_API_KEY = omdb_key
        cfg.TVDB_API_KEY = tvdb_key

        try:
            from tmdb_client import tmdb
            tmdb.set_credentials(tmdb_key, tmdb_token)
        except Exception:
            logger.exception("failed to apply TMDb key")

        try:
            from omdb_client import omdb
            omdb.set_api_key(omdb_key)
        except Exception:
            logger.exception("failed to apply OMDb key")

        try:
            from tvdb_client import tvdb
            tvdb.set_api_key(tvdb_key)
        except Exception:
            logger.exception("failed to apply TVDB key")

        global _mtime
        path = keys_path()
        try:
            _mtime = os.path.getmtime(path) if os.path.isfile(path) else 0.0
        except OSError:
            _mtime = 0.0
        return data


def ensure_applied() -> dict:
    """文件变更（含手工改 json）时再灌进内存，避免必须重启。"""
    global _mtime
    path = keys_path()
    try:
        m = os.path.getmtime(path) if os.path.isfile(path) else 0.0
    except OSError:
        m = 0.0
    with _lock:
        if _mtime is None or m != _mtime:
            return apply_runtime_keys()
        return _read_store_unlocked()


def public_keys_status() -> dict:
    """仅 masked + enabled + configured，不含完整 key。"""
    store = ensure_applied()
    out = {}
    for src in SOURCES:
        key = effective_key(src, store)
        configured = has_credentials(src, store)
        out[src] = {
            "label": SOURCE_LABELS[src],
            "configured": configured,
            "masked": mask_key(key) if key else "",
            "enabled": is_attempt_enabled(src, store),
        }
    return out


def update_source(source: str, api_key=None, enabled=None) -> dict:
    """更新某源。api_key=None 表示不改 key；空字符串表示清除。"""
    src = (source or "").strip().lower()
    if src in ("omdb",):
        src = "imdb"
    if src in ("thetvdb",):
        src = "tvdb"
    if src not in SOURCES:
        raise ValueError("未知来源")

    with _lock:
        store = _read_store_unlocked()
        rec = dict(store.get(src) or {"enabled": True})
        if enabled is not None:
            rec["enabled"] = bool(enabled)
        if api_key is not None:
            rec["api_key"] = str(api_key).strip()
        store[src] = rec
        _write_store_unlocked(store)
        apply_runtime_keys(store)
        logger.info(
            "api key updated source=%s configured=%s attempt=%s",
            src,
            has_credentials(src, store),
            is_attempt_enabled(src, store),
        )
        return public_keys_status()
