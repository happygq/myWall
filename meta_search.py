"""多源片名搜索：TMDb + OMDb(IMDb) + TheTVDB，并行合并。"""
from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

from api_keys import (
    DISABLED_HINT,
    MISSING_HINTS,
    SOURCE_LABELS,
    ensure_applied,
    has_credentials,
    is_attempt_enabled,
)
from omdb_client import omdb, OMDbError
from tmdb_client import tmdb, TMDbError, build_search_queries
from tvdb_client import tvdb, TVDbError

logger = logging.getLogger("myWall.meta_search")

VALID_SOURCES = ("tmdb", "imdb", "tvdb")


def normalize_source_filter(value: str | None) -> str:
    s = (value or "all").strip().lower()
    if s in ("tmdb", "imdb", "tvdb"):
        return s
    if s in ("omdb",):
        return "imdb"
    if s in ("thetvdb", "tvdb"):
        return "tvdb"
    return "all"


def providers_status() -> dict:
    """来源是否可搜：开关开且有 key。attempt=关则跳过且不发请求。"""
    store = ensure_applied()
    has_key = {
        "tmdb": bool(tmdb.enabled) or has_credentials("tmdb", store),
        "imdb": bool(omdb.enabled),
        "tvdb": bool(tvdb.enabled),
    }
    extra = {"imdb": {"via": "omdb"}}
    out = {}
    for src in VALID_SOURCES:
        attempt = is_attempt_enabled(src, store)
        configured = bool(has_key.get(src))
        if not attempt:
            hint = DISABLED_HINT
            enabled = False
        elif not configured:
            hint = MISSING_HINTS.get(src, "未配置 API Key")
            enabled = False
        else:
            hint = ""
            enabled = True
        rec = {
            "enabled": enabled,
            "configured": configured,
            "attempt": attempt,
            "label": "IMDb" if src == "imdb" else SOURCE_LABELS.get(src, src.upper()),
            "hint": hint,
        }
        rec.update(extra.get(src) or {})
        out[src] = rec
    return out


def _tag_tmdb_candidate(item: dict) -> dict:
    out = dict(item)
    out["source"] = "tmdb"
    out.setdefault("imdb_id", None)
    out.setdefault("tvdb_id", None)
    out["tmdb_id"] = out.get("tmdb_id")
    return out


def _pick_query(title_cn: str, title_en: str) -> str:
    queries = build_search_queries(title_cn or "", title_en or "")
    if queries:
        return queries[0]
    return (title_en or title_cn or "").strip()


def _search_tmdb(title_cn: str, title_en: str, year: str, media_type: str) -> list[dict]:
    if not tmdb.enabled:
        return []
    raw = tmdb.search_by_title_and_visual_clues(
        title_cn=title_cn,
        title_en=title_en,
        year=year,
        media_type=media_type,
    )
    return [_tag_tmdb_candidate(r) for r in raw]


def _search_imdb(title_cn: str, title_en: str, year: str, media_type: str) -> list[dict]:
    if not omdb.enabled:
        return []
    q = _pick_query(title_cn, title_en)
    if not q:
        return []
    results = omdb.search(q, year=year or None, media_type=media_type)
    # 中文片名时再用英文/另一路补一轮
    alt = (title_en or title_cn or "").strip()
    if alt and alt.lower() != q.lower():
        seen = {r.get("imdb_id") for r in results}
        for r in omdb.search(alt, year=year or None, media_type=media_type):
            if r.get("imdb_id") not in seen:
                results.append(r)
                seen.add(r.get("imdb_id"))
    return results[:20]


def _search_tvdb(title_cn: str, title_en: str, year: str, media_type: str) -> list[dict]:
    if not tvdb.enabled:
        return []
    q = _pick_query(title_cn, title_en)
    if not q:
        return []
    results = tvdb.search(q, year=year or None, media_type=media_type)
    alt = (title_en or title_cn or "").strip()
    if alt and alt.lower() != q.lower():
        seen = {r.get("tvdb_id") for r in results}
        for r in tvdb.search(alt, year=year or None, media_type=media_type):
            if r.get("tvdb_id") not in seen:
                results.append(r)
                seen.add(r.get("tvdb_id"))
    return results[:20]


def search_multi_source(
    title_cn: str = "",
    title_en: str = "",
    year: str = "",
    media_type: str = "all",
    source: str = "all",
) -> dict:
    """
    并行搜索并合并。同名同年不同源并列保留（不去跨源合并）。
    无 key 的源跳过并记入 disabled；单源失败记入 errors，不拖垮整次搜索。
    """
    src_filter = normalize_source_filter(source)
    status = providers_status()
    want = list(VALID_SOURCES) if src_filter == "all" else [src_filter]

    disabled = []
    for s in want:
        if not status.get(s, {}).get("enabled"):
            disabled.append(s)

    runnable = [s for s in want if s not in disabled]
    # 指定了已禁用源且没有可跑的：有 hint 供 UI；attempt=关时上层不 400
    if not runnable:
        hints = [status[s]["hint"] for s in want if status.get(s, {}).get("hint")]
        return {
            "candidates": [],
            "count": 0,
            "providers": status,
            "disabled": disabled,
            "errors": [{"source": s, "message": status[s]["hint"] or "未启用"} for s in want],
            "message": "；".join(hints) or "所选来源均不可用",
            "source": src_filter,
            "media_type": media_type,
        }

    jobs = {
        "tmdb": lambda: _search_tmdb(title_cn, title_en, year, media_type),
        "imdb": lambda: _search_imdb(title_cn, title_en, year, media_type),
        "tvdb": lambda: _search_tvdb(title_cn, title_en, year, media_type),
    }

    buckets: dict[str, list] = {s: [] for s in VALID_SOURCES}
    errors: list[dict] = []

    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {pool.submit(jobs[s]): s for s in runnable}
        for fut in as_completed(futures):
            s = futures[fut]
            try:
                buckets[s] = fut.result() or []
            except (TMDbError, OMDbError, TVDbError) as e:
                logger.exception("%s search failed: %s", s, getattr(e, "cause", None) or e)
                errors.append({"source": s, "message": e.user_message})
            except Exception as e:
                logger.exception("%s search unexpected: %s", s, e)
                errors.append({"source": s, "message": "搜索失败，请稍后重试"})

    # 顺序：TMDb → IMDb → TVDB；同名同年不同源并列
    candidates = []
    for s in ("tmdb", "imdb", "tvdb"):
        if s in want:
            candidates.extend(buckets.get(s) or [])

    return {
        "candidates": candidates,
        "count": len(candidates),
        "providers": status,
        "disabled": disabled,
        "errors": errors,
        "source": src_filter,
        "media_type": media_type,
    }
