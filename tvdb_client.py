"""TheTVDB v4 API 客户端（需 TVDB_API_KEY / THETVDB_API_KEY）。"""
from __future__ import annotations

import logging
import os
import re
import threading
import time

import requests

from config import TVDB_API_KEY, TMDB_HTTP_PROXY
from tmdb_client import sanitize_sensitive

logger = logging.getLogger("myWall.tvdb")

TVDB_BASE = "https://api4.thetvdb.com/v4"
TVDB_ARTWORK = "https://artworks.thetvdb.com"
TVDB_TIMEOUT = float(os.environ.get("TVDB_TIMEOUT", "15"))


class TVDbError(Exception):
    def __init__(self, user_message: str, cause: BaseException | None = None):
        super().__init__(user_message)
        self.user_message = user_message
        self.cause = cause


def _session_with_proxy() -> requests.Session:
    session = requests.Session()
    session.headers.update({"accept": "application/json", "Content-Type": "application/json"})
    http_proxy = (
        os.environ.get("HTTP_PROXY")
        or os.environ.get("http_proxy")
        or TMDB_HTTP_PROXY
        or ""
    )
    https_proxy = (
        os.environ.get("HTTPS_PROXY")
        or os.environ.get("https_proxy")
        or http_proxy
        or TMDB_HTTP_PROXY
        or ""
    )
    if http_proxy or https_proxy:
        session.proxies.update({
            k: v for k, v in {"http": http_proxy, "https": https_proxy}.items() if v
        })
    return session


