(() => {
  const $ = (id) => document.getElementById(id);

  const SKIP_DELETE_CONFIRM_KEY = "spineEditor.skipDeleteConfirm";
  // 历史错误键：曾把「不再提醒」误当成禁用删除；加载时清掉
  const LEGACY_BAD_DELETE_KEYS = [
    "spineEditor.disableDelete",
    "spineEditor.deleteDisabled",
    "skipDeleteConfirm",
  ];

  const els = {
    inputImage: $("input-image"),
    inputJson: $("input-json"),
    btnLoad: $("btn-load"),
    btnReset: $("btn-reset"),
    btnResetEmbed: $("btn-reset-embed"),
    btnAdd: $("btn-add"),
    btnCopy: $("btn-copy"),
    btnDelete: $("btn-delete"),
    btnExport: $("btn-export"),
    btnSaveServer: $("btn-save-server"),
    embedMeta: $("embed-meta"),
    saveStatus: $("save-status"),
    btnRestoreDeleteConfirm: $("btn-restore-delete-confirm"),
    deleteModal: $("delete-confirm-modal"),
    deleteMsg: $("delete-confirm-msg"),
    deleteSkip: $("delete-skip-confirm"),
    deleteCancel: $("delete-confirm-cancel"),
    deleteOk: $("delete-confirm-ok"),
    spineList: $("spine-list"),
    spineCount: $("spine-count"),
    stage: $("stage"),
    stageImg: $("stage-img"),
    coordsBox: $("coords-box"),
  };

  const qs = new URLSearchParams(window.location.search);
  const embedImageId = Number(qs.get("image_id") || 0);
  const isEmbed = qs.get("embed") === "1" || (Number.isFinite(embedImageId) && embedImageId > 0);

  const state = {
    originalJson: null,
    jsonData: null,
    spines: [],
    originalSpines: [],
    imageFile: null,
    imageUrl: "",
    naturalW: 0,
    naturalH: 0,
    dispW: 0,
    dispH: 0,
    activeIndex: 0,
    mode: null, // move | copy_drag | resize_tl | resize_br | create
    drag: null,
    rectEls: [],
    rubberEl: null,
    deleteConfirmResolver: null,
    wallImageId: embedImageId > 0 ? embedImageId : null,
    isEmbed,
  };

  if (isEmbed) {
    document.body.classList.add("is-embed");
  }

  function lsGet(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function lsSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore quota / private mode */
    }
  }

  function lsRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  function repairDeleteConfirmStorage() {
    for (const key of LEGACY_BAD_DELETE_KEYS) lsRemove(key);
    const raw = lsGet(SKIP_DELETE_CONFIRM_KEY);
    // 只接受 "1"；其它脏值清掉，避免误把删除整条链路短路
    if (raw != null && raw !== "1") lsRemove(SKIP_DELETE_CONFIRM_KEY);
  }

  function getSkipDeleteConfirm() {
    return lsGet(SKIP_DELETE_CONFIRM_KEY) === "1";
  }

  function setSkipDeleteConfirm(skip) {
    if (skip) lsSet(SKIP_DELETE_CONFIRM_KEY, "1");
    else lsRemove(SKIP_DELETE_CONFIRM_KEY);
    syncSkipConfirmUi();
  }

  function syncSkipConfirmUi() {
    const skip = getSkipDeleteConfirm();
    if (els.btnRestoreDeleteConfirm) {
      els.btnRestoreDeleteConfirm.classList.toggle("is-visible", skip);
    }
    // 删除按钮永不因「不再提醒」而 disabled
    if (els.btnDelete) els.btnDelete.disabled = false;
  }

  function closeDeleteConfirm(result) {
    if (els.deleteModal) els.deleteModal.classList.remove("is-open");
    const resolve = state.deleteConfirmResolver;
    state.deleteConfirmResolver = null;
    if (resolve) resolve(result);
  }

  function askDeleteConfirm(label) {
    if (getSkipDeleteConfirm()) {
      return Promise.resolve({ confirmed: true, skipNext: false });
    }
    return new Promise((resolve) => {
      state.deleteConfirmResolver = resolve;
      if (els.deleteMsg) {
        els.deleteMsg.textContent = `确定删除 #${label}？删除后将按顺序重编号。`;
      }
      if (els.deleteSkip) els.deleteSkip.checked = false;
      if (els.deleteModal) els.deleteModal.classList.add("is-open");
      if (els.deleteOk) els.deleteOk.focus();
    });
  }

  function ensureLoaded() {
    if (!state.originalJson) {
      alert(state.isEmbed ? "正在加载图片与框数据…" : "请先加载原图和 stage1 json");
      return false;
    }
    return true;
  }

  function isTypingTarget(el) {
    if (!el) return false;
    const tag = (el.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
  }

  function setStageSize() {
    if (!state.naturalW || !state.naturalH) return;
    const maxW = state.stage ? state.stage.clientWidth : els.stage.clientWidth;
    const maxH = Math.max(260, Math.floor(window.innerHeight * 0.62));
    const scale = Math.min(1, maxW / state.naturalW, maxH / state.naturalH);
    state.dispW = Math.max(1, Math.floor(state.naturalW * scale));
    state.dispH = Math.max(1, Math.floor(state.naturalH * scale));
    els.stageImg.style.width = `${state.dispW}px`;
    els.stageImg.style.height = `${state.dispH}px`;
    renderRects();
  }

  function clientToFrac(clientX, clientY) {
    const r = els.stage.getBoundingClientRect();
    const lx = clientX - r.left;
    const ly = clientY - r.top;
    const fx = lx / Math.max(1, state.dispW);
    const fy = ly / Math.max(1, state.dispH);
    return {
      x: Math.max(0, Math.min(1, fx)),
      y: Math.max(0, Math.min(1, fy)),
    };
  }

  function fracToPxRect(bbox) {
    const x = (bbox.x || 0) * state.dispW;
    const y = (bbox.y || 0) * state.dispH;
    const w = (bbox.w || 0) * state.dispW;
    const h = (bbox.h || 0) * state.dispH;
    return { x, y, w, h };
  }

  function median(nums) {
    if (!nums.length) return 0;
    const a = [...nums].sort((p, q) => p - q);
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }

  function defaultBoxSize() {
    if (state.spines.length) {
      const ws = state.spines.map((s) => s.bbox.w || 0);
      const hs = state.spines.map((s) => s.bbox.h || 0);
      return {
        w: Math.max(0.02, median(ws) || 0.08),
        h: Math.max(0.01, median(hs) || 0.035),
      };
    }
    return { w: 0.08, h: 0.035 };
  }

  function nextSpineIndex() {
    let max = 0;
    for (const s of state.spines) {
      const n = Number(s.spine_index);
      if (Number.isFinite(n) && n > max) max = n;
    }
    return max + 1;
  }

  function renumberSpines() {
    state.spines.forEach((s, i) => {
      s.spine_index = i + 1;
      s.id = `spine_${i + 1}`;
    });
  }

  function insertSpine(bbox, opts = {}) {
    const idx = nextSpineIndex();
    const spine = {
      id: `spine_${idx}`,
      spine_index: idx,
      bbox: clampPositiveBBox(bbox.x, bbox.y, bbox.w, bbox.h),
      confidence: opts.confidence != null ? opts.confidence : 1.0,
      crop_source: opts.crop_source || "spine",
      _origBbox: null, // 新增框无「加载时」原值，R 无效
    };
    let insertAt = state.spines.length;
    if (opts.afterActive && state.spines[state.activeIndex]) {
      insertAt = state.activeIndex + 1;
    }
    state.spines.splice(insertAt, 0, spine);
    renumberSpines();
    state.activeIndex = insertAt;
    renderSpineList();
    renderRects();
    refreshListActive();
    return spine;
  }

  function addSpineNearActive() {
    if (!ensureLoaded()) return;
    const size = defaultBoxSize();
    const active = state.spines[state.activeIndex];
    let x;
    let y;
    let w = size.w;
    let h = size.h;
    if (active && active.bbox) {
      w = active.bbox.w || w;
      h = active.bbox.h || h;
      x = active.bbox.x;
      y = active.bbox.y + h + 0.002;
      if (y + h > 1) y = Math.max(0, active.bbox.y - h - 0.002);
    } else {
      x = Math.max(0, 0.5 - w / 2);
      y = Math.max(0, 0.5 - h / 2);
    }
    insertSpine({ x, y, w, h }, { afterActive: true });
  }

  function copyActiveSpine() {
    if (!ensureLoaded()) return;
    const active = state.spines[state.activeIndex];
    if (!active) {
      alert("请先选中一个框");
      return;
    }
    const b = active.bbox;
    const gap = 0.002;
    let y = b.y + b.h + gap;
    if (y + b.h > 1) y = Math.max(0, b.y - b.h - gap);
    insertSpine(
      { x: b.x, y, w: b.w, h: b.h },
      { afterActive: true, confidence: active.confidence != null ? active.confidence : 1.0, crop_source: active.crop_source || "spine" }
    );
  }

  function applyDeleteSpine(index) {
    state.spines.splice(index, 1);
    renumberSpines();
    if (!state.spines.length) {
      state.activeIndex = 0;
      els.coordsBox.textContent = "（无框）";
    } else {
      state.activeIndex = Math.min(index, state.spines.length - 1);
    }
    renderSpineList();
    renderRects();
    refreshListActive();
  }

  async function deleteActiveSpine(indexOpt) {
    if (!ensureLoaded()) return;
    if (state.deleteConfirmResolver) return; // 确认框已打开，避免重复进入
    const index = indexOpt != null ? indexOpt : state.activeIndex;
    const s = state.spines[index];
    if (!s) return;
    const label = s.spine_index ?? index + 1;
    const { confirmed, skipNext } = await askDeleteConfirm(label);
    if (!confirmed) return; // 取消：不删除，也不永久禁用
    if (skipNext) setSkipDeleteConfirm(true);
    applyDeleteSpine(index);
  }

  function clearRubber() {
    if (state.rubberEl) {
      state.rubberEl.remove();
      state.rubberEl = null;
    }
  }

  function showRubber(bbox, className) {
    if (!state.rubberEl) {
      state.rubberEl = document.createElement("div");
      els.stage.appendChild(state.rubberEl);
    }
    state.rubberEl.className = className || "rubber-band";
    const { x, y, w, h } = fracToPxRect(bbox);
    state.rubberEl.style.left = `${x}px`;
    state.rubberEl.style.top = `${y}px`;
    state.rubberEl.style.width = `${w}px`;
    state.rubberEl.style.height = `${h}px`;
  }

  function fracBoxFromDragDelta(e, startBox, startClientX, startClientY) {
    const dx = (e.clientX - startClientX) / Math.max(1, state.dispW);
    const dy = (e.clientY - startClientY) / Math.max(1, state.dispH);
    return clampPositiveBBox(startBox.x + dx, startBox.y + dy, startBox.w, startBox.h);
  }

  function mkRectEl(spine, index) {
    const { bbox } = spine;
    const { x, y, w, h } = fracToPxRect(bbox);

    const div = document.createElement("div");
    div.className = "spine-rect" + (index === state.activeIndex ? " active" : "");
    div.style.left = `${x}px`;
    div.style.top = `${y}px`;
    div.style.width = `${w}px`;
    div.style.height = `${h}px`;

    div.dataset.index = String(index);

    const label = document.createElement("div");
    label.className = "spine-rect-label";
    label.textContent = String(spine.spine_index ?? index + 1);
    div.appendChild(label);

    const h1 = document.createElement("div");
    h1.className = "handle tl";
    div.appendChild(h1);

    const h2 = document.createElement("div");
    h2.className = "handle br";
    div.appendChild(h2);

    const onMouseDownMove = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.button !== 0) return;
      state.activeIndex = index;
      refreshListActive();
      const src = state.spines[index];
      const copyDrag = e.ctrlKey || e.metaKey;
      state.mode = copyDrag ? "copy_drag" : "move";
      state.drag = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startBox: { ...src.bbox },
        confidence: src.confidence != null ? src.confidence : 1.0,
        crop_source: src.crop_source || "spine",
      };
      renderRects();
      if (copyDrag) {
        showRubber(src.bbox, "rubber-band copy-drag");
      }
      els.coordsBox.textContent = formatCoords(src.bbox);
    };

    const onMouseDownTL = (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.activeIndex = index;
      refreshListActive();
      state.mode = "resize_tl";
      state.drag = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startBox: { ...state.spines[index].bbox },
      };
      renderRects();
    };

    const onMouseDownBR = (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.activeIndex = index;
      refreshListActive();
      state.mode = "resize_br";
      state.drag = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startBox: { ...state.spines[index].bbox },
      };
      renderRects();
    };

    div.addEventListener("mousedown", onMouseDownMove);
    h1.addEventListener("mousedown", onMouseDownTL);
    h2.addEventListener("mousedown", onMouseDownBR);
    div.addEventListener("dblclick", () => {
      const v = prompt("修改 spine_index（数字）：", spine.spine_index ?? index + 1);
      const n = parseInt(v, 10);
      if (!Number.isFinite(n) || n <= 0) return;
      spine.spine_index = n;
      div.querySelector(".spine-rect-label").textContent = String(n);
      refreshListActive();
      renderSpineList();
    });

    return div;
  }

  function renderRects() {
    state.rectEls.forEach((n) => n.remove());
    state.rectEls = [];

    state.spines.forEach((spine, index) => {
      const el = mkRectEl(spine, index);
      if (state.activeIndex === index) {
        els.coordsBox.textContent = formatCoords(spine.bbox);
      }
      els.stage.appendChild(el);
      state.rectEls.push(el);
    });
    if (state.rubberEl) els.stage.appendChild(state.rubberEl);
  }

  function refreshListActive() {
    [...els.spineList.children].forEach((li) => li.classList.remove("active"));
    const li = [...els.spineList.children][state.activeIndex];
    if (li) li.classList.add("active");
    const s = state.spines[state.activeIndex];
    if (s) els.coordsBox.textContent = formatCoords(s.bbox);
  }

  function formatCoords(bbox) {
    const x = bbox.x ?? 0;
    const y = bbox.y ?? 0;
    const w = bbox.w ?? 0;
    const h = bbox.h ?? 0;
    return `x=${(+x).toFixed(4)} y=${(+y).toFixed(4)} w=${(+w).toFixed(4)} h=${(+h).toFixed(4)}`;
  }

  function updateSpineCount() {
    if (els.spineCount) els.spineCount.textContent = String(state.spines.length);
  }

  function renderSpineList() {
    els.spineList.innerHTML = "";
    updateSpineCount();
    state.spines.forEach((spine, index) => {
      const li = document.createElement("li");
      if (index === state.activeIndex) li.classList.add("active");

      const text = document.createElement("span");
      text.textContent = `#${spine.spine_index ?? index + 1}  (${(spine.confidence ?? "").toString().slice(0, 6)})`;
      li.appendChild(text);

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "li-del";
      delBtn.textContent = "删";
      delBtn.title = "删除此框";
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        state.activeIndex = index;
        deleteActiveSpine(index);
      });
      li.appendChild(delBtn);

      li.addEventListener("click", () => {
        state.activeIndex = index;
        refreshListActive();
        renderRects();
      });
      els.spineList.appendChild(li);
    });
  }

  function clampPositiveBBox(x, y, w, h) {
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));
    const maxW = Math.max(0, 1 - x);
    const maxH = Math.max(0, 1 - y);
    w = Math.max(0.001, Math.min(w, maxW));
    h = Math.max(0.001, Math.min(h, maxH));
    return { x, y, w, h };
  }

  function onMouseMove(e) {
    if (!state.mode || !state.drag) return;

    if (state.mode === "create") {
      const a = state.drag.startFrac;
      const b = clientToFrac(e.clientX, e.clientY);
      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      const w = Math.abs(b.x - a.x);
      const h = Math.abs(b.y - a.y);
      showRubber({ x, y, w, h });
      els.coordsBox.textContent = formatCoords({ x, y, w, h });
      return;
    }

    if (state.mode === "copy_drag") {
      const preview = fracBoxFromDragDelta(
        e,
        state.drag.startBox,
        state.drag.startClientX,
        state.drag.startClientY
      );
      showRubber(preview, "rubber-band copy-drag");
      els.coordsBox.textContent = formatCoords(preview);
      return;
    }

    const start = state.drag.startBox;
    const ns = clientToFrac(e.clientX, e.clientY);

    if (state.mode === "move") {
      state.spines[state.activeIndex].bbox = fracBoxFromDragDelta(
        e,
        start,
        state.drag.startClientX,
        state.drag.startClientY
      );
    } else if (state.mode === "resize_br") {
      const tl = { x: start.x, y: start.y };
      const br = { x: ns.x, y: ns.y };
      const w = br.x - tl.x;
      const h = br.y - tl.y;
      state.spines[state.activeIndex].bbox = clampPositiveBBox(tl.x, tl.y, w, h);
    } else if (state.mode === "resize_tl") {
      const br = { x: start.x + start.w, y: start.y + start.h };
      const tl = { x: ns.x, y: ns.y };
      const w = br.x - tl.x;
      const h = br.y - tl.y;
      state.spines[state.activeIndex].bbox = clampPositiveBBox(tl.x, tl.y, w, h);
    }

    renderRects();
    const s = state.spines[state.activeIndex];
    if (s) els.coordsBox.textContent = formatCoords(s.bbox);
  }

  function onMouseUp(e) {
    if (state.mode === "create" && state.drag) {
      const a = state.drag.startFrac;
      const b = clientToFrac(e.clientX, e.clientY);
      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      const w = Math.abs(b.x - a.x);
      const h = Math.abs(b.y - a.y);
      clearRubber();
      state.mode = null;
      state.drag = null;
      // 过小视为误点，忽略
      if (w >= 0.008 && h >= 0.005 && ensureLoaded()) {
        insertSpine({ x, y, w, h });
      }
      return;
    }
    if (state.mode === "copy_drag" && state.drag) {
      const bbox = fracBoxFromDragDelta(
        e,
        state.drag.startBox,
        state.drag.startClientX,
        state.drag.startClientY
      );
      const opts = {
        afterActive: true,
        confidence: state.drag.confidence,
        crop_source: state.drag.crop_source,
      };
      clearRubber();
      state.mode = null;
      state.drag = null;
      if (ensureLoaded()) {
        insertSpine(bbox, opts);
      }
      return;
    }
    state.mode = null;
    state.drag = null;
  }

  function onStageMouseDown(e) {
    if (!state.originalJson || !state.dispW) return;
    // 点在已有框上时由框自己处理
    if (e.target.closest && e.target.closest(".spine-rect")) return;
    e.preventDefault();
    const startFrac = clientToFrac(e.clientX, e.clientY);
    state.mode = "create";
    state.drag = { startFrac };
    showRubber({ x: startFrac.x, y: startFrac.y, w: 0, h: 0 });
  }

  function bindGlobalEvents() {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    els.stage.addEventListener("mousedown", onStageMouseDown);

    window.addEventListener("keydown", (e) => {
      if (isTypingTarget(e.target)) return;
      if (els.deleteModal && els.deleteModal.classList.contains("is-open")) return;
      if (!state.originalJson) return;

      const key = e.key;
      const lower = key.length === 1 ? key.toLowerCase() : key;

      if (lower === "a" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        addSpineNearActive();
        return;
      }
      if (lower === "c" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        copyActiveSpine();
        return;
      }
      if (key === "Delete" || key === "Backspace") {
        e.preventDefault();
        deleteActiveSpine();
        return;
      }
      if (lower === "s" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (state.isEmbed) saveToServer();
        else exportJson();
        return;
      }

      const s = state.spines[state.activeIndex];
      if (!s) return;
      const step = e.shiftKey ? 0.01 : 0.002;

      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) {
        e.preventDefault();
        let { x, y, w, h } = s.bbox;
        if (key === "ArrowLeft") x -= step;
        if (key === "ArrowRight") x += step;
        if (key === "ArrowUp") y -= step;
        if (key === "ArrowDown") y += step;
        s.bbox = clampPositiveBBox(x, y, w, h);
        renderRects();
        return;
      }
      if (key === "[") {
        e.preventDefault();
        s.bbox = clampPositiveBBox(s.bbox.x, s.bbox.y, Math.max(0.001, s.bbox.w - step), Math.max(0.001, s.bbox.h - step));
        renderRects();
        return;
      }
      if (key === "]") {
        e.preventDefault();
        s.bbox = clampPositiveBBox(s.bbox.x, s.bbox.y, Math.min(1 - s.bbox.x, s.bbox.w + step), Math.min(1 - s.bbox.y, s.bbox.h + step));
        renderRects();
        return;
      }
      if (lower === "r") {
        e.preventDefault();
        // 用加载时快照还原；新增/复制框无 _origBbox
        if (!s._origBbox) return;
        s.bbox = { ...s._origBbox };
        renderRects();
      }
    });
  }

  function buildBoxesPayload() {
    const out = JSON.parse(JSON.stringify(state.originalJson));
    out.spines = state.spines.map((s) => ({
      id: s.id,
      spine_index: s.spine_index,
      bbox: {
        x: +(+s.bbox.x).toFixed(4),
        y: +(+s.bbox.y).toFixed(4),
        w: +(+s.bbox.w).toFixed(4),
        h: +(+s.bbox.h).toFixed(4),
      },
      confidence: s.confidence,
      crop_source: s.crop_source || "spine",
    }));
    out.edited_by = "spine_boxes_editor";
    out.edited_at = new Date().toISOString();
    out.editor_version = "1.4";
    if (state.wallImageId) out.wall_image_id = state.wallImageId;
    return out;
  }

  function exportJson() {
    if (!state.originalJson) {
      alert("还未加载 json");
      return;
    }
    const out = buildBoxesPayload();
    const imageId = state.originalJson.image_id || state.wallImageId || "edited";
    const fileName = `spine_boxes_${imageId}_edited.json`;
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function setSaveStatus(text, kind) {
    if (!els.saveStatus) return;
    els.saveStatus.textContent = text || "";
    els.saveStatus.classList.remove("ok", "err");
    if (kind) els.saveStatus.classList.add(kind);
  }

  async function saveToServer() {
    if (!state.wallImageId) {
      alert("缺少 image_id，无法保存");
      return;
    }
    if (!state.originalJson) {
      alert("尚未加载数据");
      return;
    }
    const payload = buildBoxesPayload();
    setSaveStatus("保存中…");
    try {
      const res = await fetch(`/api/images/${state.wallImageId}/spine-boxes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boxes: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
      state.originalJson = payload;
      setSaveStatus(`已保存 ${data.spine_count || 0} 框`, "ok");
      try {
        window.parent.postMessage(
          { type: "spine-boxes-saved", imageId: state.wallImageId, spineCount: data.spine_count || 0 },
          "*"
        );
      } catch {
        /* ignore */
      }
    } catch (e) {
      setSaveStatus(e.message || "保存失败", "err");
      alert("保存失败: " + (e.message || e));
    }
  }

  function applyBoxesData(jsonData, imageUrl) {
    if (!jsonData || !Array.isArray(jsonData.spines)) {
      throw new Error("json 格式不对：找不到 spines[]");
    }
    state.originalJson = jsonData;
    state.jsonData = jsonData;
    state.spines = jsonData.spines.map((s) => ({
      id: s.id,
      spine_index: s.spine_index,
      bbox: { ...(s.bbox || {}) },
      confidence: s.confidence,
      crop_source: s.crop_source,
      _origBbox: s.bbox ? { ...s.bbox } : null,
    }));
    state.originalSpines = JSON.parse(JSON.stringify(
      state.spines.map(({ id, spine_index, bbox, confidence, crop_source }) => ({
        id, spine_index, bbox, confidence, crop_source,
      }))
    ));
    state.activeIndex = 0;
    clearStageOverlays();

    if (state.imageUrl && state.imageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(state.imageUrl);
    }
    state.imageUrl = imageUrl;
    els.stageImg.src = imageUrl;
    els.stageImg.onload = () => {
      state.naturalW = els.stageImg.naturalWidth;
      state.naturalH = els.stageImg.naturalHeight;
      setStageSize();
      renderSpineList();
      refreshListActive();
      if (!state.spines.length) {
        els.coordsBox.textContent = "（无框 — 可用「＋ 添加框」或空白处拖拽新建）";
      }
    };
  }

  async function loadFromServer() {
    if (!state.wallImageId) return;
    if (els.embedMeta) els.embedMeta.textContent = `加载图片 #${state.wallImageId}…`;
    try {
      const res = await fetch(`/api/images/${state.wallImageId}/spine-boxes`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
      const boxes = data.boxes || {};
      const url = boxes.image_url;
      if (!url) throw new Error("缺少图片 URL");
      applyBoxesData(boxes, url);
      const name = boxes.image_filename || `#${state.wallImageId}`;
      const n = (boxes.spines || []).length;
      if (els.embedMeta) {
        els.embedMeta.textContent = `${name} · ${n} 框${data.exists ? "" : "（空模板，请手工添加）"}`;
      }
    } catch (e) {
      if (els.embedMeta) els.embedMeta.textContent = "加载失败: " + (e.message || e);
      alert("加载失败: " + (e.message || e));
    }
  }

  async function loadJsonFile(file) {
    const text = await file.text();
    return JSON.parse(text);
  }

  function clearStageOverlays() {
    state.rectEls.forEach((n) => n.remove());
    state.rectEls = [];
    clearRubber();
  }

  async function onLoad() {
    const imageFile = els.inputImage.files && els.inputImage.files[0];
    const jsonFile = els.inputJson.files && els.inputJson.files[0];
    if (!imageFile || !jsonFile) {
      alert("请先选择原图和 stage1 json");
      return;
    }

    const jsonData = await loadJsonFile(jsonFile);
    if (!jsonData || !Array.isArray(jsonData.spines)) {
      alert("json 格式不对：找不到 spines[]");
      return;
    }

    if (state.imageUrl && state.imageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(state.imageUrl);
    }
    const blobUrl = URL.createObjectURL(imageFile);
    state.imageFile = imageFile;
    applyBoxesData(jsonData, blobUrl);
  }

  function onReset() {
    if (!state.originalSpines.length && !state.originalJson) return;
    state.spines = state.originalSpines.map((s) => ({
      id: s.id,
      spine_index: s.spine_index,
      bbox: { ...s.bbox },
      confidence: s.confidence,
      crop_source: s.crop_source,
      _origBbox: { ...s.bbox },
    }));
    state.activeIndex = 0;
    clearRubber();
    renderSpineList();
    renderRects();
    refreshListActive();
  }

  if (els.btnLoad) els.btnLoad.addEventListener("click", onLoad);
  if (els.btnReset) els.btnReset.addEventListener("click", onReset);
  if (els.btnResetEmbed) els.btnResetEmbed.addEventListener("click", onReset);
  els.btnAdd.addEventListener("click", addSpineNearActive);
  els.btnCopy.addEventListener("click", copyActiveSpine);
  els.btnDelete.addEventListener("click", () => deleteActiveSpine());
  if (els.btnExport) els.btnExport.addEventListener("click", exportJson);
  if (els.btnSaveServer) els.btnSaveServer.addEventListener("click", saveToServer);

  if (els.btnRestoreDeleteConfirm) {
    els.btnRestoreDeleteConfirm.addEventListener("click", () => {
      setSkipDeleteConfirm(false);
    });
  }
  if (els.deleteCancel) {
    els.deleteCancel.addEventListener("click", () => {
      closeDeleteConfirm({ confirmed: false, skipNext: false });
    });
  }
  if (els.deleteOk) {
    els.deleteOk.addEventListener("click", () => {
      closeDeleteConfirm({
        confirmed: true,
        skipNext: !!(els.deleteSkip && els.deleteSkip.checked),
      });
    });
  }
  if (els.deleteModal) {
    els.deleteModal.addEventListener("click", (e) => {
      if (e.target === els.deleteModal) {
        closeDeleteConfirm({ confirmed: false, skipNext: false });
      }
    });
  }
  window.addEventListener("keydown", (e) => {
    if (!els.deleteModal || !els.deleteModal.classList.contains("is-open")) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeDeleteConfirm({ confirmed: false, skipNext: false });
    } else if (e.key === "Enter") {
      e.preventDefault();
      closeDeleteConfirm({
        confirmed: true,
        skipNext: !!(els.deleteSkip && els.deleteSkip.checked),
      });
    }
  });

  repairDeleteConfirmStorage();
  syncSkipConfirmUi();

  bindGlobalEvents();
  window.addEventListener("resize", () => setStageSize());

  if (state.isEmbed && state.wallImageId) {
    loadFromServer();
  }
})();
