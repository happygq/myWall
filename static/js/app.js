/**
 * myWall v3.13 — 多源片名搜索（TMDb / OMDb·IMDb / TVDB）/ 手工建卡 / tmdb_media_type / imdb_id·tvdb_id / 手工编辑 bbox / 编辑窗原图碟脊对照 / 卡片字段 / 标定碟脊 / 区域重识别 / 标记错误 / 双重确认删除 / 针图标原图 bbox 状态 / API 错误脱敏 / 按 tmdb_id 批量补海报
 * 树形分组缩略图可调整特写在总布局墙上的 placement（多特写托盘 + 单墙面编辑）
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
 * 墙面坐标：首页与 placement 编辑共用 wall-coord-layer，百分比相对墙图自然尺寸
 * 素材策略：test3≈test10 只跑一份；墙面只用 test-wall.jpg；识别 test1–13 跳过重复与已完成的 test2
 */

// ===== 全局状态 =====
const state = {
    discs: [],
    filters: { genres: [], years: [] },
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
    showToast("只读模式");
    return false;
}

function syncEditModeToggle(unlocked) {
    const btn = $("#btn-edit-mode");
    if (!btn) return;
    btn.innerHTML = unlocked ? EDIT_MODE_ICONS.unlocked : EDIT_MODE_ICONS.locked;
    btn.setAttribute("aria-pressed", unlocked ? "true" : "false");
    const title = unlocked ? "可编辑（点击切换为只读）" : "只读模式（点击解锁编辑）";
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
        showToast("只读模式");
    }, true);
    document.addEventListener("drop", (e) => {
        if (isEditUnlocked()) return;
        if (!e.target.closest("#upload-zone")) return;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showToast("只读模式");
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
        const err = await res.json().catch(() => ({ error: "请求失败" }));
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
            imdb: { enabled: false, label: "IMDb", hint: "无法检测 OMDb 配置" },
            tvdb: { enabled: false, label: "TVDB", hint: "无法检测 TVDB 配置" },
        };
    }
    return metaProvidersCache;
}

function tmdbTypeBadgeHtml(mediaType) {
    const mt = normalizeTmdbMediaType(mediaType);
    const label = mt === "tv" ? "剧集" : "电影";
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
    const rest = runnable.length ? `仅搜 ${runnable.map(s => data.providers[s].label || s).join("、")}` : "无可用来源";
    return `已跳过未启用的 ${labels.join("、")}，${rest}`;
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
        ["all", "全部"],
        ["movie", "电影"],
        ["tv", "剧集"],
    ];
    return `<div class="tmdb-scope-seg" id="${id}" role="group" aria-label="搜索类型">
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
            btn.title = info.hint || `未配置 ${src.toUpperCase()} key`;
            if (btn.classList.contains("is-active")) {
                btn.classList.remove("is-active");
                const allBtn = segEl.querySelector('[data-source="all"]');
                if (allBtn) allBtn.classList.add("is-active");
            }
        } else {
            btn.removeAttribute("disabled");
            btn.title = info.via ? `经由 ${info.via}` : "";
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
        const masked = configured ? (info.masked || "••••") : "未配置";
        const on = info.enabled !== false;
        return `<div class="edit-api-key-row" data-source="${src}">
            <div class="edit-api-key-head">
                <span class="edit-api-key-label">${label}</span>
                <span class="edit-api-key-masked${configured ? "" : " is-empty"}">${escapeHtml(masked)}</span>
                <button type="button" class="edit-api-key-switch${on ? " is-on" : ""}" role="switch" aria-checked="${on ? "true" : "false"}" title="${on ? "尝试调用（开）" : "尝试调用（关）"}" aria-label="${label} 尝试调用"></button>
            </div>
            <div class="edit-api-key-edit">
                <input type="password" autocomplete="off" spellcheck="false" placeholder="粘贴新 key" aria-label="${label} 新 key">
                <button type="button" class="edit-api-key-iconbtn" data-act="save" title="保存" aria-label="保存 ${label} key">${ICON_KEY_SAVE}</button>
                <button type="button" class="edit-api-key-iconbtn" data-act="clear" title="清除" aria-label="清除 ${label} key" ${configured ? "" : "disabled"}>${ICON_KEY_CLEAR}</button>
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
    el.innerHTML = `<span>无法读取 API Key：${escapeHtml(msg)}</span><button type="button" class="edit-api-keys-retry" data-act="retry-keys">重试</button>`;
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
        setEditApiKeysError(e.message || "请求失败");
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
                showToast(next ? "已开启尝试调用" : "已关闭该来源请求", "success");
            } catch (err) {
                showToast("更新失败: " + (err.message || err), "error");
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
                    showToast("请先粘贴新 key", "error");
                    return;
                }
                await applyApiKeyUpdate(source, { api_key: key });
                if (input) input.value = "";
                showToast("已保存（仅显示掩码）", "success");
            } else if (act === "clear") {
                await applyApiKeyUpdate(source, { api_key: "" });
                if (input) input.value = "";
                showToast("已清除该源 key", "success");
            }
        } catch (err) {
            showToast("更新失败: " + (err.message || err), "error");
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
            const hint = btn.title || "该来源未配置 API Key";
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
        ["all", "全部"],
        ["tmdb", "TMDb"],
        ["imdb", "IMDb"],
        ["tvdb", "TVDB"],
    ];
    return `<div class="tmdb-scope-seg" id="${id}" role="group" aria-label="搜索来源">
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
    const vote = r.vote_count != null ? ` | ${r.vote_count}票` : "";
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
                <div class="match-overview">${escapeHtml(r.overview || "暂无简介")}</div>
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
    const label = on ? "下滑显示墙面" : "上滑隐藏墙面";
    handle.setAttribute("title", label);
    handle.setAttribute("aria-label", `${label}，反向滑动切换`);
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
        showToast("部分数据加载失败，可刷新重试", "error");
    }
    bindEvents();
    bindWallCoordSync($("#wall-image"), $("#wall-coord-layer"), "cover");
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
    if (!filename || filename === "未归类") return "";
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
    if (genre) params.set("genre", genre);
    if (year) params.set("year", year);
    if (preference !== "" && preference != null) params.set("preference", preference);
    const data = await api(`/discs?${params.toString()}`);
    state.discs = data.discs;
    if (state.viewMode === "tree") await loadImageUrlMap();
    renderDiscMarkers();
    renderDiscList();
    $("#stat-count").textContent = state.discs.length;
}

async function loadFilters() {
    const data = await api("/filters");
    state.filters = data;
    $("#filter-genre").innerHTML = '<option value="">全部类型</option>' +
        data.genres.map(g => `<option value="${g}">${g}</option>`).join("");
    $("#filter-year").innerHTML = '<option value="">全部年份</option>' +
        data.years.map(y => `<option value="${y}">${y}</option>`).join("");
}

async function loadStats() {
    const data = await api("/stats");
    $("#stat-count").textContent = data.total_discs;
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
    m.className = `disc-marker ${getGenreClass(disc.genres)}${flagged ? " flagged" : ""} highlighted`;
    m.style.left = `${disc.pos_x}%`;
    m.style.top = `${disc.pos_y}%`;
    m.dataset.discId = disc.id;
    m.title = flagged ? `${disc.title_cn}（识别有误）` : disc.title_cn;
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
        list.innerHTML = '<div class="empty-state">暂无碟片</div>';
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

const PREF_LABELS = {
    0: "未标注喜好",
    1: "喜好 · 绿",
    2: "喜好 · 蓝",
    3: "喜好 · 橙",
};

function normalizePreference(value) {
    const n = Number(value);
    return (n === 1 || n === 2 || n === 3) ? n : 0;
}

function renderPreferenceControl(disc) {
    const pref = normalizePreference(disc.preference);
    const icon = DISC_CARD_ICONS.heartFilled;
    const title = PREF_LABELS[pref] || PREF_LABELS[0];
    const swatches = [1, 2, 3].map(level => {
        const selected = pref === level ? " is-selected" : "";
        return `<button type="button" class="disc-pref-swatch pref-${level}${selected}" data-pref="${level}" title="${PREF_LABELS[level]}" aria-label="${PREF_LABELS[level]}" onclick="event.stopPropagation();setDiscPreference(${disc.id}, ${level})">${DISC_CARD_ICONS.heartFilled}</button>`;
    }).join("");
    return `<div class="disc-pref" onclick="event.stopPropagation()"><button type="button" class="disc-pref-trigger pref-${pref}" title="${title}" aria-label="${title}" aria-haspopup="true" aria-expanded="false">${icon}</button><div class="disc-pref-menu" role="menu" aria-label="选择喜好">${swatches}<button type="button" class="disc-pref-swatch pref-0${pref === 0 ? " is-selected" : ""}" data-pref="0" title="清除标注" aria-label="清除标注" onclick="event.stopPropagation();setDiscPreference(${disc.id}, 0)">${DISC_CARD_ICONS.heart}</button></div></div>`;
}

/** 卡片/详情：主英文，副中文译名；无英文回退中文；相同或无中文不重复。 */
function discDisplayTitles(disc) {
    const cn = String(disc?.title_cn || "").trim();
    const en = String(disc?.title_en || "").trim();
    const primary = en || cn;
    const same = !!(cn && primary && cn.toLowerCase() === primary.toLowerCase());
    const secondary = (cn && !same) ? cn : "";
    return { primary, secondary };
}

function renderDiscCardHtml(disc) {
    const poster = disc.poster_url
        ? `<img class="disc-card-poster" src="${disc.poster_url}" alt="" loading="lazy" onerror="this.style.display='none'">`
        : '<div class="disc-card-poster placeholder">🎬</div>';
    const rating = disc.rating ? `<span class="disc-card-rating">⭐ ${disc.rating.toFixed(1)}</span>` : "";
    const active = disc.id === state.selectedDiscId ? "active" : "";
    const flagged = !!disc.flagged;
    const flagBtnTitle = flagged ? "取消错误标记" : "标记识别错误";
    const flagBadge = flagged
        ? `<span class="disc-flag-badge" title="已标记为识别有误">识别有误</span>`
        : "";
    // 针图标表示「原照片碟脊 bbox」是否已标定（与墙面 pos 无关）
    const spineLocated = hasSpineBbox(disc);
    const pinClass = spineLocated ? "disc-card-btn-pin is-located" : "disc-card-btn-pin is-unlocated";
    const pinTitle = spineLocated ? "已标注" : "未标注原照片位置";
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
                <button type="button" class="disc-card-btn" onclick="event.stopPropagation();editDisc(${disc.id})" title="编辑" aria-label="编辑">${DISC_CARD_ICONS.pencil}</button>
                <button type="button" class="disc-card-btn disc-card-btn-flag ${flagged ? "is-flagged" : ""}" onclick="event.stopPropagation();toggleDiscFlag(${disc.id})" title="${flagBtnTitle}" aria-label="${flagBtnTitle}">${DISC_CARD_ICONS.flag}</button>
                <button type="button" class="disc-card-btn disc-card-btn-danger" onclick="event.stopPropagation();deleteDiscWithConfirm(${disc.id})" title="删除" aria-label="删除">${DISC_CARD_ICONS.trash}</button>
            </div>
        </div>`;
}

