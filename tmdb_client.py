"""TMDb API 客户端 — 增强版：多查询规范化 + 多模态匹配"""
import logging
import os
import re

import requests
from config import (
    TMDB_API_KEY,
    TMDB_ACCESS_TOKEN,
    TMDB_BASE_URL,
    TMDB_IMAGE_BASE,
    TMDB_HTTP_PROXY,
)

logger = logging.getLogger("myWall.tmdb")

# 请求超时（秒）；可用环境变量覆盖。
TMDB_TIMEOUT = float(os.environ.get("TMDB_TIMEOUT", "15"))


class TMDbError(Exception):
    """面向前端的友好 TMDb 错误；原始异常仅记服务端日志。"""

    def __init__(self, user_message: str, cause: BaseException | None = None):
        super().__init__(user_message)
        self.user_message = user_message
        self.cause = cause


def sanitize_sensitive(text: str | None) -> str:
    """脱敏 api_key / access_token / Authorization 等，避免泄漏到前端。"""
    if text is None:
        return ""
    s = str(text)
    s = re.sub(r"(?i)(api[_-]?key)=([^&\s\"']+)", r"\1=***", s)
    s = re.sub(r"(?i)(access[_-]?token)=([^&\s\"']+)", r"\1=***", s)
    s = re.sub(r"(?i)(authorization)\s*[:=]\s*(bearer\s+)?([^\s,\"']+)",
               r"\1: \2***", s)
    s = re.sub(r"(?i)\b(bearer)\s+([A-Za-z0-9._\-+=/]+)", r"\1 ***", s)
    return s

# 碟脊常见「演员名 + 片名」前缀（姓 / 全名小写）
_ACTOR_PREFIX_SURNAMES = {
    "hanks", "connery", "craig", "depp", "pitt", "dicaprio", "freeman",
    "lawrence", "jolie", "theron", "kidman", "blanchett", "winslet",
    "nicholson", "pacino", "deniro", "de niro", "streep", "hopkins",
    "swinton", "cruise", "gibson", "willis", "schwarzenegger", "stallone",
    "eastwood", "ford", "clooney", "damon", "affleck", "washington",
    "smith", "jackson", "downey", "hemsworth", "evans", "ruffalo",
    "johansson", "portman", "bullock", "roberts", "stone", "gosling",
    "mcconaughey", "dicaprio", "bale", "phoenix", "crowe", "neeson",
}

_ACTOR_PREFIX_FULL = {
    "tom hanks", "tom cruise", "brad pitt", "angelina jolie", "will smith",
    "johnny depp", "keanu reeves", "harrison ford", "morgan freeman",
    "robert de niro", "al pacino", "leonardo dicaprio", "matt damon",
    "george clooney", "julia roberts", "meryl streep", "denzel washington",
    "bruce willis", "sean connery", "daniel craig", "nicole kidman",
    "cate blanchett", "charlize theron", "samuel l jackson", "samuel jackson",
}

# 版本 / 介质噪音
_EDITION_PATTERNS = [
    r"(?i)\bSPECIAL\s+COLLECTOR'?S?\s+EDITION\b",
    r"(?i)\bCOLLECTOR'?S?\s+EDITION\b",
    r"(?i)\bSPECIAL\s+EDITION\b",
    r"(?i)\bLIMITED\s+EDITION\b",
    r"(?i)\bULTIMATE\s+EDITION\b",
    r"(?i)\bDELUXE\s+EDITION\b",
    r"(?i)\bDIRECTOR'?S?\s+CUT\b",
    r"(?i)\bEXTENDED\s+(CUT|EDITION|VERSION)\b",
    r"(?i)\bTHEATRICAL\s+(CUT|VERSION)\b",
    r"(?i)\bUNRATED\s+(CUT|VERSION)?\b",
    r"(?i)\bREMMASTERED\b",
    r"(?i)\bREMASTERED\b",
    r"(?i)\bSTEELBOOK\b",
    r"(?i)\bDIGIBOOK\b",
    r"(?i)\bBLU[\-\s]?RAY(\s+DISC)?\b",
    r"(?i)\bBLUERAY\b",
    r"(?i)\b4K\s*UHD\b",
    r"(?i)\bUHD\b",
    r"(?i)\bULTRA\s*HD\b",
    r"(?i)\bDVD[\-\s]?9\b",
    r"(?i)\bDVD[\-\s]?5\b",
    r"(?i)\bDVD(\s+VIDEO)?\b",
    r"(?i)\bHD[\-\s]?DVD\b",
    r"(?i)\bWIDESCREEN\b",
    r"(?i)\bFULLSCREEN\b",
    r"(?i)\bREGION\s*[A-Z0-9]+\b",
    # 华语碟脊常见版本噪音
    r"完美收藏版",
    r"特别收藏版",
    r"珍藏版",
    r"收藏版",
    r"限量版",
    r"特别版",
    r"加长版",
    r"完整版",
    r"双碟版",
    r"导演剪辑版",
    r"数字修复版",
]

