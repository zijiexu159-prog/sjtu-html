const state = {
  sourcePath: "",
  layoutPath: "",
  previewUrl: "/preview",
  sourceMap: { slides: {}, fragments: {} },
  selected: null,
  mode: "edit",
  saveTimer: null,
};

const els = {
  workspace: document.querySelector("#workspace"),
  source: document.querySelector("#source-editor"),
  layout: document.querySelector("#layout-editor"),
  preview: document.querySelector("#preview-frame"),
  status: document.querySelector("#status"),
  fileLabel: document.querySelector("#file-label"),
  selectionLabel: document.querySelector("#selection-label"),
  fileSelect: document.querySelector("#file-select"),
  openButton: document.querySelector("#open-button"),
  saveButton: document.querySelector("#save-button"),
  buildButton: document.querySelector("#build-button"),
  exportButton: document.querySelector("#export-button"),
  importInput: document.querySelector("#import-input"),
  modeSelect: document.querySelector("#mode-select"),
  appearInput: document.querySelector("#appear-input"),
  effectSelect: document.querySelector("#effect-select"),
  fontScaleInput: document.querySelector("#font-scale-input"),
  applyStyleButton: document.querySelector("#apply-style-button"),
};

const snippets = {
  formula: "\n$$ {#eq:new}\nu_t + u u_x = \\\\nu u_{xx}\n$$\n",
  theorem: "\n::: theorem 定理标题{#thm:new}\n这里写定理内容。\n:::\n",
  figure: "\n![图片标题](../assets/figures/example.svg){#fig:new}\n",
  step: "\n### 内容块[fade-up]{#block-new}\n#### [1]\n第一步内容\n#### [2]\n第二步内容\n",
};

init();

async function init() {
  bindEvents();
  await loadState();
}

function bindEvents() {
  els.saveButton.addEventListener("click", () => saveAndBuild());
  els.buildButton.addEventListener("click", () => buildOnly());
  els.openButton.addEventListener("click", () => openSelectedFile());
  els.exportButton.addEventListener("click", () => exportProject());
  els.importInput.addEventListener("change", () => importFolder());
  els.modeSelect.addEventListener("change", () => setMode(els.modeSelect.value));
  els.applyStyleButton.addEventListener("click", applyStyleControls);
  els.source.addEventListener("click", focusPreviewFromSourceCursor);
  els.layout.addEventListener("input", validateLayoutSoon);
  els.layout.addEventListener("click", focusPreviewFromLayoutCursor);
  els.preview.addEventListener("load", wirePreview);
  document.querySelectorAll("[data-snippet]").forEach((button) => {
    button.addEventListener("click", () => insertSnippet(button.dataset.snippet));
  });
}

async function loadState() {
  setStatus("Loading...");
  const data = await getJson("/api/state");
  state.sourcePath = data.sourcePath;
  state.layoutPath = data.layoutPath;
  state.previewUrl = data.previewUrl || "/preview";
  state.files = data.files || [];
  els.source.value = data.source || "";
  els.layout.value = data.layoutText || "{\n  \"version\": 1,\n  \"slides\": {}\n}\n";
  els.fileLabel.textContent = `${data.sourcePath} + ${data.layoutPath}`;
  populateFileSelect();
  await refreshPreview();
  setStatus("Ready");
}

async function openSelectedFile() {
  const path = els.fileSelect.value;
  if (!path) return;
  setStatus("Opening...");
  const data = await postJson("/api/open", { path });
  applyState(data);
  await refreshPreview();
  setStatus("Opened");
}

function applyState(data) {
  state.sourcePath = data.sourcePath;
  state.layoutPath = data.layoutPath;
  state.previewUrl = data.previewUrl || state.previewUrl;
  state.files = data.files || [];
  state.selected = null;
  els.source.value = data.source || "";
  els.layout.value = data.layoutText || "{\n  \"version\": 1,\n  \"slides\": {}\n}\n";
  els.fileLabel.textContent = `${data.sourcePath} + ${data.layoutPath}`;
  els.selectionLabel.textContent = "No selection";
  populateFileSelect();
}

