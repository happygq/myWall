"""OMDb 客户端 — 合法代理访问 IMDb 元数据（需 OMDB_API_KEY）。"""
from __future__ import annotations

import logging
import os
import re

import requests

from config import OMDB_API_KEY, TMDB_HTTP_PROXY
from tmdb_client import sanitize_sensitive

logger = logging.getLogger("myWall.omdb")

OMDB_BASE = "https://www.omdbapi.com/"
OMDB_TIMEOUT = float(os.environ.get("OMDB_TIMEOUT", "15"))


class OMDbError(Exception):
    def __init__(self, user_message: str, cause: BaseException | None = None):
        super().__init__(user_message)
        self.user_message = user_message
        self.cause = cause


def _session_with_proxy() -> requests.Session:
    session = requests.Session()
    session.headers.update({"accept": "application/json"})
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


class OMDbClient:
    def __init__(self, api_key: str | None = None):
        self.api_key = (api_key if api_key is not None else OMDB_API_KEY).strip()
        self.timeout = OMDB_TIMEOUT
        self.session = _session_with_proxy()

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def set_api_key(self, api_key: str | None):
        self.api_key = (api_key or "").strip()

    def _get(self, params: dict) -> dict:
        if not self.enabled:
            raise OMDbError("未配置 OMDb API Key，无法搜索 IMDb")
        q = dict(params)
        q["apikey"] = self.api_key
        try:
            resp = self.session.get(OMDB_BASE, params=q, timeout=self.timeout)
        except requests.Timeout as e:
            logger.exception("OMDb 超时: %s", sanitize_sensitive(str(e)))
            raise OMDbError("OMDb 连接超时，请检查网络/代理", cause=e) from e
        except requests.RequestException as e:
            logger.exception("OMDb 请求失败: %s", sanitize_sensitive(str(e)))
            raise OMDbError("IMDb(OMDb) 搜索失败，请稍后重试", cause=e) from e
        if resp.status_code != 200:
            logger.warning("OMDb HTTP %s", resp.status_code)
            raise OMDbError("IMDb(OMDb) 搜索失败，请稍后重试")
        try:
            data = resp.json()
        except ValueError as e:
            raise OMDbError("OMDb 返回无效数据", cause=e) from e
        return data

    @staticmethod
    def normalize_media_type(omdb_type: str | None) -> str:
        t = (omdb_type or "").strip().lower()
        if t in ("series", "tv", "episode"):
            return "tv"
        return "movie"

    @staticmethod
    def _omdb_type_param(scope: str) -> str | None:
        s = (scope or "all").strip().lower()
        if s == "movie":
            return "movie"
        if s == "tv":
            return "series"
        return None

    @staticmethod
    def _poster_url(raw: str | None) -> str | None:
        if not raw or raw.strip().upper() == "N/A":
            return None
        return raw.strip()

    def _format_search_item(self, item: dict) -> dict:
        year_raw = str(item.get("Year") or "").strip()
        year_m = re.search(r"(\d{4})", year_raw)
        year = year_m.group(1) if year_m else ""
        title = (item.get("Title") or "").strip()
        mt = self.normalize_media_type(item.get("Type"))
        imdb_id = (item.get("imdbID") or "").strip() or None
        return {
            "source": "imdb",
            "tmdb_id": None,
            "imdb_id": imdb_id,
            "tvdb_id": None,
            "media_type": mt,
            "title_cn": title,
            "title_en": title,
            "year": year,
            "overview": "",
            "poster_url": self._poster_url(item.get("Poster")),
            "rating": 0,
            "vote_count": 0,
            "popularity": 0,
        }

    def search(self, query: str, year: str | None = None, media_type: str = "all",
               page: int = 1) -> list[dict]:
        if not self.enabled:
            return []
        q = (query or "").strip()
        if len(q) < 2:
            return []
        params: dict = {"s": q, "page": page}
        type_param = self._omdb_type_param(media_type)
        if type_param:
            params["type"] = type_param
        if year:
            params["y"] = str(year).strip()[:4]
        data = self._get(params)
        if str(data.get("Response", "")).lower() == "false":
            # 无结果不算错误
            err = (data.get("Error") or "").strip()
            if err and "movie not found" not in err.lower() and "not found" not in err.lower():
                if "invalid api key" in err.lower():
                    raise OMDbError("OMDb API Key 无效")
                logger.info("OMDb search empty/err: %s", err)
            return []
        results = []
        for item in data.get("Search") or []:
            if not isinstance(item, dict):
                continue
            formatted = self._format_search_item(item)
            if not formatted.get("imdb_id"):
                continue
            results.append(formatted)
        return results

    def get_by_imdb_id(self, imdb_id: str) -> dict | None:
        iid = (imdb_id or "").strip()
        if not iid:
            return None
        data = self._get({"i": iid, "plot": "short"})
        if str(data.get("Response", "")).lower() == "false":
            return None
        title = (data.get("Title") or "").strip()
        year_m = re.search(r"(\d{4})", str(data.get("Year") or ""))
        year = year_m.group(1) if year_m else ""
        rating_raw = data.get("imdbRating")
        try:
            rating = float(rating_raw) if rating_raw not in (None, "N/A", "") else 0
        except (TypeError, ValueError):
            rating = 0
        overview = data.get("Plot") or ""
        if overview == "N/A":
            overview = ""
        return {
            "source": "imdb",
            "tmdb_id": None,
            "imdb_id": (data.get("imdbID") or iid).strip(),
            "tvdb_id": None,
            "media_type": self.normalize_media_type(data.get("Type")),
            "title_cn": title,
            "title_en": title,
            "year": year,
            "overview": overview,
            "synopsis_cn": overview,
            "synopsis_en": overview,
            "poster_url": self._poster_url(data.get("Poster")) or "",
            "backdrop_url": "",
            "rating": rating,
            "genres": [g.strip() for g in str(data.get("Genre") or "").split(",") if g.strip()],
            "directors": [],
            "cast": [],
            "runtime": 0,
            "original_language": "",
        }


omdb = OMDbClient()