function renderDiscTree() {
    const list = $("#disc-list");
    if (state.discs.length === 0) {
        list.innerHTML = '<div class="empty-state">暂无碟片</div>';
        return;
    }

    // 按 source_image 分组
    const groups = {};
    state.discs.forEach(disc => {
        const source = disc.source_image || "未归类";
        if (!groups[source]) groups[source] = [];
        groups[source].push(disc);
    });

    // 按分组名称排序：未归类放最后
    const sortedKeys = Object.keys(groups).sort((a, b) => {
        if (a === "未归类") return 1;
        if (b === "未归类") return -1;
        return a.localeCompare(b, "zh-CN");
    });

    const groupIdPrefix = "tree-group-";

    list.innerHTML = sortedKeys.map(key => {
        const groupDiscs = groups[key];
        const count = groupDiscs.length;
        const isUncategorized = key === "未归类";
        const safeKey = key.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_");
        const groupId = groupIdPrefix + safeKey;

        const labelText = isUncategorized
            ? "未归类"
            : (key.length > 28 ? `${key.slice(0, 12)}…${key.slice(-10)}` : key);

        const thumbUrl = sourceImageThumbUrl(key);
        const encodedKey = encodeURIComponent(key);
        const iconHtml = isUncategorized
            ? `<span class="tree-group-icon">📦</span>`
            : `<img class="tree-group-thumb" src="${escapeHtml(thumbUrl)}" alt="" loading="lazy"
                    title="点击调整在墙面上的位置"
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
        const dirHtml = (disc.directors || []).map(d => `
            <div class="detail-person">
                ${d.profile_url ? `<img class="detail-person-avatar" src="${d.profile_url}" alt="" loading="lazy">` : ""}
                <div><div class="detail-person-name">${escapeHtml(d.name)}</div><div class="detail-person-role">导演</div></div>
            </div>`).join("") || '<span style="color:var(--text-muted)">暂无</span>';
        const castHtml = (disc.cast || []).slice(0, 8).map(c => `
            <div class="detail-person">
                ${c.profile_url ? `<img class="detail-person-avatar" src="${c.profile_url}" alt="" loading="lazy">` : ""}
                <div><div class="detail-person-name">${escapeHtml(c.name)}</div><div class="detail-person-role">${c.character ? `饰 ${escapeHtml(c.character)}` : "演员"}</div></div>
            </div>`).join("") || '<span style="color:var(--text-muted)">暂无</span>';
        const genreHtml = (disc.genres || []).map(g => `<span class="detail-genre">${g}</span>`).join("");

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
                <h3>${DISC_CARD_ICONS.pin}<span>在原照片中的位置</span></h3>
                <div class="ar-container" onclick="openArZoom()">
                    <img class="ar-source-image" src="${disc.source_image_url}" alt="原照片">
                    <div class="ar-highlight-rect" style="${highlightStyle}"></div>
                </div>
                <div class="ar-actions">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation();openDiscBboxEditor(${disc.id})">重新框选</button>
                </div>
                ${hasPosition
                    ? `<div class="ar-hint">点击照片可放大查看 · 可重新框选修正位置</div>`
                    : `<div class="ar-hint" style="color:var(--gold)">⚠ 尚未标定具体位置，点击「重新框选」标定</div>`}
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
                ${disc.runtime ? `<span class="detail-meta-item">${disc.runtime}分钟</span>` : ""}
                ${disc.rating ? `<span class="detail-rating">${disc.rating.toFixed(1)}<small>/10</small></span>` : ""}
            </div>
            ${genreHtml ? `<div class="detail-genres">${genreHtml}</div>` : ""}
            <div class="detail-section"><h3>简介</h3><p class="detail-synopsis">${disc.synopsis_cn || "暂无"}</p>${disc.synopsis_en ? `<p class="detail-synopsis" style="margin-top:8px;color:var(--text-muted);font-style:italic">${disc.synopsis_en}</p>` : ""}</div>
            ${arSectionHtml}
            <div class="detail-section"><h3>导演</h3><div class="detail-people">${dirHtml}</div></div>
            <div class="detail-section"><h3>主演</h3><div class="detail-people">${castHtml}</div></div>
            <div class="detail-actions">
                <button type="button" class="btn btn-primary" onclick="findDisc(${disc.id})">${DISC_CARD_ICONS.pin}<span>定位位置</span></button>
                <button type="button" class="btn btn-secondary" onclick="editDisc(${disc.id})">${DISC_CARD_ICONS.pencil}<span>编辑</span></button>
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
        showToast("加载详情失败: " + e.message, "error");
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

const MANUAL_SRC = "/static/docs/manual.html?v=3.14o";

function openManualModal() {
    const modal = $("#manual-modal");
    const iframe = $("#manual-iframe");
    if (!modal || !iframe) return;
    if (!iframe.getAttribute("src") || iframe.getAttribute("src") === "about:blank") {
        iframe.src = MANUAL_SRC;
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
        showToast("该碟片尚未标记位置", "error");
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
    showToast(`已标记 "${disc.title_cn}" 的位置`, "success");
}

async function doSearch() {
    await loadDiscs(
        $("#search-input").value.trim(),
        $("#filter-genre").value,
        $("#filter-year").value,
        $("#filter-preference")?.value || ""
    );
}

// ===== 上传 & 识别流程（新） =====

async function openUploadModal() {
    if (!requireEditUnlocked()) return;
    $("#upload-modal").classList.remove("hidden");
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
    $("#btn-start-upload").textContent = "开始上传并分析";
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
            ? `<span class="existing-photo-box-badge" title="已保存 ${img.spine_box_count || 0} 个碟脊框">${img.spine_box_count || 0}</span>`
            : "";
        return `
        <div class="existing-photo-item ${selClass}" id="existing-photo-${img.id}"
             title="${escapeHtml(label)}${img.has_spine_boxes ? ` · 已存 ${img.spine_box_count} 框` : ""}"
             onclick="toggleExistingPhoto(${img.id}, event)">
            <input type="checkbox" class="existing-photo-checkbox" ${checked}
                   onchange="onExistingPhotoCheckbox(${img.id}, this.checked, event)">
            ${boxBadge}
            <button type="button" class="existing-photo-edit-boxes" title="修正碟脊框"
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
        selectBtn.textContent = "☑ 取消全选";
    } else {
        selectBtn.textContent = count > 0 ? `☑ 已选 ${count}` : "☐ 全选";
    }

    label.textContent = count > 0 ? `已选中 ${count} 张` : "未选中";
    reprocessBtn.disabled = count === 0;
    deleteBtn.disabled = count === 0;
    setBtnLabel(reprocessBtn, count > 0 ? `重新分析选中的 ${count} 张` : "重新分析选中的");
    setBtnLabel(deleteBtn, count > 0 ? `删除选中的 ${count} 张` : "删除选中的");

    if (editBoxesBtn) {
        editBoxesBtn.disabled = count !== 1;
        setBtnLabel(editBoxesBtn, count === 1 ? "修正碟脊框" : "修正碟脊框（选 1 张）");
    }
    if (stage2Btn) {
        stage2Btn.disabled = count === 0;
        setBtnLabel(stage2Btn, count > 0 ? `Stage2 识别 ${count} 张` : "Stage2 识别");
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
            btn.textContent = `上传新照片并分析 (新${state.uploadFiles.length}张 + 选中${selectedCount}张)`;
        } else if (hasExisting) {
            btn.textContent = `上传新照片并分析所有 (新${state.uploadFiles.length}张 + 已有${state.existingImages.length}张)`;
        } else {
            btn.textContent = `开始上传并分析 (${state.uploadFiles.length} 张)`;
        }
    } else if (selectedCount > 0) {
        btn.disabled = false;
        btn.textContent = `重新分析选中的 ${selectedCount} 张`;
    } else if (hasExisting) {
        btn.disabled = false;
        btn.textContent = `重新分析已有照片 (${state.existingImages.length} 张)`;
    } else {
        btn.disabled = true;
        btn.textContent = "开始上传并分析";
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
            textEl.textContent = "正在上传图片...";
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
            textEl.textContent = `已上传 ${total} 张，正在分析中...`;

            updateAnalyzingDetail(analyzeImages);

        } else if (hasExisting) {
            // 重新分析已有照片（优先选中项）
            textEl.textContent = "正在重新分析已有照片...";
            const imageIds = existingIdsToAnalyze;

            const reprocessResult = await api("/images/batch-reprocess", {
                method: "POST",
                body: { image_ids: imageIds },
            });

            batchId = reprocessResult.batch_id;
            analyzeImages = reprocessResult.images;
            total = reprocessResult.total;
            progressFill.style.width = "10%";
            textEl.textContent = `正在分析 ${total} 张已有照片...`;

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
            textEl.textContent = `正在分析已有 ${total2} 张照片...`;
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
        textEl.textContent = "处理失败: " + e.message;
        showToast("处理失败: " + e.message, "error");
    }
}

