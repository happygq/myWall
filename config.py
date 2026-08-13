"""myWall 配置文件"""
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# TMDb API（可用环境变量覆盖；编辑碟片弹窗写入 data/api_keys.json 后由 api_keys.apply 热更新）
TMDB_API_KEY = (os.environ.get("TMDB_API_KEY") or "").strip()
TMDB_ACCESS_TOKEN = (os.environ.get("TMDB_ACCESS_TOKEN") or "").strip()
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"
# 网站 themoviedb.org 通 ≠ api.themoviedb.org 通；可被环境变量覆盖
# 优先级：HTTPS_PROXY / HTTP_PROXY / MYWALL_HTTP_PROXY / 下方默认（与 scripts/_batch_stage2 一致）
TMDB_HTTP_PROXY = (
    os.environ.get("HTTPS_PROXY")
    or os.environ.get("HTTP_PROXY")
    or os.environ.get("https_proxy")
    or os.environ.get("http_proxy")
    or os.environ.get("MYWALL_HTTP_PROXY")
    or "http://127.0.0.1:10808"
)

# OMDb（合法代理访问 IMDb 元数据）。优先环境变量；留空则 UI 禁用 IMDb 搜索。
# 申请：https://www.omdbapi.com/apikey.aspx
OMDB_API_KEY = (os.environ.get("OMDB_API_KEY") or "").strip()

# TheTVDB v4。优先环境变量 TVDB_API_KEY / THETVDB_API_KEY；留空则 UI 禁用 TVDB 搜索。
# 申请：https://thetvdb.com/api-information
TVDB_API_KEY = (
    os.environ.get("TVDB_API_KEY")
    or os.environ.get("THETVDB_API_KEY")
    or ""
).strip()

# 本机 API Key（编辑碟片弹窗维护；未入库，见 .gitignore）
API_KEYS_PATH = os.path.join(BASE_DIR, "data", "api_keys.json")

# 数据库
DATABASE_PATH = os.path.join(BASE_DIR, "data", "mywall.db")

# 上传目录
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
PHOTOS_FOLDER = os.path.join(BASE_DIR, "photos")
WALL_IMAGE = os.path.join(PHOTOS_FOLDER, "test-wall.jpg")

# 碟脊框 / stage2 结果（按 wall_image.id 关联）
SPINE_BOXES_FOLDER = os.path.join(BASE_DIR, "data", "spine_boxes")
SPINE_RESULTS_FOLDER = os.path.join(BASE_DIR, "data", "spine_results")

# 确保必要目录存在
os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(SPINE_BOXES_FOLDER, exist_ok=True)
os.makedirs(SPINE_RESULTS_FOLDER, exist_ok=True)

# Flask
SECRET_KEY = (os.environ.get("MYWALL_SECRET_KEY") or "dev-only-change-me").strip()
DEBUG = False
