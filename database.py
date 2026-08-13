"""SQLite 数据库模型和操作"""
import sqlite3
import json
import os
from contextlib import contextmanager
from config import DATABASE_PATH


def get_db():
    """获取数据库连接"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def db_session():
    """数据库会话上下文管理器"""
    conn = get_db()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """初始化数据库表"""
    with db_session() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS discs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tmdb_id INTEGER,
                tmdb_media_type TEXT DEFAULT 'movie',
                imdb_id TEXT DEFAULT NULL,
                tvdb_id INTEGER DEFAULT NULL,
                title_cn TEXT NOT NULL,
                title_en TEXT DEFAULT '',
                year TEXT DEFAULT '',
                directors TEXT DEFAULT '[]',
                cast TEXT DEFAULT '[]',
                synopsis_cn TEXT DEFAULT '',
                synopsis_en TEXT DEFAULT '',
                rating REAL DEFAULT 0,
                genres TEXT DEFAULT '[]',
                poster_url TEXT DEFAULT '',
                backdrop_url TEXT DEFAULT '',
                runtime INTEGER DEFAULT 0,
                original_language TEXT DEFAULT '',
                pos_x REAL DEFAULT 0,
                pos_y REAL DEFAULT 0,
                photo_offset_x REAL DEFAULT 0,
                photo_offset_y REAL DEFAULT 0,
                bbox_w REAL DEFAULT 0,
                bbox_h REAL DEFAULT 0,
                source_image TEXT DEFAULT '',
                confirmed INTEGER DEFAULT 0,
                flagged INTEGER DEFAULT 0,
                preference INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS wall_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                path TEXT NOT NULL,
                file_hash TEXT DEFAULT '',
                original_filename TEXT DEFAULT '',
                image_type TEXT DEFAULT 'closeup',
                pos_x REAL DEFAULT 0,
                pos_y REAL DEFAULT 0,
                width_ratio REAL DEFAULT 0,
                height_ratio REAL DEFAULT 0,
                width REAL DEFAULT 0,
                height REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS ocr_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                wall_image_id INTEGER,
                disc_id INTEGER,
                raw_text TEXT DEFAULT '',
                confidence REAL DEFAULT 0,
                bbox_x REAL DEFAULT 0,
                bbox_y REAL DEFAULT 0,
                bbox_w REAL DEFAULT 0,
                bbox_h REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (wall_image_id) REFERENCES wall_images(id),
                FOREIGN KEY (disc_id) REFERENCES discs(id)
            );
        """)

        # 迁移：为旧表添加缺失列（兼容已部署数据库）
        migrations = [
            "ALTER TABLE discs ADD COLUMN photo_offset_x REAL DEFAULT 0",
            "ALTER TABLE discs ADD COLUMN photo_offset_y REAL DEFAULT 0",
            "ALTER TABLE discs ADD COLUMN bbox_w REAL DEFAULT 0",
            "ALTER TABLE discs ADD COLUMN bbox_h REAL DEFAULT 0",
            "ALTER TABLE wall_images ADD COLUMN width_ratio REAL DEFAULT 0",
            "ALTER TABLE wall_images ADD COLUMN height_ratio REAL DEFAULT 0",
            "ALTER TABLE wall_images ADD COLUMN file_hash TEXT DEFAULT ''",
            "ALTER TABLE wall_images ADD COLUMN original_filename TEXT DEFAULT ''",
            "ALTER TABLE ocr_results ADD COLUMN bbox_x REAL DEFAULT 0",
            "ALTER TABLE ocr_results ADD COLUMN bbox_y REAL DEFAULT 0",
            "ALTER TABLE ocr_results ADD COLUMN bbox_w REAL DEFAULT 0",
            "ALTER TABLE ocr_results ADD COLUMN bbox_h REAL DEFAULT 0",
            "ALTER TABLE discs ADD COLUMN flagged INTEGER DEFAULT 0",
            "ALTER TABLE discs ADD COLUMN preference INTEGER DEFAULT 0",
            "ALTER TABLE discs ADD COLUMN tmdb_media_type TEXT DEFAULT 'movie'",
            "ALTER TABLE discs ADD COLUMN imdb_id TEXT DEFAULT NULL",
            "ALTER TABLE discs ADD COLUMN tvdb_id INTEGER DEFAULT NULL",
        ]
        for sql in migrations:
            try:
                conn.execute(sql)
            except sqlite3.OperationalError:
                pass  # 列已存在