async function reprocessSelectedExistingPhotos() {
    if (!requireEditUnlocked()) return;
    const ids = getSelectedExistingIds();
    if (ids.length === 0) {
        showToast("请先选中要重新分析的照片", "error");
        return;
    }
    if (!confirm(`确定重新分析选中的 ${ids.length} 张照片？原有识别结果将被清除。`)) return;
    // 主流程已支持“有选中则只分析选中”
    await startUploadAndAnalyze();
}

async function deleteSelectedExistingPhotos() {
    if (!requireEditUnlocked()) return;
    const ids = getSelectedExistingIds();
    if (ids.length === 0) {
        showToast("请先选中要删除的照片", "error");
        return;
    }
    if (!confirm(`确定永久删除选中的 ${ids.length} 张照片及其关联的所有碟片？此操作不可恢复！`)) return;

    const deleteBtn = $("#btn-existing-delete");
    const reprocessBtn = $("#btn-existing-reprocess");
    if (deleteBtn) deleteBtn.disabled = true;
    if (reprocessBtn) reprocessBtn.disabled = true;

    try {
        const result = await api("/images/batch-delete", {
            method: "POST",
            body: { image_ids: ids },
        });

        showToast(`成功删除 ${result.count} 张图片`, "success");
        const deletedSet = new Set(result.deleted || ids);
        state.existingImages = state.existingImages.filter(img => !deletedSet.has(img.id));
        state.existingSelected = {};
        renderExistingPhotos();
        updateUploadButton();
        await loadDiscs();
        await loadFilters();
        await loadStats();
    } catch (e) {
        showToast("批量删除失败: " + e.message, "error");
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
        setIconTitle(title, "crop", `修正碟脊框 — ${name}`);
    }
    const iframe = $("#spine-boxes-iframe");
    const modal = $("#spine-boxes-modal");
    if (!iframe || !modal) {
        showToast("编辑器入口未就绪", "error");
        return;
    }
    iframe.src = `/static/spine_boxes_editor.html?embed=1&image_id=${imageId}`;
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
        showToast("请先勾选恰好一张照片", "error");
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
        showToast(`碟脊框已保存（${data.spineCount || 0} 框）`, "success");
    }
});