# 台标 / 发行商标记（碟脊「BBC:片名」）；单独台标不得作为查询词
_STUDIO_TOKENS = {
    "bbc", "hbo", "itv", "pbs", "nhk", "cctv", "discovery", "netflix",
    "amazon", "hulu", "showtime", "starz", "sky", "channel4", "channel 4",
}
_RE_STUDIO_WITH_COLON = re.compile(
    r"(?i)\b(?:BBC|HBO|ITV|PBS|NHK|CCTV|Discovery|Netflix|Amazon|Hulu|Showtime|Starz|Sky|Channel\s*4)\s*[:：]"
)
_RE_STUDIO_LEADING = re.compile(
    r"(?i)^(?:BBC|HBO|ITV|PBS|NHK|CCTV|Discovery|Netflix|Amazon|Hulu|Showtime|Starz|Sky|Channel\s*4)\s+"
)
# 碟厂目录号：YJ-1376 / BD-1234
_RE_CATALOG_CODE = re.compile(r"(?i)\b[A-Z]{1,4}-\d{3,6}\b")

# 轻量 OCR / 视觉错字（仅高置信常见误读）
_OCR_TYPO_MAP = {
    "搶動殺人": "奪命殺機",
    "抢动杀人": "夺命杀机",
    "阿甘正傳": "阿甘正传",
    "阿甘正转": "阿甘正传",
}

_RE_CJK = re.compile(r"[\u4e00-\u9fff]+")
_RE_LATIN_RUN = re.compile(r"[A-Za-z][A-Za-z0-9'’\-]*(?:\s+[A-Za-z][A-Za-z0-9'’\-]*)*")
_RE_VOL_SUFFIX = re.compile(
    r"(?i)(?:\s*[:\-]?\s*(?:vol(?:ume)?|part|pt\.?|disc|disk|ep(?:isode)?|season)\.?\s*\d+$)|(?:\s+\d{1,2}$)"
)


def _apply_ocr_typos(text: str) -> str:
    if not text:
        return text
    out = text
    for bad, good in _OCR_TYPO_MAP.items():
        if bad in out:
            out = out.replace(bad, good)
    return out


def _strip_studio_marker(text: str) -> str:
    """BBC:片名 / BBC 片名(≥2词或含中文) → 片名；保留 BBC Breakfast 这类台标即片名。"""
    if not text:
        return ""
    t = _RE_STUDIO_WITH_COLON.sub(" ", text)
    m = _RE_STUDIO_LEADING.match(t)
    if m:
        rest = t[m.end():].strip(" -\t|_/")
        words = rest.split()
        if _RE_CJK.search(rest) or len(words) >= 2:
            t = rest
    return re.sub(r"\s{2,}", " ", t).strip(" -\t\n\r|_/")


def _strip_edition_junk(text: str) -> str:
    if not text:
        return ""
    t = text
    t = _RE_CATALOG_CODE.sub(" ", t)
    for pat in _EDITION_PATTERNS:
        t = re.sub(pat, " ", t)
    t = _strip_studio_marker(t)
    t = re.sub(r"[\|\[\]\{\}◆●★☆•·（）\(\)]+", " ", t)
    t = re.sub(r"\s{2,}", " ", t).strip(" -\t\n\r|_/")
    return t