# ===== Disc CRUD =====

def add_disc(data):
    """添加一张碟片"""
    with db_session() as conn:
        media_type = _normalize_tmdb_media_type(
            data.get("tmdb_media_type") or data.get("media_type")
        )
        imdb_id = _normalize_imdb_id(data.get("imdb_id"))
        tvdb_id = _normalize_tvdb_id(data.get("tvdb_id"))
        cursor = conn.execute("""
            INSERT INTO discs (tmdb_id, tmdb_media_type, imdb_id, tvdb_id,
                             title_cn, title_en, year, directors, cast,
                             synopsis_cn, synopsis_en, rating, genres, poster_url,
                             backdrop_url, runtime, original_language,
                             pos_x, pos_y, photo_offset_x, photo_offset_y,
                             bbox_w, bbox_h, source_image, confirmed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get("tmdb_id"), media_type, imdb_id, tvdb_id,
            data.get("title_cn", ""), data.get("title_en", ""),
            data.get("year", ""), json.dumps(data.get("directors", []), ensure_ascii=False),
            json.dumps(data.get("cast", []), ensure_ascii=False),
            data.get("synopsis_cn", ""), data.get("synopsis_en", ""),
            data.get("rating", 0), json.dumps(data.get("genres", []), ensure_ascii=False),
            data.get("poster_url", ""), data.get("backdrop_url", ""),
            data.get("runtime", 0), data.get("original_language", ""),
            data.get("pos_x", 0), data.get("pos_y", 0),
            data.get("photo_offset_x", 0), data.get("photo_offset_y", 0),
            data.get("bbox_w", 0), data.get("bbox_h", 0),
            data.get("source_image", ""), data.get("confirmed", 0)
        ))
        return cursor.lastrowid


def update_disc(disc_id, data):
    """更新碟片信息"""
    fields = []
    values = []
    for key in ["title_cn", "title_en", "year", "synopsis_cn", "synopsis_en",
                "rating", "poster_url", "backdrop_url", "runtime", "original_language",
                "pos_x", "pos_y", "photo_offset_x", "photo_offset_y",
                "bbox_w", "bbox_h",
                "source_image", "confirmed", "flagged", "preference", "tmdb_id",
                "tmdb_media_type", "imdb_id", "tvdb_id",
                "directors", "cast", "genres"]:
        if key in data:
            fields.append(f"{key} = ?")
            val = data[key]
            if key in ("directors", "cast", "genres") and not isinstance(val, str):
                val = json.dumps(val, ensure_ascii=False)
            if key in ("confirmed", "flagged"):
                val = 1 if val in (True, 1, "1", "true", "True") else 0
            if key == "preference":
                try:
                    val = int(val)
                except (TypeError, ValueError):
                    val = 0
                if val not in (0, 1, 2, 3):
                    val = 0
            if key == "tmdb_media_type":
                val = _normalize_tmdb_media_type(val)
            if key == "imdb_id":
                val = _normalize_imdb_id(val)
            if key == "tvdb_id":
                val = _normalize_tvdb_id(val)
            values.append(val)
    fields.append("updated_at = CURRENT_TIMESTAMP")
    values.append(disc_id)

    with db_session() as conn:
        conn.execute(f"UPDATE discs SET {', '.join(fields)} WHERE id = ?", values)


def delete_disc(disc_id):
    """删除碟片及其关联 OCR 结果"""
    with db_session() as conn:
        conn.execute("DELETE FROM ocr_results WHERE disc_id = ?", (disc_id,))
        conn.execute("DELETE FROM discs WHERE id = ?", (disc_id,))


def get_disc(disc_id):
    """获取单张碟片信息"""
    conn = get_db()
    row = conn.execute("SELECT * FROM discs WHERE id = ?", (disc_id,)).fetchone()
    conn.close()
    return _format_disc(row) if row else None


def get_all_discs():
    """获取所有碟片"""
    conn = get_db()
    rows = conn.execute("SELECT * FROM discs ORDER BY title_cn").fetchall()
    conn.close()
    return [_format_disc(r) for r in rows]


def get_discs_by_source_image(filename):
    """根据源图片文件名获取所有碟片"""
    conn = get_db()
    rows = conn.execute("SELECT * FROM discs WHERE source_image = ?", (filename,)).fetchall()
    conn.close()
    return [_format_disc(r) for r in rows]


def search_discs(keyword=None, genre=None, year=None, confirmed=None, preference=None):
    """搜索碟片。preference: 0=未标注, 1/2/3=三档喜好；None=不限。"""
    conn = get_db()
    sql = "SELECT * FROM discs WHERE 1=1"
    params = []
    if keyword:
        sql += " AND (title_cn LIKE ? OR title_en LIKE ? OR synopsis_cn LIKE ?)"
        kw = f"%{keyword}%"
        params.extend([kw, kw, kw])
    if genre:
        sql += " AND genres LIKE ?"
        params.append(f"%{genre}%")
    if year:
        sql += " AND year = ?"
        params.append(year)
    if confirmed is not None:
        sql += " AND confirmed = ?"
        params.append(confirmed)
    if preference is not None:
        sql += " AND COALESCE(preference, 0) = ?"
        params.append(int(preference))
    sql += " ORDER BY title_cn"
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [_format_disc(r) for r in rows]


def get_all_genres():
    """获取所有已使用的分类"""
    conn = get_db()
    rows = conn.execute("SELECT genres FROM discs WHERE genres != '[]'").fetchall()
    conn.close()
    genre_set = set()
    for row in rows:
        genres = json.loads(row["genres"])
        for g in genres:
            genre_set.add(g)
    return sorted(genre_set)


def get_all_years():
    """获取所有有碟片的年份"""
    conn = get_db()
    rows = conn.execute("SELECT DISTINCT year FROM discs WHERE year != '' ORDER BY year DESC").fetchall()
    conn.close()
    return [r["year"] for r in rows]


def _normalize_tmdb_media_type(value) -> str:
    """旧库无字段或空值一律视为 movie。"""
    mt = (value or "").strip().lower() if isinstance(value, str) else ""
    if mt in ("tv", "television", "show", "series"):
        return "tv"
    return "movie"


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


def _format_disc(row):
    """格式化碟片数据"""
    d = dict(row)
    for field in ("directors", "cast", "genres"):
        d[field] = json.loads(d.get(field, "[]") or "[]")
    d["flagged"] = 1 if d.get("flagged") else 0
    try:
        pref = int(d.get("preference") or 0)
    except (TypeError, ValueError):
        pref = 0
    d["preference"] = pref if pref in (0, 1, 2, 3) else 0
    d["tmdb_media_type"] = _normalize_tmdb_media_type(d.get("tmdb_media_type"))
    d["imdb_id"] = _normalize_imdb_id(d.get("imdb_id"))
    d["tvdb_id"] = _normalize_tvdb_id(d.get("tvdb_id"))
    return d


# ===== Wall Images CRUD =====

def add_wall_image(filename, path, image_type="closeup", pos_x=0, pos_y=0,
                     width_ratio=0, height_ratio=0, width=0, height=0, file_hash="",
                     original_filename=""):
    """添加墙面图片"""
    with db_session() as conn:
        cursor = conn.execute("""
            INSERT INTO wall_images (filename, path, file_hash, original_filename, image_type,
                                     pos_x, pos_y, width_ratio, height_ratio, width, height)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (filename, path, file_hash, original_filename, image_type,
              pos_x, pos_y, width_ratio, height_ratio, width, height))
        return cursor.lastrowid