class TVDBClient:
    def __init__(self, api_key: str | None = None):
        self.api_key = (api_key if api_key is not None else TVDB_API_KEY).strip()
        self.timeout = TVDB_TIMEOUT
        self.session = _session_with_proxy()
        self._token: str | None = None
        self._token_at: float = 0
        self._lock = threading.Lock()

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def set_api_key(self, api_key: str | None):
        key = (api_key or "").strip()
        if key != self.api_key:
            with self._lock:
                self._token = None
                self._token_at = 0
        self.api_key = key

    def _ensure_token(self) -> str:
        if not self.enabled:
            raise TVDbError("未配置 TheTVDB API Key，无法搜索")
        with self._lock:
            # token 约 1 个月有效；本地缓存 20 小时后刷新
            if self._token and (time.time() - self._token_at) < 20 * 3600:
                return self._token
            try:
                resp = self.session.post(
                    f"{TVDB_BASE}/login",
                    json={"apikey": self.api_key},
                    timeout=self.timeout,
                )
            except requests.Timeout as e:
                logger.exception("TVDB login 超时: %s", sanitize_sensitive(str(e)))
                raise TVDbError("TheTVDB 连接超时，请检查网络/代理", cause=e) from e
            except requests.RequestException as e:
                logger.exception("TVDB login 失败: %s", sanitize_sensitive(str(e)))
                raise TVDbError("TheTVDB 登录失败，请稍后重试", cause=e) from e
            if resp.status_code != 200:
                logger.warning("TVDB login HTTP %s body=%s",
                               resp.status_code, sanitize_sensitive(resp.text[:200]))
                raise TVDbError("TheTVDB API Key 无效或登录失败")
            data = resp.json() if resp.content else {}
            token = ((data.get("data") or {}).get("token") if isinstance(data, dict) else None)
            if not token:
                raise TVDbError("TheTVDB 登录未返回 token")
            self._token = token
            self._token_at = time.time()
            return self._token

    def _get(self, path: str, params: dict | None = None) -> dict:
        token = self._ensure_token()
        headers = {"Authorization": f"Bearer {token}"}
        try:
            resp = self.session.get(
                f"{TVDB_BASE}{path}",
                params=params or {},
                headers=headers,
                timeout=self.timeout,
            )
        except requests.Timeout as e:
            logger.exception("TVDB 超时 %s: %s", path, sanitize_sensitive(str(e)))
            raise TVDbError("TheTVDB 连接超时，请检查网络/代理", cause=e) from e
        except requests.RequestException as e:
            logger.exception("TVDB 请求失败 %s: %s", path, sanitize_sensitive(str(e)))
            raise TVDbError("TheTVDB 搜索失败，请稍后重试", cause=e) from e
        if resp.status_code == 401:
            # token 失效，清一次再试
            with self._lock:
                self._token = None
            token = self._ensure_token()
            headers = {"Authorization": f"Bearer {token}"}
            resp = self.session.get(
                f"{TVDB_BASE}{path}",
                params=params or {},
                headers=headers,
                timeout=self.timeout,
            )
        if resp.status_code != 200:
            logger.warning("TVDB HTTP %s path=%s", resp.status_code, path)
            raise TVDbError("TheTVDB 搜索失败，请稍后重试")
        try:
            return resp.json()
        except ValueError as e:
            raise TVDbError("TheTVDB 返回无效数据", cause=e) from e

    @staticmethod
    def normalize_media_type(tvdb_type: str | None) -> str:
        t = (tvdb_type or "").strip().lower()
        if t in ("series", "tv", "season", "episode"):
            return "tv"
        if t in ("movie", "film"):
            return "movie"
        # 默认剧集（TVDB 以剧集为主）
        return "tv"

    @staticmethod
    def _type_params(scope: str) -> list[str | None]:
        s = (scope or "all").strip().lower()
        if s == "movie":
            return ["movie"]
        if s == "tv":
            return ["series"]
        return [None]  # 一次不限类型

    @staticmethod
    def _image_url(raw: str | None) -> str | None:
        if not raw:
            return None
        u = str(raw).strip()
        if not u or u.upper() == "N/A":
            return None
        if u.startswith("http://") or u.startswith("https://"):
            return u
        if not u.startswith("/"):
            u = "/" + u
        return f"{TVDB_ARTWORK}{u}"

    def _format_search_item(self, item: dict) -> dict | None:
        if not isinstance(item, dict):
            return None
        raw_type = item.get("type") or item.get("primary_type") or ""
        mt = self.normalize_media_type(raw_type)
        # id 可能在 id / tvdb_id / objectID 里
        tid = item.get("tvdb_id") or item.get("id")
        if tid is None:
            obj = str(item.get("objectID") or "")
            m = re.search(r"(\d+)$", obj)
            tid = m.group(1) if m else None
        try:
            tvdb_id = int(tid) if tid is not None else None
        except (TypeError, ValueError):
            tvdb_id = None
        if not tvdb_id:
            return None
        name = (item.get("name") or item.get("title") or "").strip()
        name_translated = (item.get("name_translated") or {})
        title_cn = ""
        if isinstance(name_translated, dict):
            title_cn = (
                name_translated.get("zho")
                or name_translated.get("zh")
                or name_translated.get("zh-CN")
                or ""
            )
            if isinstance(title_cn, list):
                title_cn = title_cn[0] if title_cn else ""
        title_cn = (title_cn or name or "").strip()
        title_en = name or title_cn
        year_raw = str(item.get("year") or item.get("first_air_time") or "").strip()
        year_m = re.search(r"(\d{4})", year_raw)
        year = year_m.group(1) if year_m else ""
        overview = item.get("overview") or ""
        if isinstance(overview, dict):
            overview = overview.get("eng") or overview.get("zho") or next(iter(overview.values()), "")
        poster = (
            self._image_url(item.get("image_url"))
            or self._image_url(item.get("thumbnail"))
            or self._image_url(item.get("image"))
        )
        return {
            "source": "tvdb",
            "tmdb_id": None,
            "imdb_id": None,
            "tvdb_id": tvdb_id,
            "media_type": mt,
            "title_cn": title_cn,
            "title_en": title_en,
            "year": year,
            "overview": overview if isinstance(overview, str) else "",
            "poster_url": poster,
            "rating": 0,
            "vote_count": 0,
            "popularity": float(item.get("score") or 0) if item.get("score") is not None else 0,
        }

    def search(self, query: str, year: str | None = None, media_type: str = "all") -> list[dict]:
        if not self.enabled:
            return []
        q = (query or "").strip()
        if len(q) < 2:
            return []
        seen: set[int] = set()
        out: list[dict] = []
        for type_param in self._type_params(media_type):
            params: dict = {"query": q}
            if type_param:
                params["type"] = type_param
            data = self._get("/search", params)
            items = data.get("data") if isinstance(data, dict) else None
            if not isinstance(items, list):
                continue
            for item in items:
                formatted = self._format_search_item(item)
                if not formatted:
                    continue
                tid = formatted["tvdb_id"]
                if tid in seen:
                    continue
                if year:
                    y = str(year).strip()[:4]
                    if formatted.get("year") and formatted["year"] != y:
                        continue
                # remote_ids 里可能有 imdb
                remotes = item.get("remote_ids") if isinstance(item, dict) else None
                if isinstance(remotes, list):
                    for r in remotes:
                        if not isinstance(r, dict):
                            continue
                        src = str(r.get("sourceName") or r.get("source") or "").lower()
                        if "imdb" in src:
                            rid = str(r.get("id") or "").strip()
                            if rid:
                                formatted["imdb_id"] = rid if rid.startswith("tt") else f"tt{rid}" if rid.isdigit() else rid
                                break
                seen.add(tid)
                out.append(formatted)
        # 年份过滤过严时再兜底一轮无年份（仅当指定了 year）
        if year and not out:
            for type_param in self._type_params(media_type):
                params = {"query": q}
                if type_param:
                    params["type"] = type_param
                data = self._get("/search", params)
                items = data.get("data") if isinstance(data, dict) else None
                if not isinstance(items, list):
                    continue
                for item in items:
                    formatted = self._format_search_item(item)
                    if not formatted or formatted["tvdb_id"] in seen:
                        continue
                    seen.add(formatted["tvdb_id"])
                    out.append(formatted)
        return out[:20]


tvdb = TVDBClient()
