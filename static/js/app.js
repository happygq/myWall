/**
 * myWall v4.1 — 多源片名搜索（TMDb / OMDb·IMDb / TVDB）/ 手工建卡 / tmdb_media_type / imdb_id·tvdb_id / 手工编辑 bbox / 编辑窗原图碟脊对照 / 卡片字段 / 标定碟脊 / 区域重识别 / 标记错误 / 双重确认删除 / 针图标原图 bbox 状态 / API 错误脱敏 / 按 tmdb_id 批量补海报
 * 树形分组缩略图可调整特写在总布局墙上的 placement（多特写托盘 + 单墙面编辑）
 * v4.1：搜索栏覆盖导演/主演 JSON（含 name_en）；详情演职中英名并列
 * v3.6：首页 Spotify DESIGN.md 视觉壳（CSS 为主）
 * v3.7：碟片卡片操作改为线描 SVG（深灰圆底，克制强调态）
 * v3.9：卡片个人喜好心形（三色）标注 + 喜好筛选
 * v3.12：侧栏「手工建卡」复用编辑模态新建；源图可选；POST /api/discs
 * v3.13：同一搜索入口合并来源；无 key 禁用 IMDb/TVDB
 * v3.15：编辑碟片弹窗维护本机 API Key（掩码 + 开关），保存后刷新来源可用性
 * v4.0：定稿发布，统一版本号
 * v3.14：全局可编辑/只读开关（默认只读，localStorage 持久化）
 * v3.14m：手机上沿手势收/展墙面；窄屏强制只读
 * v3.14n：卡片/详情标题主英文、副中文译名（相同则不重复）
 * v3.14o：碟片卡片 info 解锁高度；英文最多 2 行、中文 1 行 ellipsis；年份/评分/心形下移
 * v3.14p：海报顶对齐英文、底齐心形；收紧行距；心形与年份同行
 * v3.14q：海报固定 48×72（信息区 4 行槽），不足 4 行仍同高、文字顶齐
 * v3.14r：类型筛选下拉中文归一（别名合并，不改库）
 * v3.14s：类型下拉+筛选查询别名 OR（Music/音乐、Documentary/纪录）；不改库内 genres
 * v3.14t：类型热词图（按碟数加权，点击筛选）
 * v3.14u：筛选三下拉同一排；词云图标；热词图兼容无 genre_counts 的旧 /api/filters
 * v3.14z：类型热词无内部滚动；hover 仅显示碟数（无框）
 * v3.15c：热词图停在墙面主区（不挡侧栏）；点词筛选不关图；词轻微物理晃动；hover 无原生 title；墙面虚化
 * v3.15e：热词弹窗改称「热词筛选」；去掉说明文字
 * v3.15f：热词装箱后整体放大铺满窗口（少留边，无内部滚动）
 * v3.15g：热词窗固定尺寸停在主区中部，不随侧栏 --drag-x 挤压；拖结束重装箱
 * v3.15h：热词字号全库加权+封顶留白；窗贴侧栏右缘跟随；手机隐藏入口；悬停数字跟光标
 * v3.15i：热词字号差拉大（min 9 / 短边 30–32%）；悬停数字 26px；面板半透明
 * v3.15k：热词缩放后不低于 12px；铺不满则留白，不再把最小词压到 7px
 * v3.15l：热词铺满后按 base 非均匀映射：最大词仍铺满，最小词约为原先一半
 * v3.15o：回退热词图到 3.15l（大面板+标题栏+装箱后非均匀字号）；撤销 3.15m/n
 * v3.15p：热词先定显示字号再密铺（恢复 3.15m 装箱）；保留大面板与标题栏
 * v3.15q：手册/README 增加热词筛选图例；手册同步 3.15p 字号流水线说明
 * v3.15r：热词力导向（吸引+碰撞）可拖拽；短按筛选、过阈值拖拽，邻居跟动
 * v3.15s：热词硬边框阻挡（词/拖拽均不能穿出 #genre-cloud 内缘）
 * v3.15t：热词窗边/角可拖拽改大小（localStorage）；关闭钮半尺寸且悬停/焦点显现
 * v3.15u：碟片卡片操作列去圆底，与海报同高密排，减少卡片下方空白
 * v3.15v：修复热词拖拽——删除重复 onGenreCloudPointerMove 覆盖拖拽分支
 * v3.15w：热词力导向加强中程吸附（更大吸引半径、更强拉力、拖拽时减弱质心回中）
 * v3.15x：热词大面板填满时最小字号按约 3.7× 对比抬升（勿停在硬底 12px）
 * v3.15y：热词 rank-aware 向心力（按字号分层的目标半径：大词居中/小词外围）+ 松手后延迟平滑重排回密铺原位
 * v3.15z：碟片卡片图标变暗（CSS）
 * v3.16a：热词布局稳定化——收敛后停帧（park）；纯点击筛选不接管力场（不 pin、不重排）；
 *         ResizeObserver / window resize 仅在词区宽度实质变化时重装箱，高度或微抖动只夹回硬边界
 * v3.16b：热词词团稳定居中——力场按加速度标定（∝mass）、整团回中弹簧+质心阻尼+运动学平移回中；
 *         分层力围绕词团质心（不与回中打架）；停帧前要求已居中（PARK_OFFCENTER）
 * 墙面坐标：首页与 placement 编辑共用 wall-coord-layer，百分比相对墙图自然尺寸
 * 素材策略：test3≈test10 只跑一份；墙面只用 test-wall.jpg；识别 test1–13 跳过重复与已完成的 test2
 */

// ===== 全局状态 =====
const state = {
    discs: [],
    filters: { genres: [], years: [], genre_counts: [] },
    libraryGenreCounts: [],
    selectedDiscId: null,
    highlightedDiscId: null,
    wallImageUrl: "",
    uploadFiles: [],
    batchId: null,
    analysisResults: [],
    selectedMatches: {},
    rejectedDiscs: {},
    viewMode: "list",
    manageSelected: {},
    existingImages: [],
    existingSelected: {},
    imageUrlMap: {},
    imageMetaMap: {},
    closeupImages: [],
    activePhotoArFilename: null,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const tr = (key, params) => window.MyWallI18n ? window.MyWallI18n.t(key, params) : key;
function uiLocaleTag() {
    return window.MyWallI18n?.getUiLocaleTag?.() || "en";
}
function refreshDynamicUi() {
    if (window.MyWallI18n) window.MyWallI18n.applyI18n();
    syncWallSheetHandle(document.documentElement.classList.contains("wall-collapsed"));
    syncSidebarFooterToggle();
    updateExistingPhotosActions?.();
    updateUploadButton?.();
    updateBatchActionBar?.();
    updateSelectAllButton?.();
    _setEditDiscModalChrome(editDiscState.mode || "edit");
    if (isSidebarFooterOpen()) openSidebarFooter({ pin: !!$("#sidebar-footer")?.dataset.pinned }); else closeSidebarFooter();
}


// ===== 工具函数 =====
function showToast(msg, type = "") {
    const toast = $("#toast");
    toast.textContent = msg;
    toast.className = `toast ${type}`;
    toast.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.add("hidden"), 3000);
}

// ===== 全局可编辑 / 只读 =====
const EDIT_UNLOCK_KEY = "mywall-edit-unlocked";
const EDIT_MODE_ICONS = {
    locked: '<svg class="edit-mode-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="11" width="14" height="10.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.75"/><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M8 11V7.25a4 4 0 0 1 8 0V11"/></svg>',
    unlocked: '<svg class="edit-mode-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="11" width="14" height="10.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.75"/><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M8 11V7.25a4 4 0 0 1 7.8-1.15"/></svg>',
};
const READONLY_BLOCK_SELECTOR = [
    "[data-edit-only]",
    ".sidebar-footer-actions .btn",
    ".disc-card-actions .disc-card-btn:not(.disc-card-btn-pin)",
    ".disc-pref",
    ".tree-group-thumb",
    ".ar-actions",
    ".detail-actions .btn-secondary",
    ".image-grid-reprocess",
    ".image-grid-delete",
    ".existing-photo-edit-boxes",
    ".upload-preview-remove",
    ".disc-reject-btn",
    ".disc-tool-btn",
    "#upload-zone",
].join(",");

function isForcedReadonlyLayout() {
    return isNarrowBrowse();
}

function isEditUnlocked() {
    return !document.body.classList.contains("readonly");
}

function readStoredEditUnlocked() {
    try {
        return localStorage.getItem(EDIT_UNLOCK_KEY) === "1";
    } catch (_) {
        return false;
    }
}

function persistEditUnlocked(unlocked) {
    try {
        localStorage.setItem(EDIT_UNLOCK_KEY, unlocked ? "1" : "0");
    } catch (_) { /* ignore */ }
}

function requireEditUnlocked() {
    if (isEditUnlocked()) return true;
    showToast(tr("toast.readonly"));
    return false;
}

function syncEditModeToggle(unlocked) {
    const btn = $("#btn-edit-mode");
    if (!btn) return;
    btn.innerHTML = unlocked ? EDIT_MODE_ICONS.unlocked : EDIT_MODE_ICONS.locked;
    btn.setAttribute("aria-pressed", unlocked ? "true" : "false");
    const title = unlocked ? tr("mode.editableHint") : tr("mode.readonlyHint");
    btn.setAttribute("title", title);
    btn.setAttribute("aria-label", title);
}

function syncEditModeChrome() {
    const btn = $("#btn-edit-mode");
    if (!btn) return;
    const forced = isForcedReadonlyLayout();
    btn.hidden = forced;
    btn.disabled = forced;
    btn.setAttribute("aria-hidden", forced ? "true" : "false");
    btn.tabIndex = forced ? -1 : 0;
}

function applyEditMode(unlocked) {
    if (isForcedReadonlyLayout()) unlocked = false;
    document.body.classList.toggle("readonly", !unlocked);
    syncEditModeToggle(unlocked);
    syncEditModeChrome();
    if (!unlocked) {
        try { closeSpineBoxesEditor(); } catch (_) { /* ignore */ }
    }
}

function toggleEditMode() {
    if (isForcedReadonlyLayout()) return;
    const next = !isEditUnlocked();
    persistEditUnlocked(next);
    applyEditMode(next);
}

function initEditMode() {
    applyEditMode(isForcedReadonlyLayout() ? false : readStoredEditUnlocked());
    $("#btn-edit-mode")?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isForcedReadonlyLayout()) return;
        toggleEditMode();
    });
    document.addEventListener("click", (e) => {
        if (isEditUnlocked()) return;
        if (e.target.closest("#btn-edit-mode")) return;
        const hit = e.target.closest(READONLY_BLOCK_SELECTOR);
        if (!hit) return;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showToast(tr("toast.readonly"));
    }, true);
    document.addEventListener("drop", (e) => {
        if (isEditUnlocked()) return;
        if (!e.target.closest("#upload-zone")) return;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showToast(tr("toast.readonly"));
    }, true);
}

async function api(path, options = {}) {
    const config = {
        headers: { "Content-Type": "application/json" },
        ...options,
    };
    if (config.body && typeof config.body === "object" && !(config.body instanceof FormData)) {
        config.body = JSON.stringify(config.body);
    }
    if (config.body instanceof FormData) {
        delete config.headers["Content-Type"];
    }
    const res = await fetch(`/api${path}`, config);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        // 旧后端曾把「全部来源 + 跳过无 key 的 IMDb/TVDB」标成 400，但仍是有效搜索结果
        if (String(path).includes("/meta/search") && Array.isArray(err.candidates)) {
            return err;
        }
        throw new Error(err.message || err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

/** 归一化 media_type；旧数据缺省 movie */
function normalizeTmdbMediaType(value) {
    const mt = String(value || "").trim().toLowerCase();
    if (mt === "tv" || mt === "television" || mt === "show" || mt === "series") return "tv";
    return "movie";
}

/** 搜索范围：all | movie | tv */
function normalizeTmdbSearchScope(value) {
    const s = String(value || "").trim().toLowerCase();
    if (s === "movie" || s === "film") return "movie";
    if (s === "tv" || s === "television" || s === "show" || s === "series") return "tv";
    return "all";
}

/** 搜索来源：all | tmdb | imdb | tvdb */
function normalizeMetaSource(value) {
    const s = String(value || "").trim().toLowerCase();
    if (s === "tmdb") return "tmdb";
    if (s === "imdb" || s === "omdb") return "imdb";
    if (s === "tvdb" || s === "thetvdb") return "tvdb";
    return "all";
}

let metaProvidersCache = null;

async function loadMetaProviders(force = false) {
    if (metaProvidersCache && !force) return metaProvidersCache;
    try {
        const data = await api("/meta/providers");
        metaProvidersCache = data.providers || {};
    } catch (_) {
        metaProvidersCache = {
            tmdb: { enabled: true, label: "TMDb" },
            imdb: { enabled: false, label: "IMDb", hint: tr("meta.omdbUnavailable") },
            tvdb: { enabled: false, label: "TVDB", hint: tr("meta.tvdbUnavailable") },
        };
    }
    return metaProvidersCache;
}

function tmdbTypeBadgeHtml(mediaType) {
    const mt = normalizeTmdbMediaType(mediaType);
    const label = mt === "tv" ? tr("meta.typeTv") : tr("meta.typeMovie");
    return `<span class="tmdb-type-badge is-${mt}">${label}</span>`;
}

function sourceBadgeHtml(source) {
    const s = normalizeMetaSource(source === "all" ? "tmdb" : source);
    const key = s === "all" ? "tmdb" : s;
    const label = key === "imdb" ? "IMDb" : key === "tvdb" ? "TVDB" : "TMDb";
    return `<span class="source-badge is-${key}">${label}</span>`;
}

/** 跳过的未启用源：提示，不当失败 */
function metaSkippedHint(data, source) {
    const disabled = data?.disabled || [];
    if (!disabled.length) return "";
    const src = normalizeMetaSource(source || data?.source || "all");
    if (src !== "all") return "";
    const labels = disabled.map(s => {
        const info = data.providers?.[s] || {};
        return info.label || String(s).toUpperCase();
    });
    const runnable = ["tmdb", "imdb", "tvdb"].filter(s => data.providers?.[s]?.enabled);
    const rest = runnable.length ? tr("meta.searchOnly", { sources: runnable.map(s => data.providers[s].label || s).join(", ") }) : tr("meta.noSources");
    return tr("meta.skippedSources", { sources: labels.join(", "), rest });
}

function metaSearchErrorNotes(data) {
    return (data?.errors || []).map(e => `${e.source}: ${e.message}`).join("；");
}

function tmdbDetailPath(tmdbId, mediaType) {
    const mt = normalizeTmdbMediaType(mediaType);
    return `/tmdb/detail/${tmdbId}?media_type=${encodeURIComponent(mt)}`;
}

function getTmdbScopeFromSeg(segEl) {
    if (!segEl) return "all";
    const active = segEl.querySelector(".tmdb-scope-btn.is-active");
    return normalizeTmdbSearchScope(active?.dataset?.scope || "all");
}

function setTmdbScopeSeg(segEl, scope) {
    if (!segEl) return;
    const next = normalizeTmdbSearchScope(scope);
    segEl.querySelectorAll(".tmdb-scope-btn").forEach(btn => {
        btn.classList.toggle("is-active", (btn.dataset.scope || "") === next);
    });
}

function bindTmdbScopeSeg(segEl, onChange) {
    if (!segEl || segEl.dataset.bound === "1") return;
    segEl.dataset.bound = "1";
    segEl.addEventListener("click", (e) => {
        const btn = e.target.closest(".tmdb-scope-btn");
        if (!btn || !segEl.contains(btn)) return;
        setTmdbScopeSeg(segEl, btn.dataset.scope || "all");
        if (typeof onChange === "function") onChange(getTmdbScopeFromSeg(segEl));
    });
}

function tmdbScopeSegHtml(id, activeScope = "all") {
    const scope = normalizeTmdbSearchScope(activeScope);
    const opts = [
        ["all", tr("edit.scopeAll")],
        ["movie", tr("meta.typeMovie")],
        ["tv", tr("meta.typeTv")],
    ];
    return `<div class="tmdb-scope-seg" id="${id}" role="group" aria-label=tr("edit.scopeSearchType")>
        ${opts.map(([v, label]) =>
            `<button type="button" class="tmdb-scope-btn${v === scope ? " is-active" : ""}" data-scope="${v}">${label}</button>`
        ).join("")}
    </div>`;
}

function getMetaSourceFromSeg(segEl) {
    if (!segEl) return "all";
    const active = segEl.querySelector(".tmdb-scope-btn.is-active:not(.is-disabled)");
    if (active) return normalizeMetaSource(active.dataset.source || "all");
    return "all";
}

function setMetaSourceSeg(segEl, source) {
    if (!segEl) return;
    const next = normalizeMetaSource(source);
    segEl.querySelectorAll(".tmdb-scope-btn").forEach(btn => {
        const v = normalizeMetaSource(btn.dataset.source || "all");
        btn.classList.toggle("is-active", v === next && !btn.classList.contains("is-disabled"));
    });
}

async function applyMetaSourceAvailability(segEl) {
    if (!segEl) return;
    const providers = await loadMetaProviders();
    segEl.querySelectorAll(".tmdb-scope-btn").forEach(btn => {
        const src = normalizeMetaSource(btn.dataset.source || "all");
        if (src === "all") {
            btn.classList.remove("is-disabled");
            btn.removeAttribute("disabled");
            btn.title = "";
            return;
        }
        const info = providers[src] || {};
        const enabled = !!info.enabled;
        btn.classList.toggle("is-disabled", !enabled);
        if (!enabled) {
            btn.setAttribute("disabled", "disabled");
            btn.title = info.hint || tr("meta.noKey", { source: src.toUpperCase() });
            if (btn.classList.contains("is-active")) {
                btn.classList.remove("is-active");
                const allBtn = segEl.querySelector('[data-source="all"]');
                if (allBtn) allBtn.classList.add("is-active");
            }
        } else {
            btn.removeAttribute("disabled");
            btn.title = info.via ? tr("meta.via", { name: info.via }) : "";
        }
    });
}

const API_KEY_SOURCES = [
    ["tmdb", "TMDb"],
    ["imdb", "IMDb (OMDb)"],
    ["tvdb", "TVDB"],
];
const ICON_KEY_SAVE = '<svg class="disc-card-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M5 12l5 5L20 7"/></svg>';
const ICON_KEY_CLEAR = '<svg class="disc-card-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>';

async function applyApiKeyUpdate(source, body) {
    const data = await api("/settings/keys", {
        method: "PUT",
        body: { source, ...body },
    });
    if (data.providers) metaProvidersCache = data.providers;
    else await loadMetaProviders(true);
    await applyMetaSourceAvailability($("#edit-meta-source"));
    await applyMetaSourceAvailability(document.getElementById("match-meta-source"));
    renderEditApiKeysPanel(data.keys || {});
    return data;
}

function renderEditApiKeysPanel(keys) {
    const body = $("#edit-api-keys-body");
    if (!body) return;
    body.innerHTML = API_KEY_SOURCES.map(([src, label]) => {
        const info = keys[src] || {};
        const configured = !!info.configured;
        const masked = configured ? (info.masked || "••••") : tr("edit.apiKeyNotConfigured");
        const on = info.enabled !== false;
        return `<div class="edit-api-key-row" data-source="${src}">
            <div class="edit-api-key-head">
                <span class="edit-api-key-label">${label}</span>
                <span class="edit-api-key-masked${configured ? "" : " is-empty"}">${escapeHtml(masked)}</span>
                <button type="button" class="edit-api-key-switch${on ? " is-on" : ""}" role="switch" aria-checked="${on ? "true" : "false"}" title="${on ? tr("edit.apiKeyToggleOn") : tr("edit.apiKeyToggleOff")}" aria-label="${tr("edit.apiKeyTry", { label })}"></button>
            </div>
            <div class="edit-api-key-edit">
                <input type="password" autocomplete="off" spellcheck="false" placeholder="${tr("edit.apiKeyNew")}" aria-label="${tr("edit.apiKeyNewAria", { label })}">
                <button type="button" class="edit-api-key-iconbtn" data-act="save" title="${tr("action.save")}" aria-label="${tr("edit.apiKeySaveAria", { label })}">${ICON_KEY_SAVE}</button>
                <button type="button" class="edit-api-key-iconbtn" data-act="clear" title="${tr("edit.apiKeyClear")}" aria-label="${tr("edit.apiKeyClearAria", { label })}" ${configured ? "" : "disabled"}>${ICON_KEY_CLEAR}</button>
            </div>
        </div>`;
    }).join("");
}

function setEditApiKeysError(msg) {
    const el = $("#edit-api-keys-error");
    if (!el) return;
    if (!msg) {
        el.hidden = true;
        el.classList.add("hidden");
        el.innerHTML = "";
        return;
    }
    el.hidden = false;
    el.classList.remove("hidden");
    el.innerHTML = `<span>${tr("toast.apiKeysLoadFailed", { message: escapeHtml(msg) })}</span><button type="button" class="edit-api-keys-retry" data-act="retry-keys">${tr("action.retry")}</button>`;
}

async function loadEditApiKeysPanel() {
    const body = $("#edit-api-keys-body");
    if (!body) return;
    if (!body.querySelector(".edit-api-key-row")) {
        renderEditApiKeysPanel({});
    }
    try {
        const data = await api("/settings/keys");
        setEditApiKeysError("");
        renderEditApiKeysPanel(data.keys || {});
    } catch (e) {
        setEditApiKeysError(e.message || tr("status.requestFailed"));
        if (!body.querySelector(".edit-api-key-row")) {
            renderEditApiKeysPanel({});
        }
    }
}

function bindEditApiKeysPanel() {
    const root = $("#edit-api-keys");
    if (!root || root.dataset.bound === "1") return;
    root.dataset.bound = "1";
    root.addEventListener("toggle", () => {
        if (root.open) loadEditApiKeysPanel();
    });
    root.addEventListener("click", async (e) => {
        const retry = e.target.closest("[data-act='retry-keys']");
        if (retry && root.contains(retry)) {
            e.preventDefault();
            retry.disabled = true;
            try {
                await loadEditApiKeysPanel();
            } finally {
                retry.disabled = false;
            }
            return;
        }
        const row = e.target.closest(".edit-api-key-row");
        if (!row || !root.contains(row)) return;
        const source = row.dataset.source;
        const sw = e.target.closest(".edit-api-key-switch");
        const btn = e.target.closest("[data-act]");
        if (sw) {
            e.preventDefault();
            const next = !sw.classList.contains("is-on");
            sw.disabled = true;
            try {
                await applyApiKeyUpdate(source, { enabled: next });
                showToast(next ? tr("toast.apiKeyToggleOn") : tr("toast.apiKeyToggleOff"), "success");
            } catch (err) {
                showToast(tr("toast.updateFailed", { message: err.message || err }), "error");
                sw.disabled = false;
            }
            return;
        }
        if (!btn) return;
        e.preventDefault();
        const act = btn.dataset.act;
        const input = row.querySelector("input");
        btn.disabled = true;
        try {
            if (act === "save") {
                const key = (input?.value || "").trim();
                if (!key) {
                    showToast(tr("toast.apiKeyPasteFirst"), "error");
                    return;
                }
                await applyApiKeyUpdate(source, { api_key: key });
                if (input) input.value = "";
                showToast(tr("toast.apiKeySaved"), "success");
            } else if (act === "clear") {
                await applyApiKeyUpdate(source, { api_key: "" });
                if (input) input.value = "";
                showToast(tr("toast.apiKeyCleared"), "success");
            }
        } catch (err) {
            showToast(tr("toast.updateFailed", { message: err.message || err }), "error");
        } finally {
            btn.disabled = false;
        }
    });
}

function bindMetaSourceSeg(segEl, onChange) {
    if (!segEl || segEl.dataset.bound === "1") return;
    segEl.dataset.bound = "1";
    segEl.addEventListener("click", (e) => {
        const btn = e.target.closest(".tmdb-scope-btn");
        if (!btn || !segEl.contains(btn)) return;
        if (btn.classList.contains("is-disabled") || btn.disabled) {
            const hint = btn.title || tr("toast.sourceNoKey");
            showToast(hint, "error");
            return;
        }
        setMetaSourceSeg(segEl, btn.dataset.source || "all");
        if (typeof onChange === "function") onChange(getMetaSourceFromSeg(segEl));
    });
    applyMetaSourceAvailability(segEl);
}

function metaSourceSegHtml(id, activeSource = "all") {
    const source = normalizeMetaSource(activeSource);
    const opts = [
        ["all", tr("edit.scopeAll")],
        ["tmdb", "TMDb"],
        ["imdb", "IMDb"],
        ["tvdb", "TVDB"],
    ];
    return `<div class="tmdb-scope-seg" id="${id}" role="group" aria-label=tr("edit.scopeSearchSource")>
        ${opts.map(([v, label]) =>
            `<button type="button" class="tmdb-scope-btn${v === source ? " is-active" : ""}" data-source="${v}">${label}</button>`
        ).join("")}
    </div>`;
}

function candidateSourceOf(r) {
    return normalizeMetaSource(r?.source || (r?.tmdb_id ? "tmdb" : r?.imdb_id ? "imdb" : r?.tvdb_id ? "tvdb" : "tmdb"));
}

function renderMetaCandidateItem(r) {
    const src = candidateSourceOf(r);
    const mt = normalizeTmdbMediaType(r.media_type);
    const title = r.title_cn || r.title || "";
    const titleEn = r.title_en || r.original_title || "";
    const rating = Number(r.rating || 0);
    const vote = r.vote_count != null ? ` | ${tr("meta.votes", { count: r.vote_count })}` : "";
    const idHint = src === "tmdb"
        ? `TMDb ${r.tmdb_id || ""}`
        : src === "imdb"
            ? (r.imdb_id || "")
            : `TVDB ${r.tvdb_id || ""}`;
    return `
        <div class="match-item"
             data-source="${src}"
             data-tmdb-id="${r.tmdb_id != null ? r.tmdb_id : ""}"
             data-imdb-id="${escapeHtml(r.imdb_id || "")}"
             data-tvdb-id="${r.tvdb_id != null ? r.tvdb_id : ""}"
             data-media-type="${mt}"
             data-title-cn="${escapeHtml(title)}"
             data-title-en="${escapeHtml(titleEn)}"
             data-year="${escapeHtml(String(r.year || ""))}"
             data-poster-url="${escapeHtml(r.poster_url || "")}"
             data-overview="${escapeHtml(r.overview || "")}"
             role="button" tabindex="0">
            ${r.poster_url
                ? `<img class="match-poster" src="${escapeHtml(r.poster_url)}" alt="" loading="lazy">`
                : '<div class="match-poster" style="display:flex;align-items:center;justify-content:center;opacity:.45">—</div>'}
            <div class="match-info">
                <div class="match-title">${escapeHtml(title)}${sourceBadgeHtml(src)}${tmdbTypeBadgeHtml(mt)}</div>
                <div class="match-meta">${escapeHtml(titleEn)} | ${escapeHtml(String(r.year || ""))} | ${escapeHtml(idHint)}${rating ? ` | ⭐ ${rating.toFixed(1)}` : ""}${vote}</div>
                <div class="match-overview">${escapeHtml(r.overview || tr("detail.noSynopsis"))}</div>
            </div>
        </div>`;
}

function debounce(fn, delay) {
    let t;
    return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), delay);
    };
}

// 与 genre_normalize.py GENRE_GROUPS 保持同步：只用于下拉/筛选/展示，不改库内原始 genres
const GENRE_GROUPS = [
    ["剧情", ["剧情", "Drama"]],
    ["喜剧", ["喜剧", "Comedy"]],
    ["动作", ["动作", "Action", "动作冒险", "Action & Adventure", "Action Adventure"]],
    ["冒险", ["冒险", "Adventure", "动作冒险", "Action & Adventure", "Action Adventure"]],
    ["动画", ["动画", "Animation"]],
    ["纪录", ["纪录", "纪录片", "Documentary"]],
    ["音乐", ["音乐", "Music", "Musical", "音乐剧"]],
    ["科幻", ["科幻", "Science Fiction", "Sci-Fi", "Sci Fi", "Sci-Fi & Fantasy", "Science Fiction & Fantasy"]],
    ["奇幻", ["奇幻", "Fantasy", "Sci-Fi & Fantasy", "Science Fiction & Fantasy"]],
    ["恐怖", ["恐怖", "Horror"]],
    ["惊悚", ["惊悚", "Thriller"]],
    ["悬疑", ["悬疑", "Mystery"]],
    ["爱情", ["爱情", "Romance"]],
    ["犯罪", ["犯罪", "Crime"]],
    ["战争", ["战争", "War", "War & Politics", "War and Politics"]],
    ["历史", ["历史", "History"]],
    ["家庭", ["家庭", "Family"]],
    ["西部", ["西部", "Western"]],
    ["新闻", ["新闻", "News"]],
    ["电视电影", ["电视电影", "TV Movie", "TVMovie"]],
    ["真人秀", ["真人秀", "Reality", "Reality-TV", "Reality TV"]],
    ["儿童", ["儿童", "Kids", "Children"]],
];
const GENRE_CANONICAL_ORDER = GENRE_GROUPS.map(([key]) => key);

function normGenre(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[_\-]+/g, " ")
        .replace(/\s+/g, " ");
}

const GENRE_ALIAS_TO_KEYS = (() => {
    const index = {};
    for (const [key, aliases] of GENRE_GROUPS) {
        for (const alias of [key, ...aliases]) {
            const nk = normGenre(alias);
            if (!nk) continue;
            const bucket = index[nk] || (index[nk] = []);
            if (!bucket.includes(key)) bucket.push(key);
        }
    }
    return index;
})();

function canonicalKeysOf(raw) {
    const nk = normGenre(raw);
    if (!nk) return [];
    if (GENRE_ALIAS_TO_KEYS[nk]) return GENRE_ALIAS_TO_KEYS[nk].slice();
    const found = [];
    const padded = ` ${nk} `;
    for (const [aliasN, keys] of Object.entries(GENRE_ALIAS_TO_KEYS)) {
        if (padded.includes(` ${aliasN} `)) {
            for (const key of keys) if (!found.includes(key)) found.push(key);
        }
    }
    return found;
}

function displayGenres(rawList) {
    const extras = [];
    const seen = new Set();
    for (const item of rawList || []) {
        const text = String(item ?? "").trim();
        if (!text) continue;
        const keys = canonicalKeysOf(text);
        if (keys.length) keys.forEach(k => seen.add(k));
        else if (!extras.includes(text)) extras.push(text);
    }
    return GENRE_CANONICAL_ORDER.filter(k => seen.has(k)).concat(extras);
}

function genreDisplayLabel(label) {
    if (window.MyWallI18n?.getContentLang() === "zh") return label;
    const keys = canonicalKeysOf(label);
    const key = keys[0] || label;
    const group = GENRE_GROUPS.find(([canonical]) => canonical === key);
    return group?.[1]?.find(alias => /^[\x00-\x7F]+$/.test(alias)) || label;
}

function orderedGenreLabels(labels) {
    const present = new Set(
        [...(labels || [])].map(x => String(x).trim()).filter(Boolean)
    );
    const known = GENRE_CANONICAL_ORDER.filter(k => present.has(k));
    const rest = [...present].filter(k => !known.includes(k)).sort();
    return known.concat(rest);
}

function discMatchesGenre(disc, filterValue) {
    const needle = String(filterValue || "").trim();
    if (!needle) return true;
    const targetKeys = new Set(canonicalKeysOf(needle));
    const needleN = normGenre(needle);
    const pools = [disc?.genres, disc?.genres_cn];
    for (const rawList of pools) {
        for (const item of rawList || []) {
            const text = String(item ?? "").trim();
            if (!text) continue;
            const keys = canonicalKeysOf(text);
            if (targetKeys.size) {
                if (keys.some(k => targetKeys.has(k))) return true;
            } else if (keys.includes(needle) || normGenre(text) === needleN || text === needle) {
                return true;
            }
        }
    }
    return false;
}

function populateGenreFilter(rawLabels) {
    const genreEl = $("#filter-genre");
    if (!genreEl) return;
    const prev = genreEl.value;
    const collected = [];
    for (const g of rawLabels || state.filters?.genres || []) collected.push(g);
    const mapped = [];
    for (const g of collected) mapped.push(...displayGenres([g]));
    const options = orderedGenreLabels(mapped);
    genreEl.innerHTML = `<option value="">${tr("filter.allGenres")}</option>` +
        options.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(genreDisplayLabel(g))}</option>`).join("");
    const canonicalPrev = (canonicalKeysOf(prev)[0] || prev);
    if (canonicalPrev && [...genreEl.options].some(o => o.value === canonicalPrev)) {
        genreEl.value = canonicalPrev;
    } else if (prev && [...genreEl.options].some(o => o.value === prev)) {
        genreEl.value = prev;
    }
}

function genreLabels(disc) {
    if (Array.isArray(disc?.genres) && disc.genres.length) return displayGenres(disc.genres);
    if (Array.isArray(disc?.genres_cn) && disc.genres_cn.length) return displayGenres(disc.genres_cn);
    return [];
}

function getGenreClass(genres) {
    if (!genres || genres.length === 0) return "genre-default";
    const g = genres[0].toLowerCase();
    if (g.includes("动作") || g.includes("action") || g.includes("冒险")) return "genre-action";
    if (g.includes("剧情") || g.includes("drama")) return "genre-drama";
    if (g.includes("喜剧") || g.includes("comedy")) return "genre-comedy";
    if (g.includes("恐怖") || g.includes("惊悚") || g.includes("horror") || g.includes("thriller")) return "genre-horror";
    if (g.includes("科幻") || g.includes("sci")) return "genre-scifi";
    if (g.includes("动画") || g.includes("animation")) return "genre-animation";
    if (g.includes("纪录") || g.includes("documentary")) return "genre-documentary";
    return "genre-default";
}

// ===== 墙面归一化坐标（object-fit 内容框） =====

function computeObjectFitRect(cw, ch, nw, nh, fit = "contain") {
    if (!cw || !ch || !nw || !nh) {
        return { left: 0, top: 0, width: cw || 0, height: ch || 0 };
    }
    const cAspect = cw / ch;
    const iAspect = nw / nh;
    let width;
    let height;
    if (fit === "cover") {
        if (cAspect > iAspect) {
            width = cw;
            height = cw / iAspect;
        } else {
            height = ch;
            width = ch * iAspect;
        }
    } else {
        if (cAspect > iAspect) {
            height = ch;
            width = ch * iAspect;
        } else {
            width = cw;
            height = cw / iAspect;
        }
    }
    return {
        left: (cw - width) / 2,
        top: (ch - height) / 2,
        width,
        height,
    };
}

function resolveObjectFit(imgEl, fallback = "contain") {
    if (!imgEl) return fallback;
    const dataFit = (imgEl.dataset.fit || "").trim();
    if (dataFit === "cover" || dataFit === "contain") return dataFit;
    try {
        const cs = getComputedStyle(imgEl).objectFit;
        if (cs === "cover" || cs === "contain") return cs;
    } catch (_) { /* ignore */ }
    return fallback;
}

function syncWallCoordLayer(imgEl, layerEl, fit) {
    if (!imgEl || !layerEl) return;
    const parent = imgEl.parentElement;
    if (!parent) return;
    const mode = fit || resolveObjectFit(imgEl);
    const rect = computeObjectFitRect(
        parent.clientWidth,
        parent.clientHeight,
        imgEl.naturalWidth,
        imgEl.naturalHeight,
        mode
    );
    layerEl.style.left = `${rect.left}px`;
    layerEl.style.top = `${rect.top}px`;
    layerEl.style.width = `${rect.width}px`;
    layerEl.style.height = `${rect.height}px`;
}

const _wallCoordSyncCleanups = new WeakMap();

function bindWallCoordSync(imgEl, layerEl, fit) {
    if (!imgEl || !layerEl) return () => {};
    const prev = _wallCoordSyncCleanups.get(imgEl);
    if (prev) prev();

    const mode = fit || resolveObjectFit(imgEl);
    const sync = () => syncWallCoordLayer(imgEl, layerEl, mode);
    const onLoad = () => sync();
    imgEl.addEventListener("load", onLoad);
    let ro = null;
    if (typeof ResizeObserver !== "undefined" && imgEl.parentElement) {
        ro = new ResizeObserver(sync);
        ro.observe(imgEl.parentElement);
    }
    window.addEventListener("resize", sync);
    if (imgEl.complete && imgEl.naturalWidth) sync();
    else requestAnimationFrame(sync);

    const cleanup = () => {
        imgEl.removeEventListener("load", onLoad);
        window.removeEventListener("resize", sync);
        if (ro) ro.disconnect();
    };
    _wallCoordSyncCleanups.set(imgEl, cleanup);
    return sync;
}

function clientToWallPercent(clientX, clientY, coordLayerEl) {
    const layer = coordLayerEl || $("#wall-coord-layer");
    if (!layer) return { x: 0, y: 0 };
    const rect = layer.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    return {
        x: ((clientX - rect.left) / w) * 100,
        y: ((clientY - rect.top) / h) * 100,
    };
}

function switchViewMode(mode) {
    state.viewMode = mode;
    $("#btn-mode-list").classList.toggle("active", mode === "list");
    $("#btn-mode-tree").classList.toggle("active", mode === "tree");
    renderDiscList();
}

// ===== 手机布局（勿只靠 max-width：iPhone Chrome 经 IP:端口常报桌面级 layout viewport） =====
const MOBILE_MAX_WIDTH = 900;
const PANEL_DRAG_STORAGE_KEYS = ["mywall-sidebar-drag-x", "mywall-detail-drag-x"];

function isCoarsePointer() {
    try {
        return window.matchMedia("(pointer: coarse)").matches;
    } catch (_) {
        return false;
    }
}

function isMobileUA() {
    return /iPhone|iPod|Android.+Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || "");
}

function layoutCssWidth() {
    const vv = window.visualViewport;
    const visualW = vv && vv.width ? vv.width : Infinity;
    const inner = window.innerWidth || Infinity;
    const client = document.documentElement?.clientWidth || Infinity;
    const w = Math.min(visualW, inner, client);
    return Number.isFinite(w) ? w : (window.innerWidth || 980);
}

function isNarrowBrowse() {
    // 视口 < 900 或粗指针（手机）或手机 UA —— 任一即启用，避免大虚拟桌面漏检
    return layoutCssWidth() < MOBILE_MAX_WIDTH || isCoarsePointer() || isMobileUA();
}

function pickMobileLayoutWidth() {
    const vw = layoutCssWidth();
    const screenMin = Math.min(
        (window.screen && screen.width) || 9999,
        (window.screen && screen.height) || 9999
    );
    let w = vw;
    if (screenMin >= 240 && screenMin < MOBILE_MAX_WIDTH) w = Math.min(w, screenMin);
    if (w >= MOBILE_MAX_WIDTH) {
        w = (screenMin >= 240 && screenMin < MOBILE_MAX_WIDTH) ? screenMin : Math.min(vw, 430);
    }
    return Math.max(320, Math.round(w));
}

function forceDeviceViewportMeta() {
    if (!isNarrowBrowse()) return;
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    const target = pickMobileLayoutWidth();
    meta.setAttribute("content", `width=${target}, initial-scale=1, viewport-fit=cover`);
}

function clearMobilePanelDrag() {
    try {
        PANEL_DRAG_STORAGE_KEYS.forEach((k) => sessionStorage.removeItem(k));
    } catch (_) { /* ignore */ }
    ["#sidebar", "#detail-panel"].forEach((sel) => {
        const el = document.querySelector(sel);
        if (!el) return;
        el.style.setProperty("--drag-x", "0px");
        el.classList.remove("is-dragging");
    });
    document.body?.classList.remove("panel-is-dragging");
}

function syncNarrowLayout() {
    const root = document.documentElement;
    const narrow = isNarrowBrowse();
    root.classList.toggle("is-narrow", narrow);
    document.body?.classList.toggle("is-narrow", narrow);
    if (!narrow) {
        root.classList.remove("wall-collapsed");
        root.style.removeProperty("--vvw");
        root.style.removeProperty("--vvh");
        root.style.removeProperty("--vv-left");
        root.style.removeProperty("--vv-top");
        applyEditMode(readStoredEditUnlocked());
        syncWallSheetHandle(false);
        syncGenreCloudEntry();
        return;
    }
    forceDeviceViewportMeta();
    clearMobilePanelDrag();
    const vv = window.visualViewport;
    const w = pickMobileLayoutWidth();
    const visualH = vv && vv.height ? vv.height : window.innerHeight;
    root.style.setProperty("--vvw", `${w}px`);
    root.style.setProperty("--vvh", `${Math.max(1, Math.round(visualH))}px`);
    root.style.setProperty("--vv-left", "0px");
    root.style.setProperty("--vv-top", "0px");
    applyWallCollapsed(readStoredWallCollapsed());
    applyEditMode(false);
    syncGenreCloudEntry();
}

function initNarrowLayout() {
    forceDeviceViewportMeta();
    syncNarrowLayout();
    requestAnimationFrame(() => {
        forceDeviceViewportMeta();
        syncNarrowLayout();
    });
    const onResize = () => syncNarrowLayout();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    try {
        window.matchMedia("(pointer: coarse)").addEventListener("change", onResize);
        window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH - 1}px)`).addEventListener("change", onResize);
    } catch (_) { /* ignore */ }
}

// ===== 手机栏目上沿：上滑收墙 / 下滑展墙 =====
const WALL_COLLAPSED_KEY = "mywall-wall-collapsed";
const WALL_SHEET_SWIPE_THRESHOLD = 28;

function readStoredWallCollapsed() {
    try {
        return sessionStorage.getItem(WALL_COLLAPSED_KEY) === "1";
    } catch (_) {
        return false;
    }
}

function persistWallCollapsed(collapsed) {
    try {
        sessionStorage.setItem(WALL_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch (_) { /* ignore */ }
}

function syncWallSheetHandle(collapsed) {
    const handle = $("#wall-sheet-handle");
    if (!handle) return;
    const narrow = isNarrowBrowse();
    const on = !!collapsed;
    handle.tabIndex = narrow ? 0 : -1;
    handle.setAttribute("aria-hidden", narrow ? "false" : "true");
    handle.setAttribute("aria-expanded", on ? "false" : "true");
    const label = on ? tr("wall.sheetShow") : tr("wall.sheetHide");
    handle.setAttribute("title", label);
    handle.setAttribute("aria-label", tr("wall.sheetAria", { action: label }));
}

function applyWallCollapsed(collapsed) {
    const root = document.documentElement;
    if (!isNarrowBrowse()) {
        root.classList.remove("wall-collapsed");
        syncWallSheetHandle(false);
        return;
    }
    const next = !!collapsed;
    root.classList.toggle("wall-collapsed", next);
    persistWallCollapsed(next);
    syncWallSheetHandle(next);
}

function initWallSheetHandle() {
    const handle = $("#wall-sheet-handle");
    if (!handle || handle.dataset.bound === "1") return;
    handle.dataset.bound = "1";

    let tracking = false;
    let startY = 0;
    let startX = 0;
    let pointerId = null;
    let axis = "";

    const onMove = (e) => {
        if (!tracking || e.pointerId !== pointerId) return;
        if (!isNarrowBrowse()) return;
        const dy = e.clientY - startY;
        const dx = e.clientX - startX;
        if (!axis) {
            if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
            axis = Math.abs(dy) >= Math.abs(dx) ? "y" : "x";
        }
        if (axis !== "y") return;
        e.preventDefault();
        if (dy <= -WALL_SHEET_SWIPE_THRESHOLD) {
            applyWallCollapsed(true);
            endGesture(e);
        } else if (dy >= WALL_SHEET_SWIPE_THRESHOLD) {
            applyWallCollapsed(false);
            endGesture(e);
        }
    };

    const endGesture = (e) => {
        if (!tracking || (e && e.pointerId !== pointerId)) return;
        tracking = false;
        try { handle.releasePointerCapture?.(pointerId); } catch (_) { /* ignore */ }
        pointerId = null;
        axis = "";
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", endGesture);
        handle.removeEventListener("pointercancel", endGesture);
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", endGesture);
        document.removeEventListener("pointercancel", endGesture);
    };

    handle.addEventListener("pointerdown", (e) => {
        if (!isNarrowBrowse()) return;
        if (e.button != null && e.button !== 0) return;
        tracking = true;
        axis = "";
        pointerId = e.pointerId;
        startY = e.clientY;
        startX = e.clientX;
        try { handle.setPointerCapture?.(pointerId); } catch (_) { /* ignore */ }
        handle.addEventListener("pointermove", onMove);
        handle.addEventListener("pointerup", endGesture);
        handle.addEventListener("pointercancel", endGesture);
        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", endGesture);
        document.addEventListener("pointercancel", endGesture);
        e.preventDefault();
    });

    handle.addEventListener("keydown", (e) => {
        if (!isNarrowBrowse()) return;
        if (e.key === "ArrowUp") {
            e.preventDefault();
            applyWallCollapsed(true);
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            applyWallCollapsed(false);
        }
    });
}

// ===== 初始化 =====
async function init() {
    if (window.MyWallI18n) {
        try {
            await window.MyWallI18n.init();
            window.MyWallI18n.applyI18n();
        } catch (error) {
            console.error("[myWall] locale load failed", error);
        }
    }
    initLanguageSelector();
    initNarrowLayout();
    initEditMode();
    initWallSheetHandle();
    // 拖拽不依赖 API，尽早挂上，避免加载失败时整站交互未绑定
    initPanelDrags();
    initWallBrightness();
    try {
        await Promise.all([loadWallImage(), loadDiscs(), loadFilters(), loadStats(), loadImageUrlMap()]);
    } catch (e) {
        console.error("[myWall] init data load failed", e);
        showToast(tr("status.partialLoadError"), "error");
    }
    bindEvents();
    bindWallCoordSync($("#wall-image"), $("#wall-coord-layer"), "cover");
}

function initLanguageSelector() {
    const control = $("#ui-language-control");
    const trigger = $("#ui-language-trigger");
    const options = Array.from(document.querySelectorAll(".language-option[data-lang]"));
    if (!control || !trigger || !options.length || !window.MyWallI18n) return;

    const languages = {
        en: { flag: "🇺🇸", label: "English" },
        zh: { flag: "🇨🇳", label: "简体中文" },
        ja: { flag: "🇯🇵", label: "日本語" },
        ko: { flag: "🇰🇷", label: "한국어" },
    };

    const setOpen = (open, suppressHover = false) => {
        control.classList.toggle("is-open", open);
        control.classList.toggle("is-hover-suppressed", !open && suppressHover);
        trigger.setAttribute("aria-expanded", String(open));
    };

    const syncLanguageControl = (lang) => {
        const language = languages[lang] || languages.en;
        const flag = trigger.querySelector(".language-flag");
        if (flag) flag.textContent = language.flag;
        trigger.setAttribute("aria-label", language.label);
        trigger.setAttribute("title", language.label);
        options.forEach(option => {
            option.setAttribute("aria-selected", String(option.dataset.lang === lang));
        });
    };

    syncLanguageControl(window.MyWallI18n.getUiLang());
    trigger.addEventListener("click", event => {
        event.stopPropagation();
        control.classList.remove("is-hover-suppressed");
        setOpen(!control.classList.contains("is-open"));
    });
    options.forEach(option => {
        option.addEventListener("click", async event => {
            event.stopPropagation();
            const lang = option.dataset.lang;
            if (!languages[lang]) return;
            control.setAttribute("aria-busy", "true");
            try {
                await window.MyWallI18n.setUiLang(lang);
                setOpen(false, true);
                trigger.focus({ preventScroll: true });
            } catch (error) {
                console.error("[myWall] language switch failed", error);
                showToast(error.message, "error");
            } finally {
                control.removeAttribute("aria-busy");
            }
        });
    });
    control.addEventListener("mouseleave", () => {
        if (!control.contains(document.activeElement)) {
            control.classList.remove("is-hover-suppressed");
            setOpen(false);
        }
    });
    control.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        setOpen(false, true);
        trigger.focus({ preventScroll: true });
    });
    document.addEventListener("click", event => {
        if (!control.contains(event.target)) setOpen(false);
    });
    window.addEventListener("mywall:ui-language-changed", (event) => {
        syncLanguageControl(event.detail.lang);
        syncEditModeToggle(isEditUnlocked());
        updateDiscCount(state.discs.length);
        populateGenreFilter(state.filters?.genres);
        renderDiscList();
        if (state.selectedDiscId) showDiscDetail(state.selectedDiscId);
        refreshDynamicUi();
        syncManualLinks();
    });
    syncManualLinks();
}

function updateDiscCount(count) {
    const label = $("#stat-label");
    if (label) label.textContent = tr("stats.discs", { count });
}

async function loadImageUrlMap() {
    try {
        const data = await api("/images");
        state.imageUrlMap = {};
        state.imageMetaMap = {};
        const images = data.images || [];
        images.forEach(img => {
            if (!img.filename) return;
            state.imageUrlMap[img.filename] = img.url || "";
            state.imageMetaMap[img.filename] = img;
        });
        state.closeupImages = images.filter(img => (img.image_type || "closeup") !== "panoramic");
    } catch (e) {
        state.imageUrlMap = {};
        state.imageMetaMap = {};
        state.closeupImages = [];
    }
}

function sourceImageThumbUrl(filename) {
    if (!filename || filename === tr("tree.uncategorized")) return "";
    if (state.imageUrlMap[filename]) return state.imageUrlMap[filename];
    return `/uploads/${filename}`;
}

async function loadWallImage() {
    const data = await api("/wall-image");
    if (data.url) {
        state.wallImageUrl = data.url;
        $("#wall-image").src = data.url;
    }
}

async function loadDiscs(keyword = "", genre = "", year = "", preference = "") {
    const params = new URLSearchParams();
    if (keyword) params.set("keyword", keyword);
    if (year) params.set("year", year);
    if (preference !== "" && preference != null) params.set("preference", preference);
    // 类型：同时打后端 ?genre=（新进程别名 OR）+ 本地别名 OR。
    // 若旧进程按 JSON LIKE 漏了英文别名，再拉一页未带 genre 的结果补齐。
    if (genre) params.set("genre", genre);
    const data = await api(`/discs?${params.toString()}`);
    let discs = data.discs || [];
    if (genre) {
        discs = discs.filter(d => discMatchesGenre(d, genre));
        const needAliasBackfill = canonicalKeysOf(genre).length > 0;
        if (needAliasBackfill) {
            const rawParams = new URLSearchParams();
            if (keyword) rawParams.set("keyword", keyword);
            if (year) rawParams.set("year", year);
            if (preference !== "" && preference != null) rawParams.set("preference", preference);
            const rawData = await api(`/discs?${rawParams.toString()}`);
            const seen = new Set(discs.map(d => d.id));
            for (const d of rawData.discs || []) {
                if (!seen.has(d.id) && discMatchesGenre(d, genre)) {
                    discs.push(d);
                    seen.add(d.id);
                }
            }
        }
    }
    state.discs = discs;
    if (state.viewMode === "tree") await loadImageUrlMap();
    populateGenreFilter(state.filters?.genres);
    if (state.filters) {
        state.filters.genre_counts = resolveGenreCounts(state.filters);
    }
    renderDiscMarkers();
    renderDiscList();
    $("#stat-count")?.replaceChildren(document.createTextNode(String(state.discs.length)));
    updateDiscCount(state.discs.length);
}

async function loadFilters() {
    const data = await api("/filters");
    const genre_counts = resolveGenreCounts(data);
    state.filters = {
        ...data,
        genres: Array.isArray(data.genres) ? data.genres : genre_counts.map(x => x.label),
        years: data.years || [],
        genre_counts,
    };
    const yearEl = $("#filter-year");
    const prevYear = yearEl ? yearEl.value : "";
    populateGenreFilter(data.genres);
    if (yearEl) {
        yearEl.innerHTML = `<option value="">${tr("filter.allYears")}</option>` +
            (data.years || []).map(y => `<option value="${escapeHtml(y)}">${escapeHtml(y)}</option>`).join("");
        if (prevYear && [...yearEl.options].some(o => o.value === prevYear)) {
            yearEl.value = prevYear;
        }
    }
}

async function loadStats() {
    const data = await api("/stats");
    $("#stat-count")?.replaceChildren(document.createTextNode(String(data.total_discs)));
    updateDiscCount(data.total_discs);
}

// ===== 碟片标记 / 特写 AR =====
function renderDiscMarkers() {
    const container = $("#disc-markers");
    if (!container) return;
    container.innerHTML = "";
    // 默认不展示多碟气泡；仅在「位置查找」时高亮当前目标碟
    if (!state.highlightedDiscId) return;
    const disc = state.discs.find(d => d.id === state.highlightedDiscId);
    if (!disc) return;
    if (disc.pos_x === 0 && disc.pos_y === 0) return;

    const m = document.createElement("div");
    const flagged = !!disc.flagged;
    m.className = `disc-marker ${getGenreClass(genreLabels(disc))}${flagged ? " flagged" : ""} highlighted`;
    m.style.left = `${disc.pos_x}%`;
    m.style.top = `${disc.pos_y}%`;
    m.dataset.discId = disc.id;
    m.title = flagged ? tr("toast.flaggedTitle", { title: disc.title_cn }) : disc.title_cn;
    const tt = document.createElement("div");
    tt.className = "disc-marker-tooltip";
    tt.textContent = flagged ? `⚠ ${disc.title_cn}` : disc.title_cn;
    m.appendChild(tt);
    m.addEventListener("click", (e) => { e.stopPropagation(); showDiscDetail(disc.id); });
    container.appendChild(m);
}

function renderPhotoArOverlay(sourceFilename) {
    const container = $("#photo-ar-overlays");
    if (!container) return;
    container.innerHTML = "";
    state.activePhotoArFilename = sourceFilename || null;
    if (!sourceFilename) return;

    const meta = state.imageMetaMap[sourceFilename];
    if (!meta) return;
    const wr = Number(meta.width_ratio) || 0;
    const hr = Number(meta.height_ratio) || 0;
    if (wr <= 0 || hr <= 0) return;

    const el = document.createElement("div");
    el.className = "photo-ar-block";
    el.style.left = `${Number(meta.pos_x) || 0}%`;
    el.style.top = `${Number(meta.pos_y) || 0}%`;
    el.style.width = `${wr}%`;
    el.style.height = `${hr}%`;
    el.title = meta.display_name || meta.filename || sourceFilename;
    container.appendChild(el);
}

function clearPhotoArOverlay() {
    state.activePhotoArFilename = null;
    const container = $("#photo-ar-overlays");
    if (container) container.innerHTML = "";
}

function renderDiscList() {
    if (state.viewMode === "tree") {
        renderDiscTree();
        return;
    }
    const list = $("#disc-list");
    if (state.discs.length === 0) {
        list.innerHTML = `<div class="empty-state">${tr("status.empty")}</div>`;
        return;
    }
    list.innerHTML = state.discs.map(disc => renderDiscCardHtml(disc)).join("");
}

/** 线描 SVG（currentColor），卡片操作 / 侧栏 / modal 共用；由 CSS 控制尺寸与颜色 */
const DISC_CARD_ICONS = {
    pin: '<svg class="disc-card-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z"/><circle fill="none" stroke="currentColor" stroke-width="1.75" cx="12" cy="10" r="2.25"/></svg>',
    pencil: '<svg class="disc-card-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M14.5 5.5l4 4M4 20l.7-3.8L16.2 4.7a2 2 0 0 1 2.8 0l.3.3a2 2 0 0 1 0 2.8L7.8 19.3 4 20z"/></svg>',
    flag: '<svg class="disc-card-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M5 21V4m0 0h10l-2.2 3.5L15 11H5"/></svg>',
    trash: '<svg class="disc-card-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0l.7 12a1 1 0 0 0 1 .9h6.6a1 1 0 0 0 1-.9L17 7M10 11v6M14 11v6"/></svg>',
    heart: '<svg class="disc-card-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M12 20.5S4.5 15.8 3 10.8C1.8 7.2 3.6 4.5 6.6 4.5c1.7 0 3.1 1 5.4 3.2 2.3-2.2 3.7-3.2 5.4-3.2 3 0 4.8 2.7 3.6 6.3-1.5 5-9 9.7-9 9.7z"/></svg>',
    heartFilled: '<svg class="disc-card-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M12 20.5S4.5 15.8 3 10.8C1.8 7.2 3.6 4.5 6.6 4.5c1.7 0 3.1 1 5.4 3.2 2.3-2.2 3.7-3.2 5.4-3.2 3 0 4.8 2.7 3.6 6.3-1.5 5-9 9.7-9 9.7z"/></svg>',
    camera: '<svg class="disc-card-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M4 8h3.2l1.6-2h6.4l1.6 2H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle fill="none" stroke="currentColor" stroke-width="1.75" cx="12" cy="13" r="3.25"/></svg>',
    image: '<svg class="disc-card-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M4 5h16v14H4V5z"/><circle fill="none" stroke="currentColor" stroke-width="1.75" cx="9" cy="10" r="1.75"/><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.5-4.5L12 15l3-3.5L20 16"/></svg>',
    list: '<svg class="disc-card-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M5 7h14M5 12h14M5 17h14"/></svg>',
    folder: '<svg class="disc-card-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M3 7h6l2 2h10v10H3V7z"/></svg>',
    search: '<svg class="disc-card-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle fill="none" stroke="currentColor" stroke-width="1.75" cx="11" cy="11" r="6.25"/><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M16.5 16.5L21 21"/></svg>',
    save: '<svg class="disc-card-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M5 3h11l4 4v14H5V3z"/><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M8 3v6h8V3M8 21v-7h8v7"/></svg>',
    refresh: '<svg class="disc-card-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 1 1-2.6-6.35M21 3v6h-6"/></svg>',
    crop: '<svg class="disc-card-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M6 3v3H3M18 3v3h3M6 21v-3H3M18 21v-3h3M8 8h8v8H8z"/></svg>',
    check: '<svg class="disc-card-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M5 12.5l4.5 4.5L19 7"/></svg>',
    plus: '<svg class="disc-card-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg class="disc-card-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M5 12h14"/></svg>',
    eye: '<svg class="disc-card-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle fill="none" stroke="currentColor" stroke-width="1.75" cx="12" cy="12" r="2.75"/></svg>',
};

function setBtnLabel(btn, label) {
    if (!btn) return;
    const span = btn.querySelector(".btn-label");
    if (span) {
        span.textContent = label;
        return;
    }
    btn.textContent = label;
}

function getBtnLabel(btn) {
    if (!btn) return "";
    const span = btn.querySelector(".btn-label");
    return span ? span.textContent : (btn.textContent || "").trim();
}

function setIconTitle(el, iconKey, text) {
    if (!el) return;
    const icon = DISC_CARD_ICONS[iconKey] || "";
    el.innerHTML = `${icon}<span class="modal-title-text">${escapeHtml(String(text || ""))}</span>`;
}

function preferenceLabel(level) {
    return tr({
        0: "preference.none",
        1: "preference.green",
        2: "preference.blue",
        3: "preference.orange",
    }[level] || "preference.none");
}

function normalizePreference(value) {
    const n = Number(value);
    return (n === 1 || n === 2 || n === 3) ? n : 0;
}

function renderPreferenceControl(disc) {
    const pref = normalizePreference(disc.preference);
    const icon = DISC_CARD_ICONS.heartFilled;
    const title = preferenceLabel(pref);
    const swatches = [1, 2, 3].map(level => {
        const selected = pref === level ? " is-selected" : "";
        const label = preferenceLabel(level);
        return `<button type="button" class="disc-pref-swatch pref-${level}${selected}" data-pref="${level}" title="${label}" aria-label="${label}" onclick="event.stopPropagation();setDiscPreference(${disc.id}, ${level})">${DISC_CARD_ICONS.heartFilled}</button>`;
    }).join("");
    const clearLabel = tr("preference.clear");
    return `<div class="disc-pref" onclick="event.stopPropagation()"><button type="button" class="disc-pref-trigger pref-${pref}" title="${title}" aria-label="${title}" aria-haspopup="true" aria-expanded="false">${icon}</button><div class="disc-pref-menu" role="menu" aria-label="${tr("preference.choose")}">${swatches}<button type="button" class="disc-pref-swatch pref-0${pref === 0 ? " is-selected" : ""}" data-pref="0" title="${clearLabel}" aria-label="${clearLabel}" onclick="event.stopPropagation();setDiscPreference(${disc.id}, 0)">${DISC_CARD_ICONS.heart}</button></div></div>`;
}

/** 卡片/详情：主英文，副中文译名；无英文回退中文；相同或无中文不重复。 */
function discDisplayTitles(disc) {
    const cn = String(disc?.title_cn || "").trim();
    const en = String(disc?.title_en || "").trim();
    const primary = en || cn;
    const same = !!(cn && primary && cn.toLowerCase() === primary.toLowerCase());
    const secondary = window.MyWallI18n?.getContentLang() === "zh" && cn && !same ? cn : "";
    return { primary, secondary };
}

function renderDiscCardHtml(disc) {
    const poster = disc.poster_url
        ? `<img class="disc-card-poster" src="${disc.poster_url}" alt="" loading="lazy" onerror="this.style.display='none'">`
        : '<div class="disc-card-poster placeholder">🎬</div>';
    const rating = disc.rating ? `<span class="disc-card-rating">⭐ ${disc.rating.toFixed(1)}</span>` : "";
    const active = disc.id === state.selectedDiscId ? "active" : "";
    const flagged = !!disc.flagged;
    const flagBtnTitle = flagged ? tr("card.unflag") : tr("card.flag");
    const flagBadge = flagged
        ? `<span class="disc-flag-badge" title="${tr("card.flagged")}">${tr("card.flagged")}</span>`
        : "";
    // 针图标表示「原照片碟脊 bbox」是否已标定（与墙面 pos 无关）
    const spineLocated = hasSpineBbox(disc);
    const pinClass = spineLocated ? "disc-card-btn-pin is-located" : "disc-card-btn-pin is-unlocated";
    const pinTitle = spineLocated ? tr("card.spineLocated") : tr("card.spineMissing");
    const { primary, secondary } = discDisplayTitles(disc);
    return `
        <div class="disc-card ${active}${flagged ? " flagged" : ""}" data-disc-id="${disc.id}" onclick="showDiscDetail(${disc.id})">
            <div class="disc-card-main">
                <div class="disc-card-poster-slot">${poster}</div>
                <div class="disc-card-info">
                    <div class="disc-card-title">${escapeHtml(primary)}${flagBadge}</div>
                    <div class="disc-card-subtitle">${secondary ? escapeHtml(secondary) : ""}</div>
                    <div class="disc-card-meta"><span>${disc.year || '?'}</span>${rating}${renderPreferenceControl(disc)}</div>
                </div>
            </div>
            <div class="disc-card-actions">
                <button type="button" class="disc-card-btn ${pinClass}" onclick="event.stopPropagation();findDisc(${disc.id})" title="${pinTitle}" aria-label="${pinTitle}">${DISC_CARD_ICONS.pin}</button>
                <button type="button" class="disc-card-btn" onclick="event.stopPropagation();editDisc(${disc.id})" title="${tr("action.edit")}" aria-label="${tr("action.edit")}">${DISC_CARD_ICONS.pencil}</button>
                <button type="button" class="disc-card-btn disc-card-btn-flag ${flagged ? "is-flagged" : ""}" onclick="event.stopPropagation();toggleDiscFlag(${disc.id})" title="${flagBtnTitle}" aria-label="${flagBtnTitle}">${DISC_CARD_ICONS.flag}</button>
                <button type="button" class="disc-card-btn disc-card-btn-danger" onclick="event.stopPropagation();deleteDiscWithConfirm(${disc.id})" title="${tr("action.delete")}" aria-label="${tr("action.delete")}">${DISC_CARD_ICONS.trash}</button>
            </div>
        </div>`;
}

function renderDiscTree() {
    const list = $("#disc-list");
    if (state.discs.length === 0) {
        list.innerHTML = `<div class="empty-state">${tr("status.empty")}</div>`;
        return;
    }

    // 按 source_image 分组
    const groups = {};
    state.discs.forEach(disc => {
        const source = disc.source_image || tr("tree.uncategorized");
        if (!groups[source]) groups[source] = [];
        groups[source].push(disc);
    });

    // 按分组名称排序：未归类放最后
    const sortedKeys = Object.keys(groups).sort((a, b) => {
        if (a === tr("tree.uncategorized")) return 1;
        if (b === tr("tree.uncategorized")) return -1;
        return a.localeCompare(b, uiLocaleTag());
    });

    const groupIdPrefix = "tree-group-";

    list.innerHTML = sortedKeys.map(key => {
        const groupDiscs = groups[key];
        const count = groupDiscs.length;
        const isUncategorized = key === tr("tree.uncategorized");
        const safeKey = key.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_");
        const groupId = groupIdPrefix + safeKey;

        const labelText = isUncategorized
            ? tr("tree.uncategorized")
            : (key.length > 28 ? `${key.slice(0, 12)}…${key.slice(-10)}` : key);

        const thumbUrl = sourceImageThumbUrl(key);
        const encodedKey = encodeURIComponent(key);
        const iconHtml = isUncategorized
            ? `<span class="tree-group-icon">📦</span>`
            : `<img class="tree-group-thumb" src="${escapeHtml(thumbUrl)}" alt="" loading="lazy"
                    title="${tr("tree.adjustPlacement")}"
                    onclick="event.stopPropagation();openSourcePlacementEditor(decodeURIComponent('${encodedKey}'))"
                    onerror="this.onerror=null;this.src='/photos/${escapeHtml(key)}';this.onerror=function(){this.style.display='none';var n=this.nextElementSibling;if(n)n.style.display='inline';};">
               <span class="tree-group-icon" style="display:none">📂</span>`;

        const discsHtml = groupDiscs.map(d => renderDiscCardHtml(d)).join("");

        return `
            <div class="tree-group" id="${groupId}">
                <div class="tree-group-header" onclick="toggleTreeGroup('${groupId}')">
                    <span class="tree-group-arrow">▼</span>
                    ${iconHtml}
                    <span class="tree-group-label" title="${escapeHtml(key)}">${escapeHtml(labelText)}</span>
                    <span class="tree-group-count">${count}</span>
                </div>
                <div class="tree-group-body">
                    ${discsHtml}
                </div>
            </div>`;
    }).join("");
}

function toggleTreeGroup(groupId) {
    const el = document.getElementById(groupId);
    if (!el) return;
    el.classList.toggle("tree-group-collapsed");
}

// ===== 碟片详情 =====
async function showDiscDetail(discId) {
    try {
        const disc = await api(`/discs/${discId}`);
        state.selectedDiscId = discId;
        const personLabel = (p) => {
            const cn = (p.name || "").trim();
            const en = (p.name_en || "").trim();
            return escapeHtml(en || cn || "");
        };
        const dirHtml = (disc.directors || []).map(d => `
            <div class="detail-person">
                ${d.profile_url ? `<img class="detail-person-avatar" src="${d.profile_url}" alt="" loading="lazy">` : ""}
                <div><div class="detail-person-name">${personLabel(d)}</div><div class="detail-person-role">${tr("detail.director")}</div></div>
            </div>`).join("") || `<span style="color:var(--text-muted)">${tr("detail.none")}</span>`;
        const castHtml = (disc.cast || []).slice(0, 8).map(c => `
            <div class="detail-person">
                ${c.profile_url ? `<img class="detail-person-avatar" src="${c.profile_url}" alt="" loading="lazy">` : ""}
                <div><div class="detail-person-name">${personLabel(c)}</div><div class="detail-person-role">${c.character ? escapeHtml(c.character) : tr("detail.actor")}</div></div>
            </div>`).join("") || `<span style="color:var(--text-muted)">${tr("detail.none")}</span>`;
        const genreHtml = genreLabels(disc).map(g => `<span class="detail-genre">${escapeHtml(genreDisplayLabel(g))}</span>`).join("");

        // AR 叠加层：在原照片中高亮碟片位置
        let arSectionHtml = "";
        const hasSourceImage = disc.source_image_url && disc.source_image_url.length > 0;
        if (hasSourceImage) {
            const ox = (typeof disc.photo_offset_x === 'number' ? disc.photo_offset_x : 0) * 100;
            const oy = (typeof disc.photo_offset_y === 'number' ? disc.photo_offset_y : 0) * 100;
            const bw = (typeof disc.bbox_w === 'number' && disc.bbox_w > 0 ? disc.bbox_w : 0.1) * 100;
            const bh = (typeof disc.bbox_h === 'number' && disc.bbox_h > 0 ? disc.bbox_h : 0.08) * 100;
            const hasPosition = ox > 0.01 || oy > 0.01;

            state._arData = {
                sourceImageUrl: disc.source_image_url,
                offsetX: ox.toFixed(1),
                offsetY: oy.toFixed(1),
                bboxW: bw.toFixed(1),
                bboxH: bh.toFixed(1),
                hasPosition: hasPosition,
            };

            const highlightStyle = hasPosition
                ? `left: ${state._arData.offsetX}%; top: ${state._arData.offsetY}%; width: ${state._arData.bboxW}%; height: ${state._arData.bboxH}%;`
                : "display: none;";

            arSectionHtml = `
            <div class="detail-section">
                <h3>${DISC_CARD_ICONS.pin}<span>${tr("detail.sourcePosition")}</span></h3>
                <div class="ar-container" onclick="openArZoom()">
                    <img class="ar-source-image" src="${disc.source_image_url}" alt="${tr("detail.sourcePhotoAlt")}">
                    <div class="ar-highlight-rect" style="${highlightStyle}"></div>
                </div>
                <div class="ar-actions">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation();openDiscBboxEditor(${disc.id})">${tr("action.reselect")}</button>
                </div>
                ${hasPosition
                    ? `<div class="ar-hint">${tr("detail.sourcePositionHint")}</div>`
                    : `<div class="ar-hint" style="color:var(--gold)">⚠ ${tr("detail.sourcePositionMissing")}</div>`}
            </div>`;
        } else {
            state._arData = null;
        }

        const titles = discDisplayTitles(disc);
        $("#detail-content").innerHTML = `
            ${disc.backdrop_url ? `<img class="detail-backdrop" src="${disc.backdrop_url}" alt="" loading="lazy">` : ""}
            ${disc.poster_url ? `<img class="detail-poster" src="${disc.poster_url}" alt="" loading="lazy">` : ""}
            <div class="detail-title-cn">${escapeHtml(titles.primary)}</div>
            ${titles.secondary ? `<div class="detail-title-en">${escapeHtml(titles.secondary)}</div>` : ""}
            <div class="detail-meta">
                ${disc.year ? `<span class="detail-meta-item">${disc.year}</span>` : ""}
                ${disc.runtime ? `<span class="detail-meta-item">${tr("detail.runtimeMinutes", { minutes: disc.runtime })}</span>` : ""}
                ${disc.rating ? `<span class="detail-rating">${disc.rating.toFixed(1)}<small>/10</small></span>` : ""}
            </div>
            ${genreHtml ? `<div class="detail-genres">${genreHtml}</div>` : ""}
            <div class="detail-section"><h3>${tr("detail.synopsis")}</h3><p class="detail-synopsis">${escapeHtml(disc.synopsis_en || disc.synopsis_cn || tr("detail.noSynopsis"))}</p></div>
            ${arSectionHtml}
            <div class="detail-section"><h3>${tr("detail.director")}</h3><div class="detail-people">${dirHtml}</div></div>
            <div class="detail-section"><h3>${tr("detail.cast")}</h3><div class="detail-people">${castHtml}</div></div>
            <div class="detail-actions">
                <button type="button" class="btn btn-primary" onclick="findDisc(${disc.id})">${DISC_CARD_ICONS.pin}<span>${tr("action.locate")}</span></button>
                <button type="button" class="btn btn-secondary" onclick="editDisc(${disc.id})">${DISC_CARD_ICONS.pencil}<span>${tr("action.edit")}</span></button>
            </div>`;

        $("#detail-panel").classList.remove("hidden");
        // 打开后再校正边界（init 时面板可能 display:none，宽度为 0）
        const detail = $("#detail-panel");
        if (detail) {
            const x = getPanelDragOffset(detail);
            const { min, max } = panelDragBounds(detail, "right");
            setPanelDragOffset(detail, clamp(x, min, max), { animate: false });
        }
        renderDiscList();
        if (disc.source_image) renderPhotoArOverlay(disc.source_image);
        else clearPhotoArOverlay();
    } catch (e) {
        showToast(tr("status.detailLoadError", { message: e.message }), "error");
    }
}

function closeDetail() {
    $("#detail-panel").classList.add("hidden");
    closeArZoom();
    state.selectedDiscId = null;
    state._arData = null;
    clearPhotoArOverlay();
    renderDiscList();
}

// ===== 使用手册 =====

function manualSrc() {
    return window.MyWallI18n?.getUiLang() === "zh"
        ? "/static/docs/manual.html?v=3.16f"
        : "/static/docs/manual.en.html?v=5.0c";
}

function syncManualLinks() {
    const src = manualSrc();
    const link = $("#manual-new-tab");
    const iframe = $("#manual-iframe");
    if (link) link.href = src;
    if (iframe && iframe.getAttribute("src") !== "about:blank") iframe.src = src;
}

function openManualModal() {
    const modal = $("#manual-modal");
    const iframe = $("#manual-iframe");
    if (!modal || !iframe) return;
    if (!iframe.getAttribute("src") || iframe.getAttribute("src") === "about:blank") {
        iframe.src = manualSrc();
    }
    modal.classList.remove("hidden");
}

function closeManualModal() {
    const modal = $("#manual-modal");
    if (modal) modal.classList.add("hidden");
}

// ===== AR 放大查看 =====

function openArZoom() {
    if (!state._arData) return;
    const d = state._arData;
    $("#ar-zoom-image").src = d.sourceImageUrl;
    $("#ar-zoom-highlight").style.cssText = `
        left: ${d.offsetX}%;
        top: ${d.offsetY}%;
        width: ${d.bboxW}%;
        height: ${d.bboxH}%;
    `;
    $("#ar-zoom-overlay").classList.add("active");
}

function closeArZoom() {
    $("#ar-zoom-overlay").classList.remove("active");
}

function findDisc(discId) {
    const disc = state.discs.find(d => d.id === discId);
    if (!disc) return;
    if (disc.pos_x === 0 && disc.pos_y === 0) {
        showToast(tr("toast.positionMissing"), "error");
        return;
    }
    state.highlightedDiscId = discId;
    renderDiscMarkers();
    // 查找时同步呈现所属特写覆盖区（半透明色块），气泡仅当前碟
    if (disc.source_image) renderPhotoArOverlay(disc.source_image);

    // 片名只由 disc-marker-tooltip 显示；此处仅保留扩散环，避免双文字条
    const guide = $("#location-guide");
    guide.classList.remove("hidden");
    guide.style.left = `${disc.pos_x}%`;
    guide.style.top = `${disc.pos_y}%`;
    guide.innerHTML = `
        <div class="guide-ring"></div>
        <div class="guide-ring" style="animation-delay:0.3s"></div>
        <div class="guide-ring" style="animation-delay:0.6s"></div>`;
    clearTimeout(state._ht);
    state._ht = setTimeout(() => {
        state.highlightedDiscId = null;
        guide.classList.add("hidden");
        guide.innerHTML = "";
        renderDiscMarkers();
        // 若详情仍打开且源图一致，保留色块；否则清除查找临时色块
        if (state.selectedDiscId) {
            const sel = state.discs.find(d => d.id === state.selectedDiscId);
            if (sel && sel.source_image) renderPhotoArOverlay(sel.source_image);
            else clearPhotoArOverlay();
        } else {
            clearPhotoArOverlay();
        }
    }, 5000);
    showToast(tr("toast.positionMarked", { title: discDisplayTitles(disc).primary }), "success");
}

async function doSearch() {
    await loadDiscs(
        $("#search-input").value.trim(),
        $("#filter-genre").value,
        $("#filter-year").value,
        $("#filter-preference")?.value || ""
    );
    syncGenreCloudActive();
}

// ===== 类型热词图 =====

function parseGenreCountList(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw.map(item => {
            if (item == null) return null;
            if (typeof item === "string" || typeof item === "number") {
                const label = String(item).trim();
                return label ? { label, count: 1 } : null;
            }
            const label = String(item.label || item.name || item.genre || item.key || "").trim();
            const count = Number(item.count ?? item.n ?? item.value ?? item.total ?? 0);
            if (!label) return null;
            return { label, count: count > 0 ? count : 0 };
        }).filter(Boolean);
    }
    if (typeof raw === "object") {
        return Object.entries(raw).map(([label, v]) => {
            const count = (v && typeof v === "object")
                ? Number(v.count ?? v.n ?? v.value ?? 0)
                : Number(v);
            return { label: String(label).trim(), count: count > 0 ? count : 0 };
        }).filter(item => item.label);
    }
    return [];
}

function tallyGenreCountsFromDiscs(discs) {
    const counts = {};
    for (const d of discs || []) {
        for (const g of genreLabels(d)) {
            if (g) counts[g] = (counts[g] || 0) + 1;
        }
    }
    return Object.entries(counts).map(([label, count]) => ({ label, count }));
}

function genreCountsWeight(items) {
    return (items || []).reduce((sum, x) => sum + (Number(x.count) || 0), 0);
}

function rememberLibraryGenreCounts(items) {
    if (!items?.length) return;
    const prev = state.libraryGenreCounts || [];
    if (!prev.length || genreCountsWeight(items) > genreCountsWeight(prev) || items.length > prev.length) {
        state.libraryGenreCounts = items;
    }
}

function resolveGenreCounts(data) {
    const fromApi = parseGenreCountList(data?.genre_counts).filter(x => x.label && x.count > 0);
    const apiLooksReal = fromApi.some(x => x.count > 1);
    if (apiLooksReal) {
        rememberLibraryGenreCounts(fromApi);
        return fromApi;
    }
    const cached = state.libraryGenreCounts || [];
    if (cached.some(x => Number(x.count) > 1)) return cached;
    const fromDiscs = tallyGenreCountsFromDiscs(state.discs).filter(x => x.label && x.count > 0);
    if (fromDiscs.length) {
        rememberLibraryGenreCounts(fromDiscs);
        return fromDiscs;
    }
    if (fromApi.length) {
        rememberLibraryGenreCounts(fromApi);
        return fromApi;
    }
    if (cached.length) return cached;
    const fromLabels = (data?.genres || state.filters?.genres || [])
        .map(g => ({ label: String(g || "").trim(), count: 1 }))
        .filter(x => x.label);
    rememberLibraryGenreCounts(fromLabels);
    return fromLabels;
}

const GENRE_CLOUD_GAP = 1;
const GENRE_CLOUD_HOVER_PAD = 18;
const GENRE_CLOUD_PAD_X = 8;
const GENRE_CLOUD_PAD_BOTTOM = 8;
const GENRE_CLOUD_FILL_MARGIN = 6;
const GENRE_CLOUD_MAX_SPEED = 1200;
/**
 * 3.16a：所有力都按「加速度」标定（力 ∝ 相关 mass），大词小词得到同量级加速度。
 * 旧版力值与 mass 无关、积分时再除 mass，于是小词被猛甩、大词几乎不动——
 * 这正是词团被拉扁、重叠、并整体慢慢漂向一角的根因。
 */
/** 中程吸引：每对按较小 mass 归一的加速度尺度（碰撞 GENRE_CLOUD_COLLIDE 仍硬于此） */
const GENRE_CLOUD_ATTRACT = 6;
/** 碰撞刚度：按重叠深度给加速度，量级明显高于吸引，保证不重叠 */
const GENRE_CLOUD_COLLIDE = 18;
/** 单词速度阻尼（力 ∝ mass ⇒ 大小词同衰减率 ≈3.6/s，大词不再拖着整团慢慢漂） */
const GENRE_CLOUD_DAMP = 0.06;
/** 整团回中弹簧：力 ∝ mass ⇒ 等价刚体平移（不压扁词团），ω≈√(60k)≈2.1rad/s */
const GENRE_CLOUD_CENTER = 0.075;
/** 质心速度阻尼（≈4.2/s，接近临界阻尼，回中不来回过冲） */
const GENRE_CLOUD_CENTER_DAMP = 0.07;
/** 拖拽中减弱回中，别抢跟手控制 */
const GENRE_CLOUD_CENTER_DRAG_SCALE = 0.3;
/** 回中目标：包围盒中心与质心的混合（视觉居中 vs 抗单个离群词带偏） */
const GENRE_CLOUD_CENTER_BBOX_MIX = 0.55;
/** 运动学回中：力场被边框/密团夹住推不动时，整团平移回中（不改相对布局） */
const GENRE_CLOUD_RECENTER_RATE = 3;
const GENRE_CLOUD_RECENTER_MAX = 240;
/** 平均速度低于此值算「静止」，此时才全速回中，运动中只做弱修正 */
const GENRE_CLOUD_RECENTER_CALM = 90;
const GENRE_CLOUD_RECENTER_MOVING_GAIN = 0.35;
const GENRE_CLOUD_RECENTER_DRAG_GAIN = 0.15;
const GENRE_CLOUD_RECENTER_EPS = 0.35;
/** 吸引半径相对词均跨度的倍率（过小则拖远后断吸） */
const GENRE_CLOUD_ATTRACT_SPAN = 8.2;
/** pinned 拖拽体对邻居的拉力倍率（按邻居自身 mass 归一后，大小词跟动一致） */
const GENRE_CLOUD_PINNED_ATTRACT = 6;
const GENRE_CLOUD_WALL_REST = 0.28;
/** 位置级分离迭代：密团里靠它保证「碰撞硬于吸引」，不够则残留重叠 */
const GENRE_CLOUD_WALL_ITERS = 5;
const GENRE_CLOUD_COLLIDE_GAP = 3;
const GENRE_CLOUD_DRAG_THRESHOLD = 6;
/** 热度分层回复力：按字号定目标半径的径向弹簧（ω≈2.2rad/s，临界阻尼，几秒内收敛） */
const GENRE_CLOUD_RANK_K = 0.08;
const GENRE_CLOUD_RANK_DAMP = 0.085;
/** 分层力的等向阻尼（大词 mass 大，全局 DAMP 不够，靠这项停住） */
const GENRE_CLOUD_RANK_DAMP_ISO = 0.02;
/** 拖拽中分层力减弱，保留跟手与邻居跟动 */
const GENRE_CLOUD_RANK_DRAG_GAIN = 0.15;
/** 松手后分层力渐入速率（1/s），避免瞬间弹回 */
const GENRE_CLOUD_RANK_RAMP = 1.8;
/** 目标半径容差（px）：以内不施力，保留轻微晃动、不抖 */
const GENRE_CLOUD_RANK_DEADZONE = 5;
/** 往外推的分力更弱：分层主要靠把大词拉回中心，小词让碰撞挤出去，避免词团向边缘摊开 */
const GENRE_CLOUD_RANK_OUT_GAIN = 0.45;
const GENRE_CLOUD_RANK_MAX_ERR = 240;
/** 目标半径里「初始密铺半径」的权重，其余来自累积面积分层 */
const GENRE_CLOUD_RANK_HOME_MIX = 0.4;
/**
 * 松手后延迟重排：密团是「jammed」的，只靠力场大词挤不回中心，
 * 所以等团体平静（或超时）后再平滑过渡回按热度密铺的原位。
 */
const GENRE_CLOUD_REFLOW_CALM = 120;
const GENRE_CLOUD_REFLOW_MIN_WAIT = 0.35;
const GENRE_CLOUD_REFLOW_MAX_WAIT = 1.2;
const GENRE_CLOUD_REFLOW_DUR = 0.85;
const GENRE_CLOUD_PANEL_W = 640;
const GENRE_CLOUD_PANEL_MIN_W = 360;
const GENRE_CLOUD_PANEL_MIN_H = 280;
const GENRE_CLOUD_SIDEBAR_GAP = 12;
const GENRE_CLOUD_SIZE_MIN = 12;
/** 3.15l：均匀铺满后，最小词约为该均匀最小的比例（拉开对比） */
const GENRE_CLOUD_MIN_FILL_FACTOR = 0.5;
/** 目标 max/min（手册：约 89/24 ≈ 3.7）；大面板填满时抬升可读下限，硬底仍为 SIZE_MIN */
const GENRE_CLOUD_TARGET_CONTRAST = 3.7;
const GENRE_CLOUD_MAX_RATIO = 0.30;
const GENRE_CLOUD_MAX_RATIO_HARD = 0.32;
const GENRE_CLOUD_TIP_OX = 14;
const GENRE_CLOUD_TIP_OY = 14;
const GENRE_CLOUD_SIZE_KEY = "mywall-genre-cloud-size";
/**
 * 3.16a：分层收敛后「停帧」，坐标定格在 DOM 上。
 * 之后点卡片 / 点词筛选都不会再动布局；只有拖词、松手重排、面板 resize、窗口重铺才重新起帧。
 */
const GENRE_CLOUD_PARK_SPEED = 12;
const GENRE_CLOUD_PARK_HOLD = 0.4;
const GENRE_CLOUD_PARK_MAX_T = 4;
/** 每帧整团位移（px）：运动学回中直接改位置、不带速度，只看速度会误判已静止 */
const GENRE_CLOUD_PARK_DRIFT = 0.4;
/** 3.16b：还没居中就先别停帧，否则会把偏心的词团定格在角上（PARK_MAX_T 仍兜底） */
const GENRE_CLOUD_PARK_OFFCENTER = 6;
/** 3.16a：词区宽度变化不到该阈值（详情开合、筛选、滚动条微抖）就不重装箱，只夹回硬边界 */
const GENRE_CLOUD_REPACK_MIN_DW = 6;
let genreCloudPackedWidth = -1;
let genreCloudMotionRaf = 0;
let genreCloudBodies = [];
let genreCloudMotionLast = 0;
let genreCloudRootEl = null;
let genreCloudRankGain = 1;
let genreCloudReflow = null;
let genreCloudDrag = null;
let genreCloudResize = null;
let genreCloudPanelSize = { w: GENRE_CLOUD_PANEL_W, h: 0 };
let genreCloudResizePackTimer = 0;
let genreCloudSettleT = 0;
let genreCloudCalmT = 0;
let genreCloudLastCx = NaN;
let genreCloudLastCy = NaN;

function prefersReducedMotion() {
    try {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
        return false;
    }
}

function isNarrowLayout() {
    return document.documentElement.classList.contains("is-narrow")
        || window.matchMedia("(pointer: coarse), (max-width: 899.98px)").matches;
}

function isGenreCloudUnavailable() {
    return isNarrowBrowse() || isNarrowLayout();
}

function syncGenreCloudEntry() {
    const btn = $("#btn-genre-cloud");
    const off = isGenreCloudUnavailable();
    if (btn) {
        btn.hidden = off;
        btn.classList.toggle("hidden", off);
        btn.setAttribute("aria-hidden", off ? "true" : "false");
        if (off) btn.setAttribute("aria-expanded", "false");
    }
    const modal = $("#genre-cloud-modal");
    if (off && modal && !modal.classList.contains("hidden")) closeGenreCloudModal();
}

function genreCloudFillTarget(n) {
    if (n >= 12) return 0.90;
    if (n >= 6) return 0.60;
    return 0.40;
}

function genreCloudDefaultHeight() {
    const vh = window.innerHeight || 800;
    return Math.max(GENRE_CLOUD_PANEL_MIN_H, Math.min(Math.round(vh * 0.72), 720));
}

function genreCloudMaxPanelHeight() {
    const vh = window.innerHeight || 800;
    return Math.max(GENRE_CLOUD_PANEL_MIN_H, Math.min(Math.round(vh * 0.92), 920));
}

function genreCloudMaxPanelWidth() {
    const dock = genreCloudDockLeft();
    const vw = window.innerWidth || 1200;
    return Math.max(GENRE_CLOUD_PANEL_MIN_W, Math.floor(vw - dock - 16));
}

function loadGenreCloudPanelSize() {
    const fallback = { w: GENRE_CLOUD_PANEL_W, h: genreCloudDefaultHeight() };
    try {
        const raw = localStorage.getItem(GENRE_CLOUD_SIZE_KEY);
        if (!raw) {
            genreCloudPanelSize = fallback;
            return genreCloudPanelSize;
        }
        const parsed = JSON.parse(raw);
        const w = Math.round(Number(parsed?.w) || 0);
        const h = Math.round(Number(parsed?.h) || 0);
        if (w < GENRE_CLOUD_PANEL_MIN_W || h < GENRE_CLOUD_PANEL_MIN_H) {
            genreCloudPanelSize = fallback;
            return genreCloudPanelSize;
        }
        genreCloudPanelSize = {
            w: Math.min(w, genreCloudMaxPanelWidth()),
            h: Math.min(h, genreCloudMaxPanelHeight()),
        };
        return genreCloudPanelSize;
    } catch (e) {
        genreCloudPanelSize = fallback;
        return genreCloudPanelSize;
    }
}

function saveGenreCloudPanelSize() {
    try {
        localStorage.setItem(GENRE_CLOUD_SIZE_KEY, JSON.stringify({
            w: Math.round(genreCloudPanelSize.w),
            h: Math.round(genreCloudPanelSize.h),
        }));
    } catch (e) { /* ignore */ }
}

function genreCloudClampBodiesToBounds() {
    const root = genreCloudRootEl || $("#genre-cloud");
    if (!root || !genreCloudBodies.length) return;
    const { w: boundsW, h: boundsH } = genreCloudBoundsSize(root);
    for (let i = 0; i < genreCloudBodies.length; i++) {
        const b = genreCloudBodies[i];
        genreCloudClampBody(b, boundsW, boundsH, { bounce: false });
        genreCloudApplyBodyPos(b);
    }
}

function genreCloudSchedulePackAfterResize() {
    if (genreCloudResizePackTimer) clearTimeout(genreCloudResizePackTimer);
    genreCloudResizePackTimer = setTimeout(() => {
        genreCloudResizePackTimer = 0;
        // 面板拖拽改尺寸松手：这是允许重铺的场合之一
        relayoutGenreCloudIfOpen({ forcePack: true });
    }, 120);
}

function genreCloudPanelBox() {
    const panel = $(".modal-genre-cloud");
    const w = Math.max(1, panel?.offsetWidth || genreCloudPanelSize.w || GENRE_CLOUD_PANEL_W);
    const h = Math.max(1, panel?.offsetHeight || genreCloudPanelSize.h || genreCloudDefaultHeight());
    return { w, h, short: Math.min(w, h) };
}

function genreCloudRelT(count, minCount, maxCount) {
    const c = Math.max(1, Number(count) || 1);
    const lo = Math.max(1, Number(minCount) || 1);
    const hi = Math.max(lo, Number(maxCount) || lo);
    const sqrtLo = Math.sqrt(lo);
    const sqrtHi = Math.sqrt(hi);
    const sqrtT = sqrtHi <= sqrtLo ? 1 : (Math.sqrt(c) - sqrtLo) / (sqrtHi - sqrtLo);
    const logLo = Math.log(lo + 1);
    const logHi = Math.log(hi + 1);
    const logT = logHi <= logLo ? 1 : (Math.log(c + 1) - logLo) / (logHi - logLo);
    const t = (sqrtT + logT) / 2;
    return Math.pow(Math.max(0, Math.min(1, t)), 1.25);
}

function libraryCountsForCloud() {
    const cached = (state.libraryGenreCounts || []).filter(x => x.label && x.count > 0);
    if (cached.length) return cached;
    return resolveGenreCounts(state.filters || {}).filter(x => x.label && x.count > 0);
}

function resetGenreCloudBox(root) {
    if (!root) return;
    root.style.height = "";
    root.style.transform = "";
    root.style.marginBottom = "";
}

function genreCloudMaxHeight() {
    const modal = $(".modal-genre-cloud");
    const header = modal?.querySelector(".modal-header");
    const body = modal?.querySelector(".genre-cloud-body");
    const bodyPad = body
        ? (parseFloat(getComputedStyle(body).paddingTop) || 0)
            + (parseFloat(getComputedStyle(body).paddingBottom) || 0)
        : 32;
    const chrome = (header?.offsetHeight || 52) + bodyPad;
    const panelH = modal?.clientHeight || genreCloudPanelSize.h || genreCloudDefaultHeight();
    return Math.max(140, Math.floor(panelH - chrome - 8));
}

function genreCloudStyle(count, minCount, maxCount, sizeMin, sizeMax) {
    const t = genreCloudRelT(count, minCount, maxCount);
    const lo = sizeMin ?? GENRE_CLOUD_SIZE_MIN;
    const hi = Math.max(lo + 6, sizeMax ?? 72);
    const size = Math.round(lo + t * (hi - lo));
    const weight = t > 0.72 ? 700 : t > 0.38 ? 600 : 400;
    const color = t > 0.7 ? "#fdfdfd" : t > 0.42 ? "#b3b3b3" : t > 0.18 ? "#7a7a7a" : "#5c5c5c";
    const rank = t > 0.55 ? "lg" : t > 0.28 ? "md" : "sm";
    return { size, weight, color, rank };
}

function genreCloudCanVertical(label) {
    const chars = [...String(label || "")];
    if (chars.length < 2 || chars.length > 6) return false;
    let han = 0;
    for (const ch of chars) {
        const c = ch.codePointAt(0);
        if ((c >= 0x4e00 && c <= 0x9fff) || (c >= 0x3400 && c <= 0x4dbf)) han += 1;
    }
    return han >= chars.length - 1;
}

function genreCloudOverlaps(x, y, w, h, boxes, gap) {
    const r = x + w + gap;
    const b = y + h + gap;
    for (let i = 0; i < boxes.length; i++) {
        const p = boxes[i];
        if (x < p.x + p.w + gap && r > p.x && y < p.y + p.h + gap && b > p.y) return true;
    }
    return false;
}

function genreCloudUnionWidth(boxes, x, w) {
    let minX = x;
    let maxX = x + w;
    for (let i = 0; i < boxes.length; i++) {
        const p = boxes[i];
        if (p.x < minX) minX = p.x;
        const right = p.x + p.w;
        if (right > maxX) maxX = right;
    }
    return maxX - minX;
}

function genreCloudBBoxArea(boxes, extra) {
    let minX = extra.x;
    let minY = extra.y;
    let maxX = extra.x + extra.w;
    let maxY = extra.y + extra.h;
    for (let i = 0; i < boxes.length; i++) {
        const p = boxes[i];
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        const r = p.x + p.w;
        const b = p.y + p.h;
        if (r > maxX) maxX = r;
        if (b > maxY) maxY = b;
    }
    return (maxX - minX) * (maxY - minY);
}

function genreCloudAligns(hostLen, wordLen) {
    const extra = hostLen - wordLen;
    if (Math.abs(extra) < 0.5) return [0];
    return [0, extra / 2, extra];
}

function genreCloudEdgeCandidates(item, placed, gap) {
    const variants = [{ vertical: false, w: item.hw, h: item.hh }];
    if (item.canV) variants.push({ vertical: true, w: item.vw, h: item.vh });
    const xSnaps = [];
    const ySnaps = [];
    for (let i = 0; i < placed.length; i++) {
        const p = placed[i];
        xSnaps.push(p.x, p.x + p.w);
        ySnaps.push(p.y, p.y + p.h);
    }
    const out = [];
    for (let i = 0; i < placed.length; i++) {
        const p = placed[i];
        for (let v = 0; v < variants.length; v++) {
            const or = variants[v];
            const ys = new Set(genreCloudAligns(p.h, or.h).map(d => p.y + d));
            for (let s = 0; s < ySnaps.length; s++) {
                ys.add(ySnaps[s]);
                ys.add(ySnaps[s] - or.h);
            }
            const xs = new Set(genreCloudAligns(p.w, or.w).map(d => p.x + d));
            for (let s = 0; s < xSnaps.length; s++) {
                xs.add(xSnaps[s]);
                xs.add(xSnaps[s] - or.w);
            }
            const yPad = Math.max(p.h, or.h) + 12;
            const xPad = Math.max(p.w, or.w) + 12;
            ys.forEach(y => {
                if (y + or.h < p.y - yPad || y > p.y + p.h + yPad) return;
                out.push({ ...or, x: p.x + p.w + gap, y });
                out.push({ ...or, x: p.x - or.w - gap, y });
            });
            xs.forEach(x => {
                if (x + or.w < p.x - xPad || x > p.x + p.w + xPad) return;
                out.push({ ...or, x, y: p.y + p.h + gap });
                out.push({ ...or, x, y: p.y - or.h - gap });
            });
        }
    }
    return out;
}

function genreCloudSpiralSlot(w, h, placed, maxW, gap) {
    const cx = -w / 2;
    const cy = -h / 2;
    const ok = (x, y) => !genreCloudOverlaps(x, y, w, h, placed, gap) && genreCloudUnionWidth(placed, x, w) <= maxW;
    if (ok(cx, cy)) return { x: cx, y: cy };
    const step = 2;
    const maxR = Math.max(maxW * 5, 900);
    for (let r = step; r <= maxR; r += step) {
        const n = Math.max(16, Math.ceil((Math.PI * 2 * r) / step));
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const x = Math.cos(a) * r + cx;
            const y = Math.sin(a) * r + cy;
            if (ok(x, y)) return { x, y };
        }
    }
    let maxY = 0;
    for (let i = 0; i < placed.length; i++) {
        const b = placed[i].y + placed[i].h;
        if (b > maxY) maxY = b;
    }
    return { x: cx, y: maxY + gap };
}

function genreCloudPickSlot(item, placed, maxW, gap, vCount, hCount) {
    const wantV = item.canV && vCount < hCount * 0.55;
    let best = null;
    let bestScore = Infinity;
    const cands = genreCloudEdgeCandidates(item, placed, gap);
    for (let i = 0; i < cands.length; i++) {
        const c = cands[i];
        const x = Math.round(c.x);
        const y = Math.round(c.y);
        if (genreCloudOverlaps(x, y, c.w, c.h, placed, gap)) continue;
        if (genreCloudUnionWidth(placed, x, c.w) > maxW) continue;
        const dx = x + c.w / 2;
        const dy = y + c.h / 2;
        let score = dx * dx + dy * dy + genreCloudBBoxArea(placed, { x, y, w: c.w, h: c.h }) * 0.06;
        if (c.vertical && wantV) score *= 0.88;
        else if (!c.vertical && !wantV) score *= 0.96;
        if (score < bestScore) {
            bestScore = score;
            best = { x, y, w: c.w, h: c.h, vertical: c.vertical };
        }
    }
    if (best) return best;
    const variants = [{ vertical: false, w: item.hw, h: item.hh }];
    if (item.canV) variants.push({ vertical: true, w: item.vw, h: item.vh });
    let fallback = null;
    let fallbackScore = Infinity;
    for (let v = 0; v < variants.length; v++) {
        const or = variants[v];
        const slot = genreCloudSpiralSlot(or.w, or.h, placed, maxW, gap);
        const dx = slot.x + or.w / 2;
        const dy = slot.y + or.h / 2;
        const score = dx * dx + dy * dy;
        if (score < fallbackScore) {
            fallbackScore = score;
            fallback = { x: Math.round(slot.x), y: Math.round(slot.y), w: or.w, h: or.h, vertical: or.vertical };
        }
    }
    return fallback;
}

function clearGenreCloudPlacement() {
    const modal = $("#genre-cloud-modal");
    const panel = $(".modal-genre-cloud");
    const overlay = $("#genre-cloud-overlay");
    if (modal) {
        modal.style.top = "";
        modal.style.left = "";
        modal.style.right = "";
        modal.style.bottom = "";
        modal.style.width = "";
        modal.style.height = "";
    }
    if (panel) {
        panel.style.top = "";
        panel.style.left = "";
        panel.style.right = "";
        panel.style.bottom = "";
        panel.style.width = "";
        panel.style.minWidth = "";
        panel.style.maxWidth = "";
        panel.style.height = "";
        panel.style.minHeight = "";
        panel.style.maxHeight = "";
        panel.style.transform = "";
    }
    overlay?.classList.remove("is-pass-through");
}

function genreCloudDockLeft() {
    const sidebar = $("#sidebar");
    const gap = GENRE_CLOUD_SIDEBAR_GAP;
    if (!sidebar) return 8 + 340 + gap;
    if (document.body.classList.contains("panel-is-dragging") || sidebar.classList.contains("is-dragging")) {
        return Math.round(sidebar.getBoundingClientRect().right + gap);
    }
    const leftPx = parseFloat(getComputedStyle(sidebar).left);
    const baseLeft = Number.isFinite(leftPx) ? leftPx : 8;
    const w = sidebar.offsetWidth || 340;
    return Math.round(baseLeft + w + getPanelDragOffset(sidebar) + gap);
}

function syncGenreCloudPlacement() {
    const modal = $("#genre-cloud-modal");
    const panel = $(".modal-genre-cloud");
    const overlay = $("#genre-cloud-overlay");
    if (!modal || modal.classList.contains("hidden")) return;
    if (isGenreCloudUnavailable()) {
        closeGenreCloudModal();
        return;
    }
    if (!panel) return;
    overlay?.classList.remove("is-pass-through");
    if (!genreCloudPanelSize.h) loadGenreCloudPanelSize();
    const maxW = genreCloudMaxPanelWidth();
    const maxH = genreCloudMaxPanelHeight();
    const w = Math.max(GENRE_CLOUD_PANEL_MIN_W, Math.min(Math.round(genreCloudPanelSize.w || GENRE_CLOUD_PANEL_W), maxW));
    const h = Math.max(GENRE_CLOUD_PANEL_MIN_H, Math.min(Math.round(genreCloudPanelSize.h || genreCloudDefaultHeight()), maxH));
    genreCloudPanelSize = { w, h };
    const left = genreCloudDockLeft();
    panel.style.top = "50%";
    panel.style.left = `${left}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.width = `${w}px`;
    panel.style.minWidth = `${GENRE_CLOUD_PANEL_MIN_W}px`;
    panel.style.maxWidth = `${maxW}px`;
    panel.style.height = `${h}px`;
    panel.style.minHeight = `${GENRE_CLOUD_PANEL_MIN_H}px`;
    panel.style.maxHeight = `${maxH}px`;
    panel.style.transform = "translateY(-50%)";
}

/** 3.16a：只同步词区硬边界高度并把词夹回框内，不动字号 / 坐标（与 packGenreCloud 同一高度公式） */
function genreCloudSyncBox(root) {
    if (!root) return;
    const availH = Math.max(8, genreCloudMaxHeight() - GENRE_CLOUD_HOVER_PAD - GENRE_CLOUD_PAD_BOTTOM);
    root.style.height = `${Math.ceil(availH + GENRE_CLOUD_HOVER_PAD + GENRE_CLOUD_PAD_BOTTOM)}px`;
    genreCloudClampBodiesToBounds();
}

/** 词区宽度是否真的变了（到需要重铺的程度） */
function genreCloudNeedsRepack(root) {
    if (genreCloudPackedWidth <= 0) return true;
    const w = Math.round(root?.clientWidth || 0);
    if (!w) return false;
    return Math.abs(w - genreCloudPackedWidth) >= GENRE_CLOUD_REPACK_MIN_DW;
}

function relayoutGenreCloudIfOpen({ forcePack = false } = {}) {
    const modal = $("#genre-cloud-modal");
    if (!modal || modal.classList.contains("hidden")) return;
    syncGenreCloudPlacement();
    const root = $("#genre-cloud");
    if (!root) return;
    if (forcePack) {
        genreCloudPackedWidth = -1;
        packGenreCloud(root);
        return;
    }
    // 窗口只是变高 / 变化很小：保持现有坐标，别整图重铺
    if (!genreCloudNeedsRepack(root)) {
        genreCloudSyncBox(root);
        return;
    }
    packGenreCloud(root);
}

function stopGenreCloudMotion() {
    if (genreCloudMotionRaf) {
        cancelAnimationFrame(genreCloudMotionRaf);
        genreCloudMotionRaf = 0;
    }
    endGenreCloudDrag({ applyFilter: false });
    genreCloudBodies = [];
    genreCloudMotionLast = 0;
    genreCloudRootEl = null;
    genreCloudRankGain = 1;
    genreCloudReflow = null;
    genreCloudSettleT = 0;
    genreCloudCalmT = 0;
    genreCloudLastCx = NaN;
    genreCloudLastCy = NaN;
}

function genreCloudApplyBodyPos(b) {
    b.el.style.left = `${b.x}px`;
    b.el.style.top = `${b.y}px`;
    b.el.style.transform = "";
}

function genreCloudBoundsSize(root) {
    // left/top 相对 #genre-cloud 内容盒；client* 即面板词区内缘（已扣 body padding / header）
    return {
        w: Math.max(1, root?.clientWidth || 1),
        h: Math.max(1, root?.clientHeight || 1),
    };
}

function genreCloudClampBody(b, boundsW, boundsH, { bounce = false } = {}) {
    const maxX = Math.max(0, boundsW - b.w);
    const maxY = Math.max(0, boundsH - b.h);
    if (b.x < 0) {
        b.x = 0;
        if (bounce && b.vx < 0) b.vx = -b.vx * GENRE_CLOUD_WALL_REST;
        else if (b.vx < 0) b.vx = 0;
    } else if (b.x > maxX) {
        b.x = maxX;
        if (bounce && b.vx > 0) b.vx = -b.vx * GENRE_CLOUD_WALL_REST;
        else if (b.vx > 0) b.vx = 0;
    }
    if (b.y < 0) {
        b.y = 0;
        if (bounce && b.vy < 0) b.vy = -b.vy * GENRE_CLOUD_WALL_REST;
        else if (b.vy < 0) b.vy = 0;
    } else if (b.y > maxY) {
        b.y = maxY;
        if (bounce && b.vy > 0) b.vy = -b.vy * GENRE_CLOUD_WALL_REST;
        else if (b.vy > 0) b.vy = 0;
    }
}

function genreCloudResolveOverlaps(bodies) {
    const n = bodies.length;
    for (let i = 0; i < n; i++) {
        const a = bodies[i];
        for (let j = i + 1; j < n; j++) {
            const b = bodies[j];
            const dx = (b.x + b.w * 0.5) - (a.x + a.w * 0.5);
            const dy = (b.y + b.h * 0.5) - (a.y + a.h * 0.5);
            const halfW = a.w * 0.5 + b.w * 0.5 + GENRE_CLOUD_COLLIDE_GAP;
            const halfH = a.h * 0.5 + b.h * 0.5 + GENRE_CLOUD_COLLIDE_GAP;
            const ox = halfW - Math.abs(dx);
            const oy = halfH - Math.abs(dy);
            if (ox <= 0 || oy <= 0) continue;
            const inv = 1 / (a.mass + b.mass);
            if (ox < oy) {
                const push = (dx < 0 ? -ox : ox);
                if (!a.pinned) a.x -= push * b.mass * inv;
                if (!b.pinned) b.x += push * a.mass * inv;
            } else {
                const push = (dy < 0 ? -oy : oy);
                if (!a.pinned) a.y -= push * b.mass * inv;
                if (!b.pinned) b.y += push * a.mass * inv;
            }
        }
    }
}

/**
 * 给每个词算一个「热度层」目标半径（相对面板的椭圆归一，0=质心 1=内缘）。
 * 形状取自按字号降序的累积面积：r ∝ sqrt(累积面积)，即大词占中心圆盘、小词落到外环；
 * 半径标度用初始密铺位置最小二乘拟合，所以刚打开时误差接近 0，不会一开窗就重排。
 */
function genreCloudAssignRankTargets(root) {
    const n = genreCloudBodies.length;
    if (!n) return;
    const { w: boundsW, h: boundsH } = genreCloudBoundsSize(root);
    const rx = Math.max(1, boundsW * 0.5);
    const ry = Math.max(1, boundsH * 0.5);
    const gap = GENRE_CLOUD_COLLIDE_GAP * 2;
    let total = 0;
    for (let i = 0; i < n; i++) {
        const b = genreCloudBodies[i];
        b.size = parseFloat(b.el.style.fontSize)
            || parseFloat(b.el.dataset.baseSize)
            || GENRE_CLOUD_SIZE_MIN;
        b.area = (b.w + gap) * (b.h + gap);
        b.homeU = Math.hypot(((b.x + b.w * 0.5) - rx) / rx, ((b.y + b.h * 0.5) - ry) / ry);
        total += b.area;
    }
    const order = genreCloudBodies
        .map((b, i) => i)
        .sort((i, j) => (genreCloudBodies[j].size - genreCloudBodies[i].size)
            || (genreCloudBodies[j].area - genreCloudBodies[i].area));
    let cum = 0;
    let num = 0;
    let den = 0;
    for (let k = 0; k < order.length; k++) {
        const b = genreCloudBodies[order[k]];
        const mid = cum + b.area * 0.5;
        cum += b.area;
        b.rankShape = Math.sqrt(Math.max(0, mid) / (total || 1));
        num += b.homeU * b.rankShape;
        den += b.rankShape * b.rankShape;
    }
    const fitK = Math.min(1.05, Math.max(0.45, den > 0 ? num / den : 0.85));
    for (let i = 0; i < n; i++) {
        const b = genreCloudBodies[i];
        const shaped = Math.min(0.98, b.rankShape * fitK);
        const mixed = GENRE_CLOUD_RANK_HOME_MIX * b.homeU
            + (1 - GENRE_CLOUD_RANK_HOME_MIX) * shaped;
        b.rankU = Math.min(0.98, Math.max(0, mixed));
    }
}

function scheduleGenreCloudReflow() {
    if (!genreCloudBodies.length || prefersReducedMotion()) return;
    genreCloudReflow = { phase: "wait", t: 0 };
    resumeGenreCloudMotion();
}

function cancelGenreCloudReflow() {
    genreCloudReflow = null;
}

/**
 * 松手后的分层重排：先等团体动能降下来（或超时），再用 easeInOut 平滑挪回密铺原位。
 * 返回 true 表示本帧由重排接管（跳过力场积分，避免两套位移打架）。
 */
function stepGenreCloudReflow(dt, boundsW, boundsH) {
    const r = genreCloudReflow;
    if (!r) return false;
    const n = genreCloudBodies.length;
    if (!n) {
        genreCloudReflow = null;
        return false;
    }
    r.t += dt;
    if (r.phase === "wait") {
        let speed = 0;
        for (let i = 0; i < n; i++) {
            const b = genreCloudBodies[i];
            if (b.pinned) return false;
            speed += Math.hypot(b.vx, b.vy);
        }
        speed /= n;
        const calm = r.t >= GENRE_CLOUD_REFLOW_MIN_WAIT && speed < GENRE_CLOUD_REFLOW_CALM;
        if (!calm && r.t < GENRE_CLOUD_REFLOW_MAX_WAIT) return false;
        r.phase = "run";
        r.t = 0;
        for (let i = 0; i < n; i++) {
            const b = genreCloudBodies[i];
            b.fromX = b.x;
            b.fromY = b.y;
        }
    }
    const k = Math.min(1, r.t / GENRE_CLOUD_REFLOW_DUR);
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    for (let i = 0; i < n; i++) {
        const b = genreCloudBodies[i];
        const hx = Number.isFinite(b.homeX) ? b.homeX : b.x;
        const hy = Number.isFinite(b.homeY) ? b.homeY : b.y;
        b.x = b.fromX + (hx - b.fromX) * e;
        b.y = b.fromY + (hy - b.fromY) * e;
        b.vx = 0;
        b.vy = 0;
        genreCloudClampBody(b, boundsW, boundsH, { bounce: false });
        genreCloudApplyBodyPos(b);
    }
    if (k >= 1) genreCloudReflow = null;
    return true;
}

/**
 * 词团整体状态（只统计自由词，拖拽中的 pinned 词不参与，否则拖远一词就把整团目标带跑）：
 * 质心 / 包围盒 / 质心速度 / 平均速率。cx,cy 是回中要对齐面板中心的那个点。
 */
function genreCloudGroupFrame() {
    let massSum = 0;
    let comX = 0;
    let comY = 0;
    let velX = 0;
    let velY = 0;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let speed = 0;
    let count = 0;
    for (let i = 0; i < genreCloudBodies.length; i++) {
        const b = genreCloudBodies[i];
        if (b.pinned) continue;
        const m = b.mass;
        comX += (b.x + b.w * 0.5) * m;
        comY += (b.y + b.h * 0.5) * m;
        velX += b.vx * m;
        velY += b.vy * m;
        massSum += m;
        if (b.x < minX) minX = b.x;
        if (b.y < minY) minY = b.y;
        if (b.x + b.w > maxX) maxX = b.x + b.w;
        if (b.y + b.h > maxY) maxY = b.y + b.h;
        speed += Math.hypot(b.vx, b.vy);
        count += 1;
    }
    if (!count) return null;
    const inv = 1 / (massSum || 1);
    const cmx = comX * inv;
    const cmy = comY * inv;
    const mix = GENRE_CLOUD_CENTER_BBOX_MIX;
    return {
        count,
        comX: cmx,
        comY: cmy,
        velX: velX * inv,
        velY: velY * inv,
        minX,
        minY,
        maxX,
        maxY,
        speed: speed / count,
        cx: (minX + maxX) * 0.5 * mix + cmx * (1 - mix),
        cy: (minY + maxY) * 0.5 * mix + cmy * (1 - mix),
    };
}

/**
 * 运动学回中：整团一起平移，相对布局完全不变。
 * 只用两侧余量内的位移——否则边框会把外侧词夹住、整团被压扁。
 */
function genreCloudRecenterGroup(frame, dt, boundsW, boundsH, gain) {
    if (!frame || gain <= 0) return;
    const rate = Math.min(1, dt * GENRE_CLOUD_RECENTER_RATE * gain);
    const cap = GENRE_CLOUD_RECENTER_MAX * dt;
    let dx = Math.max(-cap, Math.min(cap, (boundsW * 0.5 - frame.cx) * rate));
    let dy = Math.max(-cap, Math.min(cap, (boundsH * 0.5 - frame.cy) * rate));
    if (dx > 0) dx = Math.min(dx, Math.max(0, boundsW - frame.maxX));
    else if (dx < 0) dx = -Math.min(-dx, Math.max(0, frame.minX));
    if (dy > 0) dy = Math.min(dy, Math.max(0, boundsH - frame.maxY));
    else if (dy < 0) dy = -Math.min(-dy, Math.max(0, frame.minY));
    if (Math.abs(dx) < GENRE_CLOUD_RECENTER_EPS) dx = 0;
    if (Math.abs(dy) < GENRE_CLOUD_RECENTER_EPS) dy = 0;
    if (!dx && !dy) return;
    for (let i = 0; i < genreCloudBodies.length; i++) {
        const b = genreCloudBodies[i];
        if (b.pinned) continue;
        b.x += dx;
        b.y += dy;
    }
}

/** 整团中心与词区几何中心的偏差是否已收进容差 */
function genreCloudIsCentered(passedFrame) {
    const root = genreCloudRootEl;
    const frame = passedFrame || genreCloudGroupFrame();
    if (!root || !frame) return true;
    const { w: boundsW, h: boundsH } = genreCloudBoundsSize(root);
    return Math.abs(frame.cx - boundsW * 0.5) <= GENRE_CLOUD_PARK_OFFCENTER
        && Math.abs(frame.cy - boundsH * 0.5) <= GENRE_CLOUD_PARK_OFFCENTER;
}

function genreCloudBodyAtEl(el) {
    for (let i = 0; i < genreCloudBodies.length; i++) {
        if (genreCloudBodies[i].el === el) return genreCloudBodies[i];
    }
    return null;
}

function startGenreCloudMotion(root) {
    stopGenreCloudMotion();
    if (!root) return;
    if ($("#genre-cloud-modal")?.classList.contains("hidden")) return;
    const words = [...root.querySelectorAll(".genre-cloud-word")];
    if (!words.length) return;
    genreCloudRootEl = root;
    genreCloudBodies = words.map((el) => {
        const w = Math.max(1, el.offsetWidth || 1);
        const h = Math.max(1, el.offsetHeight || 1);
        const x = parseFloat(el.style.left) || 0;
        const y = parseFloat(el.style.top) || 0;
        el.style.transform = "";
        return {
            el,
            w,
            h,
            x,
            y,
            vx: 0,
            vy: 0,
            mass: Math.max(24, w * h * 0.02),
            pinned: false,
            rankU: 0,
            // 密铺原位：松手后重排的目标（面板 resize 重装箱时随之更新）
            homeX: x,
            homeY: y,
            fromX: x,
            fromY: y,
        };
    });
    genreCloudAssignRankTargets(root);
    genreCloudRankGain = 1;
    genreCloudReflow = null;
    genreCloudSettleT = 0;
    genreCloudCalmT = 0;
    if (prefersReducedMotion()) return;
    genreCloudMotionLast = performance.now();
    genreCloudMotionRaf = requestAnimationFrame(genreCloudTick);
}

function genreCloudTick(now) {
    if ($("#genre-cloud-modal")?.classList.contains("hidden")) {
        stopGenreCloudMotion();
        return;
    }
    const dt = Math.min(0.033, Math.max(0.008, (now - genreCloudMotionLast) / 1000));
    genreCloudMotionLast = now;
    if (!document.hidden) {
        stepGenreCloudPhysics(dt);
        if (genreCloudShouldPark(dt)) {
            parkGenreCloudMotion();
            return;
        }
    }
    genreCloudMotionRaf = requestAnimationFrame(genreCloudTick);
}

/** 收敛判据：不在拖拽 / 松手重排 / 面板 resize 中，且团体平均速度已降下来（或已到超时上限） */
function genreCloudShouldPark(dt) {
    const n = genreCloudBodies.length;
    if (!n) return true;
    if (genreCloudDrag || genreCloudReflow || genreCloudResize) {
        genreCloudSettleT = 0;
        genreCloudCalmT = 0;
        return false;
    }
    genreCloudSettleT += dt;
    let speed = 0;
    for (let i = 0; i < n; i++) {
        speed += Math.hypot(genreCloudBodies[i].vx, genreCloudBodies[i].vy);
    }
    speed /= n;
    const frame = genreCloudGroupFrame();
    // 整团中心的逐帧位移：运动学回中直接改位置、不带速度，只看 speed 会误判已静止
    const drift = frame && Number.isFinite(genreCloudLastCx)
        ? Math.hypot(frame.cx - genreCloudLastCx, frame.cy - genreCloudLastCy)
        : Infinity;
    if (frame) {
        genreCloudLastCx = frame.cx;
        genreCloudLastCy = frame.cy;
    }
    const calm = speed < GENRE_CLOUD_PARK_SPEED
        && drift < GENRE_CLOUD_PARK_DRIFT
        && genreCloudIsCentered(frame);
    if (calm) genreCloudCalmT += dt;
    else genreCloudCalmT = 0;
    return genreCloudCalmT >= GENRE_CLOUD_PARK_HOLD || genreCloudSettleT >= GENRE_CLOUD_PARK_MAX_T;
}

/** 停帧但保留 bodies：坐标定格，之后点卡片 / 点词筛选都不会让图再动 */
function parkGenreCloudMotion() {
    if (genreCloudMotionRaf) {
        cancelAnimationFrame(genreCloudMotionRaf);
        genreCloudMotionRaf = 0;
    }
    for (let i = 0; i < genreCloudBodies.length; i++) {
        const b = genreCloudBodies[i];
        b.vx = 0;
        b.vy = 0;
        genreCloudApplyBodyPos(b);
    }
    genreCloudSettleT = 0;
    genreCloudCalmT = 0;
}

/** 仅真实交互（确认拖拽、松手重排、边界变化）才重新起帧 */
function resumeGenreCloudMotion() {
    if (!genreCloudBodies.length || prefersReducedMotion()) return;
    if ($("#genre-cloud-modal")?.classList.contains("hidden")) return;
    genreCloudSettleT = 0;
    genreCloudCalmT = 0;
    genreCloudLastCx = NaN;
    genreCloudLastCy = NaN;
    if (genreCloudMotionRaf) return;
    genreCloudMotionLast = performance.now();
    genreCloudMotionRaf = requestAnimationFrame(genreCloudTick);
}

function stepGenreCloudPhysics(dt) {
    const n = genreCloudBodies.length;
    const root = genreCloudRootEl;
    if (!n || !root) return;
    const { w: boundsW, h: boundsH } = genreCloudBoundsSize(root);
    if (stepGenreCloudReflow(dt, boundsW, boundsH)) return;
    const fx = new Float64Array(n);
    const fy = new Float64Array(n);

    let avgSpan = 0;
    let hasPinned = false;
    for (let i = 0; i < n; i++) {
        const b = genreCloudBodies[i];
        if (b.pinned) hasPinned = true;
        avgSpan += (b.w + b.h) * 0.5;
    }
    avgSpan = Math.max(20, avgSpan / n);
    // 面板尺度下限：拖远后仍能吸回；词跨度倍率保证密团内中程跟动
    const attractR = Math.max(
        avgSpan * GENRE_CLOUD_ATTRACT_SPAN,
        Math.min(boundsW, boundsH) * 0.58,
        220
    );
    const targetCx = boundsW * 0.5;
    const targetCy = boundsH * 0.5;
    const frame = genreCloudGroupFrame();
    // 拖拽时减弱回中，否则邻居被往反方向拽、跟动变差
    const centerScale = hasPinned ? GENRE_CLOUD_CENTER_DRAG_SCALE : 1;
    // 整团 → 面板中心：同一个加速度加在每个自由词上 = 刚体平移；带质心速度阻尼，不漂不荡
    const comAx = frame
        ? ((targetCx - frame.cx) * GENRE_CLOUD_CENTER - frame.velX * GENRE_CLOUD_CENTER_DAMP) * centerScale
        : 0;
    const comAy = frame
        ? ((targetCy - frame.cy) * GENRE_CLOUD_CENTER - frame.velY * GENRE_CLOUD_CENTER_DAMP) * centerScale
        : 0;
    // 分层力围绕词团自身质心：位置交给回中力，分层只负责形状，两者不再互相打架
    const shapeCx = frame ? frame.comX : targetCx;
    const shapeCy = frame ? frame.comY : targetCy;
    // 分层力：拖拽中降到 DRAG_GAIN（不夺跟手感），松手后平滑渐入回 1
    const rankTarget = hasPinned ? GENRE_CLOUD_RANK_DRAG_GAIN : 1;
    const rankRate = hasPinned ? 8 : GENRE_CLOUD_RANK_RAMP;
    genreCloudRankGain += (rankTarget - genreCloudRankGain) * Math.min(1, dt * rankRate);
    const rankGain = genreCloudRankGain;
    const rx = Math.max(1, boundsW * 0.5);
    const ry = Math.max(1, boundsH * 0.5);

    for (let i = 0; i < n; i++) {
        const a = genreCloudBodies[i];
        if (!a.pinned) {
            fx[i] += comAx * a.mass;
            fy[i] += comAy * a.mass;
            fx[i] += -GENRE_CLOUD_DAMP * a.vx * a.mass;
            fy[i] += -GENRE_CLOUD_DAMP * a.vy * a.mass;
            if (rankGain > 0.002) {
                // 目标半径按热度分层：大词半径小（居中），小词半径大（外围）
                let dx = (a.x + a.w * 0.5) - shapeCx;
                let dy = (a.y + a.h * 0.5) - shapeCy;
                let dist = Math.hypot(dx, dy);
                if (dist < 0.001) {
                    const ang = i * 2.399963;
                    dx = Math.cos(ang) * 0.01;
                    dy = Math.sin(ang) * 0.01;
                    dist = 0.01;
                }
                const nx = dx / dist;
                const ny = dy / dist;
                // 椭圆归一半径，让目标层随面板长宽比拉伸
                const u = Math.hypot(dx / rx, dy / ry) || 1e-6;
                const err = dist * (1 - (a.rankU || 0) / u);
                if (Math.abs(err) > GENRE_CLOUD_RANK_DEADZONE) {
                    const e = Math.max(-GENRE_CLOUD_RANK_MAX_ERR, Math.min(GENRE_CLOUD_RANK_MAX_ERR, err));
                    const dirGain = e < 0 ? GENRE_CLOUD_RANK_OUT_GAIN : 1;
                    const k = GENRE_CLOUD_RANK_K * rankGain * a.mass * dirGain;
                    fx[i] -= nx * k * e;
                    fy[i] -= ny * k * e;
                }
                // 径向阻尼 + 轻等向阻尼：按 mass 归一，大小词一起收敛不来回抖
                const vr = a.vx * nx + a.vy * ny;
                const dRad = GENRE_CLOUD_RANK_DAMP * rankGain * a.mass;
                fx[i] -= nx * dRad * vr;
                fy[i] -= ny * dRad * vr;
                const dIso = GENRE_CLOUD_RANK_DAMP_ISO * rankGain * a.mass;
                fx[i] -= a.vx * dIso;
                fy[i] -= a.vy * dIso;
            }
        }
        for (let j = i + 1; j < n; j++) {
            const b = genreCloudBodies[j];
            const ax = a.x + a.w * 0.5;
            const ay = a.y + a.h * 0.5;
            const bx = b.x + b.w * 0.5;
            const by = b.y + b.h * 0.5;
            const dx = bx - ax;
            const dy = by - ay;
            const dist = Math.hypot(dx, dy) || 0.001;
            const nx = dx / dist;
            const ny = dy / dist;
            const halfW = a.w * 0.5 + b.w * 0.5 + GENRE_CLOUD_COLLIDE_GAP;
            const halfH = a.h * 0.5 + b.h * 0.5 + GENRE_CLOUD_COLLIDE_GAP;
            const ox = halfW - Math.abs(dx);
            const oy = halfH - Math.abs(dy);
            // 两词都自由时按较小 mass 归一（动量守恒，整团不被内部力推着漂）；
            // 一侧被拖住时按受力者自身 mass 归一，大词也能被拖动的词推开/带走。
            const bothFree = !a.pinned && !b.pinned;
            const pairMin = Math.min(a.mass, b.mass);
            const scaleA = bothFree ? pairMin : a.mass;
            const scaleB = bothFree ? pairMin : b.mass;
            if (ox > 0 && oy > 0) {
                const sepX = ox < oy ? (dx < 0 ? -ox : ox) : 0;
                const sepY = ox < oy ? 0 : (dy < 0 ? -oy : oy);
                if (!a.pinned) {
                    fx[i] -= sepX * GENRE_CLOUD_COLLIDE * scaleA;
                    fy[i] -= sepY * GENRE_CLOUD_COLLIDE * scaleA;
                }
                if (!b.pinned) {
                    fx[j] += sepX * GENRE_CLOUD_COLLIDE * scaleB;
                    fy[j] += sepY * GENRE_CLOUD_COLLIDE * scaleB;
                }
            } else if (dist < attractR) {
                // 略低于 AABB 分离距即可吸，避免「只在极近壳层」才有力
                const minSep = Math.min(halfW, halfH) * 0.72;
                if (dist > minSep) {
                    const t = 1 - dist / attractR;
                    // 缓和衰减：中程仍有明显拉力（原 t² 在半半径处只剩 25%）
                    const falloff = t * (0.4 + 0.6 * t);
                    const pinnedBoost = bothFree ? 1 : GENRE_CLOUD_PINNED_ATTRACT;
                    const pull = GENRE_CLOUD_ATTRACT * falloff * pinnedBoost;
                    if (!a.pinned) {
                        fx[i] += nx * pull * scaleA;
                        fy[i] += ny * pull * scaleA;
                    }
                    if (!b.pinned) {
                        fx[j] -= nx * pull * scaleB;
                        fy[j] -= ny * pull * scaleB;
                    }
                }
            }
        }
    }

    for (let i = 0; i < n; i++) {
        const b = genreCloudBodies[i];
        if (b.pinned) {
            genreCloudClampBody(b, boundsW, boundsH, { bounce: false });
            genreCloudApplyBodyPos(b);
            continue;
        }
        const invM = 1 / b.mass;
        b.vx += fx[i] * invM * dt * 60;
        b.vy += fy[i] * invM * dt * 60;
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > GENRE_CLOUD_MAX_SPEED) {
            const s = GENRE_CLOUD_MAX_SPEED / sp;
            b.vx *= s;
            b.vy *= s;
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        genreCloudClampBody(b, boundsW, boundsH, { bounce: true });
    }

    // 词间分离后立刻硬夹回边框；多轮迭代让边框像不可穿透墙参与阻挡
    for (let iter = 0; iter < GENRE_CLOUD_WALL_ITERS; iter++) {
        genreCloudResolveOverlaps(genreCloudBodies);
        for (let i = 0; i < n; i++) {
            genreCloudClampBody(genreCloudBodies[i], boundsW, boundsH, { bounce: false });
        }
    }

    // 分离/夹边会吞掉一侧动量（贴角后力场也推不动），残留偏心在这里按位置直接收掉
    const after = genreCloudGroupFrame();
    const recenterGain = hasPinned
        ? GENRE_CLOUD_RECENTER_DRAG_GAIN
        : (after && after.speed < GENRE_CLOUD_RECENTER_CALM ? 1 : GENRE_CLOUD_RECENTER_MOVING_GAIN);
    genreCloudRecenterGroup(after, dt, boundsW, boundsH, recenterGain);

    for (let i = 0; i < n; i++) {
        genreCloudApplyBodyPos(genreCloudBodies[i]);
    }
}

function endGenreCloudDrag({ applyFilter = false } = {}) {
    const drag = genreCloudDrag;
    if (!drag) return;
    const { body, pointerId, moved, genre, el, pinned } = drag;
    genreCloudDrag = null;
    // 3.16a：纯点击（未过阈值）从未接管力场，松手不碰速度 / 不排重，只走筛选
    if (pinned) {
        el?.classList.remove("is-dragging");
        if (body) {
            body.pinned = false;
            if (!moved) {
                body.vx = 0;
                body.vy = 0;
            }
        }
    }
    if (moved) scheduleGenreCloudReflow();
    try {
        if (el?.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
    } catch (e) { /* ignore */ }
    if (applyFilter && !moved && genre) applyGenreFromCloud(genre);
}

function onGenreCloudPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    const root = $("#genre-cloud");
    const word = e.target.closest?.(".genre-cloud-word");
    if (!root || !word || !root.contains(word)) return;
    const body = genreCloudBodyAtEl(word);
    if (!body && !prefersReducedMotion()) return;
    const b = body || {
        el: word,
        w: word.offsetWidth || 1,
        h: word.offsetHeight || 1,
        x: parseFloat(word.style.left) || 0,
        y: parseFloat(word.style.top) || 0,
        vx: 0,
        vy: 0,
        mass: 1,
        pinned: false,
    };
    if (!body && prefersReducedMotion()) {
        // reduced-motion：无持续力场，仍允许拖位 + 短按筛选
    }
    hideGenreCloudTip();
    // 3.16a：按下先只记意图——不 pin、不打断松手重排、不动速度，
    // 越过 GENRE_CLOUD_DRAG_THRESHOLD 才接管力场，所以「点词筛选」对布局零扰动。
    genreCloudDrag = {
        body: b,
        el: word,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        lastT: performance.now(),
        grabDX: e.clientX - (word.getBoundingClientRect().left),
        grabDY: e.clientY - (word.getBoundingClientRect().top),
        moved: false,
        pinned: false,
        genre: word.dataset.genre || "",
    };
    try {
        word.setPointerCapture(e.pointerId);
    } catch (err) { /* ignore */ }
    e.preventDefault();
}

/** 拖拽确认：此刻才 pin、打断上一次归位并重新起帧；抓点按当前位置重算，避免起手跳位 */
function beginGenreCloudDragTakeover(drag, e) {
    cancelGenreCloudReflow();
    const rect = drag.el.getBoundingClientRect();
    drag.grabDX = e.clientX - rect.left;
    drag.grabDY = e.clientY - rect.top;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    drag.lastT = performance.now();
    drag.pinned = true;
    if (drag.body) {
        drag.body.pinned = true;
        drag.body.vx = 0;
        drag.body.vy = 0;
    }
    drag.el.classList.add("is-dragging");
    resumeGenreCloudMotion();
}

function onGenreCloudPointerDragMove(e) {
    const drag = genreCloudDrag;
    if (!drag || e.pointerId !== drag.pointerId) return;
    const root = genreCloudRootEl || $("#genre-cloud");
    if (!root) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) >= GENRE_CLOUD_DRAG_THRESHOLD) {
        drag.moved = true;
        hideGenreCloudTip();
        beginGenreCloudDragTakeover(drag, e);
    }
    if (!drag.moved) {
        moveGenreCloudTip(e, drag.el);
        return;
    }
    const rootRect = root.getBoundingClientRect();
    const b = drag.body;
    const prevX = b.x;
    const prevY = b.y;
    b.x = e.clientX - rootRect.left - drag.grabDX;
    b.y = e.clientY - rootRect.top - drag.grabDY;
    const { w: boundsW, h: boundsH } = genreCloudBoundsSize(root);
    genreCloudClampBody(b, boundsW, boundsH, { bounce: false });
    const now = performance.now();
    const dt = Math.max(0.008, (now - drag.lastT) / 1000);
    b.vx = (b.x - prevX) / dt;
    b.vy = (b.y - prevY) / dt;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    drag.lastT = now;
    genreCloudApplyBodyPos(b);
    if (prefersReducedMotion()) return;
    // 无持续 rAF 时（不应发生）仍推一把邻居；正常靠力场跟动
}

function onGenreCloudPointerUp(e) {
    const drag = genreCloudDrag;
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (drag.moved) {
        const b = drag.body;
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > GENRE_CLOUD_MAX_SPEED) {
            const s = GENRE_CLOUD_MAX_SPEED / sp;
            b.vx *= s;
            b.vy *= s;
        } else {
            b.vx *= 0.85;
            b.vy *= 0.85;
        }
    }
    endGenreCloudDrag({ applyFilter: true });
}

function onGenreCloudPointerMove(e) {
    if (genreCloudDrag) {
        onGenreCloudPointerDragMove(e);
        return;
    }
    const word = e.target.closest?.(".genre-cloud-word");
    if (!word || !$("#genre-cloud")?.contains(word)) {
        hideGenreCloudTip();
        return;
    }
    moveGenreCloudTip(e, word);
}

/** 只切 class / aria-pressed（颜色态）；绝不动 left/top/fontSize，也不触发装箱 */
function syncGenreCloudActive() {
    const root = $("#genre-cloud");
    if (!root) return;
    const active = ($("#filter-genre")?.value || "").trim();
    root.querySelectorAll(".genre-cloud-word").forEach(el => {
        const on = (el.dataset.genre || "") === active;
        el.classList.toggle("is-active", on);
        el.setAttribute("aria-pressed", on ? "true" : "false");
    });
}

function genreCloudMeasureItems(words) {
    return words.map(el => {
        el.classList.remove("is-vertical");
        el.style.transform = "";
        el.style.left = "0";
        el.style.top = "0";
        const hw = el.offsetWidth;
        const hh = el.offsetHeight;
        const canV = genreCloudCanVertical(el.dataset.genre || "");
        let vw = hw;
        let vh = hh;
        if (canV) {
            el.classList.add("is-vertical");
            vw = el.offsetWidth;
            vh = el.offsetHeight;
            el.classList.remove("is-vertical");
        }
        return { el, hw, hh, vw, vh, canV };
    });
}

function genreCloudPlaceItems(items, width) {
    const first = items[0];
    first.el.classList.remove("is-vertical");
    const placed = [{
        el: first.el,
        x: Math.round(-first.hw / 2 + first.hw * 0.05),
        y: Math.round(-first.hh / 2 - first.hh * 0.06),
        w: first.hw,
        h: first.hh,
        vertical: false,
    }];
    let vCount = 0;
    let hCount = 1;
    for (let i = 1; i < items.length; i++) {
        const slot = genreCloudPickSlot(items[i], placed, width, GENRE_CLOUD_GAP, vCount, hCount);
        if (!slot) continue;
        items[i].el.classList.toggle("is-vertical", !!slot.vertical);
        placed.push({ el: items[i].el, ...slot });
        if (slot.vertical) vCount += 1;
        else hCount += 1;
    }
    return placed;
}

function genreCloudPackExtent(placed) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < placed.length; i++) {
        const p = placed[i];
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        const r = p.x + p.w;
        const b = p.y + p.h;
        if (r > maxX) maxX = r;
        if (b > maxY) maxY = b;
    }
    return {
        minX,
        minY,
        packW: Math.max(1, maxX - minX),
        packH: Math.max(1, maxY - minY),
    };
}

function genreCloudFitScale(packW, packH, maxFont, wordCount, fullW) {
    const maxH = genreCloudMaxHeight();
    const availW = Math.max(8, fullW - GENRE_CLOUD_FILL_MARGIN * 2);
    const availH = Math.max(8, maxH - GENRE_CLOUD_HOVER_PAD - GENRE_CLOUD_PAD_BOTTOM);
    const fill = genreCloudFillTarget(wordCount);
    const { short } = genreCloudPanelBox();
    const sFit = Math.min(availW / packW, availH / packH);
    const sFill = sFit * fill;
    const sCap = (short * GENRE_CLOUD_MAX_RATIO_HARD) / Math.max(1, maxFont);
    return { s: Math.min(sFill, sCap, sFit), availH };
}

/** 先定显示字号区间：max 跟铺满估计；min 用 3.15l 半比拉开，大面板再抬到约 max/3.7（勿贴硬底 12） */
function genreCloudDisplayRange(minBase, maxBase, s) {
    const actualMax = Math.max(GENRE_CLOUD_SIZE_MIN, maxBase * s);
    const uniformMin = minBase * s;
    let actualMin = Math.max(GENRE_CLOUD_SIZE_MIN, uniformMin * GENRE_CLOUD_MIN_FILL_FACTOR);
    const contrastFloor = GENRE_CLOUD_SIZE_MIN * GENRE_CLOUD_TARGET_CONTRAST;
    if (actualMax >= contrastFloor) {
        const contrastMin = actualMax / GENRE_CLOUD_TARGET_CONTRAST;
        actualMin = Math.max(actualMin, Math.min(actualMax, contrastMin));
    }
    actualMin = Math.min(actualMax, actualMin);
    return { actualMin, actualMax };
}

function packGenreCloud(root) {
    if (!root) return;
    const words = [...root.querySelectorAll(".genre-cloud-word")];
    if (!words.length) {
        stopGenreCloudMotion();
        hideGenreCloudTip();
        resetGenreCloudBox(root);
        genreCloudPackedWidth = -1;
        return;
    }
    const fullW = Math.floor(root.clientWidth);
    const width = Math.max(8, fullW - GENRE_CLOUD_PAD_X * 2);
    if (fullW < 8) return;

    stopGenreCloudMotion();
    hideGenreCloudTip();
    root.style.transform = "";
    root.style.marginBottom = "";

    const sizes = words.map(el => parseFloat(el.dataset.baseSize) || GENRE_CLOUD_SIZE_MIN);
    const maxBase = Math.max(...sizes);
    const minBase = Math.min(...sizes);
    const spanBase = maxBase - minBase;

    for (let i = 0; i < words.length; i++) {
        words[i].style.fontSize = `${sizes[i]}px`;
    }
    const probe = genreCloudPackExtent(genreCloudPlaceItems(genreCloudMeasureItems(words), width));
    const estimate = genreCloudFitScale(probe.packW, probe.packH, maxBase, words.length, fullW);
    const { actualMin, actualMax } = genreCloudDisplayRange(minBase, maxBase, estimate.s);

    const dispSizes = [];
    for (let i = 0; i < words.length; i++) {
        const t = spanBase <= 0 ? 1 : (sizes[i] - minBase) / spanBase;
        const fontSize = actualMin + t * (actualMax - actualMin);
        dispSizes.push(fontSize);
        words[i].style.fontSize = `${fontSize}px`;
    }

    const placed = genreCloudPlaceItems(genreCloudMeasureItems(words), width);
    const { minX, minY, packW, packH } = genreCloudPackExtent(placed);
    const maxDisp = Math.max(...dispSizes);
    const minDisp = Math.min(...dispSizes);
    const fit = genreCloudFitScale(packW, packH, maxDisp, words.length, fullW);
    // 硬底 12 仅作绝对下限；大面板下 minDisp 已是可读线，等比缩时尽量保持
    const sFloor = GENRE_CLOUD_SIZE_MIN / Math.max(GENRE_CLOUD_SIZE_MIN, minDisp);
    const s2 = Math.min(1, fit.s);
    const s = s2 >= sFloor ? s2 : sFloor;
    const usedW = packW * s;
    const usedH = packH * s;
    const offsetX = (fullW - usedW) / 2;
    const extraY = (fit.availH - usedH) / 2;
    const offsetY = GENRE_CLOUD_HOVER_PAD + extraY;
    for (let i = 0; i < placed.length; i++) {
        const p = placed[i];
        const fontSize = Math.max(
            GENRE_CLOUD_SIZE_MIN,
            (parseFloat(p.el.style.fontSize) || minDisp) * s
        );
        p.el.style.fontSize = `${fontSize}px`;
        p.el.style.left = `${(p.x - minX) * s + offsetX}px`;
        p.el.style.top = `${(p.y - minY) * s + offsetY}px`;
    }
    // 固定用面板可用高度，不按词团 bbox 贴边收高度（否则铺满系数塌成 ~1，最小词回 12px）
    root.style.height = `${Math.ceil(fit.availH + GENRE_CLOUD_HOVER_PAD + GENRE_CLOUD_PAD_BOTTOM)}px`;
    root.style.transform = "";
    root.style.marginBottom = "";
    genreCloudPackedWidth = Math.round(root.clientWidth);
    startGenreCloudMotion(root);
}

function hideGenreCloudTip() {
    const tip = $("#genre-cloud-tip");
    if (!tip) return;
    tip.hidden = true;
    tip.textContent = "";
    tip.classList.remove("is-active");
}

function moveGenreCloudTip(e, word) {
    const tip = $("#genre-cloud-tip");
    if (!tip || !word) return;
    tip.textContent = word.dataset.count || "";
    tip.hidden = false;
    tip.classList.toggle("is-active", word.classList.contains("is-active"));
    tip.style.left = `${e.clientX + GENRE_CLOUD_TIP_OX}px`;
    tip.style.top = `${e.clientY + GENRE_CLOUD_TIP_OY}px`;
}

function renderGenreCloud() {
    const root = $("#genre-cloud");
    if (!root) return;
    hideGenreCloudTip();
    const counts = libraryCountsForCloud();
    if (state.filters) state.filters.genre_counts = counts;
    if (!counts.length) {
        root.innerHTML = `<p class="genre-cloud-empty">${tr("status.noGenreData")}</p>`;
        resetGenreCloudBox(root);
        genreCloudPackedWidth = -1;
        return;
    }
    const minCount = Math.min(...counts.map(c => c.count));
    const maxCount = Math.max(...counts.map(c => c.count));
    const { short } = genreCloudPanelBox();
    const sizeMin = GENRE_CLOUD_SIZE_MIN;
    const sizeMax = Math.max(sizeMin + 6, Math.round(short * GENRE_CLOUD_MAX_RATIO));
    const active = ($("#filter-genre")?.value || "").trim();
    const ordered = [...counts].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, uiLocaleTag()));
    root.innerHTML = ordered.map(item => {
        const st = genreCloudStyle(item.count, minCount, maxCount, sizeMin, sizeMax);
        const isActive = item.label === active;
        const displayLabel = genreDisplayLabel(item.label);
        return `<button type="button" class="genre-cloud-word${isActive ? " is-active" : ""}" data-genre="${escapeHtml(item.label)}" data-count="${item.count}" data-base-size="${st.size}" data-rank="${st.rank}" aria-label="${escapeHtml(displayLabel)}, ${item.count}" aria-pressed="${isActive ? "true" : "false"}" style="font-size:${st.size}px;font-weight:${st.weight};--genre-cloud-fg:${st.color}"><span class="genre-cloud-label">${escapeHtml(displayLabel)}</span></button>`;
    }).join("");
    packGenreCloud(root);
}

function onGenreCloudResizePointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    const handle = e.target.closest?.(".genre-cloud-resize");
    const panel = $(".modal-genre-cloud");
    if (!handle || !panel || !panel.contains(handle)) return;
    if (isGenreCloudUnavailable()) return;
    const dir = handle.getAttribute("data-dir") || "";
    if (!dir) return;
    e.preventDefault();
    e.stopPropagation();
    endGenreCloudDrag({ applyFilter: false });
    hideGenreCloudTip();
    const rect = panel.getBoundingClientRect();
    genreCloudResize = {
        dir,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startW: rect.width,
        startH: rect.height,
        startLeft: rect.left,
        startTop: rect.top,
    };
    document.body.classList.add("genre-cloud-is-resizing");
    try {
        handle.setPointerCapture(e.pointerId);
    } catch (err) { /* ignore */ }
}

function onGenreCloudResizePointerMove(e) {
    const drag = genreCloudResize;
    if (!drag || e.pointerId !== drag.pointerId) return;
    const panel = $(".modal-genre-cloud");
    if (!panel) return;
    const dir = drag.dir;
    const maxW = genreCloudMaxPanelWidth();
    const maxH = genreCloudMaxPanelHeight();
    const dockLeft = genreCloudDockLeft();
    let w = drag.startW;
    let h = drag.startH;
    let left = dockLeft;
    let top = drag.startTop;

    if (dir.includes("e")) {
        w = drag.startW + (e.clientX - drag.startX);
    }
    if (dir.includes("w")) {
        const proposedLeft = drag.startLeft + (e.clientX - drag.startX);
        left = Math.max(dockLeft, Math.round(proposedLeft));
        w = drag.startW + (drag.startLeft - left);
    }
    if (dir.includes("s")) {
        h = drag.startH + (e.clientY - drag.startY);
    }
    if (dir.includes("n")) {
        h = drag.startH - (e.clientY - drag.startY);
    }

    w = Math.max(GENRE_CLOUD_PANEL_MIN_W, Math.min(Math.round(w), maxW));
    h = Math.max(GENRE_CLOUD_PANEL_MIN_H, Math.min(Math.round(h), maxH));
    if (!dir.includes("w")) left = dockLeft;
    // 以中线为锚：高度变化时保持垂直居中感
    top = Math.round(drag.startTop + (drag.startH - h) / 2);
    const minTop = 8;
    const maxTop = Math.max(minTop, (window.innerHeight || 800) - h - 8);
    top = Math.max(minTop, Math.min(top, maxTop));
    // 西侧拖宽后右缘不越过视口
    if (dir.includes("w")) {
        const maxLeft = Math.max(dockLeft, (window.innerWidth || 1200) - w - 8);
        left = Math.min(left, maxLeft);
    }

    genreCloudPanelSize = { w, h };
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.transform = "none";
    panel.style.width = `${w}px`;
    panel.style.height = `${h}px`;
    panel.style.minWidth = `${GENRE_CLOUD_PANEL_MIN_W}px`;
    panel.style.maxWidth = `${maxW}px`;
    panel.style.minHeight = `${GENRE_CLOUD_PANEL_MIN_H}px`;
    panel.style.maxHeight = `${maxH}px`;

    // 拖拽中先更新硬边界，松手后再重装箱
    genreCloudSyncBox($("#genre-cloud"));
}

function onGenreCloudResizePointerUp(e) {
    const drag = genreCloudResize;
    if (!drag || e.pointerId !== drag.pointerId) return;
    genreCloudResize = null;
    document.body.classList.remove("genre-cloud-is-resizing");
    saveGenreCloudPanelSize();
    // 回到侧栏贴边 + 垂直居中，尺寸保留
    syncGenreCloudPlacement();
    genreCloudSchedulePackAfterResize();
}

function initGenreCloudLayout() {
    loadGenreCloudPanelSize();
    const root = $("#genre-cloud");
    const panel = $(".modal-genre-cloud");
    if (root && typeof ResizeObserver !== "undefined") {
        new ResizeObserver(() => {
            if ($("#genre-cloud-modal")?.classList.contains("hidden")) return;
            // 面板 resize / 拖词 / 侧栏拖动中：只夹回硬边界，松手后再判断要不要重铺
            if (genreCloudResize || genreCloudDrag || document.body.classList.contains("panel-is-dragging")) {
                genreCloudClampBodiesToBounds();
                return;
            }
            // 3.16a：只有词区宽度实质变化才重装箱；高度变化或微抖动只夹回边界，保持坐标
            if (!genreCloudNeedsRepack(root)) {
                genreCloudClampBodiesToBounds();
                return;
            }
            packGenreCloud(root);
        }).observe(root);
    }
    window.addEventListener("resize", () => {
        if (genreCloudResize) return;
        loadGenreCloudPanelSize();
        relayoutGenreCloudIfOpen();
    });
    root?.addEventListener("pointerdown", onGenreCloudPointerDown);
    root?.addEventListener("pointermove", onGenreCloudPointerMove);
    root?.addEventListener("pointerup", onGenreCloudPointerUp);
    root?.addEventListener("pointercancel", (e) => {
        if (genreCloudDrag && e.pointerId === genreCloudDrag.pointerId) {
            endGenreCloudDrag({ applyFilter: false });
        }
        hideGenreCloudTip();
    });
    root?.addEventListener("pointerleave", () => {
        if (!genreCloudDrag) hideGenreCloudTip();
    });
    panel?.addEventListener("pointerdown", onGenreCloudResizePointerDown);
    panel?.addEventListener("pointermove", onGenreCloudResizePointerMove);
    panel?.addEventListener("pointerup", onGenreCloudResizePointerUp);
    panel?.addEventListener("pointercancel", onGenreCloudResizePointerUp);
}

async function openGenreCloudModal() {
    if (isGenreCloudUnavailable()) return;
    const modal = $("#genre-cloud-modal");
    const btn = $("#btn-genre-cloud");
    if (!modal) return;
    try {
        await loadFilters();
    } catch (e) {
        if (state.filters) {
            state.filters.genre_counts = resolveGenreCounts(state.filters);
        }
    }
    if (isGenreCloudUnavailable()) return;
    modal.classList.remove("hidden");
    document.documentElement.classList.add("genre-cloud-open");
    loadGenreCloudPanelSize();
    syncGenreCloudPlacement();
    renderGenreCloud();
    if (document.fonts?.ready) {
        document.fonts.ready.then(() => {
            if (!modal.classList.contains("hidden")) packGenreCloud($("#genre-cloud"));
        });
    }
    if (btn) btn.setAttribute("aria-expanded", "true");
}

function closeGenreCloudModal() {
    const modal = $("#genre-cloud-modal");
    const btn = $("#btn-genre-cloud");
    hideGenreCloudTip();
    stopGenreCloudMotion();
    if (genreCloudResizePackTimer) {
        clearTimeout(genreCloudResizePackTimer);
        genreCloudResizePackTimer = 0;
    }
    genreCloudResize = null;
    document.body.classList.remove("genre-cloud-is-resizing");
    document.documentElement.classList.remove("genre-cloud-open");
    if (modal) modal.classList.add("hidden");
    clearGenreCloudPlacement();
    if (btn) {
        btn.setAttribute("aria-expanded", "false");
        if (!btn.hidden && !isGenreCloudUnavailable()) btn.focus();
    }
}

function applyGenreFromCloud(label) {
    const genreEl = $("#filter-genre");
    if (!genreEl) return;
    const value = String(label || "").trim();
    if (value && ![...genreEl.options].some(o => o.value === value)) {
        populateGenreFilter([...(state.filters?.genres || []), value]);
    }
    genreEl.value = value;
    syncGenreCloudActive();
    doSearch();
}

// ===== 上传 & 识别流程（新） =====

async function openUploadModal() {
    if (!requireEditUnlocked()) return;
    $("#upload-modal").classList.remove("hidden");
    refreshDynamicUi();
    // 加载已有图片
    try {
        const data = await api("/images");
        state.existingImages = data.images.filter(img => img.image_type !== "panoramic");
    } catch (e) {
        state.existingImages = [];
    }
    state.existingSelected = {};
    resetUploadUI();
    updateUploadButton();
}

function closeUploadModal() {
    $("#upload-modal").classList.add("hidden");
    state.uploadFiles = [];
    state.batchId = null;
    state.analysisResults = [];
    state.existingImages = [];
    state.existingSelected = {};
    $("#btn-start-upload").disabled = true;
    $("#btn-start-upload").textContent = tr("upload.start");
    placementState.images = [];
    placementState.rects = {};
    placementState.activeImageId = null;
    placementState.dragInfo = null;
}

function resetUploadUI() {
    state.uploadFiles = [];
    state.batchId = null;
    state.analysisResults = [];
    state.selectedMatches = {};
    state.rejectedDiscs = {};
    state.existingSelected = {};
    $("#upload-preview").innerHTML = "";
    $("#upload-input").value = "";

    // 渲染已有照片
    renderExistingPhotos();

    // 显示步骤1
    $$("#steps-indicator .step").forEach(s => { s.classList.remove("active", "done"); });
    $$("#steps-indicator .step-connector").forEach(c => c.classList.remove("done"));
    $("#steps-indicator").querySelector('[data-step="1"]').classList.add("active");
    $("#step-upload").classList.remove("hidden");
    $("#step-analyzing").classList.add("hidden");
    $("#step-match").classList.add("hidden");
    $("#step-placement").classList.add("hidden");

    updateUploadButton();
}

function getSelectedExistingIds() {
    return Object.keys(state.existingSelected).map(Number).filter(id => !isNaN(id));
}

function getExistingIdsForAnalyze() {
    const selected = getSelectedExistingIds();
    if (selected.length > 0) return selected;
    return state.existingImages.map(img => img.id);
}

function renderExistingPhotos() {
    const section = $("#existing-photos-section");
    const grid = $("#existing-photos-grid");
    const countEl = $("#existing-photos-count");

    // 清理已不存在的选中项
    const validIds = new Set(state.existingImages.map(img => img.id));
    Object.keys(state.existingSelected).forEach(id => {
        if (!validIds.has(Number(id))) delete state.existingSelected[id];
    });

    if (state.existingImages.length === 0) {
        section.classList.add("hidden");
        updateExistingPhotosActions();
        return;
    }

    section.classList.remove("hidden");
    countEl.textContent = state.existingImages.length;
    grid.innerHTML = state.existingImages.map(img => {
        const label = img.display_name || img.original_filename || img.filename || "";
        const short = label.length > 14 ? label.slice(0, 12) + "…" : label;
        const checked = state.existingSelected[img.id] ? "checked" : "";
        const selClass = state.existingSelected[img.id] ? "selected" : "";
        const boxBadge = img.has_spine_boxes
            ? `<span class="existing-photo-box-badge" title="${tr("upload.savedBoxes", { count: img.spine_box_count || 0 })}">${img.spine_box_count || 0}</span>`
            : "";
        return `
        <div class="existing-photo-item ${selClass}" id="existing-photo-${img.id}"
             title="${escapeHtml(label)}${img.has_spine_boxes ? tr("upload.storedBoxes", { count: img.spine_box_count }) : ""}"
             onclick="toggleExistingPhoto(${img.id}, event)">
            <input type="checkbox" class="existing-photo-checkbox" ${checked}
                   onchange="onExistingPhotoCheckbox(${img.id}, this.checked, event)">
            ${boxBadge}
            <button type="button" class="existing-photo-edit-boxes" title=tr("dialog.spineBoxes")
                    onclick="openSpineBoxesEditor(${img.id}, event)">${DISC_CARD_ICONS.crop}</button>
            <img src="${img.url}" alt="${escapeHtml(label)}" loading="lazy" onerror="this.style.display='none'">
            <div class="existing-photo-label">${escapeHtml(short)}</div>
        </div>`;
    }).join("");
    updateExistingPhotosActions();
}

function toggleExistingPhoto(imageId, evt) {
    if (evt && (evt.target.classList.contains("existing-photo-checkbox")
        || evt.target.closest(".existing-photo-edit-boxes"))) return;
    const checked = !state.existingSelected[imageId];
    onExistingPhotoCheckbox(imageId, checked, evt);
    const cb = document.querySelector(`#existing-photo-${imageId} .existing-photo-checkbox`);
    if (cb) cb.checked = checked;
}

function onExistingPhotoCheckbox(imageId, checked, evt) {
    if (evt) evt.stopPropagation();
    if (checked) {
        state.existingSelected[imageId] = true;
    } else {
        delete state.existingSelected[imageId];
    }
    const item = document.getElementById(`existing-photo-${imageId}`);
    if (item) item.classList.toggle("selected", checked);
    updateExistingPhotosActions();
    updateUploadButton();
}

function toggleSelectAllExistingPhotos() {
    const allIds = state.existingImages.map(img => img.id);
    const selectedCount = getSelectedExistingIds().length;
    const allSelected = allIds.length > 0 && selectedCount === allIds.length;
    if (allSelected) {
        state.existingSelected = {};
    } else {
        state.existingSelected = {};
        allIds.forEach(id => { state.existingSelected[id] = true; });
    }
    renderExistingPhotos();
    updateUploadButton();
}

function updateExistingPhotosActions() {
    const count = getSelectedExistingIds().length;
    const total = state.existingImages.length;
    const selectBtn = $("#btn-existing-select-all");
    const label = $("#existing-photos-selected-label");
    const reprocessBtn = $("#btn-existing-reprocess");
    const deleteBtn = $("#btn-existing-delete");
    const editBoxesBtn = $("#btn-existing-edit-boxes");
    const stage2Btn = $("#btn-existing-stage2");

    if (!selectBtn || !label || !reprocessBtn || !deleteBtn) return;

    if (total > 0 && count === total) {
        selectBtn.textContent = `☑ ${tr("action.deselectAll")}`;
    } else {
        selectBtn.textContent = count > 0 ? `☑ ${tr("action.selectCount", { count })}` : `☐ ${tr("action.selectAll")}`;
    }

    label.textContent = count > 0 ? tr("status.selectedCount", { count }) : tr("status.noSelection");
    reprocessBtn.disabled = count === 0;
    deleteBtn.disabled = count === 0;
    setBtnLabel(reprocessBtn, count > 0 ? tr("upload.reprocessSelectedCount", { count }) : tr("upload.reprocessSelected"));
    setBtnLabel(deleteBtn, count > 0 ? tr("upload.deleteSelectedCount", { count }) : tr("upload.deleteSelected"));

    if (editBoxesBtn) {
        editBoxesBtn.disabled = count !== 1;
        setBtnLabel(editBoxesBtn, count === 1 ? tr("upload.editSpineBoxes") : tr("upload.editSpineBoxesPickOne"));
    }
    if (stage2Btn) {
        stage2Btn.disabled = count === 0;
        setBtnLabel(stage2Btn, count > 0 ? tr("upload.stage2Count", { count }) : tr("upload.stage2"));
    }
}

function updateUploadButton() {
    const hasNewFiles = state.uploadFiles.length > 0;
    const hasExisting = state.existingImages.length > 0;
    const selectedCount = getSelectedExistingIds().length;
    const btn = $("#btn-start-upload");

    if (hasNewFiles) {
        btn.disabled = false;
        if (selectedCount > 0) {
            btn.textContent = tr("upload.uploadNewAndSelected", { newCount: state.uploadFiles.length, selCount: selectedCount });
        } else if (hasExisting) {
            btn.textContent = tr("upload.uploadNewAndAll", { newCount: state.uploadFiles.length, existCount: state.existingImages.length });
        } else {
            btn.textContent = tr("upload.startCount", { count: state.uploadFiles.length });
        }
    } else if (selectedCount > 0) {
        btn.disabled = false;
        btn.textContent = tr("upload.reanalyzeSelectedOnly", { count: selectedCount });
    } else if (hasExisting) {
        btn.disabled = false;
        btn.textContent = tr("upload.reanalyzeExisting", { count: state.existingImages.length });
    } else {
        btn.disabled = true;
        btn.textContent = tr("upload.start");
    }
}

function handleFileSelect(files) {
    if (!requireEditUnlocked()) return;
    state.uploadFiles = Array.from(files);
    const preview = $("#upload-preview");
    preview.innerHTML = state.uploadFiles.map((f, i) => {
        const url = URL.createObjectURL(f);
        return `<div class="upload-preview-item">
            <img src="${url}" alt="${f.name}">
            <button class="upload-preview-remove" onclick="removeFile(${i})">✕</button>
        </div>`;
    }).join("");
    updateUploadButton();
}

function removeFile(idx) {
    if (!requireEditUnlocked()) return;
    state.uploadFiles.splice(idx, 1);
    handleFileSelect(state.uploadFiles);
}

async function startUploadAndAnalyze() {
    if (!requireEditUnlocked()) return;
    const hasNewFiles = state.uploadFiles.length > 0;
    const existingIdsToAnalyze = getExistingIdsForAnalyze();
    const hasExisting = existingIdsToAnalyze.length > 0;

    if (!hasNewFiles && !hasExisting) return;

    // 切换到步骤2
    $("#step-upload").classList.add("hidden");
    $("#step-analyzing").classList.remove("hidden");
    const step2 = $("#steps-indicator").querySelector('[data-step="2"]');
    step2.classList.add("active");
    $("#steps-indicator").querySelector('[data-step="1"]').classList.add("done");
    $("#steps-indicator").querySelector(".step-connector").classList.add("done");

    const progressFill = $("#analyze-progress-fill");
    const textEl = $("#analyzing-text");
    const detailEl = $("#analyzing-detail");

    progressFill.style.width = "0%";
    detailEl.innerHTML = "";

    try {
        let batchId;
        let total;
        let analyzeImages = [];

        if (hasNewFiles) {
            // 上传新文件
            textEl.textContent = tr("upload.uploading");
            const formData = new FormData();
            state.uploadFiles.forEach(f => formData.append("images", f));
            formData.append("type", "closeup");

            const uploadResult = await fetch("/api/batch/process", {
                method: "POST",
                body: formData,
            });
            const batchData = await uploadResult.json();
            if (!uploadResult.ok) throw new Error(batchData.error || "上传失败");

            batchId = batchData.batch_id;
            analyzeImages = batchData.images;
            total = batchData.total;
            progressFill.style.width = "10%";
            textEl.textContent = tr("upload.uploadedAnalyzing", { count: total });

            updateAnalyzingDetail(analyzeImages);

        } else if (hasExisting) {
            // 重新分析已有照片（优先选中项）
            textEl.textContent = tr("upload.reanalyzingExisting");
            const imageIds = existingIdsToAnalyze;

            const reprocessResult = await api("/images/batch-reprocess", {
                method: "POST",
                body: { image_ids: imageIds },
            });

            batchId = reprocessResult.batch_id;
            analyzeImages = reprocessResult.images;
            total = reprocessResult.total;
            progressFill.style.width = "10%";
            textEl.textContent = tr("upload.analyzingExisting", { count: total });

            updateAnalyzingDetail(analyzeImages);
        }

        // 如果也有已有照片需要也加入到批处理
        if (hasNewFiles && hasExisting) {
            // 先等新照片分析完
            await pollBatchProgress(batchId, total, progressFill, textEl, detailEl);

            // 收集新照片结果
            const status1 = await api(`/batch/process/${batchId}`);
            const newResults = status1.results || [];
            state.analysisResults = [...newResults];

            // 再分析现有的照片（优先选中项）
            const reprocessResult = await api("/images/batch-reprocess", {
                method: "POST",
                body: { image_ids: existingIdsToAnalyze },
            });
            const batchId2 = reprocessResult.batch_id;
            const analyzeImages2 = reprocessResult.images;
            const total2 = reprocessResult.total;

            updateAnalyzingDetail(analyzeImages2);
            textEl.textContent = tr("upload.analyzingExisting", { count: total2 });
            await pollBatchProgress(batchId2, total2, progressFill, textEl, detailEl);

            const status2 = await api(`/batch/process/${batchId2}`);
            const existingResults = status2.results || [];
            state.analysisResults = [...newResults, ...existingResults];
        } else {
            await pollBatchProgress(batchId, total, progressFill, textEl, detailEl);
        }

        // 切换到步骤3
        $("#step-analyzing").classList.add("hidden");
        $("#step-match").classList.remove("hidden");
        const step3 = $("#steps-indicator").querySelector('[data-step="3"]');
        step3.classList.add("active");
        step2.classList.remove("active");
        step2.classList.add("done");
        $$("#steps-indicator .step-connector")[1].classList.add("done");

        renderMatchResults();

    } catch (e) {
        textEl.textContent = tr("toast.processFailed", { message: e.message });
        showToast(tr("toast.processFailed", { message: e.message }), "error");
    }
}

async function reprocessSelectedExistingPhotos() {
    if (!requireEditUnlocked()) return;
    const ids = getSelectedExistingIds();
    if (ids.length === 0) {
        showToast(tr("toast.selectPhotosToAnalyze"), "error");
        return;
    }
    if (!confirm(tr("confirm.reprocessBatch", { count: ids.length }))) return;
    // 主流程已支持“有选中则只分析选中”
    await startUploadAndAnalyze();
}

async function deleteSelectedExistingPhotos() {
    if (!requireEditUnlocked()) return;
    const ids = getSelectedExistingIds();
    if (ids.length === 0) {
        showToast(tr("toast.selectPhotosToDelete"), "error");
        return;
    }
    if (!confirm(tr("confirm.deleteBatch", { count: ids.length }))) return;

    const deleteBtn = $("#btn-existing-delete");
    const reprocessBtn = $("#btn-existing-reprocess");
    if (deleteBtn) deleteBtn.disabled = true;
    if (reprocessBtn) reprocessBtn.disabled = true;

    try {
        const result = await api("/images/batch-delete", {
            method: "POST",
            body: { image_ids: ids },
        });

        showToast(tr("toast.batchDeleteSuccess", { count: result.count }), "success");
        const deletedSet = new Set(result.deleted || ids);
        state.existingImages = state.existingImages.filter(img => !deletedSet.has(img.id));
        state.existingSelected = {};
        renderExistingPhotos();
        updateUploadButton();
        await loadDiscs();
        await loadFilters();
        await loadStats();
    } catch (e) {
        showToast(tr("toast.deleteFailed", { message: e.message }), "error");
        updateExistingPhotosActions();
    }
}

// ===== 碟脊框编辑 / Stage2 =====

function openSpineBoxesEditor(imageId, evt) {
    if (evt) {
        evt.preventDefault();
        evt.stopPropagation();
    }
    if (!requireEditUnlocked()) return;
    const img = state.existingImages.find(x => x.id === imageId);
    const title = $("#spine-boxes-modal-title");
    if (title) {
        const name = img ? (img.display_name || img.original_filename || img.filename) : `#${imageId}`;
        setIconTitle(title, "crop", `${tr("dialog.spineBoxes")} — ${name}`);
    }
    const iframe = $("#spine-boxes-iframe");
    const modal = $("#spine-boxes-modal");
    if (!iframe || !modal) {
        showToast(tr("toast.editorNotReady"), "error");
        return;
    }
    iframe.src = `/static/spine_boxes_editor.html?v=5.0c&embed=1&image_id=${imageId}`;
    refreshDynamicUi();
    modal.classList.remove("hidden");
}

function closeSpineBoxesEditor() {
    const modal = $("#spine-boxes-modal");
    const iframe = $("#spine-boxes-iframe");
    if (modal) modal.classList.add("hidden");
    if (iframe) iframe.src = "about:blank";
}

async function openSpineBoxesEditorForSelection() {
    if (!requireEditUnlocked()) return;
    const ids = getSelectedExistingIds();
    if (ids.length !== 1) {
        showToast(tr("toast.selectOnePhoto"), "error");
        return;
    }
    openSpineBoxesEditor(ids[0]);
}

async function refreshExistingImagesMeta() {
    try {
        const data = await api("/images");
        const selected = { ...state.existingSelected };
        state.existingImages = (data.images || []).filter(img => img.image_type !== "panoramic");
        state.existingSelected = {};
        state.existingImages.forEach(img => {
            if (selected[img.id]) state.existingSelected[img.id] = true;
        });
        renderExistingPhotos();
        updateUploadButton();
    } catch (e) {
        /* ignore */
    }
}

window.addEventListener("message", (e) => {
    const data = e.data || {};
    if (data.type === "spine-boxes-saved" && data.imageId) {
        const img = state.existingImages.find(x => x.id === data.imageId);
        if (img) {
            img.has_spine_boxes = (data.spineCount || 0) > 0;
            img.spine_box_count = data.spineCount || 0;
            renderExistingPhotos();
        }
        showToast(tr("toast.spineBoxesSaved", { count: data.spineCount || 0 }), "success");
    }
});

async function runStage2OnSelected() {
    if (!requireEditUnlocked()) return;
    const ids = getSelectedExistingIds();
    if (ids.length === 0) {
        showToast(tr("toast.selectPhotosStage2"), "error");
        return;
    }
    const missing = ids.filter(id => {
        const img = state.existingImages.find(x => x.id === id);
        return !img || !img.has_spine_boxes;
    });
    if (missing.length) {
        showToast(tr("toast.missingSpineBoxes", { count: missing.length }), "error");
        return;
    }
    if (!confirm(
        tr("confirm.stage2", { count: ids.length })
    )) return;

    $("#step-upload").classList.add("hidden");
    $("#step-analyzing").classList.remove("hidden");
    $("#step-match").classList.add("hidden");
    $("#step-placement").classList.add("hidden");
    $$("#steps-indicator .step").forEach(s => s.classList.remove("active", "done"));
    const step2 = $("#steps-indicator").querySelector('[data-step="2"]');
    if (step2) step2.classList.add("active");

    const progressFill = $("#analyze-progress-fill");
    const textEl = $("#analyzing-text");
    const detailEl = $("#analyzing-detail");
    if (progressFill) progressFill.style.width = "0%";
    if (textEl) textEl.textContent = tr("upload.stage2Running");
    if (detailEl) {
        detailEl.innerHTML = ids.map(id => {
            const img = state.existingImages.find(x => x.id === id) || {};
            const name = img.display_name || img.original_filename || img.filename || `#${id}`;
            return `<div class="analyzing-item is-pending" id="stage2-item-${id}">
                <div class="analyzing-meta">
                    <div class="analyzing-label">等待</div>
                    <div class="analyzing-name">${escapeHtml(name)}</div>
                </div>
            </div>`;
        }).join("");
    }

    try {
        const start = await api("/batch/stage2", {
            method: "POST",
            body: {
                image_ids: ids,
                reset_existing: true,
                import: true,
                confirmed: 1,
                require_layout: false,
            },
        });
        const batchId = start.batch_id;
        let done = false;
        while (!done) {
            await new Promise(r => setTimeout(r, 1200));
            const st = await api(`/tasks/${batchId}`);
            const task = st;
            const pct = task.progress || 0;
            if (progressFill) progressFill.style.width = `${pct}%`;
            if (textEl) textEl.textContent = task.message || tr("upload.stage2Progress", { pct });
            const results = task.results || [];
            results.forEach(r => {
                const el = document.getElementById(`stage2-item-${r.image_id}`);
                if (!el) return;
                el.classList.toggle("is-processing", !r.ok && !r.error);
                el.classList.toggle("is-done", !!r.ok);
                el.classList.toggle("is-error", !!r.error);
                const label = el.querySelector(".analyzing-label");
                if (label) {
                    if (r.error) label.textContent = tr("status.failed");
                    else if (r.ok) label.textContent = tr("upload.stage2ItemDone", { matched: r.matched || 0, spines: r.spine_count || 0, imported: r.imported || 0 });
                    else label.textContent = tr("status.processing");
                }
            });
            if (task.status === "done" || task.status === "error") {
                done = true;
                const okCount = (task.results || []).filter(r => r.ok).length;
                const failCount = (task.results || []).filter(r => !r.ok).length;
                if (task.status === "error") {
                    showToast(task.message || tr("toast.stage2Failed", { message: "" }), "error");
                } else {
                    showToast(tr("toast.stage2Done", { ok: okCount, fail: failCount }), failCount ? "error" : "success");
                }
                await loadDiscs();
                await loadFilters();
                await loadStats();
                await refreshExistingImagesMeta();
                // 回到上传步骤，方便继续改框
                $("#step-analyzing").classList.add("hidden");
                $("#step-upload").classList.remove("hidden");
                $$("#steps-indicator .step").forEach(s => s.classList.remove("active", "done"));
                $("#steps-indicator").querySelector('[data-step="1"]')?.classList.add("active");
            }
        }
    } catch (e) {
        if (textEl) textEl.textContent = tr("toast.stage2Failed", { message: e.message });
        showToast(tr("toast.stage2Failed", { message: e.message }), "error");
        $("#step-analyzing").classList.add("hidden");
        $("#step-upload").classList.remove("hidden");
        $$("#steps-indicator .step").forEach(s => s.classList.remove("active", "done"));
        $("#steps-indicator").querySelector('[data-step="1"]')?.classList.add("active");
    }
}

function updateAnalyzingDetail(images) {
    const detail = $("#analyzing-detail");
    detail.innerHTML = images.map((img, idx) => {
        const url = img.url || (img.filename ? `/uploads/${img.filename}` : "");
        const name = img.original_filename || img.filename || `Image #${img.image_id}`;
        const stateClass = idx === 0 ? "is-processing" : "is-pending";
        const label = idx === 0 ? tr("status.analyzing") : tr("status.waiting");
        return `<div class="analyzing-item ${stateClass}" id="item-${img.image_id}" data-image-id="${img.image_id}">
            <div class="analyzing-thumb">
                <img src="${escapeHtml(url)}" alt="${escapeHtml(name)}" loading="lazy">
                <div class="analyzing-scan-overlay" aria-hidden="true"></div>
                <div class="analyzing-badge" aria-hidden="true"></div>
            </div>
            <div class="analyzing-meta">
                <div class="analyzing-label">${label}</div>
                <div class="analyzing-name" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
                <div class="analyzing-extra"></div>
            </div>
        </div>`;
    }).join("");
}

function setAnalyzingItemState(card, stateName, label, extraHtml = "") {
    card.classList.remove("is-pending", "is-processing", "is-done", "is-error");
    card.classList.add(stateName);
    const labelEl = card.querySelector(".analyzing-label");
    const badgeEl = card.querySelector(".analyzing-badge");
    const extraEl = card.querySelector(".analyzing-extra");
    if (labelEl) labelEl.textContent = label;
    if (extraEl) extraEl.innerHTML = extraHtml || "";
    if (badgeEl) {
        if (stateName === "is-done") badgeEl.textContent = "✅";
        else if (stateName === "is-error") badgeEl.textContent = "❌";
        else badgeEl.textContent = "";
    }
}

function refreshAnalyzingCards(detailEl, results) {
    const resultMap = new Map();
    (results || []).forEach(r => resultMap.set(String(r.image_id), r));

    const cards = detailEl.querySelectorAll(".analyzing-item");
    let markedProcessing = false;

    cards.forEach(card => {
        const id = String(card.dataset.imageId);
        const r = resultMap.get(id);

        if (r && r.status === "done") {
            let extra = "";
            if (r.analysis && r.analysis.best_title) {
                extra = `<span class="item-title">${escapeHtml(r.analysis.best_title)}</span>`;
            } else if (r.disc_count !== undefined) {
                extra = `<span class="item-title">${tr("upload.analyzeItemTitle", { count: r.disc_count })}</span>`;
            }
            setAnalyzingItemState(card, "is-done", tr("status.done"), extra);
            return;
        }

        if (r && r.status === "error") {
            const err = escapeHtml(r.error || tr("upload.analyzeFail"));
            setAnalyzingItemState(card, "is-error", tr("status.failed"), `<span class="item-error">${err}</span>`);
            return;
        }

        if (!markedProcessing) {
            setAnalyzingItemState(card, "is-processing", tr("status.analyzing"));
            markedProcessing = true;
        } else {
            setAnalyzingItemState(card, "is-pending", tr("status.waiting"));
        }
    });
}

async function pollBatchProgress(batchId, total, progressFill, textEl, detailEl, weightScale = 1.0) {
    for (let attempt = 0; attempt < 300; attempt++) {
        await sleep(2000);
        const status = await api(`/batch/process/${batchId}`);
        const pct = status.progress || 0;
        progressFill.style.width = `${Math.min(100, (10 + pct * 0.9) * weightScale)}%`;
        textEl.textContent = tr("upload.analyzingProgress", { done: status.completed || 0, total });

        refreshAnalyzingCards(detailEl, status.results);

        if (status.status === "done" || status.status === "error") {
            state.analysisResults = status.results || [];
            progressFill.style.width = "100%";
            textEl.textContent = tr("upload.analyzingComplete", { count: total });
            refreshAnalyzingCards(detailEl, status.results);
            // 全部结束后不再保留 processing 态
            detailEl.querySelectorAll(".analyzing-item.is-processing").forEach(card => {
                setAnalyzingItemState(card, "is-pending", tr("status.waiting"));
            });
            return;
        }
    }
    throw new Error(tr("toast.reanalyzeTimeout"));
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== 匹配结果渲染 =====

function matchStatusLabel(sel, isAuto, isRejected) {
    if (isRejected) return { text: tr("match.rejected"), cls: "error", title: tr("match.rejectedHint") };
    if (isAuto && sel && !sel.suggested) {
        return { text: tr("match.autoMatched"), cls: "matched", title: tr("match.autoMatchedHint") };
    }
    if (sel && !sel.suggested) {
        return { text: tr("match.selected"), cls: "matched", title: tr("match.selectedHint") };
    }
    if (sel && sel.suggested) {
        return { text: tr("match.suggested"), cls: "pending", title: tr("match.suggestedHint") };
    }
    return { text: tr("match.unselected"), cls: "pending", title: tr("match.unselectedHint") };
}

function renderMatchResults() {
    const results = state.analysisResults;

    // 全局 selectedMatches
    if (!state.selectedMatches) state.selectedMatches = {};
    if (!state.rejectedDiscs) state.rejectedDiscs = {};

    // 预选：自动匹配 / 或待确认碟片的首个候选（suggested，可点击更换）
    results.forEach((r, imgIdx) => {
        (r.discs || []).forEach((d, discIdx) => {
            const key = `${imgIdx}_${discIdx}`;
            if (state.rejectedDiscs[key] || state.selectedMatches[key]) return;
            if (d.auto_matched && d.auto_matched.tmdb_id) {
                state.selectedMatches[key] = {
                    tmdb_id: d.auto_matched.tmdb_id,
                    media_type: normalizeTmdbMediaType(d.auto_matched.media_type || d.auto_matched.tmdb_media_type),
                    candidate_idx: 0,
                };
                return;
            }
            const candidates = d.candidates || [];
            if (candidates.length > 0 && candidates[0].tmdb_id) {
                state.selectedMatches[key] = {
                    tmdb_id: candidates[0].tmdb_id,
                    media_type: normalizeTmdbMediaType(candidates[0].media_type),
                    candidate_idx: 0,
                    suggested: true,
                };
            }
        });
    });

    updateMatchSummary();

    $("#match-list").innerHTML = results.map((r, imgIdx) => {
        const imgSrc = r.url || "";
        const discs = r.discs || [];
        const displayName = r.original_filename || r.filename;
        const photoBadge = r.status === "error"
            ? `<span class="match-photo-badge error">${tr("match.photoFailed")}</span>`
            : `<span class="match-photo-badge">${tr("match.photoDone", { count: discs.length })}</span>`;

        let discsHtml = "";
        discs.forEach((d, discIdx) => {
            const isAuto = !!d.auto_matched;
            const key = `${imgIdx}_${discIdx}`;
            const sel = state.selectedMatches[key];
            const isRejected = !!(state.rejectedDiscs && state.rejectedDiscs[key]);
            const status = matchStatusLabel(sel, isAuto, isRejected);
            const candidates = d.candidates || [];

            let candidatesHtml = "";
            if (candidates.length > 0) {
                candidatesHtml = candidates.map((c, ci) => {
                    const cType = normalizeTmdbMediaType(c.media_type);
                    const isSelected = sel && sel.tmdb_id === c.tmdb_id
                        && normalizeTmdbMediaType(sel.media_type) === cType;
                    const selClass = isSelected ? (isAuto && !sel.suggested ? "selected is-auto" : "selected") : "";
                    const compareId = `vc-${imgIdx}-${discIdx}-${ci}`;
                    const posterAttr = (c.poster_url || "").replace(/'/g, "%27");
                    const titleAttr = escapeHtml(c.title_cn || "").replace(/'/g, "\\'");
                    return `
                        <div class="match-candidate ${selClass}"
                             role="button" tabindex="0"
                             data-key="${key}" data-candidate-idx="${ci}" data-tmdb-id="${c.tmdb_id}"
                             data-media-type="${cType}"
                             onclick="selectCandidateByKey('${key}', ${ci}, this)"
                             title="${tr("match.clickToSelect")}">
                            <div class="match-candidate-main">
                                <span class="match-candidate-pick" aria-hidden="true">✓</span>
                                ${c.poster_url ? `<img class="match-candidate-poster" src="${c.poster_url}" alt="" loading="lazy" onerror="this.style.display='none'">` : '<div class="match-candidate-poster">🎬</div>'}
                                <div class="match-candidate-info">
                                    <div class="match-candidate-title">
                                        ${escapeHtml(c.title_cn)}${tmdbTypeBadgeHtml(cType)}
                                        ${c.poster_url && r.image_id ? `<button type="button" class="visual-compare-btn" onclick="event.stopPropagation();visualCompare(${r.image_id}, ${imgIdx}, ${discIdx}, '${posterAttr}', '${titleAttr}', '${c.year || ''}', '${compareId}')" title="${tr("match.visualCompare")}">${DISC_CARD_ICONS.eye}<span>${tr("match.visualCompare")}</span></button>` : ''}
                                    </div>
                                    <div class="match-candidate-meta">${escapeHtml(c.title_en)} | ${c.year} | ⭐${(c.rating || 0).toFixed(1)} | ${tr("meta.votes", { count: c.vote_count || 0 })}</div>
                                    ${isSelected ? `<div class="match-candidate-hint">${tr("match.selectedSaveHint")}</div>` : `<div class="match-candidate-hint">${tr("match.clickToSelect")}</div>`}
                                </div>
                            </div>
                            <div class="visual-compare-result" id="${compareId}"></div>
                        </div>`;
                }).join("");
            } else {
                candidatesHtml = `<div class="empty-state" style="padding:12px">${tr("match.noMatchManual")}</div>`;
            }

            discsHtml += `
                <div class="disc-entry" data-img-idx="${imgIdx}" data-disc-idx="${discIdx}"
                     style="margin-bottom:8px;padding:8px;background:var(--bg-hover);border-radius:6px${isRejected ? ';opacity:0.35;text-decoration:line-through' : ''}">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;gap:8px">
                        <span style="font-size:13px;font-weight:600">${escapeHtml(d.title_cn || d.title_en || tr('match.unrecognized'))}</span>
                        <span class="match-card-status ${status.cls}" title="${escapeHtml(status.title)}">${status.text}</span>
                    </div>
                    <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">
                        ${d.title_en ? escapeHtml(d.title_en) + ' | ' : ''}
                        ${d.year || ''}
                        ${d.confidence ? ' | ' + tr('match.confidence', { value: d.confidence }) : ''}
                        ${renderSourceBadge(d.source, d.confidence)}
                        ${hasSpineBbox(d) ? ' · <span style="color:var(--green)">' + tr('match.spineMarked') + '</span>' : ' · <span style="color:var(--gold)">' + tr('match.spineMissing') + '</span>'}
                    </div>
                    <div class="match-candidates">${candidatesHtml}</div>
                    <div class="disc-manual-actions">
                        <button type="button" class="disc-tool-btn" onclick="event.stopPropagation();openSpineCalibrator(${imgIdx}, ${discIdx})" title="${tr('match.calibrateSpine')}">${DISC_CARD_ICONS.crop}<span>${tr("match.calibrateSpine")}</span></button>
                        <button type="button" class="disc-tool-btn" onclick="event.stopPropagation();openManualTmdbSearch(${imgIdx}, ${discIdx})" title="${tr('match.manualSearch')}">${DISC_CARD_ICONS.search}<span>${tr("match.manualSearch")}</span></button>
                        <button type="button" class="disc-reject-btn" onclick="event.stopPropagation();rejectDisc(${imgIdx}, ${discIdx})" title="${tr('match.rejectedHint')}" ${isRejected ? "disabled" : ""}>${isRejected ? tr("match.rejectedBtn") : tr("match.reject")}</button>
                    </div>
                </div>`;
        });

        return `
            <div class="match-card expanded" id="match-card-${imgIdx}">
                <div class="match-card-header">
                    ${imgSrc ? `<img class="match-card-image" src="${imgSrc}" alt="" loading="lazy">` : ""}
                    <div class="match-card-info">
                        <div class="match-card-filename" title="${escapeHtml(r.filename)}">${escapeHtml(displayName)}</div>
                        <div class="match-card-detected">${tr("match.detectedDiscs", { count: discs.length })}</div>
                    </div>
                    ${photoBadge}
                </div>
                <div class="match-card-expand">
                    ${discs.length > 0 ? discsHtml : `<div class="empty-state" style="padding:12px">${tr("toast.noDiscsInRegion")}</div>`}
                    <div class="match-card-actions" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">
                        <button type="button" class="btn btn-secondary" onclick="event.stopPropagation();openRegionReanalyze(${imgIdx})" title="${tr('match.regionReanalyze')}">${tr("match.regionReanalyze")}</button>
                        <button type="button" class="btn btn-secondary" onclick="event.stopPropagation();searchManualForDisc('${escapeHtml(r.filename)}', ${imgIdx})">${DISC_CARD_ICONS.search}<span class="btn-label">${tr("match.manualSearch")}</span></button>
                    </div>
                </div>
            </div>`;
    }).join("");

    updateConfirmButton();
}

function hasSpineBbox(disc) {
    if (!disc) return false;
    return (Number(disc.bbox_w) || 0) > 0.001 && (Number(disc.bbox_h) || 0) > 0.001;
}

// ===== 来源徽章 + 拒绝 =====

function renderSourceBadge(source, confidence) {
    if (!source) return '';
    let color, label, icon;
    if (source === 'vision') {
        color = 'var(--green)';
        label = tr('source.vision');
        icon = '👁';
    } else if (source === 'ocr') {
        color = 'var(--gold)';
        label = 'OCR';
        icon = '📷';
        // confidence for OCR is typically "low" or "medium" — make orange for low
        if (confidence === 'low') {
            color = '#f97316';  // orange-red
        }
    } else {
        color = 'var(--text-muted)';
        label = source;
        icon = '❓';
    }
    return ` <span class="source-badge" style="color:${color};border-color:${color}" title="${tr("source.from", { label })}">${icon} ${label}</span>`;
}

function rejectDisc(imgIdx, discIdx) {
    if (!requireEditUnlocked()) return;
    const discEl = document.querySelector(`.disc-entry[data-img-idx="${imgIdx}"][data-disc-idx="${discIdx}"]`);
    if (!discEl) return;

    const key = `${imgIdx}_${discIdx}`;
    if (state.selectedMatches && state.selectedMatches[key]) {
        delete state.selectedMatches[key];
    }

    if (!state.rejectedDiscs) state.rejectedDiscs = {};
    const r = state.analysisResults[imgIdx];
    if (r && r.discs && r.discs[discIdx]) {
        state.rejectedDiscs[key] = r.discs[discIdx].title_cn || '';
    }

    discEl.style.opacity = '0.25';
    discEl.style.textDecoration = 'line-through';
    const rejectBtn = discEl.querySelector('.disc-reject-btn');
    if (rejectBtn) {
        rejectBtn.textContent = tr("match.rejectedBtn");
        rejectBtn.disabled = true;
    }
    discEl.querySelectorAll(".match-candidate").forEach(c => {
        c.classList.remove("selected", "is-auto");
        const hint = c.querySelector(".match-candidate-hint");
        if (hint) hint.textContent = tr("match.clickToSelect");
    });
    const statusEl = discEl.querySelector(".match-card-status");
    if (statusEl) {
        statusEl.textContent = tr("match.rejected");
        statusEl.className = "match-card-status error";
        statusEl.title = tr("match.rejectedHint");
    }

    updateMatchSummary();
    updateConfirmButton();
}

function updateMatchSummary() {
    let totalDiscs = 0;
    let autoMatchedCount = 0;
    let selectedCount = 0;
    let rejectedCount = Object.keys(state.rejectedDiscs || {}).length;

    state.analysisResults.forEach((r, imgIdx) => {
        if (!r.discs) return;
        r.discs.forEach((d, discIdx) => {
            const key = `${imgIdx}_${discIdx}`;
            if (state.rejectedDiscs && state.rejectedDiscs[key]) return;
            totalDiscs++;
            if (d.auto_matched) autoMatchedCount++;
            if (state.selectedMatches && state.selectedMatches[key]) selectedCount++;
        });
    });

    const pendingCount = totalDiscs - selectedCount;
    $("#match-summary").innerHTML = `
        <span>${tr("match.summaryPhotos", { photos: state.analysisResults.length, discs: totalDiscs })}</span>
        <span>${tr("match.summarySelected", { selected: selectedCount, auto: autoMatchedCount, pending: pendingCount })}${rejectedCount > 0 ? tr("match.summaryRejected", { count: rejectedCount }) : ""}</span>
    `;
}

function updateConfirmButton() {
    const btn = $("#btn-confirm-all");
    if (!btn) return;
    const count = Object.entries(state.selectedMatches || {}).filter(([key]) => {
        return !(state.rejectedDiscs && state.rejectedDiscs[key]);
    }).length;
    btn.disabled = count === 0;
    setBtnLabel(btn, count > 0
        ? tr("match.confirmSaveCount", { count })
        : tr("match.confirmPickFirst"));
}

function selectCandidateByKey(key, candidateIdx, el) {
    if (!el) return;
    if (!state.selectedMatches) state.selectedMatches = {};

    const parent = el.closest(".disc-entry");
    if (!parent) return;

    // 若曾拒绝，重新选择时取消拒绝
    if (state.rejectedDiscs && state.rejectedDiscs[key]) {
        delete state.rejectedDiscs[key];
        parent.style.opacity = "";
        parent.style.textDecoration = "";
        const rejectBtn = parent.querySelector(".disc-reject-btn");
        if (rejectBtn) {
            rejectBtn.disabled = false;
            rejectBtn.textContent = tr("match.reject");
        }
    }

    parent.querySelectorAll(".match-candidate").forEach(c => {
        c.classList.remove("selected", "is-auto");
        const hint = c.querySelector(".match-candidate-hint");
        if (hint) hint.textContent = tr("match.clickToSelect");
    });
    el.classList.add("selected");
    const selectedHint = el.querySelector(".match-candidate-hint");
    if (selectedHint) selectedHint.textContent = tr("match.selectedSaveHint");

    const tmdbId = parseInt(el.dataset.tmdbId, 10);
    if (!tmdbId || isNaN(tmdbId)) return;
    const mediaType = normalizeTmdbMediaType(el.dataset.mediaType);

    // 用户主动点击 = 明确选择（不再是 suggested）
    state.selectedMatches[key] = {
        tmdb_id: tmdbId,
        media_type: mediaType,
        candidate_idx: candidateIdx,
    };

    const statusEl = parent.querySelector(".match-card-status");
    if (statusEl) {
        statusEl.textContent = tr("match.selected");
        statusEl.className = "match-card-status matched";
        statusEl.title = "已为该碟片选定 TMDb 候选，确认后会写入片库";
    }
    updateMatchSummary();
    updateConfirmButton();
}

function searchManualForDisc(filename, imgIdx) {
    // 照片级手动搜索：写入该照片第一张未拒绝碟片，或新建占位碟片
    const r = (state.analysisResults || [])[imgIdx];
    if (!r) {
        showMatchModal("", null, null);
        return;
    }
    let discIdx = 0;
    const discs = r.discs || [];
    for (let i = 0; i < discs.length; i++) {
        const key = `${imgIdx}_${i}`;
        if (!(state.rejectedDiscs && state.rejectedDiscs[key])) {
            discIdx = i;
            break;
        }
    }
    if (!discs.length) {
        r.discs = [{
            title_cn: "",
            title_en: "",
            year: "",
            confidence: "low",
            source: "manual",
            photo_offset_x: 0,
            photo_offset_y: 0,
            bbox_w: 0,
            bbox_h: 0,
            candidates: [],
        }];
        discIdx = 0;
    }
    openManualTmdbSearch(imgIdx, discIdx);
}

function openManualTmdbSearch(imgIdx, discIdx) {
    if (!requireEditUnlocked()) return;
    const disc = (((state.analysisResults || [])[imgIdx] || {}).discs || [])[discIdx] || {};
    const q = disc.title_cn || disc.title_en || "";
    showMatchModal(q, null, null, {
        matchKey: `${imgIdx}_${discIdx}`,
        imgIdx,
        discIdx,
        year: disc.year || "",
    });
}

function toggleMatchCard(idx) {
    const card = document.getElementById(`match-card-${idx}`);
    if (card) card.classList.toggle("expanded");
}

async function verifyWithVision(resultIdx) {
    const r = state.analysisResults[resultIdx];
    if (!state.selectedMatches || !state.selectedMatches[resultIdx]) {
        showToast(tr("toast.selectMatchFirst"), "error");
        return;
    }

    const tmdbId = state.selectedMatches[resultIdx].tmdb_id;
    const mediaType = normalizeTmdbMediaType(state.selectedMatches[resultIdx].media_type);
    const imageId = r.image_id;

    $("#verify-modal").classList.remove("hidden");
    $("#verify-body").innerHTML = `<div class="verify-loading">${tr("verify.loadingShort")}</div>`;

    try {
        const verifyTask = await api(`/images/${imageId}/verify-match`, {
            method: "POST",
            body: { tmdb_id: tmdbId, media_type: mediaType },
        });

        // 轮询验证结果
        let verifyResult = null;
        for (let i = 0; i < 60; i++) {
            await sleep(1000);
            const status = await api(`/tasks/${verifyTask.task_id}`);
            if (status.status === "done") {
                verifyResult = status.result;
                break;
            }
            if (status.status === "error") {
                throw new Error(status.result?.error || tr("toast.verifyFailed"));
            }
        }

        if (!verifyResult) throw new Error(tr("toast.verifyTimeout"));

        const isMatch = verifyResult.match;
        const conf = verifyResult.confidence || 0;
        const cls = isMatch ? "match-success" : "match-fail";
        const icon = isMatch ? "✅" : "❌";
        const txt = isMatch ? tr("verify.success") : tr("verify.fail");

        $("#verify-body").innerHTML = `
            <div class="verify-result ${cls}">
                <div class="verify-icon">${icon}</div>
                <div class="verify-text">${txt}</div>
                <div class="verify-confidence">${tr("verify.confidence", { pct: (conf * 100).toFixed(0) })}</div>
                <div class="verify-reason">${escapeHtml(verifyResult.reasoning || "")}</div>
                <div class="verify-actions">
                    <button class="btn btn-primary" onclick="$('#verify-modal').classList.add('hidden')">${tr("action.close")}</button>
                </div>
            </div>`;

    } catch (e) {
        $("#verify-body").innerHTML = `
            <div class="verify-result match-fail">
                <div class="verify-icon">⚠️</div>
                <div class="verify-text">${tr("toast.verifyFailed")}</div>
                <div class="verify-reason">${escapeHtml(e.message)}</div>
                <div class="verify-actions">
                    <button class="btn btn-primary" onclick="$('#verify-modal').classList.add('hidden')">${tr("action.close")}</button>
                </div>
            </div>`;
    }
}

async function confirmAllMatches() {
    if (!requireEditUnlocked()) return;
    const entries = Object.entries(state.selectedMatches || {}).filter(([key]) => {
        return !(state.rejectedDiscs && state.rejectedDiscs[key]);
    });
    if (entries.length === 0) {
        showToast(tr("toast.selectAtLeastOne"), "error");
        return;
    }

    const items = [];
    for (const [key, sel] of entries) {
        const [imgIdx, discIdx] = key.split("_").map(Number);
        const r = state.analysisResults[imgIdx];
        if (!r || !r.discs) continue;
        const d = r.discs[discIdx];
        if (!d) continue;

        const candidate = (d.candidates || []).find(c =>
            c.tmdb_id === sel.tmdb_id
            && normalizeTmdbMediaType(c.media_type) === normalizeTmdbMediaType(sel.media_type)
        ) || (d.candidates || []).find(c => c.tmdb_id === sel.tmdb_id);
        items.push({
            tmdb_id: sel.tmdb_id,
            tmdb_media_type: normalizeTmdbMediaType(
                sel.media_type || (candidate && candidate.media_type) || "movie"
            ),
            title_cn: candidate ? candidate.title_cn : (d.title_cn || ""),
            title_en: candidate ? candidate.title_en : (d.title_en || ""),
            year: candidate ? candidate.year : (d.year || ""),
            source_image: r.filename,
            photo_offset_x: d.photo_offset_x || 0,
            photo_offset_y: d.photo_offset_y || 0,
            bbox_w: d.bbox_w || 0,
            bbox_h: d.bbox_h || 0,
            pos_x: 0, pos_y: 0,
            confirmed: 1,
        });
    }

    if (items.length === 0) {
        showToast(tr("toast.nothingToSave"), "error");
        return;
    }

    try {
        $("#btn-confirm-all").disabled = true;
        setBtnLabel($("#btn-confirm-all"), tr("match.saving"));
        const result = await api("/batch/confirm", { method: "POST", body: { items } });
        showToast(tr("toast.savedDiscs", { count: result.count }), "success");
        await loadDiscs();
        await loadFilters();
        await loadStats();
        await loadImageUrlMap();

        showPlacementStep();
    } catch (e) {
        showToast(tr("toast.saveFailed", { message: e.message }), "error");
    } finally {
        updateConfirmButton();
    }
}

// ===== 手动搜索匹配 =====

function showMatchModal(query, discId = null, resultIdx = null, options = null) {
    $("#match-modal").classList.remove("hidden");
    refreshDynamicUi();

    const opts = options || {};
    const matchKey = opts.matchKey != null ? opts.matchKey : null;
    const preYear = opts.year || "";
    const forMatchFlow = matchKey != null;

    $("#match-body").innerHTML = `
        <div style="margin-bottom:16px">
            <input type="text" id="match-search-input" value="${escapeHtml(query || "")}"
                   style="width:100%;padding:10px;background:var(--bg-card);border:1px solid var(--border);color:var(--text-primary);border-radius:var(--radius-sm);font-size:14px;font-family:var(--font)"
                   placeholder="${tr("match.searchPlaceholder")}">
            <div class="tmdb-scope-bar" style="margin-top:10px">
                <div class="tmdb-scope-row">
                    <span class="tmdb-scope-label">${tr("edit.scopeType")}</span>
                    ${tmdbScopeSegHtml("match-tmdb-scope", "all")}
                </div>
                <div class="tmdb-scope-row">
                    <span class="tmdb-scope-label">${tr("edit.scopeSource")}</span>
                    ${metaSourceSegHtml("match-meta-source", "all")}
                </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px;align-items:center">
                <input type="text" id="match-year-input" value="${escapeHtml(String(preYear || ""))}"
                       inputmode="numeric" maxlength="4"
                       style="width:110px;padding:10px;background:var(--bg-card);border:1px solid var(--border);color:var(--text-primary);border-radius:var(--radius-sm);font-size:14px;font-family:var(--font)"
                       placeholder="${tr("match.yearOptional")}">
                <button class="btn btn-primary" id="match-search-btn" style="flex:1;white-space:nowrap">${tr("match.searchBtn")}</button>
            </div>
            ${forMatchFlow ? `<details class="edit-disc-hint" style="margin-top:8px"><summary>${tr("match.helpTitle")}</summary><p>${tr("match.helpBody")}</p></details>` : ''}
        </div>
        <div id="match-results" class="match-results">
            <div class="empty-state">${tr("match.noResults")}</div>
        </div>
        <div id="match-actions" class="hidden" style="margin-top:16px;display:flex;gap:8px">
            <button class="btn btn-primary" id="match-confirm-btn" data-edit-only>${DISC_CARD_ICONS.check}<span class="btn-label">${forMatchFlow ? tr("match.pickCandidate") : tr("match.confirmSave")}</span></button>
        </div>`;

    let selectedMovie = null;
    let selectedMediaType = "movie";
    let selectedSource = "tmdb";
    bindTmdbScopeSeg(document.getElementById("match-tmdb-scope"));
    bindMetaSourceSeg(document.getElementById("match-meta-source"));

    async function runSearch() {
        const q = document.getElementById("match-search-input").value.trim();
        const year = document.getElementById("match-year-input").value.trim();
        const mediaType = getTmdbScopeFromSeg(document.getElementById("match-tmdb-scope"));
        const source = getMetaSourceFromSeg(document.getElementById("match-meta-source"));
        if (!q) return;

        const providers = await loadMetaProviders();
        if (source !== "all" && !providers[source]?.enabled) {
            showToast(providers[source]?.hint || tr("toast.sourceUnavailable"), "error");
            return;
        }

        try {
            const data = await api("/meta/search", {
                method: "POST",
                body: { title_cn: q, title_en: "", year: year || "", media_type: mediaType, source },
            });
            const results = (data.candidates || []).map(r => ({
                source: candidateSourceOf(r),
                tmdb_id: r.tmdb_id,
                imdb_id: r.imdb_id,
                tvdb_id: r.tvdb_id,
                media_type: normalizeTmdbMediaType(r.media_type),
                title: r.title_cn || r.title || "",
                original_title: r.title_en || r.original_title || "",
                year: r.year,
                overview: r.overview || "",
                poster_url: r.poster_url,
                rating: r.rating || 0,
                vote_count: r.vote_count || 0,
                _candidate: r,
            }));

            const resultsDiv = document.getElementById("match-results");
            const errNotes = metaSearchErrorNotes(data);
            const skipHint = metaSkippedHint(data, source);
            if (!results.length) {
                const tip = data.message || errNotes || tr("match.noResultsFound");
                const extra = skipHint ? `<div class="empty-state" style="padding-top:0;font-size:12px;opacity:.75">${escapeHtml(skipHint)}</div>` : "";
                resultsDiv.innerHTML = `<div class="empty-state">${escapeHtml(tip)}</div>${extra}`;
                return;
            }
            const bannerBits = [errNotes, skipHint].filter(Boolean);
            const banner = bannerBits.length
                ? `<div class="empty-state" style="padding:8px 10px;margin-bottom:6px;font-size:12px">${escapeHtml(bannerBits.join("；"))}</div>`
                : "";
            resultsDiv.innerHTML = banner + results.map((r, idx) => `
                <div class="match-item" data-idx="${idx}" data-source="${r.source}"
                     data-tmdb-id="${r.tmdb_id != null ? r.tmdb_id : ""}"
                     data-media-type="${normalizeTmdbMediaType(r.media_type)}"
                     onclick="window._selectMatchIdx(${idx}, this)">
                    ${r.poster_url ? `<img class="match-poster" src="${escapeHtml(r.poster_url)}" alt="" loading="lazy">` : '<div class="match-poster" style="display:flex;align-items:center;justify-content:center;opacity:.45">—</div>'}
                    <div class="match-info">
                        <div class="match-title">${escapeHtml(r.title)}${sourceBadgeHtml(r.source)}${tmdbTypeBadgeHtml(r.media_type)}</div>
                        <div class="match-meta">${escapeHtml(r.original_title || "")} | ${escapeHtml(String(r.year || ""))} | ⭐ ${(r.rating || 0).toFixed(1)}${r.vote_count != null ? ` | ${tr("meta.votes", { count: r.vote_count })}` : ""}</div>
                        <div class="match-overview">${escapeHtml(r.overview || tr("detail.none"))}</div>
                    </div>
                </div>`).join("");

            window._matchSearchResults = results;
            document.getElementById("match-actions").classList.remove("hidden");
        } catch (e) {
            showToast(tr("toast.searchFailed", { message: e.message }), "error");
        }
    }

    document.getElementById("match-search-btn").addEventListener("click", runSearch);
    document.getElementById("match-search-input").addEventListener("keydown", (e) => {
        if (e.key === "Enter") runSearch();
    });

    window._selectMatchIdx = function(idx, el) {
        document.querySelectorAll("#match-results .match-item").forEach(i => i.classList.remove("selected"));
        el.classList.add("selected");
        const r = (window._matchSearchResults || [])[idx];
        if (!r) return;
        selectedSource = candidateSourceOf(r);
        selectedMovie = r.tmdb_id || null;
        selectedMediaType = normalizeTmdbMediaType(r.media_type);
        window._selectedMatchIdx = idx;
    };
    // 兼容旧 onclick 名
    window._selectMatch = function(tmdbId, el, mediaType) {
        document.querySelectorAll("#match-results .match-item").forEach(i => i.classList.remove("selected"));
        el.classList.add("selected");
        selectedMovie = tmdbId;
        selectedMediaType = normalizeTmdbMediaType(mediaType || el.dataset.mediaType);
        selectedSource = "tmdb";
    };

    document.getElementById("match-confirm-btn").addEventListener("click", async () => {
        if (!requireEditUnlocked()) return;
        const idx = window._selectedMatchIdx;
        const picked = idx != null ? (window._matchSearchResults || [])[idx] : null;
        if (!picked && !selectedMovie) { showToast(tr("toast.pickFirst"), "error"); return; }
        const src = picked ? candidateSourceOf(picked) : selectedSource;
        if (forMatchFlow && src !== "tmdb") {
            showToast(tr("toast.tmdbCandidateRequired"), "error");
            return;
        }
        if (!forMatchFlow && src !== "tmdb") {
            showToast(tr("toast.manualCardRequired"), "error");
            return;
        }
        selectedMovie = picked?.tmdb_id || selectedMovie;
        const mediaType = normalizeTmdbMediaType(picked?.media_type || selectedMediaType);

        // 匹配步骤：回填到 analysisResults / selectedMatches，不立即入库
        if (forMatchFlow) {
            try {
                const cached = picked || (window._matchSearchResults || []).find(r =>
                    r.tmdb_id === selectedMovie
                    && normalizeTmdbMediaType(r.media_type) === mediaType
                );
                let candidate = cached && cached._candidate ? cached._candidate : null;
                if (!candidate) {
                    const movieData = await api(tmdbDetailPath(selectedMovie, mediaType));
                    candidate = {
                        tmdb_id: movieData.tmdb_id,
                        media_type: normalizeTmdbMediaType(movieData.media_type || mediaType),
                        title_cn: movieData.title_cn,
                        title_en: movieData.title_en,
                        year: movieData.year,
                        overview: movieData.synopsis_cn || "",
                        poster_url: movieData.poster_url || "",
                        backdrop_url: movieData.backdrop_url || "",
                        rating: movieData.rating || 0,
                        vote_count: movieData.vote_count || 0,
                        popularity: 0,
                        genre_ids: [],
                    };
                } else {
                    candidate = {
                        ...candidate,
                        media_type: normalizeTmdbMediaType(candidate.media_type || mediaType),
                    };
                }

                const imgIdx = opts.imgIdx;
                const discIdx = opts.discIdx;
                const disc = state.analysisResults[imgIdx].discs[discIdx];
                if (!disc.candidates) disc.candidates = [];
                const existIdx = disc.candidates.findIndex(c =>
                    c.tmdb_id === candidate.tmdb_id
                    && normalizeTmdbMediaType(c.media_type) === normalizeTmdbMediaType(candidate.media_type)
                );
                let candidateIdx;
                if (existIdx >= 0) {
                    disc.candidates[existIdx] = { ...disc.candidates[existIdx], ...candidate };
                    candidateIdx = existIdx;
                } else {
                    disc.candidates.unshift(candidate);
                    candidateIdx = 0;
                }
                // 用 TMDb 片名补全未识别标题
                if (!disc.title_cn || disc.title_cn.includes(tr("match.unrecognized")) || disc.title_cn.includes("区域未识别")) {
                    disc.title_cn = candidate.title_cn || disc.title_cn;
                    disc.title_en = candidate.title_en || disc.title_en || "";
                    disc.year = candidate.year || disc.year || "";
                }
                if (!state.selectedMatches) state.selectedMatches = {};
                if (state.rejectedDiscs && state.rejectedDiscs[matchKey]) {
                    delete state.rejectedDiscs[matchKey];
                }
                state.selectedMatches[matchKey] = {
                    tmdb_id: candidate.tmdb_id,
                    media_type: normalizeTmdbMediaType(candidate.media_type),
                    candidate_idx: candidateIdx,
                };
                $("#match-modal").classList.add("hidden");
                showToast(tr("toast.matchCandidateApplied"), "success");
                renderMatchResults();
            } catch (e) {
                showToast(tr("toast.applyFailed", { message: e.message }), "error");
            }
            return;
        }

        try {
            const movieData = await api(tmdbDetailPath(selectedMovie, mediaType));
            const discData = {
                tmdb_id: movieData.tmdb_id,
                tmdb_media_type: normalizeTmdbMediaType(movieData.media_type || mediaType),
                title_cn: movieData.title_cn,
                title_en: movieData.title_en,
                year: movieData.year,
                directors: movieData.directors || [],
                cast: movieData.cast || [],
                synopsis_cn: movieData.synopsis_cn || "",
                synopsis_en: movieData.synopsis_en || "",
                rating: movieData.rating || 0,
                genres: movieData.genres || [],
                poster_url: movieData.poster_url || "",
                backdrop_url: movieData.backdrop_url || "",
                runtime: movieData.runtime || 0,
                confirmed: 1,
            };

            if (discId) {
                await api(`/discs/${discId}`, { method: "PUT", body: discData });
                showToast(tr("toast.updateSuccess"), "success");
            } else {
                await api("/discs", { method: "POST", body: discData });
                showToast(tr("toast.addSuccess"), "success");
            }

            if (resultIdx !== null && state.selectedMatches) {
                state.selectedMatches[resultIdx] = {
                    tmdb_id: selectedMovie,
                    media_type: mediaType,
                    candidate_idx: -1,
                };
                const card = document.getElementById(`match-card-${resultIdx}`);
                if (card) {
                    const statusEl = card.querySelector(".match-card-status");
                    if (statusEl) {
                        statusEl.textContent = tr("match.manualMatched");
                        statusEl.className = "match-card-status matched";
                    }
                }
            }

            $("#match-modal").classList.add("hidden");
            await loadDiscs();
            await loadFilters();
            await loadStats();
        } catch (e) {
            showToast(tr("toast.saveFailed", { message: e.message }), "error");
        }
    });
}

// ===== 图片管理 =====

async function openManageModal() {
    if (!requireEditUnlocked()) return;
    $("#manage-modal").classList.remove("hidden");
    refreshDynamicUi();
    state.manageSelected = {};
    await loadManageImages();
    updateBatchActionBar();
}

function closeManageModal() {
    $("#manage-modal").classList.add("hidden");
    state.manageSelected = {};
}

async function loadManageImages() {
    const data = await api("/images");
    const grid = $("#image-grid");
    if (data.images.length === 0) {
        grid.innerHTML = `<div class="empty-state">${tr("status.noImages")}</div>`;
        $("#manage-stat").textContent = tr("status.imageCount", { count: 0 });
        return;
    }
    $("#manage-stat").textContent = tr("status.imageCount", { count: data.images.length });
    grid.innerHTML = data.images.map(img => {
        const isChecked = state.manageSelected[img.id] ? "checked" : "";
        const selClass = state.manageSelected[img.id] ? "selected" : "";
        const label = escapeHtml(img.display_name || img.original_filename || img.filename || "");
        return `
        <div class="image-grid-item ${selClass}" id="img-item-${img.id}" onclick="toggleManageItem(${img.id}, event)">
            <input type="checkbox" class="image-grid-checkbox" ${isChecked}
                   onchange="onManageCheckbox(${img.id}, this.checked, event)">
            <img src="${img.url}" alt="${label}" loading="lazy" onerror="this.src=''">
            <div class="image-grid-overlay">
                <span title="${label}">${img.image_type === 'panoramic' ? tr('images.panoramic') : tr('images.closeup')}</span>
                <div class="image-grid-overlay-buttons">
                    <button class="image-grid-reprocess" onclick="event.stopPropagation();reprocessImage(${img.id})" title="${tr("images.reprocessOne")}">${DISC_CARD_ICONS.refresh}</button>
                    <button class="image-grid-delete" onclick="event.stopPropagation();deleteImage(${img.id})">${tr("action.delete")}</button>
                </div>
            </div>
            <div class="image-grid-reprocess-status hidden" id="reprocess-status-${img.id}"></div>
        </div>`;
    }).join("");
    updateSelectAllButton();
}

function toggleManageItem(imageId, evt) {
    if (evt.target.closest("button") || evt.target.classList.contains("image-grid-checkbox")) return;
    const checked = !state.manageSelected[imageId];
    onManageCheckbox(imageId, checked, evt);
    const cb = document.querySelector(`#img-item-${imageId} .image-grid-checkbox`);
    if (cb) cb.checked = checked;
}

function updateSelectAllButton() {
    const btn = $("#btn-manage-select-all");
    const data = state.manageSelected;
    const allItems = document.querySelectorAll("#image-grid .image-grid-item");
    const selectedCount = Object.keys(data).length;
    if (selectedCount > 0 && selectedCount === allItems.length) {
        btn.textContent = `☑ ${tr("action.deselectAll")}`;
    } else {
        btn.textContent = selectedCount > 0 ? `☑ ${tr("action.selectCount", { count: selectedCount })}` : `☐ ${tr("action.selectAll")}`;
    }
}

function toggleSelectAllImages() {
    const allItems = document.querySelectorAll("#image-grid .image-grid-item");
    const allSelected = allItems.length > 0 && Object.keys(state.manageSelected).length === allItems.length;
    if (allSelected) {
        // 取消全选
        state.manageSelected = {};
    } else {
        // 全选
        allItems.forEach(item => {
            const imgId = parseInt(item.id.replace("img-item-", ""));
            if (!isNaN(imgId)) state.manageSelected[imgId] = true;
        });
    }
    // 更新 UI
    allItems.forEach(item => {
        const imgId = parseInt(item.id.replace("img-item-", ""));
        const cb = item.querySelector(".image-grid-checkbox");
        if (cb) cb.checked = !!state.manageSelected[imgId];
        item.classList.toggle("selected", !!state.manageSelected[imgId]);
    });
    updateSelectAllButton();
    updateBatchActionBar();
}

function onManageCheckbox(imageId, checked, evt) {
    evt.stopPropagation();
    if (checked) {
        state.manageSelected[imageId] = true;
    } else {
        delete state.manageSelected[imageId];
    }
    const item = document.getElementById(`img-item-${imageId}`);
    if (item) item.classList.toggle("selected", checked);
    updateSelectAllButton();
    updateBatchActionBar();
}

function updateBatchActionBar() {
    const bar = $("#batch-action-bar");
    const label = $("#batch-action-label");
    const reprocessBtn = $("#btn-batch-reprocess");
    const deleteBtn = $("#btn-batch-delete");
    const count = Object.keys(state.manageSelected).length;

    if (count > 0) {
        bar.classList.remove("hidden");
        label.textContent = tr("status.batchSelected", { count });
        setBtnLabel(reprocessBtn, tr("images.batchReprocessCount", { count }));
        setBtnLabel(deleteBtn, tr("images.batchDeleteCount", { count }));
    } else {
        bar.classList.add("hidden");
    }
}

function openMatchStepFromResults(results) {
    state.analysisResults = results || [];
    state.selectedMatches = {};
    state.rejectedDiscs = {};
    if (!$("#manage-modal").classList.contains("hidden")) closeManageModal();
    $("#upload-modal").classList.remove("hidden");
    $$("#steps-indicator .step").forEach(s => { s.classList.remove("active", "done"); });
    $$("#steps-indicator .step-connector").forEach(c => c.classList.remove("done"));
    $("#step-upload").classList.add("hidden");
    $("#step-analyzing").classList.add("hidden");
    $("#step-placement").classList.add("hidden");
    $("#step-match").classList.remove("hidden");
    const step3 = $("#steps-indicator").querySelector('[data-step="3"]');
    step3.classList.add("active");
    $("#steps-indicator").querySelector('[data-step="1"]').classList.add("done");
    $("#steps-indicator").querySelector('[data-step="2"]').classList.add("done");
    $$("#steps-indicator .step-connector").forEach(c => c.classList.add("done"));
    renderMatchResults();
}

async function batchReprocess() {
    if (!requireEditUnlocked()) return;
    const ids = Object.keys(state.manageSelected).map(Number);
    if (ids.length === 0) return;
    if (!confirm(tr("confirm.reprocessBatch", { count: ids.length }))) return;

    const label = $("#batch-action-label");
    const bar = $("#batch-action-bar");

    bar.querySelectorAll("button").forEach(b => b.disabled = true);
    const originalLabel = label.textContent;

    try {
        const result = await api("/images/batch-reprocess", {
            method: "POST",
            body: { image_ids: ids },
        });

        const batchId = result.batch_id;
        const total = result.total;
        label.textContent = tr("images.reprocessProgress", { done: 0, total });

        for (let attempt = 0; attempt < 300; attempt++) {
            await sleep(2000);
            const status = await api(`/batch/process/${batchId}`);
            const completed = status.completed || 0;
            label.textContent = tr("images.reprocessProgress", { done: completed, total });

            if (status.status === "done") {
                label.textContent = tr("images.reprocessComplete", { count: total });
                showToast(tr("toast.reprocessDone"), "success");
                openMatchStepFromResults(status.results || []);
                return;
            }
            if (status.status === "error") {
                label.textContent = tr("images.reprocessFail");
                showToast(tr("toast.batchReprocessFailed"), "error");
                break;
            }
        }

        state.manageSelected = {};
        await loadDiscs();
        await loadFilters();
        await loadStats();
        await loadManageImages();
        updateBatchActionBar();
        bar.querySelectorAll("button").forEach(b => b.disabled = false);

    } catch (e) {
        showToast(tr("toast.batchReprocessFailed") + ": " + e.message, "error");
        label.textContent = originalLabel;
        bar.querySelectorAll("button").forEach(b => b.disabled = false);
    }
}

async function batchDelete() {
    if (!requireEditUnlocked()) return;
    const ids = Object.keys(state.manageSelected).map(Number);
    if (ids.length === 0) return;
    if (!confirm(tr("confirm.deleteBatch", { count: ids.length }))) return;

    try {
        const result = await api("/images/batch-delete", {
            method: "POST",
            body: { image_ids: ids },
        });

        showToast(tr("toast.batchDeleteSuccess", { count: result.count }), "success");
        state.manageSelected = {};
        await loadDiscs();
        await loadFilters();
        await loadStats();
        await loadManageImages();
        updateBatchActionBar();

    } catch (e) {
        showToast(tr("toast.deleteFailed", { message: e.message }), "error");
    }
}

async function deleteImage(imageId) {
    if (!requireEditUnlocked()) return;
    if (!confirm(tr("confirm.deleteImage"))) return;
    await api(`/images/${imageId}`, { method: "DELETE" });
    showToast(tr("toast.deleteSuccess"), "success");
    await loadManageImages();
    await loadDiscs();
    await loadFilters();
    await loadStats();
}

async function reprocessImage(imageId) {
    if (!requireEditUnlocked()) return;
    if (!confirm(tr("confirm.reprocessOne"))) return;

    // 关闭上传模态框，避免状态交叉
    if (!$("#upload-modal").classList.contains("hidden")) {
        closeUploadModal();
    }

    const statusEl = document.getElementById(`reprocess-status-${imageId}`);
    const btn = document.querySelector(`#img-item-${imageId} .image-grid-reprocess`);
    if (statusEl) {
        statusEl.classList.remove("hidden");
        statusEl.innerHTML = tr("images.reprocessing", { pct: 0 });
    }
    if (btn) btn.disabled = true;

    try {
        const taskResult = await api(`/images/${imageId}/reprocess`, { method: "POST" });
        const taskId = taskResult.task_id;

        // 轮询进度
        let completed = false;
        for (let attempt = 0; attempt < 150; attempt++) {
            await sleep(2000);
            const status = await api(`/batch/process/${taskId}`);
            const pct = status.progress || 0;
            if (statusEl) {
                statusEl.innerHTML = tr("images.reprocessing", { pct });
            }

            if (status.status === "done") {
                completed = true;
                const results = status.results || [];
                if (statusEl) {
                    if (results.length > 0 && results[0].disc_count > 0) {
                        statusEl.innerHTML = tr("images.foundDiscs", { count: results[0].disc_count });
                        statusEl.className = "image-grid-reprocess-status success";
                    } else {
                        statusEl.innerHTML = tr("images.noDiscsFound");
                        statusEl.className = "image-grid-reprocess-status warning";
                    }
                }
                openMatchStepFromResults(results);
                showToast(tr("toast.reprocessDone"), "success");
                return;
            }
            if (status.status === "error") {
                if (statusEl) {
                    statusEl.innerHTML = tr("images.reprocessFail");
                    statusEl.className = "image-grid-reprocess-status error";
                }
                break;
            }
        }

        if (!completed && statusEl) {
            statusEl.innerHTML = tr("toast.reanalyzeTimeout");
            statusEl.className = "image-grid-reprocess-status warning";
        }

        showToast(tr("toast.reanalyzeComplete"), "success");
        await loadDiscs();
        await loadFilters();
        await loadStats();
        await loadManageImages();

    } catch (e) {
        showToast(tr("toast.reanalyzeFailed", { message: e.message }), "error");
        if (statusEl) {
            statusEl.innerHTML = tr("images.reprocessFail") + ": " + e.message;
            statusEl.className = "image-grid-reprocess-status error";
        }
        if (btn) btn.disabled = false;
    }
}

// ===== 标记识别错误 / 双重确认删除 / 喜好标注 =====

async function setDiscPreference(discId, preference) {
    if (!requireEditUnlocked()) return;
    const disc = state.discs.find(d => d.id === discId);
    if (!disc) {
        showToast(tr("toast.discNotFound"), "error");
        return;
    }
    const current = normalizePreference(disc.preference);
    let next = normalizePreference(preference);
    // 再点当前已选色 → 清除回到空心
    if (next > 0 && next === current) next = 0;
    try {
        const res = await api(`/discs/${discId}`, {
            method: "PATCH",
            body: { preference: next },
        });
        const updated = res.disc || { ...disc, preference: next };
        const idx = state.discs.findIndex(d => d.id === discId);
        if (idx >= 0) state.discs[idx] = { ...state.discs[idx], ...updated, preference: next };
        // 若当前喜好筛选与新值不符，从列表移除；否则就地刷新卡片
        const filterPref = $("#filter-preference")?.value ?? "";
        if (filterPref !== "" && String(next) !== filterPref) {
            state.discs = state.discs.filter(d => d.id !== discId);
            $("#stat-count").textContent = state.discs.length;
            if (state.selectedDiscId === discId) closeDetail();
        }
        renderDiscList();
        renderDiscMarkers();
        showToast(preferenceLabel(next) || tr("toast.updated"), "success");
    } catch (e) {
        showToast(tr("toast.preferenceFailed", { message: e.message }), "error");
    }
}

async function toggleDiscFlag(discId) {
    if (!requireEditUnlocked()) return;
    const disc = state.discs.find(d => d.id === discId);
    if (!disc) {
        showToast(tr("toast.discNotFound"), "error");
        return;
    }
    const next = disc.flagged ? 0 : 1;
    try {
        const res = await api(`/discs/${discId}`, {
            method: "PATCH",
            body: { flagged: next },
        });
        const updated = res.disc || { ...disc, flagged: next };
        const idx = state.discs.findIndex(d => d.id === discId);
        if (idx >= 0) state.discs[idx] = { ...state.discs[idx], ...updated, flagged: next };
        renderDiscList();
        renderDiscMarkers();
        showToast(next ? tr("toast.flagSet") : tr("toast.flagCleared"), "success");
    } catch (e) {
        showToast(tr("toast.updateFailed", { message: e.message }), "error");
    }
}

async function deleteDiscWithConfirm(discId) {
    if (!requireEditUnlocked()) return;
    const disc = state.discs.find(d => d.id === discId);
    if (!disc) {
        showToast(tr("toast.discNotFound"), "error");
        return;
    }
    const title = disc.title_cn || `#${discId}`;
    // 第一次确认
    if (!confirm(tr("confirm.deleteDisc", { title }))) return;
    // 第二次确认（双重确认，防误删）
    if (!confirm(tr("confirm.deleteDiscFinal", { title }))) return;

    try {
        await api(`/discs/${discId}`, { method: "DELETE" });
        state.discs = state.discs.filter(d => d.id !== discId);
        if (state.selectedDiscId === discId) {
            closeDetail();
        }
        if (state.highlightedDiscId === discId) state.highlightedDiscId = null;
        renderDiscList();
        renderDiscMarkers();
        $("#stat-count").textContent = state.discs.length;
        showToast(tr("toast.deletedDisc", { title }), "success");
        try { await loadStats(); } catch (_) { /* ignore */ }
    } catch (e) {
        showToast(tr("toast.deleteFailed", { message: e.message }), "error");
    }
}

// ===== 编辑 / 手工建卡（片名 / 年份 / TMDb / 可选源图）+ 原图碟脊对照预览 =====

let editDiscState = { discId: null, bound: false, pendingMovie: null, mediaType: "movie", mode: "edit" };

const EDIT_DISC_ICON_PENCIL = '<path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M14.5 5.5l4 4M4 20l.7-3.8L16.2 4.7a2 2 0 0 1 2.8 0l.3.3a2 2 0 0 1 0 2.8L7.8 19.3 4 20z"/>';
const EDIT_DISC_ICON_CREATE = '<path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M8 4h8a2 2 0 0 1 2 2v14l-6-3-6 3V6a2 2 0 0 1 2-2z"/><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M12 9v5M9.5 11.5h5"/>';

/** 编辑窗只读预览：缩放/平移原特写，叠加库内 photo_offset + bbox */
const editSpinePreview = {
    imageUrl: "",
    scale: 1,
    panX: 0,
    panY: 0,
    naturalW: 0,
    naturalH: 0,
    rect: null, // {x,y,w,h} 分数坐标，与 disc.photo_offset_* / bbox_* 一致
    panning: false,
    startClient: null,
    startPan: null,
    bound: false,
};

function _setEditDiscModalChrome(mode) {
    editDiscState.mode = mode === "create" ? "create" : "edit";
    const title = $("#edit-disc-modal-title");
    const icon = $("#edit-disc-title-icon");
    if (title) title.textContent = editDiscState.mode === "create" ? tr("dialog.createDisc") : tr("dialog.editDisc");
    if (icon) icon.innerHTML = editDiscState.mode === "create" ? EDIT_DISC_ICON_CREATE : EDIT_DISC_ICON_PENCIL;
}

async function populateEditSourceImageSelect(selectedFilename) {
    const sel = $("#edit-source-image");
    if (!sel) return;
    const want = (selectedFilename || "").trim();
    try {
        const data = await api("/images");
        const images = (data.images || []).slice().sort((a, b) => {
            const na = (a.display_name || a.original_filename || a.filename || "").toLowerCase();
            const nb = (b.display_name || b.original_filename || b.filename || "").toLowerCase();
            return na.localeCompare(nb, uiLocaleTag());
        });
        let matched = false;
        const opts = [`<option value="">${tr("edit.sourceNone")}</option>`];
        for (const img of images) {
            const fn = img.filename || "";
            if (!fn) continue;
            const label = img.display_name || img.original_filename || fn;
            const typeTag = img.image_type === "panoramic" ? tr("images.panoramic") : tr("images.closeup");
            const isSel = want && (fn === want || (img.original_filename || "") === want);
            if (isSel) matched = true;
            opts.push(
                `<option value="${escapeHtml(fn)}"${isSel ? " selected" : ""}>` +
                `${escapeHtml(label)} · ${typeTag}</option>`
            );
        }
        if (want && !matched) {
            opts.splice(1, 0,
                `<option value="${escapeHtml(want)}" selected>${escapeHtml(want)} · ${tr("edit.sourceCurrent")}</option>`
            );
        }
        sel.innerHTML = opts.join("");
    } catch (e) {
        sel.innerHTML = `<option value="">${tr("edit.sourceNone")}</option>`;
        if (want) {
            sel.innerHTML += `<option value="${escapeHtml(want)}" selected>${escapeHtml(want)}</option>`;
        }
    }
}

function _previewDiscFromSourceSelect() {
    const fn = ($("#edit-source-image")?.value || "").trim();
    if (!fn) {
        initEditSpinePreview(null);
        const empty = $("#edit-disc-preview-empty");
        if (empty) empty.textContent = tr("edit.previewEmpty");
        return;
    }
    const base = editDiscState.discId
        ? (state.discs.find(d => d.id === editDiscState.discId) || {})
        : {};
    initEditSpinePreview({
        ...base,
        source_image: fn,
        source_image_url: sourceImageThumbUrl(fn),
        // 新建或换源图时不沿用旧框，除非仍是同一张且编辑已有碟
        photo_offset_x: (base.source_image === fn) ? base.photo_offset_x : 0,
        photo_offset_y: (base.source_image === fn) ? base.photo_offset_y : 0,
        bbox_w: (base.source_image === fn) ? base.bbox_w : 0,
        bbox_h: (base.source_image === fn) ? base.bbox_h : 0,
    });
}

function _editDiscHasTmdbId() {
    const raw = ($("#edit-tmdb-id").value || "").trim();
    const id = raw === "" ? null : parseInt(raw, 10);
    return id != null && !Number.isNaN(id) && id > 0;
}

function _editDiscMediaType() {
    const hidden = $("#edit-tmdb-media-type");
    return normalizeTmdbMediaType(hidden?.value || editDiscState.mediaType || "movie");
}

function _setEditDiscMediaType(mediaType) {
    const mt = normalizeTmdbMediaType(mediaType);
    editDiscState.mediaType = mt;
    const hidden = $("#edit-tmdb-media-type");
    if (hidden) hidden.value = mt;
}

function _syncEditDiscSearchBtnLabel() {
    const btn = $("#edit-disc-search-tmdb");
    if (!btn) return;
    const hasAnyId = _editDiscHasTmdbId()
        || (($("#edit-imdb-id")?.value || "").trim())
        || (($("#edit-tvdb-id")?.value || "").trim());
    btn.textContent = hasAnyId ? tr("edit.searchByTitleAgain") : tr("edit.searchByTitle");
}

function _clearEditDiscCandidates() {
    const box = $("#edit-disc-candidates");
    if (!box) return;
    box.innerHTML = "";
    box.classList.add("hidden");
    editDiscState.pendingMovie = null;
}

function _editDiscResolveImageUrl(disc) {
    if (!disc) return "";
    if (disc.source_image_url) return disc.source_image_url;
    if (disc.source_image) return sourceImageThumbUrl(disc.source_image);
    return "";
}

function _editDiscSpineRectFromDisc(disc) {
    if (!disc || !hasSpineBbox(disc)) return null;
    return {
        x: Number(disc.photo_offset_x) || 0,
        y: Number(disc.photo_offset_y) || 0,
        w: Number(disc.bbox_w) || 0,
        h: Number(disc.bbox_h) || 0,
    };
}

function initEditSpinePreview(disc) {
    const stage = $("#edit-disc-preview-stage");
    const img = $("#edit-disc-preview-img");
    const empty = $("#edit-disc-preview-empty");
    const hint = $("#edit-disc-preview-hint");
    const focusBtn = $("#edit-preview-focus-spine");
    const previewRoot = $("#edit-disc-preview");
    if (!stage || !img) return;

    // 桌面默认展开；小屏默认折叠，避免挤掉表单（用户可点「对照原图」展开）
    if (previewRoot) {
        const toggle = $("#edit-disc-preview-toggle");
        if (window.matchMedia("(max-width: 760px)").matches) {
            previewRoot.classList.add("is-collapsed");
            if (toggle) toggle.setAttribute("aria-expanded", "false");
        } else {
            previewRoot.classList.remove("is-collapsed");
            if (toggle) toggle.setAttribute("aria-expanded", "true");
        }
    }

    const imageUrl = _editDiscResolveImageUrl(disc);
    editSpinePreview.imageUrl = imageUrl;
    editSpinePreview.rect = _editDiscSpineRectFromDisc(disc);
    editSpinePreview.scale = 1;
    editSpinePreview.panX = 0;
    editSpinePreview.panY = 0;
    editSpinePreview.naturalW = 0;
    editSpinePreview.naturalH = 0;
    editSpinePreview.panning = false;

    if (focusBtn) focusBtn.disabled = !editSpinePreview.rect;

    if (!imageUrl) {
        stage.classList.add("is-empty");
        if (empty) empty.textContent = tr("edit.previewEmpty");
        img.removeAttribute("src");
        renderEditSpinePreviewRect();
        if (hint) hint.textContent = tr("edit.previewNoPhoto");
        return;
    }

    stage.classList.remove("is-empty");
    if (hint) {
        hint.textContent = editSpinePreview.rect
            ? "滚轮缩放 · 拖拽平移 · 框来自库内 photo_offset / bbox，对照脊上文字改片名"
            : "滚轮缩放 · 拖拽平移 · 尚未标定碟脊框（可在详情「重新框选」）";
    }

    img.onload = () => {
        editSpinePreview.naturalW = img.naturalWidth;
        editSpinePreview.naturalH = img.naturalHeight;
        renderEditSpinePreviewRect();
        const collapsed = previewRoot?.classList.contains("is-collapsed");
        const stageHidden = collapsed || stage.clientWidth < 8 || stage.clientHeight < 8;
        if (stageHidden) return;
        if (editSpinePreview.rect) focusEditSpinePreviewOnBbox();
        else fitEditSpinePreviewView();
    };
    if (img.src === imageUrl && img.complete && img.naturalWidth) {
        img.onload();
    } else {
        img.src = imageUrl;
    }
    renderEditSpinePreviewRect();
}

function resetEditSpinePreview() {
    editSpinePreview.imageUrl = "";
    editSpinePreview.rect = null;
    editSpinePreview.panning = false;
    const img = $("#edit-disc-preview-img");
    if (img) {
        img.onload = null;
        img.removeAttribute("src");
    }
    const canvas = $("#edit-disc-preview-canvas");
    if (canvas) canvas.style.transform = "";
    const rectEl = $("#edit-disc-preview-rect");
    if (rectEl) rectEl.classList.add("hidden");
}

function fitEditSpinePreviewView() {
    const stage = $("#edit-disc-preview-stage");
    if (!stage || !editSpinePreview.naturalW) return;
    const sw = stage.clientWidth;
    const sh = stage.clientHeight;
    const fit = Math.min(sw / editSpinePreview.naturalW, sh / editSpinePreview.naturalH, 1) * 0.96;
    editSpinePreview.scale = fit > 0 ? fit : 1;
    editSpinePreview.panX = (sw - editSpinePreview.naturalW * editSpinePreview.scale) / 2;
    editSpinePreview.panY = (sh - editSpinePreview.naturalH * editSpinePreview.scale) / 2;
    applyEditSpinePreviewTransform();
}

function focusEditSpinePreviewOnBbox() {
    const stage = $("#edit-disc-preview-stage");
    const r = editSpinePreview.rect;
    if (!stage || !r || !editSpinePreview.naturalW) {
        fitEditSpinePreviewView();
        return;
    }
    const sw = stage.clientWidth;
    const sh = stage.clientHeight;
    const bw = Math.max(r.w * editSpinePreview.naturalW, 1);
    const bh = Math.max(r.h * editSpinePreview.naturalH, 1);
    // 碟脊框约占视口 55%，便于读字；上限放宽到 12×
    const target = Math.min(sw / bw, sh / bh) * 0.55;
    editSpinePreview.scale = Math.max(0.2, Math.min(12, target));
    const cx = (r.x + r.w / 2) * editSpinePreview.naturalW;
    const cy = (r.y + r.h / 2) * editSpinePreview.naturalH;
    editSpinePreview.panX = sw / 2 - cx * editSpinePreview.scale;
    editSpinePreview.panY = sh / 2 - cy * editSpinePreview.scale;
    applyEditSpinePreviewTransform();
}

function applyEditSpinePreviewTransform() {
    const canvas = $("#edit-disc-preview-canvas");
    const img = $("#edit-disc-preview-img");
    if (!canvas) return;
    canvas.style.transform = `translate(${editSpinePreview.panX}px, ${editSpinePreview.panY}px) scale(${editSpinePreview.scale})`;
    if (img && editSpinePreview.naturalW) {
        img.style.width = `${editSpinePreview.naturalW}px`;
        img.style.height = `${editSpinePreview.naturalH}px`;
    }
}

function renderEditSpinePreviewRect() {
    const el = $("#edit-disc-preview-rect");
    if (!el) return;
    const r = editSpinePreview.rect;
    if (!r || r.w <= 0 || r.h <= 0 || !editSpinePreview.naturalW) {
        el.classList.add("hidden");
        return;
    }
    el.classList.remove("hidden");
    el.style.left = `${r.x * editSpinePreview.naturalW}px`;
    el.style.top = `${r.y * editSpinePreview.naturalH}px`;
    el.style.width = `${r.w * editSpinePreview.naturalW}px`;
    el.style.height = `${r.h * editSpinePreview.naturalH}px`;
}

function editSpinePreviewClientToFraction(clientX, clientY) {
    const stage = $("#edit-disc-preview-stage");
    if (!stage || !editSpinePreview.naturalW) return { fx: 0, fy: 0 };
    const rect = stage.getBoundingClientRect();
    const lx = (clientX - rect.left - editSpinePreview.panX) / editSpinePreview.scale;
    const ly = (clientY - rect.top - editSpinePreview.panY) / editSpinePreview.scale;
    return {
        fx: Math.max(0, Math.min(1, lx / editSpinePreview.naturalW)),
        fy: Math.max(0, Math.min(1, ly / editSpinePreview.naturalH)),
    };
}

function zoomEditSpinePreviewAt(factor, clientX, clientY) {
    const next = Math.max(0.15, Math.min(12, editSpinePreview.scale * factor));
    if (next === editSpinePreview.scale) return;
    if (clientX != null && clientY != null && editSpinePreview.naturalW) {
        const before = editSpinePreviewClientToFraction(clientX, clientY);
        editSpinePreview.scale = next;
        applyEditSpinePreviewTransform();
        const after = editSpinePreviewClientToFraction(clientX, clientY);
        editSpinePreview.panX += (after.fx - before.fx) * editSpinePreview.naturalW * editSpinePreview.scale;
        editSpinePreview.panY += (after.fy - before.fy) * editSpinePreview.naturalH * editSpinePreview.scale;
        applyEditSpinePreviewTransform();
        return;
    }
    editSpinePreview.scale = next;
    applyEditSpinePreviewTransform();
}

function bindEditSpinePreviewEvents() {
    if (editSpinePreview.bound) return;
    editSpinePreview.bound = true;

    const stage = $("#edit-disc-preview-stage");
    const toggle = $("#edit-disc-preview-toggle");
    const previewRoot = $("#edit-disc-preview");

    $("#edit-preview-zoom-in")?.addEventListener("click", () => {
        const r = stage?.getBoundingClientRect();
        if (r) zoomEditSpinePreviewAt(1.25, r.left + r.width / 2, r.top + r.height / 2);
        else zoomEditSpinePreviewAt(1.25);
    });
    $("#edit-preview-zoom-out")?.addEventListener("click", () => {
        const r = stage?.getBoundingClientRect();
        if (r) zoomEditSpinePreviewAt(1 / 1.25, r.left + r.width / 2, r.top + r.height / 2);
        else zoomEditSpinePreviewAt(1 / 1.25);
    });
    $("#edit-preview-zoom-reset")?.addEventListener("click", () => fitEditSpinePreviewView());
    $("#edit-preview-focus-spine")?.addEventListener("click", () => focusEditSpinePreviewOnBbox());

    toggle?.addEventListener("click", () => {
        if (!previewRoot) return;
        const collapsed = previewRoot.classList.toggle("is-collapsed");
        toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
        if (!collapsed && editSpinePreview.naturalW) {
            requestAnimationFrame(() => {
                if (editSpinePreview.rect) focusEditSpinePreviewOnBbox();
                else fitEditSpinePreviewView();
            });
        }
    });

    stage?.addEventListener("wheel", (e) => {
        if ($("#edit-disc-modal")?.classList.contains("hidden")) return;
        if (stage.classList.contains("is-empty")) return;
        e.preventDefault();
        zoomEditSpinePreviewAt(e.deltaY > 0 ? 0.9 : 1.1, e.clientX, e.clientY);
    }, { passive: false });

    stage?.addEventListener("mousedown", (e) => {
        if ($("#edit-disc-modal")?.classList.contains("hidden")) return;
        if (stage.classList.contains("is-empty")) return;
        if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
        editSpinePreview.panning = true;
        editSpinePreview.startClient = { x: e.clientX, y: e.clientY };
        editSpinePreview.startPan = { x: editSpinePreview.panX, y: editSpinePreview.panY };
        stage.classList.add("is-panning");
        e.preventDefault();
    });

    window.addEventListener("mousemove", (e) => {
        if (!editSpinePreview.panning || !editSpinePreview.startClient) return;
        editSpinePreview.panX = editSpinePreview.startPan.x + (e.clientX - editSpinePreview.startClient.x);
        editSpinePreview.panY = editSpinePreview.startPan.y + (e.clientY - editSpinePreview.startClient.y);
        applyEditSpinePreviewTransform();
    });

    window.addEventListener("mouseup", () => {
        if (!editSpinePreview.panning) return;
        editSpinePreview.panning = false;
        editSpinePreview.startClient = null;
        stage?.classList.remove("is-panning");
    });

    stage?.addEventListener("contextmenu", (e) => e.preventDefault());
}

function editDisc(discId) {
    if (!requireEditUnlocked()) return;
    const disc = state.discs.find(d => d.id === discId);
    if (!disc) {
        showToast(tr("toast.discNotFound"), "error");
        return;
    }
    editDiscState.discId = discId;
    editDiscState.pendingMovie = null;
    _setEditDiscModalChrome("edit");
    $("#edit-title-cn").value = disc.title_cn || "";
    $("#edit-title-en").value = disc.title_en || "";
    $("#edit-year").value = disc.year || "";
    const tid = disc.tmdb_id;
    $("#edit-tmdb-id").value = tid != null && tid !== "" && Number(tid) > 0 ? String(tid) : "";
    $("#edit-imdb-id").value = disc.imdb_id || "";
    $("#edit-tvdb-id").value = disc.tvdb_id != null && disc.tvdb_id !== "" ? String(disc.tvdb_id) : "";
    _setEditDiscMediaType(disc.tmdb_media_type || disc.media_type || "movie");
    setTmdbScopeSeg($("#edit-tmdb-scope"), "all");
    setMetaSourceSeg($("#edit-meta-source"), "all");
    applyMetaSourceAvailability($("#edit-meta-source"));
    loadEditApiKeysPanel();
    _clearEditDiscCandidates();
    _syncEditDiscSearchBtnLabel();
    $("#edit-disc-modal").classList.remove("hidden");
    refreshDynamicUi();
    bindEditDiscModal();
    populateEditSourceImageSelect(disc.source_image || "").then(() => {
        initEditSpinePreview(disc);
    });
}

/** 侧栏「手工建卡」：无 disc id，复用编辑模态 */
function openCreateDiscModal() {
    if (!requireEditUnlocked()) return;
    editDiscState.discId = null;
    editDiscState.pendingMovie = null;
    _setEditDiscModalChrome("create");
    $("#edit-title-cn").value = "";
    $("#edit-title-en").value = "";
    $("#edit-year").value = "";
    $("#edit-tmdb-id").value = "";
    $("#edit-imdb-id").value = "";
    $("#edit-tvdb-id").value = "";
    _setEditDiscMediaType("movie");
    setTmdbScopeSeg($("#edit-tmdb-scope"), "all");
    setMetaSourceSeg($("#edit-meta-source"), "all");
    applyMetaSourceAvailability($("#edit-meta-source"));
    loadEditApiKeysPanel();
    _clearEditDiscCandidates();
    _syncEditDiscSearchBtnLabel();
    $("#edit-disc-modal").classList.remove("hidden");
    refreshDynamicUi();
    bindEditDiscModal();
    populateEditSourceImageSelect("").then(() => {
        initEditSpinePreview(null);
        const empty = $("#edit-disc-preview-empty");
        if (empty) empty.textContent = tr("edit.previewEmptyOptional");
        const hint = $("#edit-disc-preview-hint");
        if (hint) hint.textContent = tr("edit.createHintNoPhoto");
    });
}

function closeEditDiscModal() {
    $("#edit-disc-modal").classList.add("hidden");
    editDiscState.discId = null;
    editDiscState.pendingMovie = null;
    editDiscState.mediaType = "movie";
    editDiscState.mode = "edit";
    _clearEditDiscCandidates();
    resetEditSpinePreview();
}

function bindEditDiscModal() {
    if (editDiscState.bound) return;
    editDiscState.bound = true;
    $("#edit-disc-close").addEventListener("click", closeEditDiscModal);
    $("#edit-disc-cancel").addEventListener("click", closeEditDiscModal);
    $("#edit-disc-overlay").addEventListener("click", closeEditDiscModal);
    $("#edit-disc-save").addEventListener("click", () => saveEditDisc(false));
    $("#edit-disc-refresh-tmdb").addEventListener("click", () => onEditDiscRefreshTmdb());
    $("#edit-disc-search-tmdb").addEventListener("click", () => searchEditDiscTmdb());
    $("#edit-tmdb-id").addEventListener("input", _syncEditDiscSearchBtnLabel);
    $("#edit-imdb-id")?.addEventListener("input", _syncEditDiscSearchBtnLabel);
    $("#edit-tvdb-id")?.addEventListener("input", _syncEditDiscSearchBtnLabel);
    $("#edit-source-image")?.addEventListener("change", () => _previewDiscFromSourceSelect());
    bindTmdbScopeSeg($("#edit-tmdb-scope"));
    bindMetaSourceSeg($("#edit-meta-source"));
    bindEditApiKeysPanel();
    bindEditSpinePreviewEvents();
}

async function onEditDiscRefreshTmdb() {
    if (!_editDiscHasTmdbId()) {
        // 无编号时走按片名搜索
        await searchEditDiscTmdb();
        return;
    }
    await saveEditDisc(true);
}

async function searchEditDiscTmdb() {
    const titleCn = ($("#edit-title-cn").value || "").trim();
    const titleEn = ($("#edit-title-en").value || "").trim();
    const year = ($("#edit-year").value || "").trim();
    const mediaType = getTmdbScopeFromSeg($("#edit-tmdb-scope"));
    const source = getMetaSourceFromSeg($("#edit-meta-source"));
    if (!titleCn && !titleEn) {
        showToast(tr("toast.fillTitleFirst"), "error");
        return;
    }

    const providers = await loadMetaProviders();
    if (source !== "all" && !providers[source]?.enabled) {
        showToast(providers[source]?.hint || tr("toast.sourceUnavailable"), "error");
        return;
    }

    const searchBtn = $("#edit-disc-search-tmdb");
    const refreshBtn = $("#edit-disc-refresh-tmdb");
    const box = $("#edit-disc-candidates");
    const prevLabel = searchBtn.textContent;
    searchBtn.disabled = true;
    refreshBtn.disabled = true;
    searchBtn.textContent = tr("edit.searching");
    box.classList.remove("hidden");
    const srcHint = source === "all" ? "全部可用来源" : source.toUpperCase();
    box.innerHTML = `<div class="empty-state">${tr("edit.searchingSource", { source: escapeHtml(srcHint) })}</div>`;

    try {
        const data = await api("/meta/search", {
            method: "POST",
            body: {
                title_cn: titleCn,
                title_en: titleEn,
                year: year || "",
                media_type: mediaType,
                source,
            },
        });
        const results = data.candidates || [];
        const errNotes = metaSearchErrorNotes(data);
        const skipHint = metaSkippedHint(data, source);
        if (!results.length) {
            const tip = data.message || errNotes || "未找到匹配结果，可改片名/年份或切换类型/来源后再搜";
            const extra = skipHint ? `<div class="empty-state" style="padding-top:0;font-size:12px;opacity:.75">${escapeHtml(skipHint)}</div>` : "";
            box.innerHTML = `<div class="empty-state">${escapeHtml(tip)}</div>${extra}`;
            if (errNotes) showToast(errNotes, "error");
            return;
        }
        const bannerBits = [errNotes, skipHint].filter(Boolean);
        const banner = bannerBits.length
            ? `<div class="empty-state" style="padding:8px 10px;margin-bottom:6px;font-size:12px">${escapeHtml(bannerBits.join("；"))}</div>`
            : "";
        box.innerHTML = banner + results.map(renderMetaCandidateItem).join("");

        box.querySelectorAll(".match-item").forEach(el => {
            el.addEventListener("click", () => applyEditDiscCandidateFromEl(el));
        });
    } catch (e) {
        box.innerHTML = `<div class="empty-state">${tr("toast.searchFailed", { message: escapeHtml(e.message) })}</div>`;
        showToast(tr("toast.searchFailed", { message: e.message }), "error");
    } finally {
        searchBtn.disabled = false;
        refreshBtn.disabled = false;
        searchBtn.textContent = prevLabel;
        _syncEditDiscSearchBtnLabel();
    }
}

async function applyEditDiscCandidateFromEl(el) {
    if (!el) return;
    const source = normalizeMetaSource(el.dataset.source || "tmdb");
    const mt = normalizeTmdbMediaType(el.dataset.mediaType);
    const box = $("#edit-disc-candidates");
    box.querySelectorAll(".match-item").forEach(i => i.classList.remove("selected"));
    el.classList.add("selected");

    const titleCn = el.dataset.titleCn || "";
    const titleEn = el.dataset.titleEn || "";
    const year = el.dataset.year || "";
    const posterUrl = el.dataset.posterUrl || "";
    const overview = el.dataset.overview || "";

    if (titleCn) $("#edit-title-cn").value = titleCn;
    if (titleEn) $("#edit-title-en").value = titleEn;
    if (year) $("#edit-year").value = year;
    _setEditDiscMediaType(mt);

    const refreshBtn = $("#edit-disc-refresh-tmdb");
    const searchBtn = $("#edit-disc-search-tmdb");
    const saveBtn = $("#edit-disc-save");
    refreshBtn.disabled = true;
    searchBtn.disabled = true;
    saveBtn.disabled = true;
    const prevRefresh = refreshBtn.textContent;

    try {
        if (source === "tmdb") {
            const tmdbId = parseInt(el.dataset.tmdbId, 10);
            if (!tmdbId) {
                showToast(tr("toast.invalidCandidate"), "error");
                return;
            }
            $("#edit-tmdb-id").value = String(tmdbId);
            // 不伪造其它源 id
            refreshBtn.textContent = tr("edit.fetchingDetails");
            const movie = await api(tmdbDetailPath(tmdbId, mt));
            editDiscState.pendingMovie = { ...movie, source: "tmdb" };
            _setEditDiscMediaType(movie.media_type || mt);
            $("#edit-title-cn").value = movie.title_cn || $("#edit-title-cn").value;
            $("#edit-title-en").value = movie.title_en || $("#edit-title-en").value;
            $("#edit-year").value = movie.year || $("#edit-year").value;
            $("#edit-tmdb-id").value = String(movie.tmdb_id || tmdbId);
            showToast(tr("edit.appliedTmdb"), "success");
        } else if (source === "imdb") {
            const imdbId = (el.dataset.imdbId || "").trim();
            if (!imdbId) {
                showToast(tr("toast.invalidCandidate"), "error");
                return;
            }
            // 不伪造 tmdb_id
            $("#edit-tmdb-id").value = "";
            $("#edit-imdb-id").value = imdbId;
            let detail = null;
            try {
                refreshBtn.textContent = tr("edit.fetchingDetails");
                detail = await api(`/meta/imdb/${encodeURIComponent(imdbId)}`);
            } catch (_) {
                detail = null;
            }
            const pending = {
                source: "imdb",
                tmdb_id: null,
                imdb_id: imdbId,
                tvdb_id: null,
                media_type: detail?.media_type || mt,
                title_cn: detail?.title_cn || titleCn,
                title_en: detail?.title_en || titleEn,
                year: detail?.year || year,
                poster_url: detail?.poster_url || posterUrl || "",
                synopsis_cn: detail?.synopsis_cn || overview || "",
                synopsis_en: detail?.synopsis_en || overview || "",
                rating: detail?.rating || 0,
                genres: detail?.genres || [],
                directors: detail?.directors || [],
                cast: detail?.cast || [],
                backdrop_url: "",
                runtime: 0,
                original_language: "",
            };
            editDiscState.pendingMovie = pending;
            if (pending.title_cn) $("#edit-title-cn").value = pending.title_cn;
            if (pending.title_en) $("#edit-title-en").value = pending.title_en;
            if (pending.year) $("#edit-year").value = pending.year;
            showToast(tr("edit.appliedImdb"), "success");
        } else {
            const tvdbId = parseInt(el.dataset.tvdbId, 10);
            if (!tvdbId) {
                showToast(tr("toast.invalidCandidate"), "error");
                return;
            }
            $("#edit-tmdb-id").value = "";
            $("#edit-tvdb-id").value = String(tvdbId);
            if (el.dataset.imdbId) $("#edit-imdb-id").value = el.dataset.imdbId;
            const pending = {
                source: "tvdb",
                tmdb_id: null,
                imdb_id: (el.dataset.imdbId || "").trim() || null,
                tvdb_id: tvdbId,
                media_type: mt,
                title_cn: titleCn,
                title_en: titleEn,
                year,
                poster_url: posterUrl || "",
                synopsis_cn: overview || "",
                synopsis_en: overview || "",
                rating: 0,
                genres: [],
                directors: [],
                cast: [],
                backdrop_url: "",
                runtime: 0,
                original_language: "",
            };
            editDiscState.pendingMovie = pending;
            showToast(tr("edit.appliedTvdb"), "success");
        }
        _syncEditDiscSearchBtnLabel();
    } catch (e) {
        editDiscState.pendingMovie = null;
        const msg = e.message || String(e);
        const hint = /接口不存在|404/i.test(msg)
            ? "（本地 API 路由未找到，请重启 Flask）"
            : "";
        showToast(tr("toast.fetchFailed") + ": " + msg + hint, "error");
    } finally {
        refreshBtn.disabled = false;
        searchBtn.disabled = false;
        saveBtn.disabled = false;
        refreshBtn.textContent = prevRefresh || tr("edit.refreshTmdb");
        _syncEditDiscSearchBtnLabel();
    }
}

async function applyEditDiscCandidate(tmdbId, el, mediaType) {
    // 兼容旧调用：视为 TMDb
    if (el) {
        el.dataset.source = "tmdb";
        el.dataset.tmdbId = String(tmdbId);
        if (mediaType) el.dataset.mediaType = mediaType;
        return applyEditDiscCandidateFromEl(el);
    }
}

async function saveEditDisc(refreshFromTmdb) {
    if (!requireEditUnlocked()) return;
    const discId = editDiscState.discId;
    const isCreate = !discId;

    const titleCn = ($("#edit-title-cn").value || "").trim();
    const titleEn = ($("#edit-title-en").value || "").trim();
    const year = ($("#edit-year").value || "").trim();
    const tmdbRaw = ($("#edit-tmdb-id").value || "").trim();
    const tmdbId = tmdbRaw === "" ? null : parseInt(tmdbRaw, 10);
    const imdbId = ($("#edit-imdb-id")?.value || "").trim() || null;
    const tvdbRaw = ($("#edit-tvdb-id")?.value || "").trim();
    const tvdbId = tvdbRaw === "" ? null : parseInt(tvdbRaw, 10);
    const mediaType = _editDiscMediaType();
    const sourceImage = ($("#edit-source-image")?.value || "").trim();

    if (!titleCn && !titleEn) {
        showToast(tr("toast.titleRequired"), "error");
        return;
    }
    if (tmdbRaw !== "" && (Number.isNaN(tmdbId) || tmdbId <= 0)) {
        showToast(tr("toast.invalidTmdbId"), "error");
        return;
    }
    if (tvdbRaw !== "" && (Number.isNaN(tvdbId) || tvdbId <= 0)) {
        showToast(tr("toast.invalidTvdbId"), "error");
        return;
    }

    // 空字符串 / 无效 → null（允许无 TMDb 号保存）；源图可空
    const body = {
        title_cn: titleCn || titleEn,
        title_en: titleEn,
        year: year,
        tmdb_id: tmdbId && tmdbId > 0 ? tmdbId : null,
        tmdb_media_type: tmdbId && tmdbId > 0 ? mediaType : mediaType,
        imdb_id: imdbId,
        tvdb_id: tvdbId && tvdbId > 0 ? tvdbId : null,
        source_image: sourceImage,
    };
    if (isCreate) {
        body.confirmed = (body.tmdb_id || body.imdb_id || body.tvdb_id) ? 1 : 0;
    }

    const saveBtn = $("#edit-disc-save");
    const refreshBtn = $("#edit-disc-refresh-tmdb");
    const searchBtn = $("#edit-disc-search-tmdb");
    saveBtn.disabled = true;
    refreshBtn.disabled = true;
    if (searchBtn) searchBtn.disabled = true;

    try {
        if (refreshFromTmdb) {
            if (!body.tmdb_id) {
                showToast(tr("toast.tmdbIdRequired"), "error");
                return;
            }
            refreshBtn.textContent = tr("edit.fetchingTmdb");
            const movie = await api(tmdbDetailPath(body.tmdb_id, body.tmdb_media_type));
            // 保留对话框里的片名/年份；只补海报与简介/演职等元数据（不碰框位）
            Object.assign(body, {
                tmdb_id: movie.tmdb_id || body.tmdb_id,
                tmdb_media_type: normalizeTmdbMediaType(movie.media_type || body.tmdb_media_type),
                directors: movie.directors || [],
                cast: movie.cast || [],
                synopsis_cn: movie.synopsis_cn || "",
                synopsis_en: movie.synopsis_en || "",
                rating: movie.rating || 0,
                genres: movie.genres || [],
                poster_url: movie.poster_url || "",
                backdrop_url: movie.backdrop_url || "",
                runtime: movie.runtime || 0,
                original_language: movie.original_language || "",
            });
            editDiscState.pendingMovie = movie;
            _setEditDiscMediaType(body.tmdb_media_type);
            $("#edit-tmdb-id").value = String(body.tmdb_id);
            if (isCreate) body.confirmed = 1;
        } else if (editDiscState.pendingMovie) {
            const movie = editDiscState.pendingMovie;
            const pendingSrc = candidateSourceOf(movie);
            const sameTmdb = body.tmdb_id && movie.tmdb_id === body.tmdb_id
                && normalizeTmdbMediaType(movie.media_type) === body.tmdb_media_type;
            const sameImdb = body.imdb_id && movie.imdb_id === body.imdb_id;
            const sameTvdb = body.tvdb_id && movie.tvdb_id === body.tvdb_id;
            if ((pendingSrc === "tmdb" && sameTmdb)
                || (pendingSrc === "imdb" && sameImdb)
                || (pendingSrc === "tvdb" && sameTvdb)
                || (!pendingSrc && sameTmdb)) {
                Object.assign(body, {
                    tmdb_media_type: normalizeTmdbMediaType(movie.media_type || body.tmdb_media_type),
                    directors: movie.directors || [],
                    cast: movie.cast || [],
                    synopsis_cn: movie.synopsis_cn || movie.overview || "",
                    synopsis_en: movie.synopsis_en || "",
                    rating: movie.rating || 0,
                    genres: movie.genres || [],
                    poster_url: movie.poster_url || "",
                    backdrop_url: movie.backdrop_url || "",
                    runtime: movie.runtime || 0,
                    original_language: movie.original_language || "",
                });
                if (movie.imdb_id && !body.imdb_id) body.imdb_id = movie.imdb_id;
                if (movie.tvdb_id && !body.tvdb_id) body.tvdb_id = movie.tvdb_id;
                // 非 TMDb 源绝不写入伪造 tmdb_id
                if (pendingSrc !== "tmdb") body.tmdb_id = null;
                if (isCreate) body.confirmed = 1;
            }
        }

        let savedId = discId;
        if (isCreate) {
            const created = await api("/discs", { method: "POST", body });
            savedId = created.id;
            closeEditDiscModal();
            showToast(refreshFromTmdb ? tr("toast.createdWithTmdb") : tr("toast.discCreated"), "success");
        } else {
            await api(`/discs/${discId}`, { method: "PUT", body });
            closeEditDiscModal();
            showToast(refreshFromTmdb ? tr("toast.refreshedFromTmdb") : tr("toast.discSaved"), "success");
        }
        await loadDiscs();
        await loadFilters();
        await loadStats();
        if (savedId && (isCreate || state.selectedDiscId === savedId)) {
            await showDiscDetail(savedId);
        }
    } catch (e) {
        const msg = e.message || String(e);
        const prefix = refreshFromTmdb ? "TMDb 刷新失败: " : "保存失败: ";
        const hint = /接口不存在|404/i.test(msg)
            ? "（本地 API 路由未找到，请重启 Flask；不是 TMDb 挂了）"
            : "";
        showToast(prefix + msg + hint, "error");
    } finally {
        saveBtn.disabled = false;
        refreshBtn.disabled = false;
        if (searchBtn) searchBtn.disabled = false;
        refreshBtn.textContent = tr("edit.refreshTmdb");
        _syncEditDiscSearchBtnLabel();
    }
}

// ===== 按 tmdb_id 批量补海报（不改片名 / 框位） =====

async function enrichPostersFromTmdb() {
    if (!requireEditUnlocked()) return;
    const btn = $("#btn-enrich-posters");
    if (!confirm(
        "按已有 TMDb 编号补全缺失海报/简介/演职人员？\n" +
        "不会改片名、年份、碟脊框与墙面坐标。\n" +
        "请确保 TMDb 可访问（必要时设置 HTTP_PROXY=http://127.0.0.1:10808）。"
    )) {
        return;
    }
    const prev = btn ? btn.querySelector(".btn-label")?.textContent : "";
    if (btn) {
        btn.disabled = true;
        const label = btn.querySelector(".btn-label");
        if (label) label.textContent = tr("action.enrichRunning");
    }
    try {
        const start = await api("/discs/enrich-posters", {
            method: "POST",
            body: { only_missing: true, include_credits: true },
        });
        if (!start.task_id) {
            showToast(start.message || tr("toast.enrichNone"), "success");
            return;
        }
        showToast(tr("toast.enrichStarted", { count: start.total }), "success");
        const taskId = start.task_id;
        while (true) {
            await new Promise(r => setTimeout(r, 1200));
            const task = await api(`/tasks/${taskId}`);
            const label = btn?.querySelector(".btn-label");
            if (label) {
                label.textContent = task.message
                    ? String(task.message).slice(0, 18)
                    : `补全 ${task.progress || 0}%`;
            }
            if (task.status === "done") {
                const r = task.result || {};
                showToast(
                    `海报补全完成：成功 ${r.ok || 0}，失败 ${r.fail || 0}` +
                    (r.skipped ? `，无海报 ${r.skipped}` : ""),
                    (r.fail || 0) > 0 ? "error" : "success"
                );
                break;
            }
            if (task.status === "error") {
                showToast(task.message || tr("toast.enrichFailed", { message: "" }), "error");
                break;
            }
        }
        await loadDiscs();
        await loadFilters();
        await loadStats();
    } catch (e) {
        showToast(tr("toast.enrichFailed", { message: e.message }), "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            const label = btn.querySelector(".btn-label");
            if (label) label.textContent = prev || tr("action.enrichPosters");
        }
    }
}

// ===== 拖拽定位 =====

let dragState = null;

function initDragOnWall() {
    $("#disc-markers").addEventListener("mousedown", (e) => {
        const marker = e.target.closest(".disc-marker");
        if (!marker || !e.shiftKey) return;
        if (!requireEditUnlocked()) return;
        e.preventDefault();
        dragState = {
            discId: parseInt(marker.dataset.discId),
            marker,
        };
        marker.style.zIndex = "30";
        marker.style.transition = "none";
    });

    document.addEventListener("mousemove", (e) => {
        if (!dragState) return;
        const p = clientToWallPercent(e.clientX, e.clientY, $("#wall-coord-layer"));
        dragState.marker.style.left = `${Math.max(0, Math.min(100, p.x))}%`;
        dragState.marker.style.top = `${Math.max(0, Math.min(100, p.y))}%`;
    });

    document.addEventListener("mouseup", async (e) => {
        if (!dragState) return;
        const p = clientToWallPercent(e.clientX, e.clientY, $("#wall-coord-layer"));
        const x = Math.round(Math.max(0, Math.min(100, p.x)) * 100) / 100;
        const y = Math.round(Math.max(0, Math.min(100, p.y)) * 100) / 100;
        dragState.marker.style.transition = "";
        dragState.marker.style.zIndex = "";
        try {
            await api(`/discs/${dragState.discId}/position`, {
                method: "PUT",
                body: { pos_x: x, pos_y: y },
            });
            await loadDiscs();
        } catch (err) {
            showToast(tr("toast.positionUpdateFailed"), "error");
        }
        dragState = null;
    });
}

// ===== 视觉比对 =====

function summarizeCompareReason(raw, isMatch) {
    const text = (raw || "").replace(/\s+/g, " ").trim();
    if (!text) return isMatch ? "碟脊外观与海报大致一致。" : "碟脊外观与海报不一致。";
    // 去掉开头 YES/NO，压缩为短中文可读摘要（过长英文截断）
    let cleaned = text.replace(/^(YES|NO)\b[\s,:：\-—]*/i, "").trim();
    if (!cleaned) cleaned = text;
    if (/[\u4e00-\u9fff]/.test(cleaned)) {
        return cleaned.length > 120 ? cleaned.slice(0, 120) + "…" : cleaned;
    }
    // 英文长文：只取首句并截断
    const first = (cleaned.split(/[.!?]\s+/)[0] || cleaned).trim();
    return first.length > 140 ? first.slice(0, 140) + "…" : first;
}

async function visualCompare(imageId, imgIdx, discIdx, posterUrl, title, year, resultContainerId) {
    const container = document.getElementById(resultContainerId);
    if (!container) return;

    const disc = (((state.analysisResults || [])[imgIdx] || {}).discs || [])[discIdx] || {};
    const ox = Number(disc.photo_offset_x) || 0;
    const oy = Number(disc.photo_offset_y) || 0;
    const bw = Number(disc.bbox_w) || 0;
    const bh = Number(disc.bbox_h) || 0;
    const hasBbox = bw > 0.001 && bh > 0.001;

    if (!hasBbox) {
        container.innerHTML = `
            <div class="compare-card">
                <div class="compare-verdict unknown">无法精确比对</div>
                <div class="compare-text">该碟片尚未标定碟脊区域。请在原图上框选正确碟脊后再比对，或改用手动搜索 TMDb。</div>
                <div class="compare-fallback-actions">
                    <button type="button" class="disc-tool-btn" onclick="event.stopPropagation();openSpineCalibrator(${imgIdx}, ${discIdx})">${DISC_CARD_ICONS.crop}<span>标定碟脊</span></button>
                    <button type="button" class="disc-tool-btn" onclick="event.stopPropagation();openManualTmdbSearch(${imgIdx}, ${discIdx})">${DISC_CARD_ICONS.search}<span>${tr("match.manualSearch")}</span></button>
                </div>
            </div>`;
        container.classList.add("show");
        return;
    }

    container.innerHTML = `<div class="compare-card"><div class="compare-text" style="color:var(--text-muted)">${tr("verify.cropping")}</div></div>`;
    container.classList.add("show");

    try {
        const taskResult = await api(`/images/${imageId}/compare-poster`, {
            method: "POST",
            body: {
                poster_url: posterUrl,
                title: title,
                year: year,
                disc_index: discIdx,
                photo_offset_x: ox,
                photo_offset_y: oy,
                bbox_w: bw,
                bbox_h: bh,
            },
        });

        let result = null;
        for (let i = 0; i < 60; i++) {
            await sleep(1000);
            const status = await api(`/tasks/${taskResult.task_id}`);
            if (status.status === "done") {
                result = status.result;
                break;
            }
            if (status.status === "error") {
                throw new Error(status.result?.error || tr("toast.compareFailed"));
            }
        }

        if (!result) throw new Error("比对超时");

        // 原图 URL：优先匹配卡片缩略图
        let sourceUrl = "";
        const hostCard = container.closest(".match-card");
        const localImg = hostCard && hostCard.querySelector(".match-card-image");
        if (localImg && localImg.src) sourceUrl = localImg.src;
        else {
            const analysis = (state.analysisResults || [])[imgIdx];
            if (analysis && analysis.url) sourceUrl = analysis.url;
        }

        const used = result.bbox || { x: ox, y: oy, w: bw, h: bh };
        const hlStyle = `left:${(used.x * 100).toFixed(2)}%;top:${(used.y * 100).toFixed(2)}%;width:${(used.w * 100).toFixed(2)}%;height:${(used.h * 100).toFixed(2)}%;`;
        const cropSrc = result.spine_crop_b64
            ? `data:image/jpeg;base64,${result.spine_crop_b64}`
            : "";

        const desc = result.description || "";
        const matchFlag = typeof result.match === "boolean"
            ? result.match
            : /^\s*YES\b/i.test(desc);
        const unknown = typeof result.match !== "boolean" && !/^\s*(YES|NO)\b/i.test(desc);
        const verdictClass = unknown ? "unknown" : (matchFlag ? "yes" : "no");
        const verdictText = unknown ? tr("verify.unknown") : (matchFlag ? "YES · 外观一致" : "NO · 外观不一致");
        const reason = summarizeCompareReason(result.summary || desc, matchFlag);
        const safePoster = escapeHtml(posterUrl);
        const safeTitle = escapeHtml(title || "");

        container.innerHTML = `
            <div class="compare-card">
                <div class="compare-verdict ${verdictClass}">${verdictText}</div>
                <div class="compare-title" style="font-size:12px;font-weight:600;color:var(--text-primary)">${safeTitle}${year ? ` (${escapeHtml(String(year))})` : ""}</div>
                <div class="compare-images">
                    <div class="compare-figure">
                        <span class="compare-caption">原图标定区域</span>
                        ${sourceUrl ? `
                            <div class="compare-source-wrap">
                                <img src="${escapeHtml(sourceUrl)}" alt="原图" onerror="this.style.display='none'">
                                <div class="compare-bbox-hl" style="${hlStyle}"></div>
                            </div>` : '<div class="compare-text">无原图</div>'}
                    </div>
                    <div class="compare-figure">
                        <span class="compare-caption">裁剪碟脊</span>
                        ${cropSrc ? `<img src="${cropSrc}" alt="${tr("verify.croppedSpine")}">` : `<div class="compare-text">${tr("verify.noCrop")}</div>`}
                    </div>
                    <div class="compare-figure">
                        <span class="compare-caption">TMDb 海报</span>
                        <img src="${safePoster}" alt="海报" onerror="this.style.display='none'">
                    </div>
                </div>
                <div class="compare-text">${escapeHtml(reason)}</div>
            </div>`;

    } catch (e) {
        const msg = e.message || String(e);
        const isBbox = /尚未标定|missing_bbox|无法精确比对/i.test(msg);
        container.innerHTML = `
            <div class="compare-card">
                <div class="compare-verdict ${isBbox ? "unknown" : "no"}">${isBbox ? "无法精确比对" : tr("toast.compareFailed")}</div>
                <div class="compare-text">${escapeHtml(msg)}</div>
                ${isBbox ? `<div class="compare-fallback-actions">
                    <button type="button" class="disc-tool-btn" onclick="event.stopPropagation();openSpineCalibrator(${imgIdx}, ${discIdx})">${DISC_CARD_ICONS.crop}<span>标定碟脊</span></button>
                    <button type="button" class="disc-tool-btn" onclick="event.stopPropagation();openManualTmdbSearch(${imgIdx}, ${discIdx})">${DISC_CARD_ICONS.search}<span>${tr("match.manualSearch")}</span></button>
                </div>` : ""}
            </div>`;
    }
}

// ===== 手工框选编辑器（标定碟脊 / 区域重识别） =====

const bboxEditor = {
    mode: "calibrate", // calibrate | reanalyze | editDiscBbox
    imgIdx: null,
    discIdx: null,
    discId: null,
    imageId: null,
    imageUrl: "",
    scale: 1,
    panX: 0,
    panY: 0,
    naturalW: 0,
    naturalH: 0,
    displayW: 0,
    displayH: 0,
    rect: null, // {x,y,w,h} fractions
    drawing: false,
    panning: false,
    startClient: null,
    startPan: null,
    drawOrigin: null, // {fx, fy} fraction at mousedown
    bound: false,
};

/** 详情页：在源图上重新框选已入库碟片的 bbox，保存 photo_offset / bbox，并尽量重算墙面 pos */
async function openDiscBboxEditor(discId) {
    if (!requireEditUnlocked()) return;
    let disc = state.discs.find(d => d.id === discId) || null;
    let imageUrl = (disc && disc.source_image_url) || "";
    if (!imageUrl && disc && disc.source_image) {
        imageUrl = sourceImageThumbUrl(disc.source_image);
    }
    if (!imageUrl || !disc) {
        try {
            disc = await api(`/discs/${discId}`);
            imageUrl = disc.source_image_url || sourceImageThumbUrl(disc.source_image || "");
        } catch (e) {
            showToast(tr("toast.loadDiscFailed", { message: e.message }), "error");
            return;
        }
    }
    if (!disc || !imageUrl) {
        showToast(tr("toast.noSourcePhoto"), "error");
        return;
    }
    const prefill = {
        x: Number(disc.photo_offset_x) || 0,
        y: Number(disc.photo_offset_y) || 0,
        w: Number(disc.bbox_w) || 0,
        h: Number(disc.bbox_h) || 0,
    };
    openBboxEditor({
        mode: "editDiscBbox",
        title: tr("dialog.bboxReselect"),
        confirmLabel: tr("bbox.confirmSave"),
        discId: disc.id,
        imgIdx: null,
        discIdx: null,
        imageId: null,
        imageUrl,
        prefill: (prefill.w > 0.001 && prefill.h > 0.001) ? prefill : null,
    });
}

function openSpineCalibrator(imgIdx, discIdx) {
    if (!requireEditUnlocked()) return;
    const analysis = (state.analysisResults || [])[imgIdx];
    if (!analysis || !analysis.url) {
        showToast(tr("toast.sourcePhotoMissing"), "error");
        return;
    }
    const disc = (analysis.discs || [])[discIdx];
    if (!disc) {
        showToast(tr("toast.discNotFound"), "error");
        return;
    }
    let prefill = null;
    if (hasSpineBbox(disc)) {
        prefill = {
            x: Number(disc.photo_offset_x) || 0,
            y: Number(disc.photo_offset_y) || 0,
            w: Number(disc.bbox_w) || 0,
            h: Number(disc.bbox_h) || 0,
        };
    }
    openBboxEditor({
        mode: "calibrate",
        title: tr("dialog.calibrateSpine"),
        confirmLabel: tr("bbox.confirmCalibrate"),
        imgIdx,
        discIdx,
        imageId: analysis.image_id,
        imageUrl: analysis.url,
        prefill,
    });
}

function openRegionReanalyze(imgIdx) {
    if (!requireEditUnlocked()) return;
    const analysis = (state.analysisResults || [])[imgIdx];
    if (!analysis || !analysis.url || !analysis.image_id) {
        showToast(tr("toast.sourcePhotoMissing"), "error");
        return;
    }
    openBboxEditor({
        mode: "reanalyze",
        title: tr("dialog.bboxRegion"),
        confirmLabel: tr("bbox.confirmRegion"),
        imgIdx,
        discIdx: null,
        imageId: analysis.image_id,
        imageUrl: analysis.url,
        prefill: null,
    });
}

function openBboxEditor({ mode, title, confirmLabel, imgIdx, discIdx, discId, imageId, imageUrl, prefill }) {
    bboxEditor.mode = mode;
    bboxEditor.imgIdx = imgIdx;
    bboxEditor.discIdx = discIdx;
    bboxEditor.discId = discId != null ? discId : null;
    bboxEditor.imageId = imageId;
    bboxEditor.imageUrl = imageUrl;
    bboxEditor.scale = 1;
    bboxEditor.panX = 0;
    bboxEditor.panY = 0;
    bboxEditor.rect = prefill && prefill.w > 0 && prefill.h > 0 ? { ...prefill } : null;
    bboxEditor.drawing = false;
    bboxEditor.panning = false;

    const root = $("#bbox-editor");
    const titleEl = $("#bbox-editor-title");
    if (titleEl) setIconTitle(titleEl, "crop", title || tr("dialog.bboxRegion"));
    $("#bbox-editor-confirm").textContent = confirmLabel || tr("action.confirm");
    $("#bbox-editor-confirm").disabled = !bboxEditor.rect;
    root.classList.remove("hidden");

    const img = $("#bbox-editor-img");
    img.onload = () => {
        bboxEditor.naturalW = img.naturalWidth;
        bboxEditor.naturalH = img.naturalHeight;
        fitBboxEditorView();
        renderBboxEditorRect();
        updateBboxEditorCoords();
    };
    img.src = imageUrl;

    bindBboxEditorEvents();
    renderBboxEditorRect();
    updateBboxEditorCoords();
}

function closeBboxEditor() {
    $("#bbox-editor").classList.add("hidden");
    bboxEditor.drawing = false;
    bboxEditor.panning = false;
}

function fitBboxEditorView() {
    const stage = $("#bbox-editor-stage");
    if (!stage || !bboxEditor.naturalW) return;
    const sw = stage.clientWidth;
    const sh = stage.clientHeight;
    const fit = Math.min(sw / bboxEditor.naturalW, sh / bboxEditor.naturalH, 1) * 0.96;
    bboxEditor.scale = fit > 0 ? fit : 1;
    bboxEditor.displayW = bboxEditor.naturalW;
    bboxEditor.displayH = bboxEditor.naturalH;
    bboxEditor.panX = (sw - bboxEditor.naturalW * bboxEditor.scale) / 2;
    bboxEditor.panY = (sh - bboxEditor.naturalH * bboxEditor.scale) / 2;
    applyBboxEditorTransform();
}

function applyBboxEditorTransform() {
    const canvas = $("#bbox-editor-canvas");
    if (!canvas) return;
    canvas.style.transform = `translate(${bboxEditor.panX}px, ${bboxEditor.panY}px) scale(${bboxEditor.scale})`;
    const img = $("#bbox-editor-img");
    if (img && bboxEditor.naturalW) {
        img.style.width = `${bboxEditor.naturalW}px`;
        img.style.height = `${bboxEditor.naturalH}px`;
    }
}

function renderBboxEditorRect() {
    const el = $("#bbox-editor-rect");
    if (!el) return;
    const r = bboxEditor.rect;
    if (!r || r.w <= 0 || r.h <= 0 || !bboxEditor.naturalW) {
        el.classList.add("hidden");
        return;
    }
    el.classList.remove("hidden");
    el.style.left = `${r.x * bboxEditor.naturalW}px`;
    el.style.top = `${r.y * bboxEditor.naturalH}px`;
    el.style.width = `${r.w * bboxEditor.naturalW}px`;
    el.style.height = `${r.h * bboxEditor.naturalH}px`;
}

function updateBboxEditorCoords() {
    const el = $("#bbox-editor-coords");
    const btn = $("#bbox-editor-confirm");
    if (!el) return;
    const r = bboxEditor.rect;
    if (!r || r.w <= 0.001 || r.h <= 0.001) {
        el.textContent = tr("bbox.noSelection");
        if (btn) btn.disabled = true;
        return;
    }
    el.textContent = `x=${r.x.toFixed(3)} y=${r.y.toFixed(3)} w=${r.w.toFixed(3)} h=${r.h.toFixed(3)}`;
    if (btn) btn.disabled = false;
}

function clientToFraction(clientX, clientY) {
    const stage = $("#bbox-editor-stage");
    const rect = stage.getBoundingClientRect();
    const lx = (clientX - rect.left - bboxEditor.panX) / bboxEditor.scale;
    const ly = (clientY - rect.top - bboxEditor.panY) / bboxEditor.scale;
    const fx = bboxEditor.naturalW ? lx / bboxEditor.naturalW : 0;
    const fy = bboxEditor.naturalH ? ly / bboxEditor.naturalH : 0;
    return {
        fx: Math.max(0, Math.min(1, fx)),
        fy: Math.max(0, Math.min(1, fy)),
    };
}

function bindBboxEditorEvents() {
    if (bboxEditor.bound) return;
    bboxEditor.bound = true;

    const stage = $("#bbox-editor-stage");
    const closeBtn = $("#bbox-editor-close");
    const cancelBtn = $("#bbox-editor-cancel");
    const confirmBtn = $("#bbox-editor-confirm");
    const backdrop = $("#bbox-editor-backdrop");

    closeBtn.addEventListener("click", closeBboxEditor);
    cancelBtn.addEventListener("click", closeBboxEditor);
    backdrop.addEventListener("click", closeBboxEditor);
    confirmBtn.addEventListener("click", confirmBboxEditor);

    $("#bbox-zoom-in").addEventListener("click", () => {
        bboxEditor.scale = Math.min(8, bboxEditor.scale * 1.25);
        applyBboxEditorTransform();
    });
    $("#bbox-zoom-out").addEventListener("click", () => {
        bboxEditor.scale = Math.max(0.15, bboxEditor.scale / 1.25);
        applyBboxEditorTransform();
    });
    $("#bbox-zoom-reset").addEventListener("click", () => {
        fitBboxEditorView();
    });

    stage.addEventListener("wheel", (e) => {
        if ($("#bbox-editor").classList.contains("hidden")) return;
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        const before = clientToFraction(e.clientX, e.clientY);
        bboxEditor.scale = Math.max(0.15, Math.min(8, bboxEditor.scale * factor));
        // 粗略保持指针附近稳定
        applyBboxEditorTransform();
        const after = clientToFraction(e.clientX, e.clientY);
        bboxEditor.panX += (after.fx - before.fx) * bboxEditor.naturalW * bboxEditor.scale;
        bboxEditor.panY += (after.fy - before.fy) * bboxEditor.naturalH * bboxEditor.scale;
        applyBboxEditorTransform();
    }, { passive: false });

    stage.addEventListener("mousedown", (e) => {
        if ($("#bbox-editor").classList.contains("hidden")) return;
        if (e.button === 1 || e.button === 2 || e.shiftKey) {
            bboxEditor.panning = true;
            bboxEditor.startClient = { x: e.clientX, y: e.clientY };
            bboxEditor.startPan = { x: bboxEditor.panX, y: bboxEditor.panY };
            e.preventDefault();
            return;
        }
        if (e.button !== 0) return;
        const { fx, fy } = clientToFraction(e.clientX, e.clientY);
        bboxEditor.drawing = true;
        bboxEditor.drawOrigin = { fx, fy };
        bboxEditor.rect = { x: fx, y: fy, w: 0, h: 0 };
        renderBboxEditorRect();
        updateBboxEditorCoords();
        e.preventDefault();
    });

    window.addEventListener("mousemove", (e) => {
        if ($("#bbox-editor").classList.contains("hidden")) return;
        if (bboxEditor.panning && bboxEditor.startClient) {
            bboxEditor.panX = bboxEditor.startPan.x + (e.clientX - bboxEditor.startClient.x);
            bboxEditor.panY = bboxEditor.startPan.y + (e.clientY - bboxEditor.startClient.y);
            applyBboxEditorTransform();
            return;
        }
        if (!bboxEditor.drawing || !bboxEditor.drawOrigin) return;
        const { fx, fy } = clientToFraction(e.clientX, e.clientY);
        const x1 = bboxEditor.drawOrigin.fx;
        const y1 = bboxEditor.drawOrigin.fy;
        const x = Math.min(x1, fx);
        const y = Math.min(y1, fy);
        const w = Math.abs(fx - x1);
        const h = Math.abs(fy - y1);
        bboxEditor.rect = { x, y, w, h };
        renderBboxEditorRect();
        updateBboxEditorCoords();
    });

    window.addEventListener("mouseup", () => {
        if (bboxEditor.panning) {
            bboxEditor.panning = false;
            bboxEditor.startClient = null;
        }
        if (bboxEditor.drawing) {
            bboxEditor.drawing = false;
            bboxEditor.drawOrigin = null;
            if (bboxEditor.rect && (bboxEditor.rect.w < 0.004 || bboxEditor.rect.h < 0.004)) {
                bboxEditor.rect = null;
                renderBboxEditorRect();
                updateBboxEditorCoords();
            }
        }
    });

    stage.addEventListener("contextmenu", (e) => e.preventDefault());
}

async function confirmBboxEditor() {
    if (!requireEditUnlocked()) return;
    const r = bboxEditor.rect;
    if (!r || r.w < 0.004 || r.h < 0.004) {
        showToast(tr("toast.drawRegionFirst"), "error");
        return;
    }

    // 已入库碟片：写回 photo_offset / bbox（后端尽量重算墙面 pos）
    if (bboxEditor.mode === "editDiscBbox") {
        const discId = bboxEditor.discId;
        if (!discId) {
            showToast(tr("toast.discIdMissing"), "error");
            return;
        }
        const confirmBtn = $("#bbox-editor-confirm");
        const prevLabel = confirmBtn.textContent;
        confirmBtn.disabled = true;
        confirmBtn.textContent = tr("edit.saving");
        try {
            await api(`/discs/${discId}`, {
                method: "PUT",
                body: {
                    photo_offset_x: +r.x.toFixed(4),
                    photo_offset_y: +r.y.toFixed(4),
                    bbox_w: +r.w.toFixed(4),
                    bbox_h: +r.h.toFixed(4),
                },
            });
            closeBboxEditor();
            showToast(tr("toast.bboxSaved"), "success");
            await loadDiscs();
            if (state.selectedDiscId === discId) {
                await showDiscDetail(discId);
            }
            renderDiscMarkers();
        } catch (e) {
            showToast(tr("toast.saveFailed", { message: e.message }), "error");
            confirmBtn.disabled = false;
            confirmBtn.textContent = prevLabel;
        }
        return;
    }

    const imgIdx = bboxEditor.imgIdx;
    const analysis = state.analysisResults[imgIdx];
    if (!analysis) {
        showToast(tr("toast.analysisLost"), "error");
        return;
    }

    if (bboxEditor.mode === "calibrate") {
        const discIdx = bboxEditor.discIdx;
        const disc = analysis.discs[discIdx];
        if (!disc) {
            showToast(tr("toast.discNotFound"), "error");
            return;
        }
        disc.photo_offset_x = +r.x.toFixed(4);
        disc.photo_offset_y = +r.y.toFixed(4);
        disc.bbox_w = +r.w.toFixed(4);
        disc.bbox_h = +r.h.toFixed(4);
        closeBboxEditor();
        showToast(tr("toast.spineCalibrated"), "success");
        renderMatchResults();
        return;
    }

    // reanalyze
    const confirmBtn = $("#bbox-editor-confirm");
    const prevLabel = confirmBtn.textContent;
    confirmBtn.disabled = true;
    confirmBtn.textContent = tr("bbox.analyzing");
    try {
        const data = await api(`/images/${bboxEditor.imageId}/analyze-region`, {
            method: "POST",
            body: {
                photo_offset_x: r.x,
                photo_offset_y: r.y,
                bbox_w: r.w,
                bbox_h: r.h,
            },
        });
        const newDiscs = data.discs || [];
        if (!analysis.discs) analysis.discs = [];
        analysis.discs.push(...newDiscs);
        analysis.disc_count = analysis.discs.length;
        closeBboxEditor();
        showToast(tr("toast.regionAdded", { count: newDiscs.length }), "success");
        renderMatchResults();
    } catch (e) {
        showToast(tr("error.regionFailed") + ": " + e.message, "error");
        confirmBtn.disabled = false;
        confirmBtn.textContent = prevLabel;
    }
}

// ===== 照片位置标记（Step 4） =====

let placementState = {
    images: [],       // {image_id, filename, url}
    rects: {},        // image_id → {pos_x, pos_y, width_ratio, height_ratio}
    activeImageId: null,
    dragInfo: null,   // {type: 'move'|'resize', image_id, startX, startY, origLeft, origTop, origW, origH, handle}
    wallContainerRect: null,
    _docBound: false,
};

function showPlacementStep() {
    // 收集所有已确认的图片（去重）
    const imageMap = {};
    state.analysisResults.forEach(r => {
        if (r.image_id && r.filename && r.url && !imageMap[r.image_id]) {
            imageMap[r.image_id] = {
                image_id: r.image_id,
                filename: r.filename,
                url: r.url,
            };
        }
    });

    placementState.images = Object.values(imageMap);
    placementState.rects = {};
    placementState.activeImageId = null;
    placementState.dragInfo = null;

    placementState.images.forEach((img, i) => {
        placementState.rects[img.image_id] = {
            pos_x: 5 + i * 22,
            pos_y: 5 + i * 15,
            width_ratio: 18,
            height_ratio: 12,
        };
    });

    $("#step-match").classList.add("hidden");
    $("#step-placement").classList.remove("hidden");

    const step3 = $("#steps-indicator").querySelector('[data-step="3"]');
    const step4 = $("#steps-indicator").querySelector('[data-step="4"]');
    step3.classList.remove("active");
    step3.classList.add("done");
    step4.classList.add("active");
    $$("#steps-indicator .step-connector")[2].classList.add("done");

    if (state.wallImageUrl) {
        $("#placement-wall-bg").src = state.wallImageUrl;
    } else {
        $("#placement-wall-bg").src = "/photos/test-wall.jpg";
    }

    bindWallCoordSync($("#placement-wall-bg"), $("#placement-coord-layer"), "contain");
    renderPlacementOverlays();
    bindPlacementEvents();
}

function renderPlacementOverlays() {
    const container = $("#placement-overlays");
    if (!container) return;
    container.innerHTML = "";

    placementState.images.forEach(img => {
        const rect = placementState.rects[img.image_id];
        if (!rect) return;

        const isActive = img.image_id === placementState.activeImageId;
        const el = document.createElement("div");
        el.className = `placement-rect${isActive ? " selected" : ""}`;
        el.style.left = `${rect.pos_x}%`;
        el.style.top = `${rect.pos_y}%`;
        el.style.width = `${rect.width_ratio}%`;
        el.style.height = `${rect.height_ratio}%`;
        el.dataset.imageId = img.image_id;

        const label = document.createElement("div");
        label.className = "placement-rect-label";
        label.textContent = img.filename.substring(0, 20);
        el.appendChild(label);

        if (img.url) {
            const thumb = document.createElement("img");
            thumb.className = "placement-rect-thumb";
            thumb.src = img.url;
            el.appendChild(thumb);
        }

        ["nw", "ne", "sw", "se"].forEach(pos => {
            const handle = document.createElement("div");
            handle.className = `resize-handle handle-${pos}`;
            handle.dataset.handle = pos;
            el.appendChild(handle);
        });

        el.addEventListener("mousedown", (e) => {
            if (e.target.classList.contains("resize-handle")) return;
            e.stopPropagation();
            placementState.activeImageId = img.image_id;
            renderPlacementOverlays();
        });

        container.appendChild(el);
    });

    let photoListEl = document.getElementById("placement-photo-list");
    if (!photoListEl) {
        photoListEl = document.createElement("div");
        photoListEl.id = "placement-photo-list";
        photoListEl.className = "placement-photo-list";
        $("#placement-wall-container").parentNode.insertBefore(photoListEl, $("#placement-wall-container"));
    }
    photoListEl.innerHTML = placementState.images.map(img => {
        const isActive = img.image_id === placementState.activeImageId;
        return `<img class="placement-photo-thumb${isActive ? " active" : ""}"
                     src="${img.url}" alt=""
                     onclick="placementState.activeImageId=${img.image_id};renderPlacementOverlays();">`;
    }).join("");
}

function bindPlacementEvents() {
    const container = $("#placement-wall-container");
    const overlays = $("#placement-overlays");
    if (!container || !overlays) return;

    if (!placementState._docBound) {
        document.addEventListener("mousemove", (e) => {
            if (!placementState.dragInfo) return;
            const layer = $("#placement-coord-layer") || container;
            const cr = layer.getBoundingClientRect();
            const dx = ((e.clientX - placementState.dragInfo.startX) / Math.max(1, cr.width)) * 100;
            const dy = ((e.clientY - placementState.dragInfo.startY) / Math.max(1, cr.height)) * 100;
            const rect = placementState.rects[placementState.dragInfo.image_id];
            if (!rect) return;

            if (placementState.dragInfo.type === "move") {
                rect.pos_x = Math.max(0, Math.min(100 - rect.width_ratio, placementState.dragInfo.origLeft + dx));
                rect.pos_y = Math.max(0, Math.min(100 - rect.height_ratio, placementState.dragInfo.origTop + dy));
            } else if (placementState.dragInfo.type === "resize") {
                const h = placementState.dragInfo.handle;
                if (h.includes("e")) {
                    rect.width_ratio = Math.max(3, Math.min(100 - rect.pos_x, placementState.dragInfo.origW + dx));
                }
                if (h.includes("w")) {
                    const newW = Math.max(3, placementState.dragInfo.origW - dx);
                    rect.pos_x = placementState.dragInfo.origLeft + placementState.dragInfo.origW - newW;
                    rect.width_ratio = newW;
                    if (rect.pos_x < 0) {
                        rect.width_ratio += rect.pos_x;
                        rect.pos_x = 0;
                    }
                }
                if (h.includes("s")) {
                    rect.height_ratio = Math.max(2, Math.min(100 - rect.pos_y, placementState.dragInfo.origH + dy));
                }
                if (h.includes("n")) {
                    const newH = Math.max(2, placementState.dragInfo.origH - dy);
                    rect.pos_y = placementState.dragInfo.origTop + placementState.dragInfo.origH - newH;
                    rect.height_ratio = newH;
                    if (rect.pos_y < 0) {
                        rect.height_ratio += rect.pos_y;
                        rect.pos_y = 0;
                    }
                }
            }
            renderPlacementOverlays();
        });
        document.addEventListener("mouseup", () => { placementState.dragInfo = null; });
        placementState._docBound = true;
    }

    overlays.onmousedown = (e) => {
        const rectEl = e.target.closest(".placement-rect");
        if (!rectEl) return;
        const imageId = parseInt(rectEl.dataset.imageId, 10);
        const handleEl = e.target.closest(".resize-handle");
        placementState.activeImageId = imageId;
        if (handleEl) {
            placementState.dragInfo = {
                type: "resize",
                image_id: imageId,
                startX: e.clientX,
                startY: e.clientY,
                origLeft: placementState.rects[imageId].pos_x,
                origTop: placementState.rects[imageId].pos_y,
                origW: placementState.rects[imageId].width_ratio,
                origH: placementState.rects[imageId].height_ratio,
                handle: handleEl.dataset.handle,
            };
        } else {
            placementState.dragInfo = {
                type: "move",
                image_id: imageId,
                startX: e.clientX,
                startY: e.clientY,
                origLeft: placementState.rects[imageId].pos_x,
                origTop: placementState.rects[imageId].pos_y,
            };
        }
        e.preventDefault();
    };
}

async function savePositionsAndFinish() {
    if (!requireEditUnlocked()) return;
    const btn = $("#btn-save-positions");
    btn.disabled = true;
    setBtnLabel(btn, tr("match.saving"));

    try {
        for (const [imageId, rect] of Object.entries(placementState.rects)) {
            await api(`/images/${imageId}/position`, {
                method: "PUT",
                body: {
                    pos_x: Math.round(rect.pos_x * 100) / 100,
                    pos_y: Math.round(rect.pos_y * 100) / 100,
                    width_ratio: Math.round(rect.width_ratio * 100) / 100,
                    height_ratio: Math.round(rect.height_ratio * 100) / 100,
                },
            });
        }
        showToast(tr("toast.positionsSaved", { count: Object.keys(placementState.rects).length }), "success");
        closeUploadModal();
        await loadImageUrlMap();
        await loadDiscs();
    } catch (e) {
        showToast(tr("toast.saveFailed", { message: e.message }), "error");
    } finally {
        btn.disabled = false;
        setBtnLabel(btn, tr("upload.savePlacement"));
    }
}

function skipPlacement() {
    closeUploadModal();
    showToast(tr("toast.skippedPlacement"), "success");
}

// ===== 树形分组：单张特写墙面 placement 编辑 =====

// ===== 树形分组：多特写托盘 + 单墙面 placement 编辑 =====

let soloPlacementState = {
    images: [],          // [{id, filename, url, display_name, sourceFilename}]
    rects: {},           // id → {pos_x, pos_y, width_ratio, height_ratio}
    dirty: {},           // id → true
    activeImageId: null,
    dragInfo: null,
    bound: false,
    trayDragId: null,
};

function _soloDefaultRect(index) {
    return {
        pos_x: 8 + (index % 4) * 20,
        pos_y: 8 + Math.floor(index / 4) * 14,
        width_ratio: 18,
        height_ratio: 12,
    };
}

function _soloHasPlacement(img) {
    return (Number(img.width_ratio) || 0) > 0 && (Number(img.height_ratio) || 0) > 0;
}

function _soloActiveEntry() {
    return soloPlacementState.images.find(i => i.id === soloPlacementState.activeImageId) || null;
}

function _soloActiveRect() {
    if (!soloPlacementState.activeImageId) return null;
    return soloPlacementState.rects[soloPlacementState.activeImageId] || null;
}

function _soloMarkDirty(imageId) {
    if (imageId != null) soloPlacementState.dirty[imageId] = true;
}

function selectSoloPlacementImage(imageId, opts = {}) {
    const entry = soloPlacementState.images.find(i => i.id === imageId);
    if (!entry) return;
    if (!soloPlacementState.rects[imageId]) {
        soloPlacementState.rects[imageId] = opts.rect
            ? { ...opts.rect }
            : _soloDefaultRect(soloPlacementState.images.findIndex(i => i.id === imageId));
        _soloMarkDirty(imageId);
    } else if (opts.rect) {
        soloPlacementState.rects[imageId] = { ...opts.rect };
        _soloMarkDirty(imageId);
    }
    soloPlacementState.activeImageId = imageId;
    const label = entry.display_name || entry.filename;
    $("#solo-placement-filename").textContent =
        tr("placement.soloEditing", { name: label });
    renderSoloPlacementTray();
    renderSoloPlacementOverlay();
}

async function openSourcePlacementEditor(sourceFilename) {
    if (!requireEditUnlocked()) return;
    if (!sourceFilename || sourceFilename === tr("tree.uncategorized")) return;

    try {
        // 确保入口特写已入库
        const data = await api(`/images/resolve-source?filename=${encodeURIComponent(sourceFilename)}`);
        const focusImg = data.image;
        if (!focusImg || !focusImg.id) {
            showToast(tr("toast.resolvePhotoFailed"), "error");
            return;
        }
        if (data.created) {
            showToast(tr("toast.autoLinkedPhoto"), "success");
        }

        await loadImageUrlMap();

        // 列出全部特写（非全景）；若 focus 不在列表则补入
        const list = [...(state.closeupImages || [])];
        if (!list.some(i => i.id === focusImg.id)) {
            list.unshift(focusImg);
        }

        const images = list.map((img, idx) => ({
            id: img.id,
            filename: img.filename || "",
            url: img.url || sourceImageThumbUrl(img.filename || ""),
            display_name: img.display_name || img.original_filename || img.filename || `Close-up ${idx + 1}`,
            sourceFilename: img.filename || "",
        }));

        const rects = {};
        images.forEach((entry, idx) => {
            const meta = state.imageMetaMap[entry.filename] || list.find(i => i.id === entry.id) || {};
            if (_soloHasPlacement(meta)) {
                rects[entry.id] = {
                    pos_x: Number(meta.pos_x) || 0,
                    pos_y: Number(meta.pos_y) || 0,
                    width_ratio: Number(meta.width_ratio) || 18,
                    height_ratio: Number(meta.height_ratio) || 12,
                };
            }
        });

        // 入口特写若尚无 placement，给默认框
        if (!rects[focusImg.id]) {
            rects[focusImg.id] = _soloHasPlacement(focusImg)
                ? {
                    pos_x: Number(focusImg.pos_x) || 10,
                    pos_y: Number(focusImg.pos_y) || 10,
                    width_ratio: Number(focusImg.width_ratio) || 18,
                    height_ratio: Number(focusImg.height_ratio) || 12,
                }
                : _soloDefaultRect(images.findIndex(i => i.id === focusImg.id));
        }

        soloPlacementState = {
            images,
            rects,
            dirty: {},
            activeImageId: focusImg.id,
            dragInfo: null,
            bound: soloPlacementState.bound,
            trayDragId: null,
        };

        const wallUrl = state.wallImageUrl || "/photos/test-wall.jpg";
        $("#solo-placement-wall-bg").src = wallUrl;
        $("#solo-placement-recalc").checked = true;
        $("#solo-placement-modal").classList.remove("hidden");

        bindWallCoordSync($("#solo-placement-wall-bg"), $("#solo-placement-coord-layer"), "contain");
        selectSoloPlacementImage(focusImg.id);
        bindSoloPlacementEvents();
    } catch (e) {
        const msg = e.message || String(e);
        showToast(/未找到|图片管理|uploads\/photos|not_found/i.test(msg)
            ? (msg.includes("未找到") || msg.includes(tr("dialog.manage"))
                ? msg
                : "该特写尚未入库。请先在「图片管理」上传，或把同名文件放到 uploads/photos 后再点缩略图。")
            : tr("toast.openPlacementFailed", { message: msg }), "error");
    }
}

function closeSoloPlacementEditor() {
    $("#solo-placement-modal").classList.add("hidden");
    soloPlacementState.dragInfo = null;
    soloPlacementState.activeImageId = null;
    soloPlacementState.trayDragId = null;
    const tray = $("#solo-placement-tray");
    if (tray) tray.innerHTML = "";
}

function renderSoloPlacementTray() {
    const tray = $("#solo-placement-tray");
    if (!tray) return;
    tray.innerHTML = soloPlacementState.images.map(img => {
        const isActive = img.id === soloPlacementState.activeImageId;
        const placed = !!soloPlacementState.rects[img.id];
        const dirty = !!soloPlacementState.dirty[img.id];
        const label = img.display_name || img.filename;
        return `<div class="placement-photo-chip" data-image-id="${img.id}">
            <img class="placement-photo-thumb${isActive ? " active" : ""}${placed ? " placed" : ""}"
                 src="${escapeHtml(img.url)}" alt=""
                 draggable="true"
                 data-image-id="${img.id}"
                 title="${escapeHtml(label)}${dirty ? "（已修改）" : ""}">
            <span class="placement-photo-chip-label" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
        </div>`;
    }).join("");

    tray.querySelectorAll(".placement-photo-thumb").forEach(thumb => {
        thumb.addEventListener("click", (e) => {
            e.preventDefault();
            const id = parseInt(thumb.dataset.imageId, 10);
            selectSoloPlacementImage(id);
        });
        thumb.addEventListener("dragstart", (e) => {
            const id = parseInt(thumb.dataset.imageId, 10);
            soloPlacementState.trayDragId = id;
            e.dataTransfer.setData("text/plain", String(id));
            e.dataTransfer.effectAllowed = "copy";
            thumb.style.opacity = "0.4";
        });
        thumb.addEventListener("dragend", () => {
            thumb.style.opacity = "";
            soloPlacementState.trayDragId = null;
            $("#solo-placement-wall-container")?.classList.remove("tray-drop-hover");
        });
    });
}

function renderSoloPlacementOverlay() {
    const container = $("#solo-placement-overlays");
    if (!container) return;
    container.innerHTML = "";

    soloPlacementState.images.forEach(img => {
        const rect = soloPlacementState.rects[img.id];
        if (!rect) return;
        const isActive = img.id === soloPlacementState.activeImageId;
        const el = document.createElement("div");
        el.className = `placement-rect${isActive ? " selected" : " inactive"}`;
        el.style.left = `${rect.pos_x}%`;
        el.style.top = `${rect.pos_y}%`;
        el.style.width = `${rect.width_ratio}%`;
        el.style.height = `${rect.height_ratio}%`;
        el.dataset.imageId = String(img.id);

        const label = document.createElement("div");
        label.className = "placement-rect-label";
        label.textContent = (img.display_name || img.filename || "").substring(0, 28);
        el.appendChild(label);

        if (img.url) {
            const thumb = document.createElement("img");
            thumb.className = "placement-rect-thumb";
            thumb.src = img.url;
            el.appendChild(thumb);
        }

        if (isActive) {
            ["nw", "ne", "sw", "se"].forEach(pos => {
                const handle = document.createElement("div");
                handle.className = `resize-handle handle-${pos}`;
                handle.dataset.handle = pos;
                el.appendChild(handle);
            });
        }

        el.addEventListener("mousedown", (e) => {
            if (!isActive) {
                selectSoloPlacementImage(img.id);
                e.preventDefault();
                e.stopPropagation();
            }
        });

        container.appendChild(el);
    });
}

function bindSoloPlacementEvents() {
    const wall = $("#solo-placement-wall-container");
    if (!wall) return;

    if (!soloPlacementState.bound) {
        const onMove = (e) => {
            if (!soloPlacementState.dragInfo) return;
            if ($("#solo-placement-modal").classList.contains("hidden")) return;
            const rect = _soloActiveRect();
            if (!rect) return;
            const layer = $("#solo-placement-coord-layer") || wall;
            const cr = layer.getBoundingClientRect();
            const dx = ((e.clientX - soloPlacementState.dragInfo.startX) / Math.max(1, cr.width)) * 100;
            const dy = ((e.clientY - soloPlacementState.dragInfo.startY) / Math.max(1, cr.height)) * 100;
            const info = soloPlacementState.dragInfo;

            if (info.type === "move") {
                rect.pos_x = Math.max(0, Math.min(100 - rect.width_ratio, info.origLeft + dx));
                rect.pos_y = Math.max(0, Math.min(100 - rect.height_ratio, info.origTop + dy));
            } else if (info.type === "resize") {
                const h = info.handle;
                if (h.includes("e")) {
                    rect.width_ratio = Math.max(3, Math.min(100 - rect.pos_x, info.origW + dx));
                }
                if (h.includes("w")) {
                    const newW = Math.max(3, info.origW - dx);
                    rect.pos_x = info.origLeft + info.origW - newW;
                    rect.width_ratio = newW;
                    if (rect.pos_x < 0) {
                        rect.width_ratio += rect.pos_x;
                        rect.pos_x = 0;
                    }
                }
                if (h.includes("s")) {
                    rect.height_ratio = Math.max(2, Math.min(100 - rect.pos_y, info.origH + dy));
                }
                if (h.includes("n")) {
                    const newH = Math.max(2, info.origH - dy);
                    rect.pos_y = info.origTop + info.origH - newH;
                    rect.height_ratio = newH;
                    if (rect.pos_y < 0) {
                        rect.height_ratio += rect.pos_y;
                        rect.pos_y = 0;
                    }
                }
            }
            _soloMarkDirty(soloPlacementState.activeImageId);
            renderSoloPlacementOverlay();
        };
        const onUp = () => { soloPlacementState.dragInfo = null; };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
        soloPlacementState.bound = true;
    }

    const overlays = $("#solo-placement-overlays");
    overlays.onmousedown = (e) => {
        const rectEl = e.target.closest(".placement-rect");
        if (!rectEl) return;
        const imageId = parseInt(rectEl.dataset.imageId, 10);
        if (imageId !== soloPlacementState.activeImageId) {
            selectSoloPlacementImage(imageId);
            return;
        }
        const handleEl = e.target.closest(".resize-handle");
        const rect = _soloActiveRect();
        if (!rect) return;
        if (handleEl) {
            soloPlacementState.dragInfo = {
                type: "resize",
                startX: e.clientX,
                startY: e.clientY,
                origLeft: rect.pos_x,
                origTop: rect.pos_y,
                origW: rect.width_ratio,
                origH: rect.height_ratio,
                handle: handleEl.dataset.handle,
            };
        } else {
            soloPlacementState.dragInfo = {
                type: "move",
                startX: e.clientX,
                startY: e.clientY,
                origLeft: rect.pos_x,
                origTop: rect.pos_y,
            };
        }
        e.preventDefault();
        e.stopPropagation();
    };

    // 托盘拖入墙面
    wall.ondragover = (e) => {
        if (soloPlacementState.trayDragId == null && !(e.dataTransfer && e.dataTransfer.types.includes("text/plain"))) return;
        e.preventDefault();
        wall.classList.add("tray-drop-hover");
    };
    wall.ondragleave = () => wall.classList.remove("tray-drop-hover");
    wall.ondrop = (e) => {
        e.preventDefault();
        wall.classList.remove("tray-drop-hover");
        const raw = e.dataTransfer.getData("text/plain") || String(soloPlacementState.trayDragId || "");
        const imageId = parseInt(raw, 10);
        if (!imageId) return;
        const layer = $("#solo-placement-coord-layer") || wall;
        const p = clientToWallPercent(e.clientX, e.clientY, layer);
        const existing = soloPlacementState.rects[imageId];
        const w = existing ? existing.width_ratio : 18;
        const h = existing ? existing.height_ratio : 12;
        const dropRect = {
            pos_x: Math.max(0, Math.min(100 - w, p.x - w / 2)),
            pos_y: Math.max(0, Math.min(100 - h, p.y - h / 2)),
            width_ratio: w,
            height_ratio: h,
        };
        selectSoloPlacementImage(imageId, { rect: dropRect });
    };
}

async function saveSoloPlacement() {
    if (!requireEditUnlocked()) return;
    const activeId = soloPlacementState.activeImageId;
    if (!activeId || !_soloActiveRect()) {
        showToast(tr("toast.selectPlacementFirst"), "error");
        return;
    }

    // 保存：优先全部 dirty；若无 dirty 则保存当前选中
    const ids = Object.keys(soloPlacementState.dirty).map(Number).filter(id => soloPlacementState.rects[id]);
    const toSave = ids.length > 0 ? ids : [activeId];

    const btn = $("#solo-placement-save");
    btn.disabled = true;
    const prev = getBtnLabel(btn);
    setBtnLabel(btn, tr("match.saving"));

    const recalc = $("#solo-placement-recalc").checked;
    let saved = 0;
    let recalcTotal = 0;
    try {
        for (const imageId of toSave) {
            const rect = soloPlacementState.rects[imageId];
            if (!rect) continue;
            const entry = soloPlacementState.images.find(i => i.id === imageId);
            const result = await api(`/images/${imageId}/position`, {
                method: "PUT",
                body: {
                    pos_x: Math.round(rect.pos_x * 100) / 100,
                    pos_y: Math.round(rect.pos_y * 100) / 100,
                    width_ratio: Math.round(rect.width_ratio * 100) / 100,
                    height_ratio: Math.round(rect.height_ratio * 100) / 100,
                    recalc_discs: recalc,
                    source_filename: entry ? entry.sourceFilename : "",
                },
            });
            saved += 1;
            recalcTotal += result.recalc_discs || 0;
            delete soloPlacementState.dirty[imageId];
            // 同步本地 meta，首页 AR 立即可用
            if (entry && entry.filename) {
                state.imageMetaMap[entry.filename] = {
                    ...(state.imageMetaMap[entry.filename] || {}),
                    ...entry,
                    pos_x: rect.pos_x,
                    pos_y: rect.pos_y,
                    width_ratio: rect.width_ratio,
                    height_ratio: rect.height_ratio,
                };
            }
        }
        showToast(
            recalc
                ? tr("placement.savedRecalc", { photos: saved, discs: recalcTotal })
                : tr("placement.saved", { count: saved }),
            "success"
        );
        closeSoloPlacementEditor();
        await loadImageUrlMap();
        await loadDiscs(
            $("#search-input").value.trim(),
            $("#filter-genre").value,
            $("#filter-year").value,
            $("#filter-preference")?.value || ""
        );
        if (state.selectedDiscId) {
            const sel = state.discs.find(d => d.id === state.selectedDiscId);
            if (sel && sel.source_image) renderPhotoArOverlay(sel.source_image);
        }
    } catch (e) {
        showToast(tr("toast.saveFailed", { message: e.message }), "error");
    } finally {
        btn.disabled = false;
        setBtnLabel(btn, prev);
    }
}

// ===== 浮动面板水平拖拽（侧栏 / 详情） =====
const PANEL_DRAG_HANDLE_PX = 36;
const PANEL_DRAG_THRESHOLD = 4;
const PANEL_SNAP_DIST = 28;

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function getPanelDragOffset(panel) {
    // 优先读内联变量（拖动中更可靠），再回退 computed
    const inline = panel.style.getPropertyValue("--drag-x").trim();
    const raw = (inline || getComputedStyle(panel).getPropertyValue("--drag-x")).trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
}

function setPanelDragOffset(panel, x, { animate = false } = {}) {
    const px = `${Math.round(x)}px`;
    if (animate) {
        panel.classList.remove("is-dragging");
        panel.style.setProperty("--drag-x", px);
        return;
    }
    panel.classList.add("is-dragging");
    panel.style.setProperty("--drag-x", px);
    void panel.offsetWidth;
    panel.classList.remove("is-dragging");
}

function snapPanelOffset(x, snaps) {
    let best = x;
    let bestDist = PANEL_SNAP_DIST + 1;
    for (const s of snaps) {
        const d = Math.abs(x - s);
        if (d < bestDist) {
            bestDist = d;
            best = s;
        }
    }
    return bestDist <= PANEL_SNAP_DIST ? best : x;
}

function panelDragBounds(panel, edge) {
    // offsetWidth 不受 transform 影响；hidden 时退回默认宽
    const w = panel.offsetWidth || panel.getBoundingClientRect().width || (edge === "left" ? 340 : 400);
    const tuck = -(w - PANEL_DRAG_HANDLE_PX);
    if (edge === "left") {
        // 默认 0；负向几乎移出左侧，正向移向右侧腾出墙面
        const max = Math.max(0, window.innerWidth - PANEL_DRAG_HANDLE_PX - 8);
        return { min: tuck, max, snaps: [0, tuck] };
    }
    // right edge panel: 默认 0；正向几乎移出右侧，负向移向左侧腾出墙面
    const min = -Math.max(0, window.innerWidth - PANEL_DRAG_HANDLE_PX - 8);
    const max = -tuck; // +(w - handle)
    return { min, max, snaps: [0, max] };
}

function initFloatingPanelDrag(panel, handle, { edge, storageKey }) {
    if (!panel || !handle) {
        console.warn("[myWall] panel drag skipped: missing panel/handle", { panel: !!panel, handle: !!handle, edge });
        return;
    }
    if (handle.dataset.panelDragBound === "1") return;
    handle.dataset.panelDragBound = "1";

    let offsetX = 0;
    try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved != null && saved !== "") offsetX = parseFloat(saved) || 0;
    } catch (_) { /* ignore */ }

    const apply = (x, opts) => {
        if (isNarrowBrowse()) {
            clearMobilePanelDrag();
            offsetX = 0;
            return;
        }
        offsetX = x;
        setPanelDragOffset(panel, x, opts);
        try { sessionStorage.setItem(storageKey, String(Math.round(x))); } catch (_) { /* ignore */ }
        syncGenreCloudPlacement();
    };

    // restore（详情面板若仍 hidden，宽度可能为 0，稍后再校正）
    if (isNarrowBrowse()) {
        clearMobilePanelDrag();
        offsetX = 0;
    } else {
        const bounds0 = panelDragBounds(panel, edge);
        apply(clamp(offsetX, bounds0.min, bounds0.max), { animate: false });
    }

    let dragging = false;
    let moved = false;
    let startPointerX = 0;
    let startOffset = 0;
    let pointerId = null;

    const onPointerMove = (e) => {
        if (isNarrowBrowse()) return;
        if (!dragging || e.pointerId !== pointerId) return;
        const dx = e.clientX - startPointerX;
        if (!moved && Math.abs(dx) < PANEL_DRAG_THRESHOLD) return;
        moved = true;
        const { min, max } = panelDragBounds(panel, edge);
        const next = clamp(startOffset + dx, min, max);
        panel.classList.add("is-dragging");
        panel.style.setProperty("--drag-x", `${Math.round(next)}px`);
        offsetX = next;
        syncGenreCloudPlacement();
        e.preventDefault();
    };

    const endDrag = (e) => {
        if (!dragging || (e && e.pointerId !== pointerId)) return;
        dragging = false;
        document.body.classList.remove("panel-is-dragging");
        try { handle.releasePointerCapture?.(pointerId); } catch (_) { /* ignore */ }
        const endedId = pointerId;
        pointerId = null;
        handle.removeEventListener("pointermove", onPointerMove);
        handle.removeEventListener("pointerup", endDrag);
        handle.removeEventListener("pointercancel", endDrag);
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", endDrag);
        document.removeEventListener("pointercancel", endDrag);

        if (isNarrowBrowse()) {
            clearMobilePanelDrag();
            return;
        }
        if (!moved) {
            panel.classList.remove("is-dragging");
            return;
        }
        const { min, max, snaps } = panelDragBounds(panel, edge);
        const snapped = clamp(snapPanelOffset(offsetX, snaps), min, max);
        panel.classList.remove("is-dragging");
        apply(snapped, { animate: true });
        syncGenreCloudPlacement();
        void endedId;
    };

    handle.addEventListener("pointerdown", (e) => {
        if (isNarrowBrowse()) {
            clearMobilePanelDrag();
            return;
        }
        if (e.button != null && e.button !== 0) return;
        if (e.target.closest("button, a, input, select, textarea, label")) return;
        if (panel.classList.contains("hidden")) return;

        dragging = true;
        moved = false;
        pointerId = e.pointerId;
        startPointerX = e.clientX;
        startOffset = getPanelDragOffset(panel);
        offsetX = startOffset;
        document.body.classList.add("panel-is-dragging");
        try { handle.setPointerCapture?.(pointerId); } catch (_) { /* ignore */ }
        // 同时挂 handle（capture 后）与 document（兜底），保证一定能收到 move
        handle.addEventListener("pointermove", onPointerMove);
        handle.addEventListener("pointerup", endDrag);
        handle.addEventListener("pointercancel", endDrag);
        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", endDrag);
        document.addEventListener("pointercancel", endDrag);
        e.preventDefault();
    });

    // 双击把手复位
    handle.addEventListener("dblclick", (e) => {
        if (isNarrowBrowse()) return;
        if (e.target.closest("button, a, input, select, textarea, label")) return;
        apply(0, { animate: true });
    });

    handle.addEventListener("keydown", (e) => {
        if (isNarrowBrowse()) return;
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        const step = e.shiftKey ? 48 : 16;
        const dir = e.key === "ArrowRight" ? 1 : -1;
        const { min, max } = panelDragBounds(panel, edge);
        apply(clamp(getPanelDragOffset(panel) + dir * step, min, max), { animate: true });
    });
}

function initPanelDrags() {
    initFloatingPanelDrag($("#sidebar"), $("#sidebar .panel-drag-handle"), {
        edge: "left",
        storageKey: "mywall-sidebar-drag-x",
    });
    initFloatingPanelDrag($("#detail-panel"), $("#detail-panel .panel-drag-handle"), {
        edge: "right",
        storageKey: "mywall-detail-drag-x",
    });
}

// ===== 侧栏底部功能托盘（默认收起，向上滑出） =====

function isSidebarFooterOpen() {
    return !!$("#sidebar-footer")?.classList.contains("is-open");
}

function closeSidebarFooter() {
    const footer = $("#sidebar-footer");
    const toggle = $("#btn-sidebar-tools");
    const sheet = $("#sidebar-footer-sheet");
    if (!footer) return;
    footer.classList.remove("is-open");
    footer.dataset.pinned = "";
    if (toggle) {
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", tr("nav.expandTools"));
    }
    if (sheet) sheet.setAttribute("inert", "");
}

function openSidebarFooter({ pin = false } = {}) {
    const footer = $("#sidebar-footer");
    const toggle = $("#btn-sidebar-tools");
    const sheet = $("#sidebar-footer-sheet");
    if (!footer) return;
    footer.classList.add("is-open");
    if (pin) footer.dataset.pinned = "1";
    if (toggle) {
        toggle.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-label", tr("nav.collapseTools"));
    }
    if (sheet) sheet.removeAttribute("inert");
}

const WALL_BRIGHTNESS_KEY = "mywall-wall-brightness";
const WALL_BRIGHTNESS_MIN = 30;
const WALL_BRIGHTNESS_MAX = 100;
const WALL_BRIGHTNESS_DEFAULT = 50;

function clampWallBrightness(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return WALL_BRIGHTNESS_DEFAULT;
    return Math.min(WALL_BRIGHTNESS_MAX, Math.max(WALL_BRIGHTNESS_MIN, Math.round(n)));
}

function readStoredWallBrightness() {
    try {
        const saved = localStorage.getItem(WALL_BRIGHTNESS_KEY);
        if (saved == null || saved === "") return WALL_BRIGHTNESS_DEFAULT;
        return clampWallBrightness(saved);
    } catch (_) {
        return WALL_BRIGHTNESS_DEFAULT;
    }
}

function applyWallBrightness(pct) {
    const value = clampWallBrightness(pct);
    document.documentElement.style.setProperty("--wall-brightness", String(value / 100));
    const slider = $("#wall-brightness-slider");
    const readout = $("#wall-brightness-value");
    if (slider) {
        slider.value = String(value);
        slider.setAttribute("aria-valuenow", String(value));
        const fill = ((value - WALL_BRIGHTNESS_MIN) / (WALL_BRIGHTNESS_MAX - WALL_BRIGHTNESS_MIN)) * 100;
        slider.style.setProperty("--fill", `${fill}%`);
    }
    if (readout) readout.textContent = `${value}%`;
    return value;
}

function persistWallBrightness(pct) {
    try {
        localStorage.setItem(WALL_BRIGHTNESS_KEY, String(clampWallBrightness(pct)));
    } catch (_) { /* ignore */ }
}

function initWallBrightness() {
    applyWallBrightness(readStoredWallBrightness());
    const slider = $("#wall-brightness-slider");
    if (!slider) return;
    const onInput = () => persistWallBrightness(applyWallBrightness(slider.value));
    slider.addEventListener("input", onInput);
    slider.addEventListener("change", onInput);
}

function initSidebarFooter() {
    const footer = $("#sidebar-footer");
    const toggle = $("#btn-sidebar-tools");
    const sheet = $("#sidebar-footer-sheet");
    if (!footer || !toggle || !sheet) return;

    const fineHover = window.matchMedia("(hover: hover) and (pointer: fine)");
    let hoverLocked = false;

    closeSidebarFooter();

    toggle.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isSidebarFooterOpen()) {
            hoverLocked = true;
            closeSidebarFooter();
        } else {
            openSidebarFooter({ pin: true });
        }
    });

    footer.addEventListener("mouseenter", () => {
        if (fineHover.matches && !hoverLocked) openSidebarFooter();
    });
    footer.addEventListener("mouseleave", () => {
        hoverLocked = false;
        if (footer.dataset.pinned !== "1") closeSidebarFooter();
    });

    ["btn-upload", "btn-create-disc", "btn-manage", "btn-enrich-posters"].forEach((id) => {
        $(`#${id}`)?.addEventListener("click", () => openSidebarFooter({ pin: true }));
    });

    document.addEventListener("pointerdown", (e) => {
        if (!footer.contains(e.target)) closeSidebarFooter();
    });
}

// ===== 事件绑定 =====

function bindEvents() {
    initPanelDrags();
    initSidebarFooter();

    // 视图模式切换
    $("#btn-mode-list").addEventListener("click", () => switchViewMode("list"));
    $("#btn-mode-tree").addEventListener("click", () => switchViewMode("tree"));

    $("#search-input").addEventListener("input", debounce(doSearch, 300));
    $("#search-btn").addEventListener("click", doSearch);
    $("#search-input").addEventListener("keydown", e => { if (e.key === "Enter") doSearch(); });
    $("#filter-genre").addEventListener("change", doSearch);
    $("#filter-year").addEventListener("change", doSearch);
    $("#filter-preference")?.addEventListener("change", doSearch);
    $("#detail-close").addEventListener("click", closeDetail);

    $("#btn-manual")?.addEventListener("click", openManualModal);
    $("#modal-close-manual")?.addEventListener("click", closeManualModal);
    $("#manual-overlay")?.addEventListener("click", closeManualModal);

    initGenreCloudLayout();
    $("#btn-genre-cloud")?.addEventListener("click", openGenreCloudModal);
    $("#modal-close-genre-cloud")?.addEventListener("click", closeGenreCloudModal);

    $("#wall-image").addEventListener("click", () => {
        if (!$("#detail-panel").classList.contains("hidden")) closeDetail();
    });

    // 上传模态框
    $("#btn-upload").addEventListener("click", openUploadModal);
    $("#modal-close-upload").addEventListener("click", closeUploadModal);
    $("#upload-zone").addEventListener("click", () => $("#upload-input").click());
    $("#upload-input").addEventListener("change", e => handleFileSelect(e.target.files));
    $("#btn-start-upload").addEventListener("click", startUploadAndAnalyze);
    $("#btn-confirm-all").addEventListener("click", confirmAllMatches);
    $("#btn-retry-analysis").addEventListener("click", resetUploadUI);
    $("#btn-existing-select-all").addEventListener("click", toggleSelectAllExistingPhotos);
    $("#btn-existing-reprocess").addEventListener("click", reprocessSelectedExistingPhotos);
    $("#btn-existing-delete").addEventListener("click", deleteSelectedExistingPhotos);
    $("#btn-existing-edit-boxes")?.addEventListener("click", openSpineBoxesEditorForSelection);
    $("#btn-existing-stage2")?.addEventListener("click", runStage2OnSelected);
    $("#modal-close-spine-boxes")?.addEventListener("click", closeSpineBoxesEditor);
    $("#spine-boxes-overlay")?.addEventListener("click", closeSpineBoxesEditor);

    // 位置标记
    $("#btn-save-positions").addEventListener("click", savePositionsAndFinish);
    $("#btn-skip-placement").addEventListener("click", skipPlacement);

    // 树形：单张特写墙面 placement
    $("#solo-placement-close").addEventListener("click", closeSoloPlacementEditor);
    $("#solo-placement-cancel").addEventListener("click", closeSoloPlacementEditor);
    $("#solo-placement-save").addEventListener("click", saveSoloPlacement);
    $("#solo-placement-overlay").addEventListener("click", closeSoloPlacementEditor);

    // 拖拽上传
    $("#upload-zone").addEventListener("dragover", e => { e.preventDefault(); $("#upload-zone").classList.add("dragover"); });
    $("#upload-zone").addEventListener("dragleave", () => $("#upload-zone").classList.remove("dragover"));
    $("#upload-zone").addEventListener("drop", e => {
        e.preventDefault();
        $("#upload-zone").classList.remove("dragover");
        handleFileSelect(e.dataTransfer.files);
    });

    // 图片管理 / 手工建卡
    $("#btn-manage").addEventListener("click", openManageModal);
    $("#btn-create-disc")?.addEventListener("click", openCreateDiscModal);
    $("#btn-enrich-posters")?.addEventListener("click", enrichPostersFromTmdb);
    $("#modal-close-manage").addEventListener("click", closeManageModal);
    $("#modal-close-verify").addEventListener("click", () => $("#verify-modal").classList.add("hidden"));

    // 管理模态框内的批量操作按钮
    $("#btn-manage-select-all").addEventListener("click", toggleSelectAllImages);
    $("#btn-batch-reprocess").addEventListener("click", batchReprocess);
    $("#btn-batch-delete").addEventListener("click", batchDelete);

    // 点击遮罩关闭
    document.querySelectorAll(".modal-overlay").forEach(o => {
        o.addEventListener("click", e => {
            const modal = e.target.closest(".modal");
            if (modal === $("#upload-modal") && confirm(tr("upload.confirmClose"))) closeUploadModal();
            if (modal === $("#manage-modal")) closeManageModal();
            if (modal === $("#match-modal")) $("#match-modal").classList.add("hidden");
            if (modal === $("#verify-modal")) $("#verify-modal").classList.add("hidden");
        });
    });

    // Zoom overlay events
    $("#ar-zoom-backdrop").addEventListener("click", closeArZoom);
    $("#ar-zoom-close").addEventListener("click", closeArZoom);
    $("#ar-zoom-wrapper").addEventListener("click", e => e.stopPropagation());

    // Escape 键
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") {
            if ($("#ar-zoom-overlay").classList.contains("active")) { closeArZoom(); return; }
            if (!$("#genre-cloud-modal")?.classList.contains("hidden")) { closeGenreCloudModal(); return; }
            if (!$("#spine-boxes-modal")?.classList.contains("hidden")) { closeSpineBoxesEditor(); return; }
            if (!$("#manual-modal")?.classList.contains("hidden")) { closeManualModal(); return; }
            if (!$("#solo-placement-modal").classList.contains("hidden")) { closeSoloPlacementEditor(); return; }
            if (!$("#detail-panel").classList.contains("hidden")) closeDetail();
            if (!$("#manage-modal").classList.contains("hidden")) closeManageModal();
            if (!$("#match-modal").classList.contains("hidden")) $("#match-modal").classList.add("hidden");
            if (!$("#verify-modal").classList.contains("hidden")) $("#verify-modal").classList.add("hidden");
            if (isSidebarFooterOpen()) closeSidebarFooter();
        }
    });

    initDragOnWall();
}

// ===== 启动 =====
document.addEventListener("DOMContentLoaded", init);