function populateFileSelect() {
  els.fileSelect.innerHTML = "";
  for (const file of state.files || []) {
    const option = document.createElement("option");
    option.value = file;
    option.textContent = file;
    option.selected = file === state.sourcePath;
    els.fileSelect.appendChild(option);
  }
}

async function saveAndBuild() {
  const parsed = parseLayoutEditor();
  if (!parsed) return;
  setStatus("Saving...");
  const data = await postJson("/api/save", {
    source: els.source.value,
    layoutText: els.layout.value,
  });
  applyState(data);
  await refreshPreview();
  setStatus("Saved");
}

async function buildOnly() {
  setStatus("Building...");
  const data = await postJson("/api/build", {});
  applyState(data);
  await refreshPreview();
  setStatus("Built");
}

function exportProject() {
  window.location.href = "/api/export";
}

async function importFolder() {
  const files = Array.from(els.importInput.files || []);
  if (!files.length) return;
  setStatus("Importing...");
  const form = new FormData();
  files.forEach((file) => {
    form.append("files", file, file.webkitRelativePath || file.name);
  });
  const data = await postForm("/api/import", form);
  applyState(data);
  await refreshPreview();
  els.importInput.value = "";
  setStatus("Imported");
}

async function refreshPreview() {
  return new Promise((resolve) => {
    const url = `${state.previewUrl}${state.previewUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
    els.preview.addEventListener("load", resolve, { once: true });
    els.preview.src = url;
  });
}

function wirePreview() {
  const doc = els.preview.contentDocument;
  const win = els.preview.contentWindow;
  if (!doc || !win) return;
  state.sourceMap = win.sjtuSourceMap || { slides: {}, fragments: {} };
  injectPreviewEditorStyle(doc);
  doc.querySelectorAll("[data-editor-id]").forEach((node) => {
    if (node.closest(".deck-controls")) return;
    node.addEventListener("click", (event) => {
      const target = event.target.closest("[data-editor-id]");
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      selectPreviewNode(target);
    }, true);
    node.addEventListener("pointerdown", (event) => {
      if (state.mode !== "edit") return;
      if (event.target.classList.contains("sjtu-editor-resize")) return;
      const target = event.target.closest("[data-editor-id]");
      if (target && target.classList.contains("fragment")) startDrag(event, target);
    });
  });
  if (state.selected?.editorId) {
    const node = findPreviewNode(state.selected.editorId);
    if (node) selectPreviewNode(node, { skipScroll: true });
  }
}

function injectPreviewEditorStyle(doc) {
  if (doc.querySelector("#sjtu-editor-style")) return;
  const style = doc.createElement("style");
  style.id = "sjtu-editor-style";
  style.textContent = `
    [data-editor-id].sjtu-editor-selected {
      outline: 3px solid rgba(181, 18, 27, 0.72) !important;
      outline-offset: 4px;
    }
    .sjtu-editor-resize {
      position: absolute;
      right: -7px;
      bottom: -7px;
      width: 14px;
      height: 14px;
      border-radius: 999px;
      border: 2px solid #fff;
      background: #b5121b;
      box-shadow: 0 1px 4px rgba(0,0,0,.22);
      cursor: nwse-resize;
      z-index: 9999;
    }
    .sjtu-editor-flash {
      animation: sjtuEditorFlash .9s ease;
    }
    @keyframes sjtuEditorFlash {
      0%, 100% { box-shadow: none; }
      40% { box-shadow: 0 0 0 8px rgba(181, 18, 27, .16); }
    }
  `;
  doc.head.appendChild(style);
}

function selectPreviewNode(node, options = {}) {
  const doc = els.preview.contentDocument;
  doc?.querySelectorAll(".sjtu-editor-selected").forEach((entry) => {
    entry.classList.remove("sjtu-editor-selected");
    entry.querySelectorAll(":scope > .sjtu-editor-resize").forEach((handle) => handle.remove());
  });
  node.classList.add("sjtu-editor-selected");
  const editorId = node.dataset.editorId;
  const slide = node.closest(".slide");
  const slideId = slide?.dataset.editorId || inferSlideIdFor(editorId);
  const layoutPath = node.dataset.layoutPath || `slides.${slideId}.fragments.${editorId}`;
  state.selected = { editorId, slideId, layoutPath };
  els.selectionLabel.textContent = `${slideId || "slide"} / ${editorId}`;
  updateControlsFromLayout();
  highlightSourceFor(editorId);
  highlightLayoutFor(editorId, layoutPath);
  if (state.mode === "edit" && node.classList.contains("fragment")) addResizeHandle(node);
  if (!options.skipScroll) node.scrollIntoView({ block: "center", inline: "center" });
}

function addResizeHandle(node) {
  node.querySelectorAll(":scope > .sjtu-editor-resize").forEach((handle) => handle.remove());
  if (getComputedStyle(node).position === "static") node.style.position = "relative";
  const handle = node.ownerDocument.createElement("span");
  handle.className = "sjtu-editor-resize";
  handle.addEventListener("pointerdown", (event) => startResize(event, node));
  node.appendChild(handle);
}

function startDrag(event, node) {
  selectPreviewNode(node, { skipScroll: true });
  const grid = node.closest(".content-grid");
  if (!grid) return;
  event.preventDefault();
  node.setPointerCapture?.(event.pointerId);
  const gridRect = grid.getBoundingClientRect();
  const rect = node.getBoundingClientRect();
  const start = {
    pointerX: event.clientX,
    pointerY: event.clientY,
    x: (rect.left - gridRect.left) / gridRect.width,
    y: (rect.top - gridRect.top) / gridRect.height,
    w: rect.width / gridRect.width,
    h: rect.height / gridRect.height,
  };
  const move = (moveEvent) => {
    const dx = (moveEvent.clientX - start.pointerX) / gridRect.width;
    const dy = (moveEvent.clientY - start.pointerY) / gridRect.height;
    const rectPatch = snapRect({
      x: start.x + dx,
      y: start.y + dy,
      w: start.w,
      h: start.h,
    }, moveEvent);
    applyRectToNode(node, rectPatch);
    writeSelectedLayout({ rect: rectPatch }, { skipHighlight: true });
  };
  const up = () => {
    node.removeEventListener("pointermove", move);
    node.removeEventListener("pointerup", up);
    node.removeEventListener("pointercancel", up);
    highlightLayoutFor(state.selected.editorId, state.selected.layoutPath);
  };
  node.addEventListener("pointermove", move);
  node.addEventListener("pointerup", up);
  node.addEventListener("pointercancel", up);
}

function startResize(event, node) {
  const grid = node.closest(".content-grid");
  if (!grid) return;
  event.preventDefault();
  event.stopPropagation();
  node.setPointerCapture?.(event.pointerId);
  const gridRect = grid.getBoundingClientRect();
  const rect = node.getBoundingClientRect();
  const start = {
    pointerX: event.clientX,
    pointerY: event.clientY,
    x: (rect.left - gridRect.left) / gridRect.width,
    y: (rect.top - gridRect.top) / gridRect.height,
    w: rect.width / gridRect.width,
    h: rect.height / gridRect.height,
  };
  const move = (moveEvent) => {
    const dw = (moveEvent.clientX - start.pointerX) / gridRect.width;
    const dh = (moveEvent.clientY - start.pointerY) / gridRect.height;
    const rectPatch = snapRect({
      x: start.x,
      y: start.y,
      w: Math.max(0.03, start.w + dw),
      h: Math.max(0.03, start.h + dh),
    }, moveEvent);
    applyRectToNode(node, rectPatch);
    writeSelectedLayout({ rect: rectPatch }, { skipHighlight: true });
  };
  const up = () => {
    node.removeEventListener("pointermove", move);
    node.removeEventListener("pointerup", up);
    node.removeEventListener("pointercancel", up);
    highlightLayoutFor(state.selected.editorId, state.selected.layoutPath);
  };
  node.addEventListener("pointermove", move);
  node.addEventListener("pointerup", up);
  node.addEventListener("pointercancel", up);
}

function snapRect(rect, event) {
  const grid = event.altKey ? 0 : event.shiftKey ? 0.025 : 0.01;
  const snap = (value) => grid ? Math.round(value / grid) * grid : value;
  return {
    x: Number(snap(rect.x).toFixed(4)),
    y: Number(snap(rect.y).toFixed(4)),
    w: Number(snap(rect.w).toFixed(4)),
    h: Number(snap(rect.h).toFixed(4)),
  };
}

function applyRectToNode(node, rect) {
  Object.assign(node.style, {
    position: "absolute",
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.w * 100}%`,
    minHeight: `${rect.h * 100}%`,
  });
}

