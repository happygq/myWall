"""Count CJK characters in UI-related files."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    "templates/index.html",
    "static/js/app.js",
    "static/spine_boxes_editor.html",
    "static/js/spine_boxes_editor.js",
    "app.py",
]

def count_cjk(text: str) -> int:
    return len(re.findall(r"[\u4e00-\u9fff]", text))

def count_ui_visible_html(text: str) -> int:
    # strip HTML comments
    t = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    return count_cjk(t)

for rel in FILES:
    p = ROOT / rel
    if not p.exists():
        print(f"{rel}: MISSING")
        continue
    text = p.read_text(encoding="utf-8")
    if rel.endswith("index.html"):
        n = count_ui_visible_html(text)
    elif rel.endswith("app.js"):
        body = text.split("*/", 1)[-1]
        gs = body.find("GENRE_GROUPS")
        ge = body.find("];", gs) + 2 if gs >= 0 else -1
        body = body[:gs] + body[ge:] if gs >= 0 else body
        n = count_cjk(body)
    else:
        n = count_cjk(text)
    print(f"{rel}: {n}")
