"""Second pass: user-visible Chinese strings in app.js."""
from pathlib import Path
import re

APP = Path(__file__).resolve().parents[1] / "static" / "js" / "app.js"
text = APP.read_text(encoding="utf-8")

REPLACEMENTS = [
    # refreshDynamicUi helpers
    (
        "    updateExistingPhotosToolbar?.();\n    updateManageToolbar?.();\n    updateUploadStartButton?.();\n    syncEditDiscModalTitle?.();\n    syncBboxEditorTitle?.();",
        "    updateExistingPhotosActions?.();\n    updateUploadButton?.();\n    updateBatchActionBar?.();\n    updateSelectAllButton?.();\n    _setEditDiscModalChrome(editDiscState.mode || \"edit\");\n    if (isSidebarFooterOpen()) openSidebarFooter({ pin: !!$(\"#sidebar-footer\")?.dataset.pinned }); else closeSidebarFooter();",
    ),
    (
        'handle.setAttribute("aria-label", `${label}，反向滑动切换`);',
        'handle.setAttribute("aria-label", tr("wall.sheetAria", { action: label }));',
    ),
    ('selectBtn.textContent = "☑ 取消全选";', 'selectBtn.textContent = `☑ ${tr("action.deselectAll")}`;'),
    ('selectBtn.textContent = count > 0 ? `☑ 已选 ${count}` : "☐ 全选";', 'selectBtn.textContent = count > 0 ? `☑ ${tr("action.selectCount", { count })}` : `☐ ${tr("action.selectAll")}`;'),
    ('label.textContent = count > 0 ? `已选中 ${count} 张` : tr("status.noSelection");', 'label.textContent = count > 0 ? tr("status.selectedCount", { count }) : tr("status.noSelection");'),
    ('setBtnLabel(reprocessBtn, count > 0 ? `重新分析选中的 ${count} 张` : tr("upload.reprocessSelected"));', 'setBtnLabel(reprocessBtn, count > 0 ? tr("upload.reprocessSelectedCount", { count }) : tr("upload.reprocessSelected"));'),
    ('setBtnLabel(deleteBtn, count > 0 ? `删除选中的 ${count} 张` : tr("upload.deleteSelected"));', 'setBtnLabel(deleteBtn, count > 0 ? tr("upload.deleteSelectedCount", { count }) : tr("upload.deleteSelected"));'),
    ('setBtnLabel(editBoxesBtn, count === 1 ? tr("dialog.spineBoxes") : "修正碟脊框（选 1 张）");', 'setBtnLabel(editBoxesBtn, count === 1 ? tr("upload.editSpineBoxes") : tr("upload.editSpineBoxesPickOne"));'),
    ('setBtnLabel(stage2Btn, count > 0 ? `Stage2 识别 ${count} 张` : tr("upload.stage2"));', 'setBtnLabel(stage2Btn, count > 0 ? tr("upload.stage2Count", { count }) : tr("upload.stage2"));'),
    (
        'btn.textContent = `上传新照片并分析 (新${state.uploadFiles.length}张 + 选中${selectedCount}张)`;',
        'btn.textContent = tr("upload.uploadNewAndSelected", { newCount: state.uploadFiles.length, selCount: selectedCount });',
    ),
    (
        'btn.textContent = `上传新照片并分析所有 (新${state.uploadFiles.length}张 + 已有${state.existingImages.length}张)`;',
        'btn.textContent = tr("upload.uploadNewAndAll", { newCount: state.uploadFiles.length, existCount: state.existingImages.length });',
    ),
    (
        'btn.textContent = `开始上传并分析 (${state.uploadFiles.length} 张)`;',
        'btn.textContent = tr("upload.startCount", { count: state.uploadFiles.length });',
    ),
    (
        'btn.textContent = `重新分析选中的 ${selectedCount} 张`;',
        'btn.textContent = tr("upload.reanalyzeSelectedOnly", { count: selectedCount });',
    ),
    (
        'btn.textContent = `重新分析已有照片 (${state.existingImages.length} 张)`;',
        'btn.textContent = tr("upload.reanalyzeExisting", { count: state.existingImages.length });',
    ),
    (
        'grid.innerHTML = \'<div class="empty-state">暂无上传的图片</div>\';',
        'grid.innerHTML = `<div class="empty-state">${tr("status.noImages")}</div>`;',
    ),
    ('$("#manage-stat").textContent = "0 张图片";', '$("#manage-stat").textContent = tr("status.imageCount", { count: 0 });'),
    ('$("#manage-stat").textContent = `${data.images.length} 张图片`;', '$("#manage-stat").textContent = tr("status.imageCount", { count: data.images.length });'),
    (
        "img.image_type === 'panoramic' ? '全景' : '特写'",
        "img.image_type === 'panoramic' ? tr('images.panoramic') : tr('images.closeup')",
    ),
    (
        'title=tr("images.reprocessOne")',
        'title="${tr("images.reprocessOne")}"',
    ),
    (
        'onclick="event.stopPropagation();deleteImage(${img.id})">删除</button>',
        'onclick="event.stopPropagation();deleteImage(${img.id})">${tr("action.delete")}</button>',
    ),
    ('btn.textContent = "☑ 取消全选";', 'btn.textContent = `☑ ${tr("action.deselectAll")}`;'),
    ('btn.textContent = selectedCount > 0 ? `☑ 已选 ${selectedCount}` : "☐ 全选";', 'btn.textContent = selectedCount > 0 ? `☑ ${tr("action.selectCount", { count: selectedCount })}` : `☐ ${tr("action.selectAll")}`;'),
    (
        'return na.localeCompare(nb, "zh");',
        'return na.localeCompare(nb, uiLocaleTag());',
    ),
    (
        "const opts = ['<option value=\"\">不关联源图（可后补）</option>'];",
        'const opts = [`<option value="">${tr("edit.sourceNone")}</option>`];',
    ),
    (
        '`<option value="${escapeHtml(want)}" selected>${escapeHtml(want)} · 当前</option>`',
        '`<option value="${escapeHtml(want)}" selected>${escapeHtml(want)} · ${tr("edit.sourceCurrent")}</option>`',
    ),
    (
        "sel.innerHTML = '<option value=\"\">不关联源图（可后补）</option>';",
        'sel.innerHTML = `<option value="">${tr("edit.sourceNone")}</option>`;',
    ),
    (
        'if (titleEl) setIconTitle(titleEl, "crop", title || "框选区域");',
        'if (titleEl) setIconTitle(titleEl, "crop", title || tr("dialog.bboxRegion"));',
    ),
    (
        'm.title = flagged ? `${disc.title_cn}（识别有误）` : disc.title_cn;',
        'm.title = flagged ? tr("toast.flaggedTitle", { title: disc.title_cn }) : disc.title_cn;',
    ),
    (
        'el.innerHTML = `<span>无法读取 API Key：${escapeHtml(msg)}</span><button type="button" class="edit-api-keys-retry" data-act="retry-keys">重试</button>`;',
        'el.innerHTML = `<span>${tr("toast.apiKeysLoadFailed", { message: escapeHtml(msg) })}</span><button type="button" class="edit-api-keys-retry" data-act="retry-keys">${tr("action.retry")}</button>`;',
    ),
    (
        'if (!confirm(`确定重新分析选中的 ${ids.length} 张照片？原有识别结果将被清除。`)) return;',
        'if (!confirm(tr("confirm.reprocessBatch", { count: ids.length }))) return;',
    ),
    (
        'if (!confirm(`确定永久删除选中的 ${ids.length} 张照片及其关联的所有碟片？此操作不可恢复！`)) return;',
        'if (!confirm(tr("confirm.deleteBatch", { count: ids.length }))) return;',
    ),
    (
        'if (!confirm(`确定重新识别选中的 ${ids.length} 张照片？原有识别结果将被清除。`)) return;',
        'if (!confirm(tr("confirm.reprocessBatch", { count: ids.length }))) return;',
    ),
    (
        'if (!confirm(`确定要删除「${title}」吗？`)) return;',
        'if (!confirm(tr("confirm.deleteDisc", { title }))) return;',
    ),
    (
        'if (!confirm(`确认删除「${title}」？\\n\\n此操作将从数据库永久移除，不可恢复。`)) return;',
        'if (!confirm(tr("confirm.deleteDiscFinal", { title }))) return;',
    ),
    (
        'showToast(`Stage2 完成：成功 ${okCount}，失败 ${failCount}`, failCount ? "error" : "success");',
        'showToast(tr("toast.stage2Done", { ok: okCount, fail: failCount }), failCount ? "error" : "success");',
    ),
    ('showToast("Stage2 失败: " + e.message, "error");', 'showToast(tr("toast.stage2Failed", { message: e.message }), "error");'),
    ('showToast("请至少选择一个匹配结果（或取消拒绝后重选）", "error");', 'showToast(tr("toast.selectAtLeastOne"), "error");'),
    ('showToast(`成功保存 ${result.count} 张碟片！`, "success");', 'showToast(tr("toast.savedDiscs", { count: result.count }), "success");'),
    (
        'showToast("Stage2 匹配入库请选择带 TMDb 徽章的候选；IMDb/TVDB 请用「手工建卡/编辑」", "error");',
        'showToast(tr("toast.tmdbCandidateRequired"), "error");',
    ),
    ('showToast("此确认入库流程仅支持 TMDb 候选；请改用手工建卡", "error");', 'showToast(tr("toast.manualCardRequired"), "error");'),
    ('showToast("已选为匹配候选", "success");', 'showToast(tr("toast.matchCandidateApplied"), "success");'),
    (
        'showToast(`批量重新识别完成，共 ${total} 张 — 请确认匹配`, "success");',
        'showToast(tr("toast.reprocessDone"), "success");',
    ),
    ('showToast("批量重新识别失败: " + e.message, "error");', 'showToast(tr("toast.batchReprocessFailed") + ": " + e.message, "error");'),
    (
        'statusEl.innerHTML = `⏳ 重新识别中... ${status.completed || 0}/1 (${pct}%)`;',
        'statusEl.innerHTML = tr("images.reprocessing", { pct });',
    ),
    (
        'statusEl.innerHTML = `✅ 识别完成！找到 ${results[0].disc_count} 张碟片`;',
        'statusEl.innerHTML = tr("images.foundDiscs", { count: results[0].disc_count });',
    ),
    ('showToast("重新识别完成", "success");', 'showToast(tr("toast.reanalyzeComplete"), "success");'),
    ('showToast("喜好标注失败: " + e.message, "error");', 'showToast(tr("toast.preferenceFailed", { message: e.message }), "error");'),
    ('showToast(next ? "已标记为识别有误" : "已取消错误标记", "success");', 'showToast(next ? tr("toast.flagSet") : tr("toast.flagCleared"), "success");'),
    ('showToast("标记失败: " + e.message, "error");', 'showToast(tr("toast.updateFailed", { message: e.message }), "error");'),
    ('showToast(`已删除「${title}」`, "success");', 'showToast(tr("toast.deletedDisc", { title }), "success");'),
    (
        'box.innerHTML = `<div class="empty-state">正在搜索 ${escapeHtml(srcHint)}…</div>`;',
        'box.innerHTML = `<div class="empty-state">${tr("edit.searchingSource", { source: escapeHtml(srcHint) })}</div>`;',
    ),
    (
        'box.innerHTML = `<div class="empty-state">搜索失败: ${escapeHtml(e.message)}</div>`;',
        'box.innerHTML = `<div class="empty-state">${tr("toast.searchFailed", { message: escapeHtml(e.message) })}</div>`;',
    ),
    ('showToast("无效的 TMDb 候选", "error");', 'showToast(tr("toast.invalidCandidate"), "error");'),
    (
        'showToast("已应用 TMDb 候选，点 save 入库，或再点「从 TMDb 刷新」一并保存", "success");',
        'showToast(tr("edit.appliedTmdb"), "success");',
    ),
    ('showToast("无效的 IMDb 候选", "error");', 'showToast(tr("toast.invalidCandidate"), "error");'),
    (
        'showToast("已应用 IMDb 候选（未写入 tmdb_id），点 save 入库", "success");',
        'showToast(tr("edit.appliedImdb"), "success");',
    ),
    ('showToast("无效的 TVDB 候选", "error");', 'showToast(tr("toast.invalidCandidate"), "error");'),
    (
        'showToast("已应用 TVDB 候选（未写入 tmdb_id），点 save 入库", "success");',
        'showToast(tr("edit.appliedTvdb"), "success");',
    ),
    (
        'showToast(refreshFromTmdb ? "已建卡并自 TMDb 拉取元数据" : "碟片已创建", "success");',
        'showToast(refreshFromTmdb ? tr("toast.createdWithTmdb") : tr("toast.discCreated"), "success");',
    ),
    (
        'showToast(refreshFromTmdb ? "已从 TMDb 刷新并保存" : "碟片已保存", "success");',
        'showToast(refreshFromTmdb ? tr("toast.refreshedFromTmdb") : tr("toast.discSaved"), "success");',
    ),
    ('showToast("该碟片没有源照片，无法框选", "error");', 'showToast(tr("toast.noSourcePhoto"), "error");'),
    ('showToast("找不到源照片", "error");', 'showToast(tr("toast.sourcePhotoMissing"), "error");'),
    ('showToast("碟片 ID 丢失", "error");', 'showToast(tr("toast.discIdMissing"), "error");'),
    (
        'showToast("保存框选失败: " + e.message, "error");',
        'showToast(tr("toast.saveFailed", { message: e.message }), "error");',
    ),
    ('showToast("分析结果丢失", "error");', 'showToast(tr("toast.analysisLost"), "error");'),
    (
        'showToast(`已追加 ${newDiscs.length} 条区域识别结果`, "success");',
        'showToast(tr("toast.regionAdded", { count: newDiscs.length }), "success");',
    ),
    (
        'showToast("区域识别失败: " + e.message, "error");',
        'showToast(tr("error.regionFailed") + ": " + e.message, "error");',
    ),
    (
        'showToast(`已保存 ${Object.keys(placementState.rects).length} 张照片的位置`, "success");',
        'showToast(tr("toast.positionsSaved", { count: Object.keys(placementState.rects).length }), "success");',
    ),
    (
        'showToast("保存位置失败: " + e.message, "error");',
        'showToast(tr("toast.saveFailed", { message: e.message }), "error");',
    ),
    ('showToast("无法解析该特写图", "error");', 'showToast(tr("toast.resolvePhotoFailed"), "error");'),
    (
        'showToast("已从 uploads/photos 自动关联该特写图", "success");',
        'showToast(tr("toast.autoLinkedPhoto"), "success");',
    ),
    (
        'showToast(`开始补全 ${start.total} 张…`, "success");',
        'showToast(tr("toast.enrichStarted", { count: start.total }), "success");',
    ),
    (
        'showToast(start.message || tr("toast.enrichNone"), "success");',
        'showToast(start.message || tr("toast.enrichNone"), "success");',
    ),
]

for old, new in REPLACEMENTS:
    if old not in text:
        print(f"SKIP: {old[:70]}...")
    else:
        text = text.replace(old, new)

# Fix localeCompare remaining
text = re.sub(r'\.localeCompare\(([^,)]+),\s*"zh(?:-CN)?"\)', r'.localeCompare(\1, uiLocaleTag())', text)

APP.write_text(text, encoding="utf-8")

# Count user-visible-ish lines (exclude block comments at top)
body = text.split("*/", 1)[-1]
remaining = len(re.findall(r"[\u4e00-\u9fff]", body))
print(f"Pass 2 done — CJK in app.js body: {remaining}")
