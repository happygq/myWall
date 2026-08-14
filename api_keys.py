"""本机 API Key 存储（未入库）：data/api_keys.json。

优先级：json 里显式写了 api_key（含空字符串=已清除）> 启动时的 env/config 回退。
enabled 为「是否尝试调用」开关，与有没有 key 独立。
GET 只暴露掩码，绝不回显完整 key。

iCloud Drive 可能把刚写入的 api_keys.json 改名为冲突副本（如 api_keys 2.json）。
热加载遇到规范路径消失/空文件时保留内存 key，并尝试从冲突副本或 bak 恢复。
"""
from __future__ import annotations

import json
import logging
import os
import shutil
import threading
import time

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

_CANONICAL_NAME = "api_keys.json"
_BACKUP_NAME = "api_keys.bak.json"

_lock = threading.RLock()
_mtime: float | None = None
_memory_store: dict | None = None
_missing_warned = False

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


def backup_path() -> str:
    return os.path.join(os.path.dirname(keys_path()), _BACKUP_NAME)


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


def _raw_has_three_sources(raw) -> bool:
    if not isinstance(raw, dict):
        return False
    for src in SOURCES:
        rec = raw.get(src)
        if not isinstance(rec, dict) and src == "imdb":
            rec = raw.get("omdb")
        if not isinstance(rec, dict):
            return False
    return True


def _store_has_any_key(store: dict | None) -> bool:
    if not store:
        return False
    for src in SOURCES:
        rec = store.get(src) or {}
        if (rec.get("api_key") or "").strip():
            return True
    return False


def _remember(store: dict) -> None:
    global _memory_store
    _memory_store = _normalize_store(store)