def _is_studio_only_query(q: str) -> bool:
    """拒绝把 BBC / HBO 等台标单独拿去搜（会刷出一堆无关发行）。"""
    if not q:
        return True
    key = re.sub(r"\s+", " ", q).strip().lower()
    key = key.strip(":：-")
    return key in _STUDIO_TOKENS


def _strip_actor_prefix(text: str) -> str:
    """Tom Hanks Forrest Gump → Forrest Gump"""
    if not text:
        return ""
    words = text.split()
    if len(words) < 3:
        return text
    lower = text.lower().strip()

    for full in sorted(_ACTOR_PREFIX_FULL, key=len, reverse=True):
        if lower.startswith(full + " "):
            rest = text[len(full):].strip(" -")
            if len(rest) >= 2:
                return rest

    # First Last + Title…（姓在已知列表）
    if len(words) >= 3:
        first, second = words[0].lower().rstrip(".,"), words[1].lower().rstrip(".,")
        if second in _ACTOR_PREFIX_SURNAMES or f"{first} {second}" in _ACTOR_PREFIX_FULL:
            rest = " ".join(words[2:])
            if len(rest) >= 2:
                return rest
    return text


def _split_bilingual(text: str) -> tuple[str, str]:
    """从混排字符串拆出中文 / 英文片段。"""
    if not text:
        return "", ""
    t = text.strip()
    cjk_parts = _RE_CJK.findall(t)
    # 去掉 CJK 后再抓拉丁片
    latin_src = _RE_CJK.sub(" ", t)
    latin_src = re.sub(r"[^\w\s'’\-]", " ", latin_src, flags=re.UNICODE)
    latin_parts = [m.group(0).strip() for m in _RE_LATIN_RUN.finditer(latin_src) if len(m.group(0).strip()) >= 2]

    cn = "".join(cjk_parts).strip() if cjk_parts else ""
    # 取最长的英文片段作为主英文标题
    en = max(latin_parts, key=len) if latin_parts else ""
    # 若几乎全是英文且无 CJK，整串当英文
    if not cn and not en and re.search(r"[A-Za-z]", t):
        en = t
    if not en and not cn:
        if _RE_CJK.search(t):
            cn = t
        else:
            en = t
    return cn, en


def _volume_variants(text: str) -> list[str]:
    """WILD PALMS 3 → [WILD PALMS 3, WILD PALMS]"""
    if not text:
        return []
    variants = [text]
    stripped = _RE_VOL_SUFFIX.sub("", text).strip(" -:")
    if stripped and stripped.lower() != text.lower() and len(stripped) >= 2:
        variants.append(stripped)
    return variants


def _norm_title_key(text: str) -> str:
    if not text:
        return ""
    t = text.lower().strip()
    t = re.sub(r"[^\w\u4e00-\u9fff]+", "", t, flags=re.UNICODE)
    return t


def _title_match_boost(item: dict, queries: list[str]) -> int:
    """精确/包含标题匹配加分，避免热门噪音（如搜 BBC）压过正确冷门条目。"""
    titles = [
        item.get("title") or "",
        item.get("name") or "",
        item.get("original_title") or "",
        item.get("original_name") or "",
    ]
    title_keys = [_norm_title_key(t) for t in titles if t]
    if not title_keys:
        return 0
    best = 0
    for q in queries or []:
        qk = _norm_title_key(q)
        if len(qk) < 2 or _is_studio_only_query(q):
            continue
        for tk in title_keys:
            if not tk:
                continue
            if tk == qk:
                best = max(best, 100)
            elif qk in tk or tk in qk:
                best = max(best, 60)
    return best


def _add_query(bucket: list, seen: set, q: str):
    if not q:
        return
    q = re.sub(r"\s{2,}", " ", q).strip(" -\t|_/")
    if len(q) < 2:
        return
    if _is_studio_only_query(q):
        return
    key = q.lower()
    if key in seen:
        return
    seen.add(key)
    bucket.append(q)