async function runStage2OnSelected() {
    if (!requireEditUnlocked()) return;
    const ids = getSelectedExistingIds();
    if (ids.length === 0) {
        showToast("请先选中要识别的照片", "error");
        return;
    }
    const missing = ids.filter(id => {
        const img = state.existingImages.find(x => x.id === id);
        return !img || !img.has_spine_boxes;
    });
    if (missing.length) {
        showToast(`有 ${missing.length} 张尚未保存碟脊框，请先「修正碟脊框」并保存`, "error");
        return;
    }
    if (!confirm(
        `对选中的 ${ids.length} 张跑 Stage2（视觉读标题 + TMDb 匹配）并写入碟片库？\n` +
        `将覆盖同图已有 discs（reset）。需 LM Studio 与 TMDb 可用。`
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
    if (textEl) textEl.textContent = "Stage2 识别中…";
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
            if (textEl) textEl.textContent = task.message || `Stage2 进度 ${pct}%`;
            const results = task.results || [];
            results.forEach(r => {
                const el = document.getElementById(`stage2-item-${r.image_id}`);
                if (!el) return;
                el.classList.toggle("is-processing", !r.ok && !r.error);
                el.classList.toggle("is-done", !!r.ok);
                el.classList.toggle("is-error", !!r.error);
                const label = el.querySelector(".analyzing-label");
                if (label) {
                    if (r.error) label.textContent = "失败";
                    else if (r.ok) label.textContent = `完成 · ${r.matched || 0}/${r.spine_count || 0} 匹配 · 导入 ${r.imported || 0}`;
                    else label.textContent = "处理中";
                }
            });
            if (task.status === "done" || task.status === "error") {
                done = true;
                const okCount = (task.results || []).filter(r => r.ok).length;
                const failCount = (task.results || []).filter(r => !r.ok).length;
                if (task.status === "error") {
                    showToast(task.message || "Stage2 失败", "error");
                } else {
                    showToast(`Stage2 完成：成功 ${okCount}，失败 ${failCount}`, failCount ? "error" : "success");
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
        if (textEl) textEl.textContent = "Stage2 失败: " + e.message;
        showToast("Stage2 失败: " + e.message, "error");
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
        const name = img.original_filename || img.filename || `图片 ${img.image_id}`;
        const stateClass = idx === 0 ? "is-processing" : "is-pending";
        const label = idx === 0 ? "分析中…" : "等待中";
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
                extra = `<span class="item-title">识别到 ${r.disc_count} 张</span>`;
            }
            setAnalyzingItemState(card, "is-done", "完成", extra);
            return;
        }

        if (r && r.status === "error") {
            const err = escapeHtml(r.error || "识别失败");
            setAnalyzingItemState(card, "is-error", "失败", `<span class="item-error">${err}</span>`);
            return;
        }

        if (!markedProcessing) {
            setAnalyzingItemState(card, "is-processing", "分析中…");
            markedProcessing = true;
        } else {
            setAnalyzingItemState(card, "is-pending", "等待中");
        }
    });
}