def _read_json_status(path: str) -> tuple[dict | None, object | None, str]:
    """读 json。status: ok / missing / empty / invalid。不把缺文件当成空 store。"""
    if not os.path.isfile(path):
        return None, None, "missing"
    try:
        if os.path.getsize(path) == 0:
            return None, None, "empty"
        with open(path, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except (OSError, ValueError) as e:
        logger.warning("failed to read api keys file %s: %s", os.path.basename(path), e)
        return None, None, "invalid"
    return _normalize_store(raw), raw, "ok"


def _is_conflict_copy_name(name: str) -> bool:
    """iCloud / 同步冲突副本：api_keys 2.json、api_keys (2).json、*conflict* 等。"""
    lower = name.lower()
    if not lower.endswith(".json") or lower.endswith(".tmp"):
        return False
    if lower in {_CANONICAL_NAME, _BACKUP_NAME}:
        return False
    if not lower.startswith("api_keys"):
        return False
    return True


def _list_conflict_copies() -> list[str]:
    folder = os.path.dirname(keys_path())
    if not os.path.isdir(folder):
        return []
    found: list[str] = []
    try:
        names = os.listdir(folder)
    except OSError:
        return []
    for name in names:
        if _is_conflict_copy_name(name):
            found.append(os.path.join(folder, name))
    found.sort(
        key=lambda p: os.path.getmtime(p) if os.path.isfile(p) else 0.0,
        reverse=True,
    )
    return found


def _copy_to_canonical(src: str) -> bool:
    dest = keys_path()
    try:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(src, dest)
        return os.path.isfile(dest) and os.path.getsize(dest) > 0
    except OSError as e:
        logger.warning(
            "failed to restore %s from %s: %s",
            _CANONICAL_NAME,
            os.path.basename(src),
            e,
        )
        return False


def _try_recover_canonical() -> dict | None:
    """规范文件缺失或空时：冲突副本（三源齐全且有 key）优先，其次 bak。"""
    for src in _list_conflict_copies():
        store, raw, status = _read_json_status(src)
        if status != "ok" or store is None:
            continue
        if not _raw_has_three_sources(raw) or not _store_has_any_key(store):
            continue
        if _copy_to_canonical(src):
            logger.warning(
                "restored %s from iCloud conflict copy %s",
                _CANONICAL_NAME,
                os.path.basename(src),
            )
            return store
        logger.warning(
            "conflict copy %s has keys but copy-back failed; using it in memory",
            os.path.basename(src),
        )
        return store

    bak = backup_path()
    store, _raw, status = _read_json_status(bak)
    if status == "ok" and store is not None and _store_has_any_key(store):
        if _copy_to_canonical(bak):
            logger.warning("restored %s from %s", _CANONICAL_NAME, _BACKUP_NAME)
        else:
            logger.warning("using %s in memory; copy-back failed", _BACKUP_NAME)
        return store
    return None


def _atomic_write_json(path: str, payload: dict) -> None:
    folder = os.path.dirname(path)
    if folder:
        os.makedirs(folder, exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")
        f.flush()
        try:
            os.fsync(f.fileno())
        except OSError:
            pass
    os.replace(tmp, path)


def _restore_after_write(payload: dict) -> None:
    """写盘后若规范路径马上不见，从冲突副本改回；再不行就重写。"""
    path = keys_path()
    deadline = time.time() + 0.3
    while True:
        if os.path.isfile(path) and os.path.getsize(path) > 0:
            return
        restored = False
        for src in _list_conflict_copies():
            cstore, _raw, status = _read_json_status(src)
            if status != "ok" or cstore is None:
                continue
            if _copy_to_canonical(src):
                logger.warning(
                    "%s vanished after write; restored from %s",
                    _CANONICAL_NAME,
                    os.path.basename(src),
                )
                restored = True
                break
        if restored and os.path.isfile(path):
            return
        try:
            _atomic_write_json(path, payload)
        except OSError as e:
            logger.warning("re-write %s failed: %s", _CANONICAL_NAME, e)
        if os.path.isfile(path) and os.path.getsize(path) > 0:
            return
        if time.time() >= deadline:
            logger.warning(
                "%s still missing after write; in-memory keys kept, bak written",
                _CANONICAL_NAME,
            )
            return
        time.sleep(0.05)


def _write_backup(payload: dict) -> None:
    try:
        _atomic_write_json(backup_path(), payload)
    except OSError as e:
        logger.warning("failed to write api keys backup: %s", e)


def _read_store_unlocked() -> dict:
    path = keys_path()
    store, _raw, status = _read_json_status(path)
    if status == "ok" and store is not None:
        _remember(store)
        return store

    recovered = _try_recover_canonical()
    if recovered is not None:
        _remember(recovered)
        return recovered

    if _memory_store is not None and _store_has_any_key(_memory_store):
        global _missing_warned
        if not _missing_warned:
            logger.warning(
                "%s %s; keeping in-memory keys",
                _CANONICAL_NAME,
                "missing" if status == "missing" else "empty or unreadable",
            )
            _missing_warned = True
        return _memory_store

    return store if store is not None else _empty_store()


def load_store() -> dict:
    with _lock:
        return _read_store_unlocked()


def _write_store_unlocked(store: dict) -> None:
    payload = _normalize_store(store)
    path = keys_path()
    _atomic_write_json(path, payload)
    _remember(payload)
    _restore_after_write(payload)
    _write_backup(payload)
    global _missing_warned
    if os.path.isfile(path):
        _missing_warned = False


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
        _remember(data)
        path = keys_path()
        try:
            _mtime = os.path.getmtime(path) if os.path.isfile(path) else 0.0
        except OSError:
            _mtime = 0.0
        return data


def ensure_applied() -> dict:
    """文件变更（含手工改 json）时再灌进内存，避免必须重启。

    规范路径消失或变成空/损坏文件时：不拿空 store 覆盖内存，并尝试从
    iCloud 冲突副本或 bak 恢复。
    """
    global _mtime, _missing_warned
    path = keys_path()
    with _lock:
        exists = os.path.isfile(path)
        size_ok = False
        if exists:
            try:
                size_ok = os.path.getsize(path) > 0
            except OSError:
                size_ok = False

        if not exists or not size_ok:
            recovered = _try_recover_canonical()
            if recovered is not None:
                _missing_warned = False
                return apply_runtime_keys(recovered)
            if _memory_store is not None and _store_has_any_key(_memory_store):
                if not _missing_warned:
                    logger.warning(
                        "%s missing or empty; keeping in-memory keys",
                        _CANONICAL_NAME,
                    )
                    _missing_warned = True
                return _memory_store
            return apply_runtime_keys()

        try:
            m = os.path.getmtime(path)
        except OSError:
            m = 0.0

        if _mtime is None or m != _mtime:
            store, _raw, status = _read_json_status(path)
            if status != "ok" or store is None:
                recovered = _try_recover_canonical()
                if recovered is not None:
                    return apply_runtime_keys(recovered)
                if _memory_store is not None and _store_has_any_key(_memory_store):
                    if not _missing_warned:
                        logger.warning(
                            "%s unreadable; keeping in-memory keys",
                            _CANONICAL_NAME,
                        )
                        _missing_warned = True
                    return _memory_store
                return apply_runtime_keys()
            _missing_warned = False
            return apply_runtime_keys(store)
        return _memory_store if _memory_store is not None else _read_store_unlocked()


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