def build_search_queries(title_cn: str = "", title_en: str = "") -> list[str]:
    """从识别标题生成去噪后的多路 TMDb 查询词。"""
    raw_parts = []
    for raw in (title_cn or "", title_en or ""):
        raw = (raw or "").strip()
        if raw:
            raw_parts.append(raw)

    # 合并后再拆，避免同一混排串重复
    combined = " ".join(raw_parts).strip()
    if not combined:
        return []

    queries: list[str] = []
    seen: set = set()

    # 原始串也试一次（有时 TMDb 能直接命中）
    _add_query(queries, seen, combined)

    cleaned = _strip_edition_junk(_apply_ocr_typos(combined))
    cleaned = _strip_actor_prefix(cleaned)
    _add_query(queries, seen, cleaned)

    # 分别处理 cn / en 字段 + 从混排拆分
    cn_field = _strip_edition_junk(_apply_ocr_typos((title_cn or "").strip()))
    en_field = _strip_edition_junk(_apply_ocr_typos((title_en or "").strip()))
    cn_field = _strip_actor_prefix(cn_field)
    en_field = _strip_actor_prefix(en_field)

    split_cn, split_en = _split_bilingual(cleaned)
    split_cn = _strip_edition_junk(split_cn)
    split_en = _strip_actor_prefix(_strip_edition_junk(split_en))

    cn_candidates = [c for c in (cn_field, split_cn) if c]
    en_candidates = [c for c in (en_field, split_en) if c]

    for cn in cn_candidates:
        # 中文字段里可能仍混有英文
        scn, sen = _split_bilingual(cn)
        for v in _volume_variants(scn or cn):
            _add_query(queries, seen, v)
        for v in _volume_variants(sen):
            _add_query(queries, seen, v)

    for en in en_candidates:
        sen_cn, sen_en = _split_bilingual(en)
        for v in _volume_variants(sen_en or en):
            _add_query(queries, seen, v)
        for v in _volume_variants(sen_cn):
            _add_query(queries, seen, v)

    # 从 cleaned 再拆一轮 volume
    for v in _volume_variants(cleaned):
        _add_query(queries, seen, v)
        c2, e2 = _split_bilingual(v)
        _add_query(queries, seen, c2)
        _add_query(queries, seen, e2)

    return queries[:12]


