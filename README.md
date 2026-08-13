# myWall

个人蓝光 / DVD 收藏墙：拍一面碟墙，识别碟脊，匹配 **TMDb / OMDb(IMDb) / TheTVDB** 元数据，在浏览器里浏览和编辑。

当前版本：**v4.0**

## 本地运行

需要 Python 3.10+。

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

浏览器打开 [http://127.0.0.1:5000](http://127.0.0.1:5000)。

服务默认监听 `0.0.0.0:5000`。若电脑已加入 Tailscale，可用手机浏览器访问这台机器的 Tailscale 主机名（或 MagicDNS）加 `:5000`，无需公网端口。

部分识别流程可选依赖本机视觉模型（如 LM Studio）；没有也能先用手册里的手工建卡 / TMDb 搜索。

站内使用说明：打开应用后访问 `/static/docs/manual.html`。

## 配置 API Key

三个来源都是可选的：缺哪个，对应搜索就会在界面里禁用。

| 来源 | 用途 | 申请 |
| --- | --- | --- |
| TMDb | 海报、影片 / 剧集元数据 | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) |
| OMDb（IMDb） | IMDb 片名搜索 | [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx) |
| TheTVDB | 剧集元数据 | [thetvdb.com/api-information](https://thetvdb.com/api-information) |

**推荐：** 打开「编辑碟片」或「手工建卡」弹窗，在 **API Key** 区块填写。会写入本机 `data/api_keys.json`（已 gitignore，热读、不必重启）。

也可以用环境变量（仅当 json 里没有覆盖时生效）。复制 `.env.example` 作参考：

```
TMDB_API_KEY=
TMDB_ACCESS_TOKEN=
OMDB_API_KEY=
TVDB_API_KEY=
```

不要把真实 key、`.env` 或 `data/api_keys.json` 提交进仓库。

访问 TMDb 若需要代理，可设 `HTTPS_PROXY` / `HTTP_PROXY` / `MYWALL_HTTP_PROXY`。

## 不会进仓库的内容

个人碟库、墙面照片、上传图、识别产物和密钥默认被 `.gitignore` 排除，包括：

- `data/api_keys.json`、`.env`
- `data/mywall.db`
- `photos/`、`uploads/`
- `out_b_stage1_*`、`data/spine_results/` 等识别输出