async function pollBatchProgress(batchId, total, progressFill, textEl, detailEl, weightScale = 1.0) {
    for (let attempt = 0; attempt < 300; attempt++) {
        await sleep(2000);
        const status = await api(`/batch/process/${batchId}`);
        const pct = status.progress || 0;
        progressFill.style.width = `${Math.min(100, (10 + pct * 0.9) * weightScale)}%`;
        textEl.textContent = `分析中... ${status.completed || 0}/${total}`;

        refreshAnalyzingCards(detailEl, status.results);

        if (status.status === "done" || status.status === "error") {
            state.analysisResults = status.results || [];
            progressFill.style.width = "100%";
            textEl.textContent = `分析完成！共 ${total} 张`;
            refreshAnalyzingCards(detailEl, status.results);
            // 全部结束后不再保留 processing 态
            detailEl.querySelectorAll(".analyzing-item.is-processing").forEach(card => {
                setAnalyzingItemState(card, "is-pending", "等待中");
            });
            return;
        }
    }
    throw new Error("分析超时");
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== 匹配结果渲染 =====

function matchStatusLabel(sel, isAuto, isRejected) {
    if (isRejected) return { text: "已拒绝", cls: "error", title: "此碟片不会保存" };
    if (isAuto && sel && !sel.suggested) {
        return { text: "自动匹配 · 将保存", cls: "matched", title: "高置信自动匹配的 TMDb 候选，确认后会写入片库；也可点击其他候选更换" };
    }
    if (sel && !sel.suggested) {
        return { text: "已选择 · 将保存", cls: "matched", title: "已为该碟片选定 TMDb 候选，确认后会写入片库" };
    }
    if (sel && sel.suggested) {
        return { text: "建议候选 · 点击可改", cls: "pending", title: "系统预选了首个候选，点击其他卡片可更换；确认后才会保存" };
    }
    return { text: "未选择", cls: "pending", title: "请点击下方某个 TMDb 候选以选中保存" };
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
            ? '<span class="match-photo-badge error">识别失败</span>'
            : `<span class="match-photo-badge">识别完成 · ${discs.length} 张</span>`;

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
                             title="点击选中此 TMDb 候选用于保存">
                            <div class="match-candidate-main">
                                <span class="match-candidate-pick" aria-hidden="true">✓</span>
                                ${c.poster_url ? `<img class="match-candidate-poster" src="${c.poster_url}" alt="" loading="lazy" onerror="this.style.display='none'">` : '<div class="match-candidate-poster">🎬</div>'}
                                <div class="match-candidate-info">
                                    <div class="match-candidate-title">
                                        ${escapeHtml(c.title_cn)}${tmdbTypeBadgeHtml(cType)}
                                        ${c.poster_url && r.image_id ? `<button type="button" class="visual-compare-btn" onclick="event.stopPropagation();visualCompare(${r.image_id}, ${imgIdx}, ${discIdx}, '${posterAttr}', '${titleAttr}', '${c.year || ''}', '${compareId}')" title="用视觉模型比对碟脊与海报">${DISC_CARD_ICONS.eye}<span>视觉比对</span></button>` : ''}
                                    </div>
                                    <div class="match-candidate-meta">${escapeHtml(c.title_en)} | ${c.year} | ⭐${(c.rating || 0).toFixed(1)} | ${c.vote_count || 0}票</div>
                                    ${isSelected ? '<div class="match-candidate-hint">当前选中 · 将随「确认并保存」写入</div>' : '<div class="match-candidate-hint">点击选中</div>'}
                                </div>
                            </div>
                            <div class="visual-compare-result" id="${compareId}"></div>
                        </div>`;
                }).join("");
            } else {
                candidatesHtml = '<div class="empty-state" style="padding:12px">未找到匹配，可手动搜索</div>';
            }

            discsHtml += `
                <div class="disc-entry" data-img-idx="${imgIdx}" data-disc-idx="${discIdx}"
                     style="margin-bottom:8px;padding:8px;background:var(--bg-hover);border-radius:6px${isRejected ? ';opacity:0.35;text-decoration:line-through' : ''}">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;gap:8px">
                        <span style="font-size:13px;font-weight:600">${escapeHtml(d.title_cn || d.title_en || '未识别')}</span>
                        <span class="match-card-status ${status.cls}" title="${escapeHtml(status.title)}">${status.text}</span>
                    </div>
                    <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">
                        ${d.title_en ? escapeHtml(d.title_en) + ' | ' : ''}
                        ${d.year || ''}
                        ${d.confidence ? ' | 置信度: ' + d.confidence : ''}
                        ${renderSourceBadge(d.source, d.confidence)}
                        ${hasSpineBbox(d) ? ' · <span style="color:var(--green)">已标定碟脊</span>' : ' · <span style="color:var(--gold)">未标定碟脊</span>'}
                    </div>
                    <div class="match-candidates">${candidatesHtml}</div>
                    <div class="disc-manual-actions">
                        <button type="button" class="disc-tool-btn" onclick="event.stopPropagation();openSpineCalibrator(${imgIdx}, ${discIdx})" title="在原图上框选碟脊，供视觉比对使用">${DISC_CARD_ICONS.crop}<span>标定碟脊</span></button>
                        <button type="button" class="disc-tool-btn" onclick="event.stopPropagation();openManualTmdbSearch(${imgIdx}, ${discIdx})" title="手动输入片名搜索 TMDb">${DISC_CARD_ICONS.search}<span>手动搜索 TMDb</span></button>
                        <button type="button" class="disc-reject-btn" onclick="event.stopPropagation();rejectDisc(${imgIdx}, ${discIdx})" title="拒绝此碟片，不保存" ${isRejected ? "disabled" : ""}>${isRejected ? "已拒绝" : "✕ 拒绝"}</button>
                    </div>
                </div>`;
        });

        return `
            <div class="match-card expanded" id="match-card-${imgIdx}">
                <div class="match-card-header">
                    ${imgSrc ? `<img class="match-card-image" src="${imgSrc}" alt="" loading="lazy">` : ""}
                    <div class="match-card-info">
                        <div class="match-card-filename" title="${escapeHtml(r.filename)}">${escapeHtml(displayName)}</div>
                        <div class="match-card-detected">识别到 <strong>${discs.length}</strong> 张碟片</div>
                    </div>
                    ${photoBadge}
                </div>
                <div class="match-card-expand">
                    ${discs.length > 0 ? discsHtml : '<div class="empty-state" style="padding:12px">未能识别到碟片</div>'}
                    <div class="match-card-actions" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">
                        <button type="button" class="btn btn-secondary" onclick="event.stopPropagation();openRegionReanalyze(${imgIdx})" title="在原图上框选任意区域并重新识别">框选区域重新识别</button>
                        <button type="button" class="btn btn-secondary" onclick="event.stopPropagation();searchManualForDisc('${escapeHtml(r.filename)}', ${imgIdx})">${DISC_CARD_ICONS.search}<span class="btn-label">手动搜索</span></button>
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
        label = '视觉模型';
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
    return ` <span class="source-badge" style="color:${color};border-color:${color}" title="来源: ${label}">${icon} ${label}</span>`;
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
        rejectBtn.textContent = '已拒绝';
        rejectBtn.disabled = true;
    }
    discEl.querySelectorAll(".match-candidate").forEach(c => {
        c.classList.remove("selected", "is-auto");
        const hint = c.querySelector(".match-candidate-hint");
        if (hint) hint.textContent = "点击选中";
    });
    const statusEl = discEl.querySelector(".match-card-status");
    if (statusEl) {
        statusEl.textContent = "已拒绝";
        statusEl.className = "match-card-status error";
        statusEl.title = "此碟片不会保存";
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
        <span>照片: <strong>${state.analysisResults.length}</strong> 张 · 碟片: <strong>${totalDiscs}</strong> 张</span>
        <span>已选: <strong class="auto-count">${selectedCount}</strong> · 自动: <strong>${autoMatchedCount}</strong> · 未选: <strong class="manual-count">${pendingCount}</strong>
        ${rejectedCount > 0 ? ` · 已拒绝: <strong style="color:var(--accent)">${rejectedCount}</strong>` : ''}</span>
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
        ? `确认并保存已选 ${count} 项`
        : "确认并保存已选（请先点选候选）");
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
            rejectBtn.textContent = "✕ 拒绝";
        }
    }

    parent.querySelectorAll(".match-candidate").forEach(c => {
        c.classList.remove("selected", "is-auto");
        const hint = c.querySelector(".match-candidate-hint");
        if (hint) hint.textContent = "点击选中";
    });
    el.classList.add("selected");
    const selectedHint = el.querySelector(".match-candidate-hint");
    if (selectedHint) selectedHint.textContent = "当前选中 · 将随「确认并保存」写入";

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
        statusEl.textContent = "已选择 · 将保存";
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
        showToast("请先选择一个 TMDb 匹配候选", "error");
        return;
    }

    const tmdbId = state.selectedMatches[resultIdx].tmdb_id;
    const mediaType = normalizeTmdbMediaType(state.selectedMatches[resultIdx].media_type);
    const imageId = r.image_id;

    $("#verify-modal").classList.remove("hidden");
    $("#verify-body").innerHTML = '<div class="verify-loading">🔄 正在用视觉模型比对图片...</div>';

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
                throw new Error(status.result?.error || "验证失败");
            }
        }

        if (!verifyResult) throw new Error("验证超时");

        const isMatch = verifyResult.match;
        const conf = verifyResult.confidence || 0;
        const cls = isMatch ? "match-success" : "match-fail";
        const icon = isMatch ? "✅" : "❌";
        const txt = isMatch ? "视觉匹配确认成功！" : "视觉匹配不通过";

        $("#verify-body").innerHTML = `
            <div class="verify-result ${cls}">
                <div class="verify-icon">${icon}</div>
                <div class="verify-text">${txt}</div>
                <div class="verify-confidence">置信度: ${(conf * 100).toFixed(0)}%</div>
                <div class="verify-reason">${escapeHtml(verifyResult.reasoning || "")}</div>
                <div class="verify-actions">
                    <button class="btn btn-primary" onclick="$('#verify-modal').classList.add('hidden')">关闭</button>
                </div>
            </div>`;

    } catch (e) {
        $("#verify-body").innerHTML = `
            <div class="verify-result match-fail">
                <div class="verify-icon">⚠️</div>
                <div class="verify-text">验证失败</div>
                <div class="verify-reason">${escapeHtml(e.message)}</div>
                <div class="verify-actions">
                    <button class="btn btn-primary" onclick="$('#verify-modal').classList.add('hidden')">关闭</button>
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
        showToast("请至少选择一个匹配结果（或取消拒绝后重选）", "error");
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
        showToast("没有可保存的项目", "error");
        return;
    }

    try {
        $("#btn-confirm-all").disabled = true;
        setBtnLabel($("#btn-confirm-all"), "正在保存...");
        const result = await api("/batch/confirm", { method: "POST", body: { items } });
        showToast(`成功保存 ${result.count} 张碟片！`, "success");
        await loadDiscs();
        await loadFilters();
        await loadStats();
        await loadImageUrlMap();

        showPlacementStep();
    } catch (e) {
        showToast("保存失败: " + e.message, "error");
    } finally {
        updateConfirmButton();
    }
}

// ===== 手动搜索匹配 =====

function showMatchModal(query, discId = null, resultIdx = null, options = null) {
    $("#match-modal").classList.remove("hidden");

    const opts = options || {};
    const matchKey = opts.matchKey != null ? opts.matchKey : null;
    const preYear = opts.year || "";
    const forMatchFlow = matchKey != null;

    $("#match-body").innerHTML = `
        <div style="margin-bottom:16px">
            <input type="text" id="match-search-input" value="${escapeHtml(query || "")}"
                   style="width:100%;padding:10px;background:var(--bg-card);border:1px solid var(--border);color:var(--text-primary);border-radius:var(--radius-sm);font-size:14px;font-family:var(--font)"
                   placeholder="输入片名搜索…">
            <div class="tmdb-scope-bar" style="margin-top:10px">
                <div class="tmdb-scope-row">
                    <span class="tmdb-scope-label">类型</span>
                    ${tmdbScopeSegHtml("match-tmdb-scope", "all")}
                </div>
                <div class="tmdb-scope-row">
                    <span class="tmdb-scope-label">来源</span>
                    ${metaSourceSegHtml("match-meta-source", "all")}
                </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px;align-items:center">
                <input type="text" id="match-year-input" value="${escapeHtml(String(preYear || ""))}"
                       inputmode="numeric" maxlength="4"
                       style="width:110px;padding:10px;background:var(--bg-card);border:1px solid var(--border);color:var(--text-primary);border-radius:var(--radius-sm);font-size:14px;font-family:var(--font)"
                       placeholder="年份(可选)">
                <button class="btn btn-primary" id="match-search-btn" style="flex:1;white-space:nowrap">按片名搜索</button>
            </div>
            ${forMatchFlow ? '<details class="edit-disc-hint" style="margin-top:8px"><summary>匹配说明</summary><p>入库仍需选 TMDb 候选（IMDb/TVDB 仅供对照）。默认全部类型 + 全部可用来源。</p></details>' : ''}
        </div>
        <div id="match-results" class="match-results">
            <div class="empty-state">输入片名后点击搜索</div>
        </div>
        <div id="match-actions" class="hidden" style="margin-top:16px;display:flex;gap:8px">
            <button class="btn btn-primary" id="match-confirm-btn" data-edit-only>${DISC_CARD_ICONS.check}<span class="btn-label">${forMatchFlow ? "选为匹配候选" : "确认并保存"}</span></button>
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
            showToast(providers[source]?.hint || "该来源不可用", "error");
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
                const tip = data.message || errNotes || "未找到匹配结果";
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
                        <div class="match-meta">${escapeHtml(r.original_title || "")} | ${escapeHtml(String(r.year || ""))} | ⭐ ${(r.rating || 0).toFixed(1)}${r.vote_count != null ? ` | ${r.vote_count}票` : ""}</div>
                        <div class="match-overview">${escapeHtml(r.overview || "暂无")}</div>
                    </div>
                </div>`).join("");

            window._matchSearchResults = results;
            document.getElementById("match-actions").classList.remove("hidden");
        } catch (e) {
            showToast("搜索失败: " + e.message, "error");
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
        if (!picked && !selectedMovie) { showToast("请先选择", "error"); return; }
        const src = picked ? candidateSourceOf(picked) : selectedSource;
        if (forMatchFlow && src !== "tmdb") {
            showToast("Stage2 匹配入库请选择带 TMDb 徽章的候选；IMDb/TVDB 请用「手工建卡/编辑」", "error");
            return;
        }
        if (!forMatchFlow && src !== "tmdb") {
            showToast("此确认入库流程仅支持 TMDb 候选；请改用手工建卡", "error");
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
                if (!disc.title_cn || disc.title_cn.includes("未识别") || disc.title_cn.includes("区域未识别")) {
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
                showToast("已选为匹配候选", "success");
                renderMatchResults();
            } catch (e) {
                showToast("回填失败: " + e.message, "error");
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
                showToast("更新成功", "success");
            } else {
                await api("/discs", { method: "POST", body: discData });
                showToast("添加成功", "success");
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
                        statusEl.textContent = "✅ 已手动匹配";
                        statusEl.className = "match-card-status matched";
                    }
                }
            }

            $("#match-modal").classList.add("hidden");
            await loadDiscs();
            await loadFilters();
            await loadStats();
        } catch (e) {
            showToast("保存失败: " + e.message, "error");
        }
    });
}

// ===== 图片管理 =====

async function openManageModal() {
    if (!requireEditUnlocked()) return;
    $("#manage-modal").classList.remove("hidden");
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
        grid.innerHTML = '<div class="empty-state">暂无上传的图片</div>';
        $("#manage-stat").textContent = "0 张图片";
        return;
    }
    $("#manage-stat").textContent = `${data.images.length} 张图片`;
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
                <span title="${label}">${img.image_type === 'panoramic' ? '全景' : '特写'}</span>
                <div class="image-grid-overlay-buttons">
                    <button class="image-grid-reprocess" onclick="event.stopPropagation();reprocessImage(${img.id})" title="重新识别此照片">${DISC_CARD_ICONS.refresh}</button>
                    <button class="image-grid-delete" onclick="event.stopPropagation();deleteImage(${img.id})">删除</button>
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
        btn.textContent = "☑ 取消全选";
    } else {
        btn.textContent = selectedCount > 0 ? `☑ 已选 ${selectedCount}` : "☐ 全选";
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
        label.textContent = `已选择 ${count} 张`;
        setBtnLabel(reprocessBtn, `批量重新识别 (${count}张)`);
        setBtnLabel(deleteBtn, `批量删除 (${count}张)`);
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
    if (!confirm(`确定重新识别选中的 ${ids.length} 张照片？原有识别结果将被清除。`)) return;

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
        label.textContent = `正在重新识别 0/${total}...`;

        for (let attempt = 0; attempt < 300; attempt++) {
            await sleep(2000);
            const status = await api(`/batch/process/${batchId}`);
            const completed = status.completed || 0;
            label.textContent = `正在重新识别 ${completed}/${total}...`;

            if (status.status === "done") {
                label.textContent = `✅ 识别完成！共 ${total} 张`;
                showToast(`批量重新识别完成，共 ${total} 张 — 请确认匹配`, "success");
                openMatchStepFromResults(status.results || []);
                return;
            }
            if (status.status === "error") {
                label.textContent = "❌ 识别失败";
                showToast("批量重新识别失败", "error");
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
        showToast("批量重新识别失败: " + e.message, "error");
        label.textContent = originalLabel;
        bar.querySelectorAll("button").forEach(b => b.disabled = false);
    }
}

async function batchDelete() {
    if (!requireEditUnlocked()) return;
    const ids = Object.keys(state.manageSelected).map(Number);
    if (ids.length === 0) return;
    if (!confirm(`确定永久删除选中的 ${ids.length} 张照片及其关联的所有碟片？此操作不可恢复！`)) return;

    try {
        const result = await api("/images/batch-delete", {
            method: "POST",
            body: { image_ids: ids },
        });

        showToast(`成功删除 ${result.count} 张图片`, "success");
        state.manageSelected = {};
        await loadDiscs();
        await loadFilters();
        await loadStats();
        await loadManageImages();
        updateBatchActionBar();

    } catch (e) {
        showToast("批量删除失败: " + e.message, "error");
    }
}

async function deleteImage(imageId) {
    if (!requireEditUnlocked()) return;
    if (!confirm("确定删除此图片及其关联的所有碟片？")) return;
    await api(`/images/${imageId}`, { method: "DELETE" });
    showToast("删除成功", "success");
    await loadManageImages();
    await loadDiscs();
    await loadFilters();
    await loadStats();
}

async function reprocessImage(imageId) {
    if (!requireEditUnlocked()) return;
    if (!confirm("确定重新识别此照片？原有识别结果将被清除。")) return;

    // 关闭上传模态框，避免状态交叉
    if (!$("#upload-modal").classList.contains("hidden")) {
        closeUploadModal();
    }

    const statusEl = document.getElementById(`reprocess-status-${imageId}`);
    const btn = document.querySelector(`#img-item-${imageId} .image-grid-reprocess`);
    if (statusEl) {
        statusEl.classList.remove("hidden");
        statusEl.innerHTML = "⏳ 正在重新识别... 0%";
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
                statusEl.innerHTML = `⏳ 重新识别中... ${status.completed || 0}/1 (${pct}%)`;
            }

            if (status.status === "done") {
                completed = true;
                const results = status.results || [];
                if (statusEl) {
                    if (results.length > 0 && results[0].disc_count > 0) {
                        statusEl.innerHTML = `✅ 识别完成！找到 ${results[0].disc_count} 张碟片`;
                        statusEl.className = "image-grid-reprocess-status success";
                    } else {
                        statusEl.innerHTML = "⚠ 识别完成，未找到碟片";
                        statusEl.className = "image-grid-reprocess-status warning";
                    }
                }
                openMatchStepFromResults(results);
                showToast("重新识别完成，请确认匹配", "success");
                return;
            }
            if (status.status === "error") {
                if (statusEl) {
                    statusEl.innerHTML = "❌ 识别失败";
                    statusEl.className = "image-grid-reprocess-status error";
                }
                break;
            }
        }

        if (!completed && statusEl) {
            statusEl.innerHTML = "⏱ 识别超时";
            statusEl.className = "image-grid-reprocess-status warning";
        }

        showToast("重新识别完成", "success");
        await loadDiscs();
        await loadFilters();
        await loadStats();
        await loadManageImages();

    } catch (e) {
        showToast("重新识别失败: " + e.message, "error");
        if (statusEl) {
            statusEl.innerHTML = "❌ 识别失败: " + e.message;
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
        showToast("碟片不存在", "error");
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
        showToast(PREF_LABELS[next] || "已更新喜好", "success");
    } catch (e) {
        showToast("喜好标注失败: " + e.message, "error");
    }
}