class TMDBClient:
    def __init__(self, api_key: str | None = None, access_token: str | None = None):
        """
        可选传入 TMDb key，便于离线脚本替换默认 config。
        """
        self.api_key = (api_key or TMDB_API_KEY).strip()
        self.access_token = (access_token or TMDB_ACCESS_TOKEN).strip()
        self.base_url = TMDB_BASE_URL
        self.image_base = TMDB_IMAGE_BASE
        self.timeout = TMDB_TIMEOUT
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.access_token}",
            "accept": "application/json"
        })
        # 显式挂代理：环境变量优先，否则用 config.TMDB_HTTP_PROXY（避免进程未继承 shell 代理）
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
            self.session.proxies.update({
                k: v for k, v in {"http": http_proxy, "https": https_proxy}.items() if v
            })
            # 同步写入环境，供同进程其它 requests 调用
            if http_proxy:
                os.environ.setdefault("HTTP_PROXY", http_proxy)
                os.environ.setdefault("http_proxy", http_proxy)
            if https_proxy:
                os.environ.setdefault("HTTPS_PROXY", https_proxy)
                os.environ.setdefault("https_proxy", https_proxy)
            logger.info("TMDb client proxies=%s", dict(self.session.proxies))
        else:
            logger.warning("TMDb client has no HTTP proxy configured")
        self.lang = "zh-CN"

    @property
    def enabled(self) -> bool:
        return bool((self.api_key or "").strip() or (self.access_token or "").strip())

    def set_credentials(self, api_key: str | None, access_token: str | None = None):
        """热更新 key / token，避免改配置后必须重启才能搜。"""
        self.api_key = (api_key or "").strip()
        if access_token is not None:
            self.access_token = (access_token or "").strip()
        elif self.api_key.startswith("eyJ"):
            self.access_token = self.api_key
        if self.access_token:
            self.session.headers["Authorization"] = f"Bearer {self.access_token}"
        else:
            self.session.headers.pop("Authorization", None)

    def _get(self, path: str, params: dict | None = None):
        """带超时的 GET；网络异常转为友好 TMDbError，详情写入日志。"""
        url = f"{self.base_url}{path}"
        try:
            return self.session.get(url, params=params or {}, timeout=self.timeout)
        except requests.Timeout as e:
            logger.exception("TMDb 超时 %s: %s", path, sanitize_sensitive(str(e)))
            raise TMDbError("TMDb 连接超时，请检查网络/代理", cause=e) from e
        except requests.RequestException as e:
            logger.exception("TMDb 请求失败 %s: %s", path, sanitize_sensitive(str(e)))
            raise TMDbError("搜索失败，请稍后重试", cause=e) from e

    @staticmethod
    def normalize_media_type(media_type: str | None) -> str:
        """归一化为 movie | tv；空/未知视为 movie（兼容旧数据）。"""
        mt = (media_type or "").strip().lower()
        if mt in ("tv", "television", "show", "series"):
            return "tv"
        return "movie"

    @staticmethod
    def normalize_search_scope(scope: str | None) -> str:
        """搜索范围：all | movie | tv；默认 all。"""
        s = (scope or "").strip().lower()
        if s in ("movie", "film"):
            return "movie"
        if s in ("tv", "television", "show", "series"):
            return "tv"
        return "all"

    def search_movie(self, query, year=None, page=1):
        """搜索电影"""
        params = {
            "api_key": self.api_key,
            "query": query,
            "language": self.lang,
            "page": page,
            "include_adult": "false"
        }
        if year:
            params["year"] = year
        resp = self._get("/search/movie", params)
        if resp.status_code == 200:
            return resp.json().get("results", [])
        logger.warning("TMDb search_movie HTTP %s", resp.status_code)
        return []

    def search_tv(self, query, year=None, page=1):
        """搜索剧集"""
        params = {
            "api_key": self.api_key,
            "query": query,
            "language": self.lang,
            "page": page,
            "include_adult": "false",
        }
        if year:
            params["first_air_date_year"] = year
        resp = self._get("/search/tv", params)
        if resp.status_code == 200:
            return resp.json().get("results", [])
        logger.warning("TMDb search_tv HTTP %s", resp.status_code)
        return []

    def search_multi(self, query, page=1):
        """TMDb /search/multi（电影+剧集+人物等）；调用方自行过滤 media_type。"""
        params = {
            "api_key": self.api_key,
            "query": query,
            "language": self.lang,
            "page": page,
            "include_adult": "false",
        }
        resp = self._get("/search/multi", params)
        if resp.status_code == 200:
            return resp.json().get("results", [])
        logger.warning("TMDb search_multi HTTP %s", resp.status_code)
        return []

    def _tag_media_type(self, results: list, media_type: str) -> list:
        out = []
        for r in results or []:
            if not isinstance(r, dict):
                continue
            item = dict(r)
            item["media_type"] = media_type
            out.append(item)
        return out

    def search_movie_multi(self, queries: list, year=None) -> list:
        """多查询策略搜索电影（兼容旧调用）。"""
        return self.search_media_multi(queries, year=year, media_type="movie")

    def search_media_multi(self, queries: list, year=None, media_type="all") -> list:
        """
        多查询策略：去重合并后按票数/热度排序。
        media_type: all | movie | tv
        - all → 并行 /search/movie + /search/tv 合并去重（支持 year）
        - movie / tv → 对应端点；带 year 时再跑一轮无年份兜底
        去重键为 (media_type, id)，因电影与剧集 id 空间独立但数值可能重叠。
        """
        scope = self.normalize_search_scope(media_type)
        seen = set()
        all_candidates = []

        def _add(results):
            for r in results or []:
                mid = r.get("id")
                mt = self.normalize_media_type(r.get("media_type") or scope)
                if not mid:
                    continue
                key = (mt, mid)
                if key in seen:
                    continue
                seen.add(key)
                item = dict(r)
                item["media_type"] = mt
                all_candidates.append(item)

        for query in queries:
            if not query or len(query) < 2:
                continue
            if scope == "all":
                # 并行 movie+tv（支持 year），比 /search/multi 更利于年份过滤与 BBC TV
                _add(self._tag_media_type(self.search_movie(query, year), "movie"))
                _add(self._tag_media_type(self.search_tv(query, year), "tv"))
                if year:
                    _add(self._tag_media_type(self.search_movie(query), "movie"))
                    _add(self._tag_media_type(self.search_tv(query), "tv"))
            elif scope == "tv":
                _add(self._tag_media_type(self.search_tv(query, year), "tv"))
                if year:
                    _add(self._tag_media_type(self.search_tv(query), "tv"))
            else:
                _add(self._tag_media_type(self.search_movie(query, year), "movie"))
                if year:
                    _add(self._tag_media_type(self.search_movie(query), "movie"))

        all_candidates.sort(
            key=lambda x: (
                _title_match_boost(x, queries),
                x.get("vote_count") or 0,
                x.get("popularity") or 0,
            ),
            reverse=True,
        )
        return all_candidates[:20]

    def _format_search_candidate(self, r: dict) -> dict:
        """将 movie/tv 搜索原始项格式化为统一候选结构。"""
        mt = self.normalize_media_type(r.get("media_type"))
        if mt == "tv":
            title_cn = r.get("name") or r.get("title") or ""
            title_en = r.get("original_name") or r.get("original_title") or ""
            date = r.get("first_air_date") or r.get("release_date") or ""
        else:
            title_cn = r.get("title") or r.get("name") or ""
            title_en = r.get("original_title") or r.get("original_name") or ""
            date = r.get("release_date") or r.get("first_air_date") or ""
        return {
            "tmdb_id": r.get("id"),
            "media_type": mt,
            "title_cn": title_cn,
            "title_en": title_en,
            "year": date[:4] if date else "",
            "overview": r.get("overview", ""),
            "poster_url": self.get_image_url(r.get("poster_path")) if r.get("poster_path") else None,
            "backdrop_url": self.get_image_url(r.get("backdrop_path"), "w780") if r.get("backdrop_path") else None,
            "rating": r.get("vote_average", 0),
            "vote_count": r.get("vote_count", 0),
            "popularity": r.get("popularity", 0),
            "genre_ids": r.get("genre_ids", []),
        }

    def search_by_title_and_visual_clues(self, title_cn="", title_en="", year="",
                                          spine_colors=None, publisher="",
                                          media_type="all") -> list:
        """结合文本和视觉线索搜索 TMDb（电影+剧集，先规范化再多路查询）"""
        queries = build_search_queries(title_cn or "", title_en or "")
        if not queries:
            return []

        candidates = self.search_media_multi(
            queries, year if year else None, media_type=media_type
        )
        return [self._format_search_candidate(r) for r in candidates]

    def get_movie_detail(self, movie_id):
        params = {
            "api_key": self.api_key,
            "language": self.lang,
            "append_to_response": "credits,external_ids"
        }
        resp = self._get(f"/movie/{movie_id}", params)
        if resp.status_code == 200:
            data = resp.json()
            en_data = self._get_en_detail(movie_id, "movie")
            if en_data:
                data["en_title"] = en_data.get("title", "")
                data["en_overview"] = en_data.get("overview", "")
            return data
        return None

    def get_tv_detail(self, tv_id):
        params = {
            "api_key": self.api_key,
            "language": self.lang,
            "append_to_response": "credits,external_ids,aggregate_credits",
        }
        resp = self._get(f"/tv/{tv_id}", params)
        if resp.status_code == 200:
            data = resp.json()
            en_data = self._get_en_detail(tv_id, "tv")
            if en_data:
                data["en_title"] = en_data.get("name", "")
                data["en_overview"] = en_data.get("overview", "")
            return data
        return None

    def _get_en_detail(self, media_id, media_type="movie"):
        mt = self.normalize_media_type(media_type)
        path = f"/tv/{media_id}" if mt == "tv" else f"/movie/{media_id}"
        params = {"api_key": self.api_key, "language": "en-US"}
        resp = self._get(path, params)
        return resp.json() if resp.status_code == 200 else None

    def get_movie_credits(self, movie_id):
        params = {"api_key": self.api_key, "language": self.lang}
        resp = self._get(f"/movie/{movie_id}/credits", params)
        if resp.status_code == 200:
            data = resp.json()
            directors = []
            for person in data.get("crew", []):
                if person.get("job") == "Director":
                    directors.append(self._format_person(person))
            cast = [self._format_person(p) for p in data.get("cast", [])[:10]]
            return {"directors": directors, "cast": cast}
        return {"directors": [], "cast": []}

    def get_tv_credits(self, tv_id, detail: dict | None = None):
        """剧集演职：created_by 作 directors；cast 优先 credits，其次 aggregate_credits。"""
        directors = []
        if detail:
            for person in detail.get("created_by") or []:
                directors.append(self._format_person(person))

        params = {"api_key": self.api_key, "language": self.lang}
        resp = self._get(f"/tv/{tv_id}/credits", params)
        cast = []
        if resp.status_code == 200:
            data = resp.json()
            cast = [self._format_person(p) for p in data.get("cast", [])[:10]]
            if not directors:
                for person in data.get("crew", []):
                    job = (person.get("job") or "").lower()
                    if job in ("director", "series director", "creator"):
                        directors.append(self._format_person(person))

        if not cast and detail:
            agg = detail.get("aggregate_credits") or {}
            for p in (agg.get("cast") or [])[:10]:
                roles = p.get("roles") or []
                character = roles[0].get("character", "") if roles else p.get("character", "")
                person = dict(p)
                person["character"] = character
                cast.append(self._format_person(person))

        return {"directors": directors, "cast": cast}

    def _format_person(self, person):
        return {
            "id": person.get("id"),
            "name": person.get("name", ""),
            "character": person.get("character", ""),
            "profile_url": self.get_image_url(person.get("profile_path"), "w185") if person.get("profile_path") else None,
        }

    def get_image_url(self, path, size="w342"):
        if not path:
            return None
        return f"{self.image_base}/{size}{path}"

    def get_movie_full(self, movie_id):
        detail = self.get_movie_detail(movie_id)
        credits = self.get_movie_credits(movie_id)
        if not detail:
            return None
        genres = [g.get("name", "") for g in detail.get("genres", [])]
        return {
            "tmdb_id": movie_id,
            "media_type": "movie",
            "title_cn": detail.get("title", ""),
            "title_en": detail.get("en_title", detail.get("original_title", "")),
            "year": detail.get("release_date", "")[:4] if detail.get("release_date") else "",
            "directors": credits.get("directors", []),
            "cast": credits.get("cast", []),
            "synopsis_cn": detail.get("overview", ""),
            "synopsis_en": detail.get("en_overview", ""),
            "rating": detail.get("vote_average", 0),
            "genres": genres,
            "poster_url": self.get_image_url(detail.get("poster_path")) if detail.get("poster_path") else None,
            "backdrop_url": self.get_image_url(detail.get("backdrop_path"), "w780") if detail.get("backdrop_path") else None,
            "runtime": detail.get("runtime", 0),
            "original_language": detail.get("original_language", ""),
        }

    def get_tv_full(self, tv_id):
        detail = self.get_tv_detail(tv_id)
        if not detail:
            return None
        credits = self.get_tv_credits(tv_id, detail=detail)
        genres = [g.get("name", "") for g in detail.get("genres", [])]
        ep_runtime = detail.get("episode_run_time") or []
        runtime = ep_runtime[0] if ep_runtime else 0
        air = detail.get("first_air_date") or ""
        return {
            "tmdb_id": tv_id,
            "media_type": "tv",
            "title_cn": detail.get("name", ""),
            "title_en": detail.get("en_title", detail.get("original_name", "")),
            "year": air[:4] if air else "",
            "directors": credits.get("directors", []),
            "cast": credits.get("cast", []),
            "synopsis_cn": detail.get("overview", ""),
            "synopsis_en": detail.get("en_overview", ""),
            "rating": detail.get("vote_average", 0),
            "genres": genres,
            "poster_url": self.get_image_url(detail.get("poster_path")) if detail.get("poster_path") else None,
            "backdrop_url": self.get_image_url(detail.get("backdrop_path"), "w780") if detail.get("backdrop_path") else None,
            "runtime": runtime,
            "original_language": detail.get("original_language", ""),
        }

    def get_media_full(self, tmdb_id, media_type="movie"):
        """按 media_type 拉取电影或剧集详情（旧数据无字段时默认 movie）。"""
        mt = self.normalize_media_type(media_type)
        if mt == "tv":
            return self.get_tv_full(tmdb_id)
        return self.get_movie_full(tmdb_id)


tmdb = TMDBClient()