function applyStyleControls() {
  if (!state.selected) {
    setStatus("Select an object first");
    return;
  }
  const patch = {};
  const fontScale = Number(els.fontScaleInput.value);
  if (Number.isFinite(fontScale) && fontScale > 0) patch.fontScale = fontScale;
  const appear = Number(els.appearInput.value);
  const effect = els.effectSelect.value;
  patch.animation = {};
  if (Number.isFinite(appear)) patch.animation.appear = appear;
  if (effect) patch.animation.effect = effect;
  writeSelectedLayout(patch);
  const node = findPreviewNode(state.selected.editorId);
  if (node) {
    if (patch.fontScale) node.style.fontSize = `${patch.fontScale}em`;
    if (patch.animation?.appear != null) node.dataset.appear = patch.animation.appear;
    if (patch.animation?.effect) node.dataset.effect = patch.animation.effect;
  }
  setStatus("Layout updated");
}

function writeSelectedLayout(patch, options = {}) {
  if (!state.selected) return;
  const json = parseLayoutEditor();
  if (!json) return;
  json.version = json.version || 1;
  json.slides = json.slides || {};
  const slide = json.slides[state.selected.slideId] ||= {};
  slide.fragments = slide.fragments || {};
  const entry = slide.fragments[state.selected.editorId] ||= {};
  deepMerge(entry, patch);
  els.layout.value = `${JSON.stringify(json, null, 2)}\n`;
  if (!options.skipHighlight) highlightLayoutFor(state.selected.editorId, state.selected.layoutPath);
}

