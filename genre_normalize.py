"""类型标签归一：只用于筛选下拉与展示，不改库里原始 genre 字符串。

来源说明：discs.genres 来自匹配到的 TMDb / OMDb 作品自带类型
（TMDb zh-CN 多为中文，剧集组合类型常残留英文；OMDb 为英文）。
TVDB 搜索候选不带类型。配错片会带上错类型。
"""
from __future__ import annotations

import re

# 下拉展示顺序；同组别名（中/英/组合类型）映射到同一中文 key。
# 一条原始字符串可命中多组（如 Sci-Fi & Fantasy → 科幻 + 奇幻）。
GENRE_GROUPS: list[tuple[str, tuple[str, ...]]] = [
    ("剧情", ("剧情", "Drama")),
    ("喜剧", ("喜剧", "Comedy")),
    ("动作", ("动作", "Action", "动作冒险", "Action & Adventure", "Action Adventure")),
    ("冒险", ("冒险", "Adventure", "动作冒险", "Action & Adventure", "Action Adventure")),
    ("动画", ("动画", "Animation")),
    ("纪录", ("纪录", "纪录片", "Documentary")),
    ("音乐", ("音乐", "Music", "Musical", "音乐剧")),
    ("科幻", ("科幻", "Science Fiction", "Sci-Fi", "Sci Fi", "Sci-Fi & Fantasy",
             "Science Fiction & Fantasy")),
    ("奇幻", ("奇幻", "Fantasy", "Sci-Fi & Fantasy", "Science Fiction & Fantasy")),
    ("恐怖", ("恐怖", "Horror")),
    ("惊悚", ("惊悚", "Thriller")),
    ("悬疑", ("悬疑", "Mystery")),
    ("爱情", ("爱情", "Romance")),
    ("犯罪", ("犯罪", "Crime")),
    ("战争", ("战争", "War", "War & Politics", "War and Politics")),
    ("历史", ("历史", "History")),
    ("家庭", ("家庭", "Family")),
    ("西部", ("西部", "Western")),
    ("新闻", ("新闻", "News")),
    ("电视电影", ("电视电影", "TV Movie", "TVMovie")),
    ("真人秀", ("真人秀", "Reality", "Reality-TV", "Reality TV")),
    ("儿童", ("儿童", "Kids", "Children")),
]

_CANONICAL_ORDER = [key for key, _ in GENRE_GROUPS]


def _norm(value: str) -> str:
    s = (value or "").strip().lower()
    s = s.replace("&", " and ")
    s = re.sub(r"[_\-]+", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s


def _build_alias_index() -> dict[str, tuple[str, ...]]:
    index: dict[str, list[str]] = {}
    for key, aliases in GENRE_GROUPS:
        names = (key,) + tuple(aliases)
        for alias in names:
            nk = _norm(alias)
            if not nk:
                continue
            bucket = index.setdefault(nk, [])
            if key not in bucket:
                bucket.append(key)
    return {k: tuple(v) for k, v in index.items()}


_ALIAS_TO_KEYS = _build_alias_index()


def canonical_keys_of(raw: str) -> tuple[str, ...]:
    """原始 genre 字符串对应的中文归一组（可能多个）。未识别则空元组。"""
    nk = _norm(raw)
    if not nk:
        return ()
    direct = _ALIAS_TO_KEYS.get(nk)
    if direct:
        return direct
    # 组合字符串：按整词命中别名（如 "Music Documentary" 尚未拆分数组）
    found: list[str] = []
    padded = f" {nk} "
    for alias_n, keys in _ALIAS_TO_KEYS.items():
        if f" {alias_n} " in padded:
            for key in keys:
                if key not in found:
                    found.append(key)
    return tuple(found)


def display_genres(raw_list) -> list[str]:
    """卡片/详情用中文归一名；未识别的保留原文；去重且尽量按标准顺序。"""
    extras: list[str] = []
    seen_keys: set[str] = set()
    for item in raw_list or []:
        text = str(item).strip() if item is not None else ""
        if not text:
            continue
        keys = canonical_keys_of(text)
        if keys:
            seen_keys.update(keys)
        elif text not in extras:
            extras.append(text)
    ordered = [k for k in _CANONICAL_ORDER if k in seen_keys]
    return ordered + extras


def ordered_genre_labels(labels) -> list[str]:
    """筛选下拉：已知类型按标准顺序，其余按原文排序。"""
    present = {str(x).strip() for x in (labels or []) if str(x).strip()}
    known = [k for k in _CANONICAL_ORDER if k in present]
    rest = sorted(present - set(known))
    return known + rest


def disc_matches_genre(raw_list, filter_value: str) -> bool:
    """筛选：选中文 key 时命中任一别名；未知值则按原文（大小写不敏感）匹配。"""
    needle = (filter_value or "").strip()
    if not needle:
        return True
    target_keys = set(canonical_keys_of(needle))
    needle_n = _norm(needle)
    for item in raw_list or []:
        text = str(item).strip() if item is not None else ""
        if not text:
            continue
        keys = canonical_keys_of(text)
        if target_keys:
            if target_keys & set(keys):
                return True
        elif needle in keys or _norm(text) == needle_n or text == needle:
            return True
    return False
