"""Add data-i18n attributes and English fallbacks to index.html modals."""
from pathlib import Path

HTML = Path(__file__).resolve().parents[1] / "templates" / "index.html"
text = HTML.read_text(encoding="utf-8")

REPLACEMENTS = [
    ('href="/static/css/style.css?v=5.0b"', 'href="/static/css/style.css?v=5.0c"'),
    ('src="/static/js/i18n.js?v=5.0b"', 'src="/static/js/i18n.js?v=5.0c"'),
    ('src="/static/js/app.js?v=5.0b"', 'src="/static/js/app.js?v=5.0c"'),
    (
        'data-panel-drag="sidebar" title="左右拖动侧栏以查看墙面（双击复位）" role="button" tabindex="0" aria-label="拖动侧栏"',
        'data-panel-drag="sidebar" data-i18n-title="drag.sidebarTitle" data-i18n-aria-label="drag.sidebar" title="Drag sidebar to view the wall (double-click to reset)" role="button" tabindex="0" aria-label="Drag sidebar"',
    ),
    (
        '<span class="panel-drag-label">Drag sidebar</span>',
        '<span class="panel-drag-label" data-i18n="drag.sidebar">Drag sidebar</span>',
    ),
    (
        'title="上滑隐藏墙面" aria-label="上滑隐藏墙面，下滑显示墙面"',
        'data-i18n-title="wall.sheetHide" data-i18n-aria-label="wall.sheetAria" title="Swipe up to hide wall" aria-label="Swipe up to hide wall, swipe down to show"',
    ),
    (
        'title="墙面背景明暗">',
        'data-i18n-title="wall.brightnessTitle" title="Wall background brightness">',
    ),
    (
        'aria-label="墙面背景亮度">',
        'data-i18n-aria-label="wall.brightnessAria" aria-label="Wall background brightness">',
    ),
    (
        'title="从零新建碟片（不经 Stage2）">',
        'data-i18n-title="action.createDiscTitle" title="Create disc from scratch (no Stage2)">',
    ),
    (
        'title="按已有 TMDb 编号补海报/简介，不改片名与碟脊框">',
        'data-i18n-title="action.enrichPostersTitle" title="Fill poster/synopsis from TMDb ID without changing titles/boxes">',
    ),
    (
        'aria-label="展开功能" title="功能">',
        'data-i18n-aria-label="nav.expandTools" data-i18n-title="nav.functions" aria-label="Expand tools" title="Tools">',
    ),
    (
        'data-panel-drag="detail" title="左右拖动详情面板以查看墙面（双击复位）" role="button" tabindex="0" aria-label="拖动详情面板"',
        'data-panel-drag="detail" data-i18n-title="drag.detailTitle" data-i18n-aria-label="drag.detail" title="Drag detail panel to view the wall (double-click to reset)" role="button" tabindex="0" aria-label="Drag panel"',
    ),
    (
        '<span class="panel-drag-label">拖动面板</span>',
        '<span class="panel-drag-label" data-i18n="drag.detail">Drag panel</span>',
    ),
    (
        'id="detail-close" type="button" title="关闭">',
        'id="detail-close" type="button" data-i18n-title="action.close" title="Close">',
    ),
    (
        '<span class="modal-title-text">上传 & 识别碟片</span>',
        '<span class="modal-title-text" data-i18n="dialog.upload">Upload &amp; Scan Discs</span>',
    ),
    (
        '<div class="step active" data-step="1"><span>1</span>上传</div>',
        '<div class="step active" data-step="1"><span>1</span><span data-i18n="upload.step.upload">Upload</span></div>',
    ),
    (
        '<div class="step" data-step="2"><span>2</span>分析</div>',
        '<div class="step" data-step="2"><span>2</span><span data-i18n="upload.step.analyze">Analyze</span></div>',
    ),
    (
        '<div class="step" data-step="3"><span>3</span>匹配</div>',
        '<div class="step" data-step="3"><span>3</span><span data-i18n="upload.step.match">Match</span></div>',
    ),
    (
        '<div class="step" data-step="4"><span>4</span>位置标记</div>',
        '<div class="step" data-step="4"><span>4</span><span data-i18n="upload.step.placement">Placement</span></div>',
    ),
    (
        '<p>拖拽碟脊特写照片到此处</p>',
        '<p data-i18n="upload.dropHint">Drag spine close-up photos here</p>',
    ),
    (
        '<p class="upload-hint">支持 JPG、PNG、WebP，可多选</p>',
        '<p class="upload-hint" data-i18n="upload.dropFormats">JPG, PNG, WebP — multiple files OK</p>',
    ),
    (
        '<span>已上传的照片 (<span id="existing-photos-count">0</span> 张)</span>',
        '<span><span data-i18n="upload.existingPhotos" data-i18n-params="count">Uploaded photos</span> (<span id="existing-photos-count">0</span>)</span>',
    ),
    (
        '<span class="existing-photos-hint">勾选后可 Stage2；点右上角线框图标修正碟脊框</span>',
        '<span class="existing-photos-hint" data-i18n="upload.existingHint">Check for Stage2; use crop icon to edit spine boxes</span>',
    ),
    (
        'id="btn-existing-select-all">☐ 全选</button>',
        'id="btn-existing-select-all">☐ <span data-i18n="action.selectAll">Select all</span></button>',
    ),
    (
        'id="existing-photos-selected-label">未选中</span>',
        'id="existing-photos-selected-label" data-i18n="status.noSelection">Nothing selected</span>',
    ),
    (
        'title="打开碟脊框编辑器（需先选中一张）">',
        'data-i18n-title="upload.editBoxesTitle" title="Open spine box editor (select one photo)">',
    ),
    (
        '<span class="btn-label">修正碟脊框</span>',
        '<span class="btn-label" data-i18n="upload.editSpineBoxes">Edit spine boxes</span>',
    ),
    (
        'title="对选中照片跑 stage2 识别并入库">',
        'data-i18n-title="upload.stage2Title" title="Run Stage2 on selected photos">',
    ),
    (
        '<span class="btn-label">Stage2 识别</span>',
        '<span class="btn-label" data-i18n="upload.stage2">Stage2 scan</span>',
    ),
    (
        '<span class="btn-label">重新分析选中的</span>',
        '<span class="btn-label" data-i18n="upload.reprocessSelected">Re-analyze selected</span>',
    ),
    (
        '<span class="btn-label">删除选中的</span>',
        '<span class="btn-label" data-i18n="upload.deleteSelected">Delete selected</span>',
    ),
    (
        'disabled>开始上传并分析</button>',
        'disabled data-i18n="upload.start">Start upload &amp; analyze</button>',
    ),
    (
        'id="analyzing-text">准备分析...</div>',
        'id="analyzing-text" data-i18n="upload.analyzingPrepare">Preparing analysis…</div>',
    ),
    (
        '<span class="btn-label">确认所有匹配并保存</span>',
        '<span class="btn-label" data-i18n="upload.confirmAll">Confirm all matches &amp; save</span>',
    ),
    (
        '<span class="btn-label">重新分析</span>',
        '<span class="btn-label" data-i18n="upload.retryAnalysis">Retry analysis</span>',
    ),
    (
        '<p>在墙面背景上拖动每个照片框，标记它们在墙上的位置和大小。</p>',
        '<p data-i18n="upload.placementHint">Drag each photo box on the wall to mark position and size.</p>',
    ),
    (
        'alt="墙面背景" data-fit="contain">',
        'alt="Wall background" data-i18n-alt="upload.wallBgAlt" data-fit="contain">',
    ),
    (
        '<span class="placement-hint">拖拽移动 · 拖动右下角调整大小 · 滚轮缩放</span>',
        '<span class="placement-hint" data-i18n="upload.placementControls">Drag to move · corner handle to resize · scroll to zoom</span>',
    ),
    (
        'id="btn-skip-placement" type="button">跳过位置标记</button>',
        'id="btn-skip-placement" type="button" data-i18n="upload.skipPlacement">Skip placement</button>',
    ),
    (
        '<span class="btn-label">保存位置并完成</span>',
        '<span class="btn-label" data-i18n="upload.savePlacement">Save positions &amp; finish</span>',
    ),
    (
        '<span class="modal-title-text">图片管理</span>',
        '<span class="modal-title-text" data-i18n="dialog.manage">Manage Images</span>',
    ),
    (
        'id="btn-manage-select-all">☐ 全选</button>',
        'id="btn-manage-select-all">☐ <span data-i18n="action.selectAll">Select all</span></button>',
    ),
    (
        'id="manage-stat">0 张图片</span>',
        'id="manage-stat" data-i18n="status.imageCount" data-i18n-params="count:0">0 images</span>',
    ),
    (
        '<div class="empty-state">暂无上传的图片</div>',
        '<div class="empty-state" data-i18n="status.noImages">No uploaded images</div>',
    ),
    (
        'id="batch-action-label">已选择 0 张</span>',
        'id="batch-action-label" data-i18n="status.batchSelected" data-i18n-params="count:0">0 selected</span>',
    ),
    (
        '<span class="btn-label">批量重新识别</span>',
        '<span class="btn-label" data-i18n="images.batchReprocess">Batch re-analyze</span>',
    ),
    (
        '<span class="btn-label">批量删除</span>',
        '<span class="btn-label" data-i18n="images.batchDelete">Batch delete</span>',
    ),
    (
        '<h2>确认 TMDb 匹配</h2>',
        '<h2 data-i18n="dialog.match">Confirm TMDb Match</h2>',
    ),
    (
        'id="edit-disc-modal-title">编辑碟片</span>',
        'id="edit-disc-modal-title" data-i18n="dialog.editDisc">Edit Disc</span>',
    ),
    (
        '<span>对照原图 · 碟脊</span>',
        '<span data-i18n="edit.previewToggle">Source photo · spine</span>',
    ),
    (
        'id="edit-preview-zoom-out" title="缩小" aria-label="缩小">',
        'id="edit-preview-zoom-out" data-i18n-title="action.zoomOut" data-i18n-aria-label="action.zoomOut" title="Zoom out" aria-label="Zoom out">',
    ),
    (
        'id="edit-preview-zoom-in" title="放大" aria-label="放大">',
        'id="edit-preview-zoom-in" data-i18n-title="action.zoomIn" data-i18n-aria-label="action.zoomIn" title="Zoom in" aria-label="Zoom in">',
    ),
    (
        'id="edit-preview-zoom-reset" title="适应窗口">适应</button>',
        'id="edit-preview-zoom-reset" data-i18n-title="action.fitWindow" title="Fit"> <span data-i18n="action.fitWindow">Fit</span></button>',
    ),
    (
        'id="edit-preview-focus-spine" title="放大到碟脊框">定位碟脊</button>',
        'id="edit-preview-focus-spine" data-i18n-title="action.focusSpine" title="Focus spine"> <span data-i18n="action.focusSpine">Focus spine</span></button>',
    ),
    (
        'id="edit-disc-preview-empty">无所属特写照片</div>',
        'id="edit-disc-preview-empty" data-i18n="edit.previewEmpty">No linked close-up photo</div>',
    ),
    (
        'alt="原照片" draggable="false">',
        'alt="Source photo" data-i18n-alt="bbox.originalAlt" draggable="false">',
    ),
    (
        'id="edit-disc-preview-hint">滚轮缩放 · 拖拽平移 · 对照脊上文字改片名</p>',
        'id="edit-disc-preview-hint" data-i18n="edit.previewHint">Scroll to zoom · drag to pan · match spine text to titles</p>',
    ),
    (
        '<span>中文片名</span>',
        '<span data-i18n="edit.titleCn">Chinese title</span>',
    ),
    (
        '<span>英文片名</span>',
        '<span data-i18n="edit.titleEn">English title</span>',
    ),
    (
        '<span>发行年份</span>',
        '<span data-i18n="edit.year">Release year</span>',
    ),
    (
        'placeholder="如 1999">',
        'placeholder="e.g. 1999" data-i18n-placeholder="edit.yearPlaceholder">',
    ),
    (
        '<span>TMDb 编号</span>',
        '<span data-i18n="edit.tmdbId">TMDb ID</span>',
    ),
    (
        'placeholder="可留空，按片名搜索挑选">',
        'placeholder="Optional — search by title to pick" data-i18n-placeholder="edit.tmdbPlaceholder">',
    ),
    (
        'placeholder="tt… 可留空">',
        'placeholder="tt… optional" data-i18n-placeholder="edit.imdbPlaceholder">',
    ),
    (
        'placeholder="可留空">',
        'placeholder="Optional" data-i18n-placeholder="edit.tvdbPlaceholder">',
    ),
    (
        '<span class="tmdb-scope-label">类型</span>',
        '<span class="tmdb-scope-label" data-i18n="edit.scopeType">Type</span>',
    ),
    (
        'aria-label="搜索类型">',
        'data-i18n-aria-label="edit.scopeSearchType" aria-label="Search type">',
    ),
    (
        'data-scope="all">全部</button>',
        'data-scope="all" data-i18n="edit.scopeAll">All</button>',
    ),
    (
        'data-scope="movie">电影</button>',
        'data-scope="movie" data-i18n="meta.typeMovie">Movie</button>',
    ),
    (
        'data-scope="tv">剧集</button>',
        'data-scope="tv" data-i18n="meta.typeTv">TV</button>',
    ),
    (
        '<span class="tmdb-scope-label">来源</span>',
        '<span class="tmdb-scope-label" data-i18n="edit.scopeSource">Source</span>',
    ),
    (
        'aria-label="搜索来源">',
        'data-i18n-aria-label="edit.scopeSearchSource" aria-label="Search source">',
    ),
    (
        'data-source="all">全部</button>',
        'data-source="all" data-i18n="edit.scopeAll">All</button>',
    ),
    (
        '<p class="edit-api-keys-note">本机保存，不入库。关则不请求该源；开但无 key 时不会假搜。只显示掩码。</p>',
        '<p class="edit-api-keys-note" data-i18n="edit.apiKeysNote">Stored locally only, not in DB. Disabled sources are skipped; no fake search without a key.</p>',
    ),
    (
        '<span>关联源图（可选）</span>',
        '<span data-i18n="edit.sourceImage">Linked source photo (optional)</span>',
    ),
    (
        'title="不选亦可建卡，框位可后补">',
        'data-i18n-title="edit.sourceTitle" title="Optional — card works without source">',
    ),
    (
        '<option value="">不关联源图（可后补）</option>',
        '<option value="" data-i18n="edit.sourceNone">No source photo (can add later)</option>',
    ),
    (
        '<summary>填写说明</summary>',
        '<summary data-i18n="edit.helpTitle">How to fill in</summary>',
    ),
    (
        '<p>至少填中/英片名之一；编号可留空。搜后点选候选填编号与海报，勿伪造 tmdb_id。无 key 或已关闭的源会禁用。有 TMDb 编号可用「从 TMDb 刷新」。无照片也可建卡。</p>',
        '<p data-i18n="edit.helpBody">Enter at least one title; IDs optional. Pick search results for poster/IDs — do not fake tmdb_id. Disabled sources stay off. With TMDb ID use Refresh from TMDb. Cards work without photos.</p>',
    ),
    (
        'id="edit-disc-search-tmdb">按片名搜索</button>',
        'id="edit-disc-search-tmdb" data-i18n="edit.searchByTitle">Search by title</button>',
    ),
    (
        'id="edit-disc-refresh-tmdb" data-edit-only>从 TMDb 刷新</button>',
        'id="edit-disc-refresh-tmdb" data-edit-only data-i18n="edit.refreshTmdb">Refresh from TMDb</button>',
    ),
    (
        'id="edit-disc-cancel">cancel</button>',
        'id="edit-disc-cancel" data-i18n="action.cancel">Cancel</button>',
    ),
    (
        'id="edit-disc-save" data-edit-only>save</button>',
        'id="edit-disc-save" data-edit-only data-i18n="action.save">Save</button>',
    ),
    (
        '<span class="modal-title-text">视觉验证</span>',
        '<span class="modal-title-text" data-i18n="dialog.verify">Visual Verification</span>',
    ),
    (
        '<div class="verify-loading">正在用视觉模型比对图片...</div>',
        '<div class="verify-loading" data-i18n="verify.loading">Comparing images with vision model…</div>',
    ),
    (
        'alt="原照片放大">',
        'alt="Zoomed source photo" data-i18n-alt="bbox.zoomAlt">',
    ),
    (
        '<span class="modal-title-text">调整特写在墙面上的位置</span>',
        '<span class="modal-title-text" data-i18n="dialog.placementSolo">Adjust close-up on wall</span>',
    ),
    (
        'id="solo-placement-filename">上方列出全部特写：点击或拖入墙面开始调整；可依次完成所有特写。</p>',
        'id="solo-placement-filename" data-i18n="placement.soloIntro">All close-ups listed above — click or drag onto the wall; switch anytime.</p>',
    ),
    (
        'aria-label="全部特写照片"></div>',
        'data-i18n-aria-label="placement.soloTray" aria-label="All close-up photos"></div>',
    ),
    (
        '<span class="placement-hint">拖拽托盘缩略图到墙面 · 框内拖拽移动 · 四角手柄缩放 · 切换特写继续调整</span>',
        '<span class="placement-hint" data-i18n="placement.soloHint">Drag tray thumbnail to wall · drag inside box · corner handles · switch close-ups</span>',
    ),
    (
        '保存后按 photo_offset 重算对应图下所有碟片的墙面坐标',
        '<span data-i18n="placement.recalc">After save, recalc wall coords for all discs on this photo</span>',
    ),
    (
        'id="solo-placement-cancel">取消</button>',
        'id="solo-placement-cancel" data-i18n="action.cancel">Cancel</button>',
    ),
    (
        '<span class="btn-label">保存位置</span>',
        '<span class="btn-label" data-i18n="placement.save">Save position</span>',
    ),
    (
        '<span class="modal-title-text">标定碟脊</span>',
        '<span class="modal-title-text" data-i18n="dialog.calibrateSpine">Mark spine region</span>',
    ),
    (
        'id="bbox-zoom-out" title="缩小" aria-label="缩小">',
        'id="bbox-zoom-out" data-i18n-title="action.zoomOut" data-i18n-aria-label="action.zoomOut" title="Zoom out" aria-label="Zoom out">',
    ),
    (
        'id="bbox-zoom-in" title="放大" aria-label="放大">',
        'id="bbox-zoom-in" data-i18n-title="action.zoomIn" data-i18n-aria-label="action.zoomIn" title="Zoom in" aria-label="Zoom in">',
    ),
    (
        'id="bbox-zoom-reset" title="重置视图">重置</button>',
        'id="bbox-zoom-reset" data-i18n-title="action.resetView" title="Reset view"> <span data-i18n="action.resetView">Reset</span></button>',
    ),
    (
        '<span class="bbox-editor-hint">滚轮缩放 · 右键/中键拖动画布 · 左键拉框</span>',
        '<span class="bbox-editor-hint" data-i18n="bbox.hint">Scroll to zoom · right/middle drag canvas · left drag box</span>',
    ),
    (
        'id="bbox-editor-coords">未框选</span>',
        'id="bbox-editor-coords" data-i18n="bbox.noSelection">No selection</span>',
    ),
    (
        'alt="源照片" draggable="false">',
        'alt="Source photo" data-i18n-alt="bbox.sourceAlt" draggable="false">',
    ),
    (
        'id="bbox-editor-cancel">取消</button>',
        'id="bbox-editor-cancel" data-i18n="action.cancel">Cancel</button>',
    ),
    (
        'disabled>确认</button>',
        'disabled data-i18n="action.confirm">Confirm</button>',
    ),
    (
        '<span class="modal-title-text">修正碟脊框</span>',
        '<span class="modal-title-text" data-i18n="dialog.spineBoxes">Edit spine boxes</span>',
    ),
    (
        'aria-label="关闭">✕</button>',
        'data-i18n-aria-label="action.close" aria-label="Close">✕</button>',
    ),
    (
        'title="碟脊框编辑器" src="about:blank">',
        'title="Spine box editor" data-i18n-title="dialog.spineBoxesEditor" src="about:blank">',
    ),
    (
        'aria-label="热词筛选"></div>',
        'data-i18n-aria-label="dialog.hotWords" aria-label="Genre cloud"></div>',
    ),
]

for old, new in REPLACEMENTS:
    if old not in text:
        print(f"MISSING: {old[:60]}...")
    else:
        text = text.replace(old, new)

HTML.write_text(text, encoding="utf-8")
import re
remaining = len(re.findall(r"[\u4e00-\u9fff]", text))
print(f"Patched index.html — remaining CJK chars: {remaining}")