function updateControlsFromLayout() {
  const entry = getSelectedLayoutEntry();
  els.fontScaleInput.value = entry?.fontScale || 1;
  els.appearInput.value = entry?.animation?.appear ?? 1;
  els.effectSelect.value = entry?.animation?.effect || "";
}

function getSelectedLayoutEntry() {
  if (!state.selected) return null;
  const json = parseLayoutEditor({ quiet: true });
  return json?.slides?.[state.selected.slideId]?.fragments?.[state.selected.editorId] || null;
}

function parseLayoutEditor(options = {}) {
  try {
    return JSON.parse(els.layout.value || "{}");
  } catch (error) {
    if (!options.quiet) setStatus(`Layout JSON error: ${error.message}`);
    return null;
  }
}

function validateLayoutSoon() {
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => {
    const json = parseLayoutEditor({ quiet: true });
    setStatus(json ? "Layout JSON ok" : "Layout JSON has errors");
  }, 250);
}

function highlightSourceFor(editorId) {
  const entry = state.sourceMap.fragments?.[editorId] || state.sourceMap.slides?.[editorId];
  if (!entry?.sourceStart) return;
  selectLines(els.source, entry.sourceStart, entry.sourceEnd || entry.sourceStart);
}

function highlightLayoutFor(editorId, layoutPath = "") {
  const text = els.layout.value;
  const index = text.indexOf(`"${editorId}"`);
  if (index >= 0) {
    selectRange(els.layout, index, index + editorId.length + 2);
    return;
  }
  if (layoutPath) {
    const last = layoutPath.split(".").pop();
    const fallback = text.indexOf(`"${last}"`);
    if (fallback >= 0) selectRange(els.layout, fallback, fallback + last.length + 2);
  }
}

