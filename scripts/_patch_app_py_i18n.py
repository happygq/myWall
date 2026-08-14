"""Replace common Chinese API error messages with English (i18n branch default UI)."""
from pathlib import Path

APP = Path(__file__).resolve().parents[1] / "app.py"
text = APP.read_text(encoding="utf-8")

ERRORS = {
    "TVDB 编号无效": "Invalid TVDB ID",
    "喜好筛选无效": "Invalid preference filter",
    "碟片不存在": "Disc not found",
    "无效数据": "Invalid data",
    "片名不能为空": "Title cannot be empty",
    "TMDb 编号无效": "Invalid TMDb ID",
    "TMDb 无数据": "No TMDb data",
    "请选择图片": "Select image(s)",
    "不支持的图片格式": "Unsupported image format",
    "图片不存在": "Image not found",
    "任务不存在": "Task not found",
    "请指定 source（tmdb / imdb / tvdb）": "Specify source (tmdb / imdb / tvdb)",
    "API Key 过长": "API key too long",
    "未知来源": "Unknown source",
    "请提供片名": "Enter a title",
    "已关闭该来源的 API 调用": "API requests disabled for this source",
    "未配置 OMDB_API_KEY，无法拉取 IMDb 详情": "OMDB_API_KEY not configured",
    "获取失败": "Fetch failed",
    "请提供 tmdb_id": "TMDb ID required",
    "TMDb 数据获取失败": "Could not fetch TMDb data",
    "没有可处理的图片": "No valid images",
    "无效文件名": "Invalid filename",
    "请提供有效的框选区域": "Valid bounding box required",
    "区域识别失败，请稍后重试": "Region analysis failed — try again",
    "该碟片尚未标定碟脊区域，无法精确比对": "Spine region not marked — cannot compare",
    "请提供海报 URL": "Poster URL required",
    "所选来源不可用": "Selected source unavailable",
    "读取 API Key 失败": "Could not read API keys",
    "保存 API Key 失败": "Could not save API keys",
    "disc_ids 无效": "Invalid disc_ids",
    "请提供 image_ids 列表": "Provide image_ids list",
    "没有找到有效图片": "No images found",
    "请提交 boxes JSON 对象": "Submit boxes JSON object",
    "spines 必须是数组": "spines must be an array",
    "文件已存在，跳过上传": "File already exists — skipped",
    "图片已上传，后台分析中...": "Uploaded — analyzing in background…",
    "搜索失败，请稍后重试": "Search failed — try again",
    "TMDb 连接超时，请检查网络/代理": "TMDb timeout — check network/proxy",
    "操作失败，请稍后重试": "Operation failed — try again later",
    "没有有效图片": "No valid images",
    "无效文件名": "Invalid filename",
}

for zh, en in ERRORS.items():
    text = text.replace(f'"error": "{zh}"', f'"error": "{en}"')
    text = text.replace(f'"error": "{zh}', f'"error": "{en}')  # partial - avoid
    text = text.replace(f'"message": "{zh}"', f'"message": "{en}"')

# Fix any remaining inline error keys with f-strings patterns
text = text.replace('"error": f"图片 #{', '"error": f"Image #')
text = text.replace('} 尚无碟脊框，请先打开「修正碟脊框」保存至少一个框"', '} has no spine boxes — edit spine boxes first"')

APP.write_text(text, encoding="utf-8")
remaining = len(__import__("re").findall(r"[\u4e00-\u9fff]", text))
print(f"app.py remaining CJK: {remaining}")