def get_all_wall_images():
    """获取所有墙面图片"""
    conn = get_db()
    rows = conn.execute("SELECT * FROM wall_images ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_wall_image(image_id):
    """获取单张墙面图片"""
    conn = get_db()
    row = conn.execute("SELECT * FROM wall_images WHERE id = ?", (image_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def find_wall_image_by_hash(file_hash):
    """按内容哈希查找已有图片"""
    if not file_hash:
        return None
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM wall_images WHERE file_hash = ? ORDER BY id ASC LIMIT 1",
        (file_hash,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def find_wall_image_by_original_filename(original_filename):
    """按原始文件名查找已有图片（次要去重）"""
    if not original_filename:
        return None
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM wall_images WHERE original_filename = ? ORDER BY id ASC LIMIT 1",
        (original_filename,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def find_wall_image_by_filename(filename):
    """按 filename 或 original_filename 查找 wall_image（用于 source_image 关联）"""
    if not filename:
        return None
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM wall_images WHERE filename = ? OR original_filename = ? "
        "ORDER BY CASE WHEN filename = ? THEN 0 ELSE 1 END, id ASC LIMIT 1",
        (filename, filename, filename),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def update_wall_image(image_id, data):
    """更新墙面图片信息"""
    fields = []
    values = []
    for key in ["pos_x", "pos_y", "width_ratio", "height_ratio", "image_type",
                "file_hash", "original_filename"]:
        if key in data:
            fields.append(f"{key} = ?")
            values.append(data[key])
    if not fields:
        return
    values.append(image_id)
    with db_session() as conn:
        conn.execute(f"UPDATE wall_images SET {', '.join(fields)} WHERE id = ?", values)


def clear_image_records(image_id):
    """清除图片关联的所有 OCR 结果和碟片记录（保留图片本身）"""
    with db_session() as conn:
        # 获取关联的碟片
        rows = conn.execute(
            "SELECT id FROM discs WHERE source_image = "
            "(SELECT filename FROM wall_images WHERE id = ?)", (image_id,)
        ).fetchall()
        for row in rows:
            conn.execute("DELETE FROM ocr_results WHERE disc_id = ?", (row["id"],))
        conn.execute(
            "DELETE FROM discs WHERE source_image = "
            "(SELECT filename FROM wall_images WHERE id = ?)", (image_id,)
        )
        conn.execute("DELETE FROM ocr_results WHERE wall_image_id = ?", (image_id,))


def delete_wall_image(image_id):
    """删除墙面图片及其关联的碟片"""
    clear_image_records(image_id)
    with db_session() as conn:
        conn.execute("DELETE FROM wall_images WHERE id = ?", (image_id,))


# ===== OCR Results =====

def save_ocr_result(wall_image_id, disc_id, raw_text, confidence=0,
                    bbox_x=0, bbox_y=0, bbox_w=0, bbox_h=0):
    """保存 OCR 结果"""
    with db_session() as conn:
        conn.execute("""
            INSERT INTO ocr_results (wall_image_id, disc_id, raw_text, confidence,
                                     bbox_x, bbox_y, bbox_w, bbox_h)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (wall_image_id, disc_id, raw_text, confidence, bbox_x, bbox_y, bbox_w, bbox_h))


# ===== 统计 =====

def get_stats():
    """获取统计信息"""
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) as c FROM discs").fetchone()["c"]
    confirmed = conn.execute("SELECT COUNT(*) as c FROM discs WHERE confirmed = 1").fetchone()["c"]
    total_images = conn.execute("SELECT COUNT(*) as c FROM wall_images").fetchone()["c"]
    genres = get_all_genres()
    years = get_all_years()
    conn.close()
    return {
        "total_discs": total,
        "confirmed_discs": confirmed,
        "total_images": total_images,
        "genres": genres,
        "years": years
    }