function focusPreviewFromSourceCursor() {
  const line = getLineAtPosition(els.source.value, els.source.selectionStart);
  const entry = findSourceMapEntryForLine(line);
  if (entry) focusPreviewNode(entry.id);
}

function focusPreviewFromLayoutCursor() {
  const around = els.layout.value.slice(Math.max(0, els.layout.selectionStart - 80), els.layout.selectionStart + 80);
  const match = around.match(/"([^"]+)"/g)?.map((item) => item.slice(1, -1)).find((id) => findPreviewNode(id));
  if (match) focusPreviewNode(match);
}

function findSourceMapEntryForLine(line) {
  const all = [
    ...Object.values(state.sourceMap.fragments || {}),
    ...Object.values(state.sourceMap.slides || {}),
  ];
  return all.find((entry) => line >= entry.sourceStart && line <= (entry.sourceEnd || entry.sourceStart));
}

function focusPreviewNode(editorId) {
  const node = findPreviewNode(editorId);
  if (!node) return;
  const slide = node.closest(".slide");
  if (slide?.dataset.index) {
    els.preview.contentWindow.location.hash = `#slide-${Number(slide.dataset.index) + 1}`;
  }
  node.classList.add("sjtu-editor-flash");
  selectPreviewNode(node);
  setTimeout(() => node.classList.remove("sjtu-editor-flash"), 900);
}

function findPreviewNode(editorId) {
  const doc = els.preview.contentDocument;
  if (!doc) return null;
  return Array.from(doc.querySelectorAll("[data-editor-id]")).find((node) => node.dataset.editorId === editorId);
}

function inferSlideIdFor(editorId) {
  return state.sourceMap.fragments?.[editorId]?.slideId || "";
}

function setMode(mode) {
  state.mode = mode;
  els.workspace.classList.toggle("read-mode", mode === "read");
  els.workspace.classList.toggle("edit-mode", mode !== "read");
  wirePreview();
}

function insertSnippet(name) {
  const snippet = snippets[name];
  if (!snippet) return;
  const start = els.source.selectionStart;
  const end = els.source.selectionEnd;
  els.source.value = `${els.source.value.slice(0, start)}${snippet}${els.source.value.slice(end)}`;
  els.source.focus();
  els.source.setSelectionRange(start + snippet.length, start + snippet.length);
}

function selectLines(textarea, startLine, endLine) {
  const lines = textarea.value.split("\n");
  const start = lines.slice(0, Math.max(0, startLine - 1)).join("\n").length + (startLine > 1 ? 1 : 0);
  const end = lines.slice(0, Math.max(startLine, endLine)).join("\n").length;
  selectRange(textarea, start, end);
}

function selectRange(textarea, start, end) {
  textarea.focus({ preventScroll: true });
  textarea.setSelectionRange(start, end);
  const before = textarea.value.slice(0, start);
  const line = before.split("\n").length;
  textarea.scrollTop = Math.max(0, (line - 5) * 21);
}

function getLineAtPosition(text, position) {
  return text.slice(0, position).split("\n").length;
}

function deepMerge(target, source) {
  Object.entries(source || {}).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      target[key] = deepMerge(target[key] || {}, value);
    } else {
      target[key] = value;
    }
  });
  return target;
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || response.statusText);
  return data;
}

async function postForm(url, body) {
  const response = await fetch(url, {
    method: "POST",
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || response.statusText);
  return data;
}

function setStatus(message) {
  els.status.textContent = message;
}
