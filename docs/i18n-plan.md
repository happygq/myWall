# myWall 多语言独立版架构

> 状态：`i18n` 分支实验方案；不合并到 `main`，除非用户明确决定。
> 首版语言：English (`en`)、简体中文 (`zh`)、日本語 (`ja`)、한국어 (`ko`)。

## 双轨发布策略

- `main` 始终保留 v4.1 中文稳定版及其中文默认体验。
- `i18n` 是多语言实验版，默认 UI 为纯英文；功能稳定前只在该分支演进。
- 开发、测试和部署均从目标分支启动，两个分支不共享提交，也不自动合并。
- 当前数据文件继续使用现有忽略规则，不提交数据库、照片、上传产物或密钥。

## 语言模型

语言偏好拆成两个维度：

- **UI locale**：按钮、侧栏、弹窗、提示和状态文案，默认 `en`。
- **Content locale**：卡片译名、演员/导演译名、简介和类型标签，默认 `en`；用户可选择 `zh`、`ja` 或 `ko`。目标语言缺失时依次回退 `en`、原始语言、现有兼容字段。

偏好写入浏览器 `localStorage`：

- `mywall.uiLocale`
- `mywall.contentLocale`

允许值固定为 `en | zh | ja | ko`。无效值按默认值处理。后续可用 `?lang=` 作为临时预览覆盖，但分支隔离仍是首要边界。

## UI i18n

前端词典位于：

- `static/locales/en.json`
- `static/locales/zh.json`
- M2/M4 补充 `ja.json`、`ko.json`

`static/js/i18n.js` 提供异步词典加载、`t(key)`、`getUiLang()` / `setUiLang()`、`getContentLang()` / `setContentLang()`。页面启动时先加载 UI 词典，再渲染带 `data-i18n` 的固定文案。词典缺 key 时回退英文，再回退 key 本身；禁止因为缺失翻译而阻断页面。

M2 将现有硬编码中文逐模块迁移到词典。迁移中的分支页面默认英文，但尚未迁移的文案视为已知过渡状态，不回写 `main`。

侧栏语言切换器使用可滑出的圆形国旗控件：English 使用 🇺🇸（表示 UI English），简体中文使用 🇨🇳，日本語使用 🇯🇵，한국어 使用 🇰🇷。首版切换 `UI locale`，不隐式改写独立的 `Content locale`。日语、韩语空词典允许先选中并保存 locale，缺失 key 按既定规则回退英文。

## Content i18n 与兼容迁移

SQLite `discs` 表计划增加 JSON 文本列：

- `titles_i18n`：`{"en": "...", "zh": "...", "ja": "...", "ko": "..."}`
- `synopses_i18n`：同上
- `genres_i18n`：各语言的展示标签数组

人物继续存于 `directors` / `cast` JSON 数组，每个人增加：

```json
{
  "id": 123,
  "names": {"en": "...", "zh": "...", "ja": "...", "ko": "..."},
  "characters": {"en": "...", "zh": "...", "ja": "...", "ko": "..."}
}
```

兼容原则：

1. 保留 `title_cn`、`title_en`、`synopsis_cn`、`synopsis_en`，不删除、不重命名；中文版和旧数据库继续可读。
2. 迁移只添加带默认值 `'{}'` 的列，可重复运行。
3. 首次迁移把旧字段回填进 JSON：`title_cn → zh`、`title_en → en`，简介同理；原字段保持不变。
4. 新版写入时同步兼容字段和 JSON 中的 `zh` / `en`，直到中文版去向另行决定。
5. API 输出同时保留旧字段与新字段，前端内容选择器读取新字段并执行回退。

## TMDb 四语预存

TMDb 调用的 `language` 必须参数化，禁止继续依赖可变的全局 `self.lang` 作为新流程唯一语言来源。enrich / 导入确定 TMDb 条目后，预拉并持久化：

- `en` → `en-US`
- `zh` → `zh-CN`
- `ja` → `ja-JP`
- `ko` → `ko-KR`

详情、简介、类型和 credits 以相同 locale 获取并合并。图片与稳定 ID 去重，不因语言重复保存。单个 locale 请求失败时记录缺失并继续其他语言；重试可补齐，不用覆盖已有非空人工翻译。搜索阶段可使用 UI/content locale，提高命中体验；最终确认后的四语预拉才是持久化数据来源。

## 手册

- 默认入口：`static/docs/manual.en.html`
- 中文入口：`static/docs/manual.zh.html`
- 日语、韩语手册可在首版 UI 与内容链路稳定后补充。
- 过渡期保留 `manual.html` 作为兼容入口；在 `i18n` 分支将其重定向或链接至英文手册，不影响 `main`。

## 类型筛选

首版展示英文规范标签，同时维护中/日/韩别名。筛选匹配采用规范 genre ID（优先）或别名集合 OR，避免直接比较当前语言文本。现有中文归一表暂时保留，并预留扩展为：

```text
genre_id → canonical_en → aliases[en|zh|ja|ko]
```

在规范 ID 完成前，API 可同时返回原始类型和英文展示标签，禁止迁移时改写旧库的中文原始值。

## 里程碑

- **M1 — 分支、文档与 schema**：建立 `i18n`，确定双轨边界、JSON schema、兼容迁移与基础词典脚手架。
- **M2 — UI 英文化**：将模板和 `app.js` 固定文案迁入词典，默认 UI 为英文，加入缺 key 检查。
- **M3 — 内容四语预存**：实现 schema 迁移、TMDb 四语详情/credits 拉取、enrich 与导入写入及回退。
- **M4 — 语言切换器**：分别切换 UI locale 和 content locale，卡片、详情、搜索与类型筛选联动。
- **M5 — 手册**：交付英文默认手册和中文手册，修正站内入口与分支运行说明。

## 验收边界

- `main` 的提交、默认语言和运行路径不变。
- `i18n` 首屏 UI locale 默认 `en`，content locale 默认 `en`，用户偏好刷新后保留。
- 同一条内容可同时保存四语，切换只改变展示，不覆盖其他语言。
- 旧数据库可原地升级；旧字段、中文数据及旧 API 消费方继续工作。
- 仓库不包含密钥、数据库、照片或识别产物。