async function toggleDiscFlag(discId) {
    if (!requireEditUnlocked()) return;
    const disc = state.discs.find(d => d.id === discId);
    if (!disc) {
        showToast("碟片不存在", "error");
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
        showToast(next ? "已标记为识别有误" : "已取消错误标记", "success");
    } catch (e) {
        showToast("标记失败: " + e.message, "error");
    }
}

async function deleteDiscWithConfirm(discId) {
    if (!requireEditUnlocked()) return;
    const disc = state.discs.find(d => d.id === discId);
    if (!disc) {
        showToast("碟片不存在", "error");
        return;
    }
    const title = disc.title_cn || `#${discId}`;
    // 第一次确认
    if (!confirm(`确定要删除「${title}」吗？`)) return;
    // 第二次确认（双重确认，防误删）
    if (!confirm(`确认删除「${title}」？\n\n此操作将从数据库永久移除，不可恢复。`)) return;

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
        showToast(`已删除「${title}」`, "success");
        try { await loadStats(); } catch (_) { /* ignore */ }
    } catch (e) {
        showToast("删除失败: " + e.message, "error");
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
    if (title) title.textContent = editDiscState.mode === "create" ? "手工建卡" : "编辑碟片";
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
            return na.localeCompare(nb, "zh");
        });
        let matched = false;
        const opts = ['<option value="">不关联源图（可后补）</option>'];
        for (const img of images) {
            const fn = img.filename || "";
            if (!fn) continue;
            const label = img.display_name || img.original_filename || fn;
            const typeTag = img.image_type === "panoramic" ? "全景" : "特写";
            const isSel = want && (fn === want || (img.original_filename || "") === want);
            if (isSel) matched = true;
            opts.push(
                `<option value="${escapeHtml(fn)}"${isSel ? " selected" : ""}>` +
                `${escapeHtml(label)} · ${typeTag}</option>`
            );
        }
        if (want && !matched) {
            opts.splice(1, 0,
                `<option value="${escapeHtml(want)}" selected>${escapeHtml(want)} · 当前</option>`
            );
        }
        sel.innerHTML = opts.join("");
    } catch (e) {
        sel.innerHTML = '<option value="">不关联源图（可后补）</option>';
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
        if (empty) empty.textContent = "无所属特写照片";
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
    btn.textContent = hasAnyId ? "按片名重新搜索" : "按片名搜索";
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
        if (empty) empty.textContent = "无所属特写照片";
        img.removeAttribute("src");
        renderEditSpinePreviewRect();
        if (hint) hint.textContent = "该碟未关联原照片，无法对照碟脊";
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
        showToast("碟片不存在", "error");
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
    bindEditDiscModal();
    populateEditSourceImageSelect("").then(() => {
        initEditSpinePreview(null);
        const empty = $("#edit-disc-preview-empty");
        if (empty) empty.textContent = "无所属特写照片（可选下方关联源图）";
        const hint = $("#edit-disc-preview-hint");
        if (hint) hint.textContent = "可不关联照片直接建卡；有图时可后补碟脊框";
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
        showToast("请先填写中文或英文片名再搜索", "error");
        return;
    }

    const providers = await loadMetaProviders();
    if (source !== "all" && !providers[source]?.enabled) {
        showToast(providers[source]?.hint || "该来源不可用", "error");
        return;
    }

    const searchBtn = $("#edit-disc-search-tmdb");
    const refreshBtn = $("#edit-disc-refresh-tmdb");
    const box = $("#edit-disc-candidates");
    const prevLabel = searchBtn.textContent;
    searchBtn.disabled = true;
    refreshBtn.disabled = true;
    searchBtn.textContent = "搜索中…";
    box.classList.remove("hidden");
    const srcHint = source === "all" ? "全部可用来源" : source.toUpperCase();
    box.innerHTML = `<div class="empty-state">正在搜索 ${escapeHtml(srcHint)}…</div>`;

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
        box.innerHTML = `<div class="empty-state">搜索失败: ${escapeHtml(e.message)}</div>`;
        showToast("搜索失败: " + e.message, "error");
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
                showToast("无效的 TMDb 候选", "error");
                return;
            }
            $("#edit-tmdb-id").value = String(tmdbId);
            // 不伪造其它源 id
            refreshBtn.textContent = "拉取详情…";
            const movie = await api(tmdbDetailPath(tmdbId, mt));
            editDiscState.pendingMovie = { ...movie, source: "tmdb" };
            _setEditDiscMediaType(movie.media_type || mt);
            $("#edit-title-cn").value = movie.title_cn || $("#edit-title-cn").value;
            $("#edit-title-en").value = movie.title_en || $("#edit-title-en").value;
            $("#edit-year").value = movie.year || $("#edit-year").value;
            $("#edit-tmdb-id").value = String(movie.tmdb_id || tmdbId);
            showToast("已应用 TMDb 候选，点 save 入库，或再点「从 TMDb 刷新」一并保存", "success");
        } else if (source === "imdb") {
            const imdbId = (el.dataset.imdbId || "").trim();
            if (!imdbId) {
                showToast("无效的 IMDb 候选", "error");
                return;
            }
            // 不伪造 tmdb_id
            $("#edit-tmdb-id").value = "";
            $("#edit-imdb-id").value = imdbId;
            let detail = null;
            try {
                refreshBtn.textContent = "拉取详情…";
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
            showToast("已应用 IMDb 候选（未写入 tmdb_id），点 save 入库", "success");
        } else {
            const tvdbId = parseInt(el.dataset.tvdbId, 10);
            if (!tvdbId) {
                showToast("无效的 TVDB 候选", "error");
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
            showToast("已应用 TVDB 候选（未写入 tmdb_id），点 save 入库", "success");
        }
        _syncEditDiscSearchBtnLabel();
    } catch (e) {
        editDiscState.pendingMovie = null;
        const msg = e.message || String(e);
        const hint = /接口不存在|404/i.test(msg)
            ? "（本地 API 路由未找到，请重启 Flask）"
            : "";
        showToast("已填入编号，但拉取详情失败: " + msg + hint, "error");
    } finally {
        refreshBtn.disabled = false;
        searchBtn.disabled = false;
        saveBtn.disabled = false;
        refreshBtn.textContent = prevRefresh || "从 TMDb 刷新";
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
        showToast("请至少填写中文或英文片名", "error");
        return;
    }
    if (tmdbRaw !== "" && (Number.isNaN(tmdbId) || tmdbId <= 0)) {
        showToast("TMDb 编号无效", "error");
        return;
    }
    if (tvdbRaw !== "" && (Number.isNaN(tvdbId) || tvdbId <= 0)) {
        showToast("TVDB 编号无效", "error");
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
                showToast("请先填写或搜索选定 TMDb 编号", "error");
                return;
            }
            refreshBtn.textContent = "拉取中…";
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
            showToast(refreshFromTmdb ? "已建卡并自 TMDb 拉取元数据" : "碟片已创建", "success");
        } else {
            await api(`/discs/${discId}`, { method: "PUT", body });
            closeEditDiscModal();
            showToast(refreshFromTmdb ? "已从 TMDb 刷新并保存" : "碟片已保存", "success");
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
        refreshBtn.textContent = "从 TMDb 刷新";
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
        if (label) label.textContent = "补全中…";
    }
    try {
        const start = await api("/discs/enrich-posters", {
            method: "POST",
            body: { only_missing: true, include_credits: true },
        });
        if (!start.task_id) {
            showToast(start.message || "没有需要补全的碟片", "success");
            return;
        }
        showToast(`开始补全 ${start.total} 张…`, "success");
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
                showToast(task.message || "补全失败", "error");
                break;
            }
        }
        await loadDiscs();
        await loadFilters();
        await loadStats();
    } catch (e) {
        showToast("补全海报失败: " + e.message, "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            const label = btn.querySelector(".btn-label");
            if (label) label.textContent = prev || "补全海报";
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
            showToast("位置更新失败", "error");
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
                    <button type="button" class="disc-tool-btn" onclick="event.stopPropagation();openManualTmdbSearch(${imgIdx}, ${discIdx})">${DISC_CARD_ICONS.search}<span>手动搜索 TMDb</span></button>
                </div>
            </div>`;
        container.classList.add("show");
        return;
    }

    container.innerHTML = '<div class="compare-card"><div class="compare-text" style="color:var(--text-muted)">🔄 正在裁剪碟脊并比对海报…</div></div>';
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
                throw new Error(status.result?.error || "比对失败");
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
        const verdictText = unknown ? "结果不明" : (matchFlag ? "YES · 外观一致" : "NO · 外观不一致");
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
                        ${cropSrc ? `<img src="${cropSrc}" alt="裁剪碟脊">` : '<div class="compare-text">无裁剪图</div>'}
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
                <div class="compare-verdict ${isBbox ? "unknown" : "no"}">${isBbox ? "无法精确比对" : "比对失败"}</div>
                <div class="compare-text">${escapeHtml(msg)}</div>
                ${isBbox ? `<div class="compare-fallback-actions">
                    <button type="button" class="disc-tool-btn" onclick="event.stopPropagation();openSpineCalibrator(${imgIdx}, ${discIdx})">${DISC_CARD_ICONS.crop}<span>标定碟脊</span></button>
                    <button type="button" class="disc-tool-btn" onclick="event.stopPropagation();openManualTmdbSearch(${imgIdx}, ${discIdx})">${DISC_CARD_ICONS.search}<span>手动搜索 TMDb</span></button>
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
            showToast("加载碟片失败: " + e.message, "error");
            return;
        }
    }
    if (!disc || !imageUrl) {
        showToast("该碟片没有源照片，无法框选", "error");
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
        title: "重新框选 · 在原照片中的位置",
        confirmLabel: "保存框选",
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
        showToast("找不到源照片", "error");
        return;
    }
    const disc = (analysis.discs || [])[discIdx];
    if (!disc) {
        showToast("碟片不存在", "error");
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
        title: "标定碟脊",
        confirmLabel: "确认标定",
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
        showToast("找不到源照片", "error");
        return;
    }
    openBboxEditor({
        mode: "reanalyze",
        title: "框选区域重新识别",
        confirmLabel: "识别此区域",
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
    if (titleEl) setIconTitle(titleEl, "crop", title || "框选区域");
    $("#bbox-editor-confirm").textContent = confirmLabel || "确认";
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
        el.textContent = "未框选";
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
        showToast("请先框选区域", "error");
        return;
    }

    // 已入库碟片：写回 photo_offset / bbox（后端尽量重算墙面 pos）
    if (bboxEditor.mode === "editDiscBbox") {
        const discId = bboxEditor.discId;
        if (!discId) {
            showToast("碟片 ID 丢失", "error");
            return;
        }
        const confirmBtn = $("#bbox-editor-confirm");
        const prevLabel = confirmBtn.textContent;
        confirmBtn.disabled = true;
        confirmBtn.textContent = "保存中…";
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
            showToast("框选已保存", "success");
            await loadDiscs();
            if (state.selectedDiscId === discId) {
                await showDiscDetail(discId);
            }
            renderDiscMarkers();
        } catch (e) {
            showToast("保存框选失败: " + e.message, "error");
            confirmBtn.disabled = false;
            confirmBtn.textContent = prevLabel;
        }
        return;
    }

    const imgIdx = bboxEditor.imgIdx;
    const analysis = state.analysisResults[imgIdx];
    if (!analysis) {
        showToast("分析结果丢失", "error");
        return;
    }

    if (bboxEditor.mode === "calibrate") {
        const discIdx = bboxEditor.discIdx;
        const disc = analysis.discs[discIdx];
        if (!disc) {
            showToast("碟片不存在", "error");
            return;
        }
        disc.photo_offset_x = +r.x.toFixed(4);
        disc.photo_offset_y = +r.y.toFixed(4);
        disc.bbox_w = +r.w.toFixed(4);
        disc.bbox_h = +r.h.toFixed(4);
        closeBboxEditor();
        showToast("碟脊区域已标定，可再点「视觉比对」", "success");
        renderMatchResults();
        return;
    }

    // reanalyze
    const confirmBtn = $("#bbox-editor-confirm");
    const prevLabel = confirmBtn.textContent;
    confirmBtn.disabled = true;
    confirmBtn.textContent = "识别中…";
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
        showToast(`已追加 ${newDiscs.length} 条区域识别结果`, "success");
        renderMatchResults();
    } catch (e) {
        showToast("区域识别失败: " + e.message, "error");
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
    setBtnLabel(btn, "正在保存...");

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
        showToast(`已保存 ${Object.keys(placementState.rects).length} 张照片的位置`, "success");
        closeUploadModal();
        await loadImageUrlMap();
        await loadDiscs();
    } catch (e) {
        showToast("保存位置失败: " + e.message, "error");
    } finally {
        btn.disabled = false;
        setBtnLabel(btn, "保存位置并完成");
    }
}

