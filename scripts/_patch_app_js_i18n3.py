"""Third pass: match/upload/placement dynamic UI strings."""
from pathlib import Path
import re

APP = Path(__file__).resolve().parents[1] / "static" / "js" / "app.js"
text = APP.read_text(encoding="utf-8")

REPLACEMENTS = [
    ('manual.en.html?v=5.0b', 'manual.en.html?v=5.0c'),
    (
        'if (isRejected) return { text: tr("match.rejected"), cls: "error", title: "此碟片不会保存" };',
        'if (isRejected) return { text: tr("match.rejected"), cls: "error", title: tr("match.rejectedHint") };',
    ),
    (
        'return { text: "自动匹配 · 将保存", cls: "matched", title: "高置信自动匹配的 TMDb 候选，确认后会写入片库；也可点击其他候选更换" };',
        'return { text: tr("match.autoMatched"), cls: "matched", title: tr("match.autoMatchedHint") };',
    ),
    (
        'return { text: "已选择 · 将保存", cls: "matched", title: "已为该碟片选定 TMDb 候选，确认后会写入片库" };',
        'return { text: tr("match.selected"), cls: "matched", title: tr("match.selectedHint") };',
    ),
    (
        'return { text: "建议候选 · 点击可改", cls: "pending", title: "系统预选了首个候选，点击其他卡片可更换；确认后才会保存" };',
        'return { text: tr("match.suggested"), cls: "pending", title: tr("match.suggestedHint") };',
    ),
    (
        'return { text: "未选择", cls: "pending", title: "请点击下方某个 TMDb 候选以选中保存" };',
        'return { text: tr("match.unselected"), cls: "pending", title: tr("match.unselectedHint") };',
    ),
    (
        '? \'<span class="match-photo-badge error">识别失败</span>\'',
        '? `<span class="match-photo-badge error">${tr("match.photoFailed")}</span>`',
    ),
    (
        ': `<span class="match-photo-badge">识别完成 · ${discs.length} 张</span>`;',
        ': `<span class="match-photo-badge">${tr("match.photoDone", { count: discs.length })}</span>`;',
    ),
    (
        'title="点击选中此 TMDb 候选用于保存">',
        'title="${tr("match.clickToSelect")}">',
    ),
    (
        'title="用视觉模型比对碟脊与海报">${DISC_CARD_ICONS.eye}<span>视觉比对</span>',
        'title="${tr("match.visualCompare")}">${DISC_CARD_ICONS.eye}<span>${tr("match.visualCompare")}</span>',
    ),
    (
        '${isSelected ? \'<div class="match-candidate-hint">当前选中 · 将随「确认并保存」写入</div>\' : \'<div class="match-candidate-hint">点击选中</div>\'}',
        '${isSelected ? `<div class="match-candidate-hint">${tr("match.selectedSaveHint")}</div>` : `<div class="match-candidate-hint">${tr("match.clickToSelect")}</div>`}',
    ),
    (
        'candidatesHtml = \'<div class="empty-state" style="padding:12px">未找到匹配，可手动搜索</div>\';',
        'candidatesHtml = `<div class="empty-state" style="padding:12px">${tr("match.noMatchManual")}</div>`;',
    ),
    (
        "${escapeHtml(d.title_cn || d.title_en || '未识别')}",
        "${escapeHtml(d.title_cn || d.title_en || tr('match.unrecognized'))}",
    ),
    (
        "${d.confidence ? ' | 置信度: ' + d.confidence : ''}",
        "${d.confidence ? ' | ' + tr('match.confidence', { value: d.confidence }) : ''}",
    ),
    (
        "${hasSpineBbox(d) ? ' · <span style=\"color:var(--green)\">已标定碟脊</span>' : ' · <span style=\"color:var(--gold)\">未标定碟脊</span>'}",
        "${hasSpineBbox(d) ? ' · <span style=\"color:var(--green)\">' + tr('match.spineMarked') + '</span>' : ' · <span style=\"color:var(--gold)\">' + tr('match.spineMissing') + '</span>'}",
    ),
    (
        'title="在原图上框选碟脊，供视觉比对使用">${DISC_CARD_ICONS.crop}<span>标定碟脊</span>',
        'title="${tr(\'match.calibrateSpine\')}">${DISC_CARD_ICONS.crop}<span>${tr("match.calibrateSpine")}</span>',
    ),
    (
        'title="手动输入片名搜索 TMDb">${DISC_CARD_ICONS.search}<span>手动搜索 TMDb</span>',
        'title="${tr(\'match.manualSearch\')}">${DISC_CARD_ICONS.search}<span>${tr("match.manualSearch")}</span>',
    ),
    (
        'title="拒绝此碟片，不保存" ${isRejected ? "disabled" : ""}>${isRejected ? tr("match.rejected") : "✕ 拒绝"}',
        'title="${tr(\'match.rejectedHint\')}" ${isRejected ? "disabled" : ""}>${isRejected ? tr("match.rejectedBtn") : tr("match.reject")}',
    ),
    (
        '<div class="match-card-detected">识别到 <strong>${discs.length}</strong> 张碟片</div>',
        '<div class="match-card-detected">${tr("match.detectedDiscs", { count: discs.length })}</div>',
    ),
    (
        '${discs.length > 0 ? discsHtml : \'<div class="empty-state" style="padding:12px">未能识别到碟片</div>\'}',
        '${discs.length > 0 ? discsHtml : `<div class="empty-state" style="padding:12px">${tr("toast.noDiscsInRegion")}</div>`}',
    ),
    (
        'title="在原图上框选任意区域并重新识别">框选区域重新识别</button>',
        'title="${tr(\'match.regionReanalyze\')}">${tr("match.regionReanalyze")}</button>',
    ),
    (
        '<span class="btn-label">手动搜索</span>',
        '<span class="btn-label">${tr("match.manualSearch")}</span>',
    ),
    (
        'const name = img.original_filename || img.filename || `图片 ${img.image_id}`;',
        'const name = img.original_filename || img.filename || `Image #${img.image_id}`;',
    ),
    (
        'const label = idx === 0 ? "分析中…" : "等待中";',
        'const label = idx === 0 ? tr("status.analyzing") : tr("status.waiting");',
    ),
    (
        'extra = `<span class="item-title">识别到 ${r.disc_count} 张</span>`;',
        'extra = `<span class="item-title">${tr("upload.analyzeItemTitle", { count: r.disc_count })}</span>`;',
    ),
    (
        'setAnalyzingItemState(card, "is-done", "完成", extra);',
        'setAnalyzingItemState(card, "is-done", tr("status.done"), extra);',
    ),
    (
        'setAnalyzingItemState(card, "is-error", "失败", `<span class="item-error">${err}</span>`);',
        'setAnalyzingItemState(card, "is-error", tr("status.failed"), `<span class="item-error">${err}</span>`);',
    ),
    (
        'setAnalyzingItemState(card, "is-processing", "分析中…");',
        'setAnalyzingItemState(card, "is-processing", tr("status.analyzing"));',
    ),
    (
        'setAnalyzingItemState(card, "is-pending", "等待中");',
        'setAnalyzingItemState(card, "is-pending", tr("status.waiting"));',
    ),
    (
        'textEl.textContent = `分析中... ${status.completed || 0}/${total}`;',
        'textEl.textContent = tr("upload.analyzingProgress", { done: status.completed || 0, total });',
    ),
    (
        'textEl.textContent = `分析完成！共 ${total} 张`;',
        'textEl.textContent = tr("upload.analyzingComplete", { count: total });',
    ),
    (
        'setAnalyzingItemState(card, "is-pending", "等待中");',
        'setAnalyzingItemState(card, "is-pending", tr("status.waiting"));',
    ),
    (
        'throw new Error("分析超时");',
        'throw new Error(tr("toast.reanalyzeTimeout"));',
    ),
    (
        'textEl.textContent = `已上传 ${total} 张，正在分析中...`;',
        'textEl.textContent = tr("upload.uploadedAnalyzing", { count: total });',
    ),
    (
        'textEl.textContent = `正在分析 ${total} 张已有照片...`;',
        'textEl.textContent = tr("upload.analyzingExisting", { count: total });',
    ),
    (
        'textEl.textContent = `正在分析已有 ${total2} 张照片...`;',
        'textEl.textContent = tr("upload.analyzingExisting", { count: total2 });',
    ),
    (
        'if (textEl) textEl.textContent = task.message || `Stage2 进度 ${pct}%`;',
        'if (textEl) textEl.textContent = task.message || tr("upload.stage2Progress", { pct });',
    ),
    (
        'if (r.error) label.textContent = "失败";',
        'if (r.error) label.textContent = tr("status.failed");',
    ),
    (
        'else if (r.ok) label.textContent = `完成 · ${r.matched || 0}/${r.spine_count || 0} 匹配 · 导入 ${r.imported || 0}`;',
        'else if (r.ok) label.textContent = tr("upload.stage2ItemDone", { matched: r.matched || 0, spines: r.spine_count || 0, imported: r.imported || 0 });',
    ),
    (
        'else label.textContent = "处理中";',
        'else label.textContent = tr("status.processing");',
    ),
    (
        'if (textEl) textEl.textContent = "Stage2 失败: " + e.message;',
        'if (textEl) textEl.textContent = tr("toast.stage2Failed", { message: e.message });',
    ),
    (
        'setIconTitle(title, "crop", `修正碟脊框 — ${name}`);',
        'setIconTitle(title, "crop", `${tr("dialog.spineBoxes")} — ${name}`);',
    ),
    (
        '`对选中的 ${ids.length} 张跑 Stage2（视觉读标题 + TMDb 匹配）并写入碟片库？\\n` +\n        `将覆盖同图已有 discs（reset）。需 LM Studio 与 TMDb 可用。`',
        'tr("confirm.stage2", { count: ids.length })',
    ),
    (
        '? `<span class="existing-photo-box-badge" title="已保存 ${img.spine_box_count || 0} 个碟脊框">${img.spine_box_count || 0}</span>`',
        '? `<span class="existing-photo-box-badge" title="${tr("upload.savedBoxes", { count: img.spine_box_count || 0 })}">${img.spine_box_count || 0}</span>`',
    ),
    (
        '${img.has_spine_boxes ? ` · 已存 ${img.spine_box_count} 框` : ""}',
        '${img.has_spine_boxes ? tr("upload.storedBoxes", { count: img.spine_box_count }) : ""}',
    ),
    (
        'rejectBtn.textContent = \'已拒绝\';',
        'rejectBtn.textContent = tr("match.rejectedBtn");',
    ),
    (
        'rejectBtn.textContent = "✕ 拒绝";',
        'rejectBtn.textContent = tr("match.reject");',
    ),
    (
        'if (selectedHint) selectedHint.textContent = "当前选中 · 将随「确认并保存」写入";',
        'if (selectedHint) selectedHint.textContent = tr("match.selectedSaveHint");',
    ),
    (
        'statusEl.textContent = "已选择 · 将保存";',
        'statusEl.textContent = tr("match.selected");',
    ),
    (
        '$("#verify-body").innerHTML = \'<div class="verify-loading">🔄 正在用视觉模型比对图片...</div>\';',
        '$("#verify-body").innerHTML = `<div class="verify-loading">${tr("verify.loadingShort")}</div>`;',
    ),
    (
        'statusEl.textContent = "✅ 已手动匹配";',
        'statusEl.textContent = tr("match.manualMatched");',
    ),
    (
        'label.textContent = `已选择 ${count} 张`;',
        'label.textContent = tr("status.batchSelected", { count });',
    ),
    (
        'setBtnLabel(reprocessBtn, `批量重新识别 (${count}张)`);',
        'setBtnLabel(reprocessBtn, tr("images.batchReprocessCount", { count }));',
    ),
    (
        'setBtnLabel(deleteBtn, `批量删除 (${count}张)`);',
        'setBtnLabel(deleteBtn, tr("images.batchDeleteCount", { count }));',
    ),
    (
        'label.textContent = `正在重新识别 0/${total}...`;',
        'label.textContent = tr("images.reprocessProgress", { done: 0, total });',
    ),
    (
        'label.textContent = `正在重新识别 ${completed}/${total}...`;',
        'label.textContent = tr("images.reprocessProgress", { done: completed, total });',
    ),
    (
        'label.textContent = `✅ 识别完成！共 ${total} 张`;',
        'label.textContent = tr("images.reprocessComplete", { count: total });',
    ),
    (
        'label.textContent = "❌ 识别失败";',
        'label.textContent = tr("images.reprocessFail");',
    ),
    (
        'statusEl.innerHTML = "⏳ 正在重新识别... 0%";',
        'statusEl.innerHTML = tr("images.reprocessing", { pct: 0 });',
    ),
    (
        'statusEl.innerHTML = "⚠ 识别完成，未找到碟片";',
        'statusEl.innerHTML = tr("images.noDiscsFound");',
    ),
    (
        'statusEl.innerHTML = "❌ 识别失败";',
        'statusEl.innerHTML = tr("images.reprocessFail");',
    ),
    (
        'statusEl.innerHTML = "⏱ 识别超时";',
        'statusEl.innerHTML = tr("toast.reanalyzeTimeout");',
    ),
    (
        'statusEl.innerHTML = "❌ 识别失败: " + e.message;',
        'statusEl.innerHTML = tr("images.reprocessFail") + ": " + e.message;',
    ),
    (
        'btn.textContent = hasAnyId ? "按片名重新搜索" : tr("edit.searchByTitle");',
        'btn.textContent = hasAnyId ? tr("edit.searchByTitleAgain") : tr("edit.searchByTitle");',
    ),
    (
        'if (hint) hint.textContent = "该碟未关联原照片，无法对照碟脊";',
        'if (hint) hint.textContent = tr("edit.previewNoPhoto");',
    ),
    (
        'if (empty) empty.textContent = "无所属特写照片（可选下方关联源图）";',
        'if (empty) empty.textContent = tr("edit.previewEmptyOptional");',
    ),
    (
        'if (hint) hint.textContent = "可不关联照片直接建卡；有图时可后补碟脊框";',
        'if (hint) hint.textContent = tr("edit.createHintNoPhoto");',
    ),
    (
        'if (label) label.textContent = prev || "补全海报";',
        'if (label) label.textContent = prev || tr("action.enrichPosters");',
    ),
    (
        'container.innerHTML = \'<div class="compare-card"><div class="compare-text" style="color:var(--text-muted)">🔄 正在裁剪碟脊并比对海报…</div></div>\';',
        'container.innerHTML = `<div class="compare-card"><div class="compare-text" style="color:var(--text-muted)">${tr("verify.cropping")}</div></div>`;',
    ),
    (
        '`正在编辑「${label}」· 可切换上方任一特写继续调整，保存时按张写回 placement。`;',
        'tr("placement.soloEditing", { name: label });',
    ),
    (
        'display_name: img.display_name || img.original_filename || img.filename || `特写 ${idx + 1}`,',
        'display_name: img.display_name || img.original_filename || img.filename || `Close-up ${idx + 1}`,',
    ),
    (
        '? `已保存 ${saved} 张特写位置${recalcTotal > 0 ? `，并重算 ${recalcTotal} 张碟片坐标` : ""}`\n                : `已保存 ${saved} 张特写在墙面上的位置`,',
        '? tr("placement.savedRecalc", { photos: saved, discs: recalcTotal })\n                : tr("placement.saved", { count: saved }),',
    ),
    (
        '${cropSrc ? `<img src="${cropSrc}" alt="裁剪碟脊">` : \'<div class="compare-text">无裁剪图</div>\'}',
        '${cropSrc ? `<img src="${cropSrc}" alt="${tr("verify.croppedSpine")}">` : `<div class="compare-text">${tr("verify.noCrop")}</div>`}',
    ),
    (
        'return ` <span class="source-badge" style="color:${color};border-color:${color}" title="来源: ${label}">${icon} ${label}</span>`;',
        'return ` <span class="source-badge" style="color:${color};border-color:${color}" title="${tr("source.from", { label })}">${icon} ${label}</span>`;',
    ),
]

for old, new in REPLACEMENTS:
    if old not in text:
        print(f"SKIP: {old[:65]}...")
    else:
        text = text.replace(old, new)

APP.write_text(text, encoding="utf-8")
body = text.split("*/", 1)[-1]
# Exclude GENRE_GROUPS block from count
genre_start = body.find("GENRE_GROUPS")
genre_end = body.find("];", genre_start) + 2 if genre_start >= 0 else -1
if genre_start >= 0:
    body_no_genre = body[:genre_start] + body[genre_end:]
else:
    body_no_genre = body
remaining = len(re.findall(r"[\u4e00-\u9fff]", body_no_genre))
print(f"Pass 3 — CJK excluding GENRE_GROUPS: {remaining}")