function skipPlacement() {
    closeUploadModal();
    showToast("已跳过位置标记", "success");
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
        `正在编辑「${label}」· 可切换上方任一特写继续调整，保存时按张写回 placement。`;
    renderSoloPlacementTray();
    renderSoloPlacementOverlay();
}

async function openSourcePlacementEditor(sourceFilename) {
    if (!requireEditUnlocked()) return;
    if (!sourceFilename || sourceFilename === "未归类") return;

    try {
        // 确保入口特写已入库
        const data = await api(`/images/resolve-source?filename=${encodeURIComponent(sourceFilename)}`);
        const focusImg = data.image;
        if (!focusImg || !focusImg.id) {
            showToast("无法解析该特写图", "error");
            return;
        }
        if (data.created) {
            showToast("已从 uploads/photos 自动关联该特写图", "success");
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
            display_name: img.display_name || img.original_filename || img.filename || `特写 ${idx + 1}`,
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
            ? (msg.includes("未找到") || msg.includes("图片管理")
                ? msg
                : "该特写尚未入库。请先在「图片管理」上传，或把同名文件放到 uploads/photos 后再点缩略图。")
            : ("打开位置编辑失败: " + msg), "error");
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
        showToast("请先选择要保存的特写", "error");
        return;
    }

    // 保存：优先全部 dirty；若无 dirty 则保存当前选中
    const ids = Object.keys(soloPlacementState.dirty).map(Number).filter(id => soloPlacementState.rects[id]);
    const toSave = ids.length > 0 ? ids : [activeId];

    const btn = $("#solo-placement-save");
    btn.disabled = true;
    const prev = getBtnLabel(btn);
    setBtnLabel(btn, "正在保存...");

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
                ? `已保存 ${saved} 张特写位置${recalcTotal > 0 ? `，并重算 ${recalcTotal} 张碟片坐标` : ""}`
                : `已保存 ${saved} 张特写在墙面上的位置`,
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
        showToast("保存位置失败: " + e.message, "error");
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
        toggle.setAttribute("aria-label", "展开功能");
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
        toggle.setAttribute("aria-label", "收起功能");
    }
    if (sheet) sheet.removeAttribute("inert");
}

const WALL_BRIGHTNESS_KEY = "mywall-wall-brightness";
const WALL_BRIGHTNESS_MIN = 30;
const WALL_BRIGHTNESS_MAX = 100;
const WALL_BRIGHTNESS_DEFAULT = 75;

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
            if (modal === $("#upload-modal") && confirm("确定关闭？当前进度将丢失")) closeUploadModal();
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
