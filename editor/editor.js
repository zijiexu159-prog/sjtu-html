const state = {
  sourcePath: "",
  layoutPath: "",
  previewUrl: "/preview",
  sourceMap: { slides: {}, fragments: {} },
  selected: null,
  mode: "edit",
  saveTimer: null,
  language: localStorage.getItem("sjtuEditorLanguage") || "zh",
  theme: localStorage.getItem("sjtuEditorTheme") || (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  sidebarCollapsed: localStorage.getItem("sjtuEditorSidebarCollapsed") === "true",
  selectedFolder: localStorage.getItem("sjtuEditorSelectedFolder") || "",
  collapsedFolders: new Set(JSON.parse(localStorage.getItem("sjtuEditorCollapsedFolders") || "[]")),
  projectRoot: "",
  projects: [],
  localFonts: [],
  undoStack: [],
  isRestoring: false,
  inputUndoArmed: true,
  statusKey: "ready",
  statusVars: {},
};

const els = {
  appMain: document.querySelector("#app-main"),
  projectView: document.querySelector("#project-view"),
  projectList: document.querySelector("#project-list"),
  projectSearch: document.querySelector("#project-search"),
  projectViewButton: document.querySelector("#project-view-button"),
  projectBackButton: document.querySelector("#project-back-button"),
  projectCreateButton: document.querySelector("#project-create-button"),
  menuCreateProjectButton: document.querySelector("#menu-create-project-button"),
  appMenu: document.querySelector(".app-menu"),
  appMenuButton: document.querySelector("#app-menu-button"),
  appMenuPopover: document.querySelector("#app-menu-popover"),
  workspace: document.querySelector("#workspace"),
  sidebarToggle: document.querySelector("#sidebar-toggle"),
  fileList: document.querySelector("#file-list"),
  objectControls: document.querySelector("#object-controls"),
  source: document.querySelector("#source-editor"),
  layout: document.querySelector("#layout-editor"),
  previewStage: document.querySelector(".preview-stage"),
  previewScaleBox: document.querySelector("#preview-scale-box"),
  preview: document.querySelector("#preview-frame"),
  previewPrevButton: document.querySelector("#preview-prev-button"),
  previewNextButton: document.querySelector("#preview-next-button"),
  status: document.querySelector("#status"),
  selectionLabel: document.querySelector("#selection-label"),
  fileSelect: document.querySelector("#file-select"),
  openButton: document.querySelector("#open-button"),
  saveButton: document.querySelector("#save-button"),
  buildButton: document.querySelector("#build-button"),
  exportButton: document.querySelector("#export-button"),
  importInput: document.querySelector("#import-input"),
  newFileButton: document.querySelector("#new-file-button"),
  newFolderButton: document.querySelector("#new-folder-button"),
  modeSelect: document.querySelector("#mode-select"),
  modeButtons: Array.from(document.querySelectorAll("[data-mode-button]")),
  languageSelect: document.querySelector("#language-select"),
  languageButtons: Array.from(document.querySelectorAll("[data-language-button]")),
  themeSelect: document.querySelector("#theme-select"),
  themeButtons: Array.from(document.querySelectorAll("[data-theme-button]")),
  sourceLineNumbers: document.querySelector("#source-line-numbers"),
  layoutLineNumbers: document.querySelector("#layout-line-numbers"),
  sourceHighlight: document.querySelector("#source-highlight"),
  sourceLineCount: document.querySelector("#source-line-count"),
  layoutLineCount: document.querySelector("#layout-line-count"),
  appearInput: document.querySelector("#appear-input"),
  effectSelect: document.querySelector("#effect-select"),
  fontScaleInput: document.querySelector("#font-scale-input"),
  fontFamilySelect: document.querySelector("#font-family-select"),
  fontSizeInput: document.querySelector("#font-size-input"),
  scanFontsButton: document.querySelector("#scan-fonts-button"),
  applyStyleButton: document.querySelector("#apply-style-button"),
};

const PREVIEW_BASE_WIDTH = 1920;
const PREVIEW_BASE_HEIGHT = 1080;
const MAX_UNDO_STEPS = 80;
const BUSY_STATUSES = new Set(["loading", "opening", "openingProject", "saving", "building", "importing", "printing", "creating", "moving", "deleting"]);
const OK_STATUSES = new Set(["opened", "saved", "built", "imported", "created", "moved", "deleted", "layoutUpdated", "layoutJsonOk", "fontsLoaded", "undone"]);
const ERROR_STATUSES = new Set(["layoutJsonBad", "layoutJsonError", "requestFailed", "selectObjectFirst", "fontSizeInvalid", "fontScanUnsupported", "nothingToUndo", "defaultProjectProtected"]);
const MARKUP_EFFECTS = new Set(["fade", "fade-up", "rise", "slide-left", "slide-right", "zoom", "blur", "move-between"]);
const MARKUP_BLOCKS = new Set(["theorem", "example", "definition", "alert", "note", "proof", "formula"]);

const DEFAULT_FONT_FAMILIES = [
  { value: "SimHei", label: "黑体 / SimHei" },
  { value: "SimSun", label: "宋体 / SimSun" },
  { value: "NSimSun", label: "新宋体 / NSimSun" },
  { value: "KaiTi", label: "楷体 / KaiTi" },
  { value: "FangSong", label: "仿宋 / FangSong" },
  { value: "Microsoft YaHei", label: "微软雅黑 / Microsoft YaHei" },
  { value: "Microsoft YaHei Light", label: "微软雅黑 Light / Microsoft YaHei Light" },
  { value: "DengXian", label: "等线 / DengXian" },
  { value: "Source Han Serif SC", label: "思源宋体 / Source Han Serif SC" },
  { value: "Source Han Sans SC", label: "思源黑体 / Source Han Sans SC" },
  { value: "LXGW WenKai", label: "霞鹜文楷 / LXGW WenKai" },
  { value: "LXGW WenKai Mono", label: "霞鹜文楷等宽 / LXGW WenKai Mono" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Libertinus Serif", label: "Libertinus Serif" },
  { value: "serif", label: "serif" },
  { value: "sans-serif", label: "sans-serif" },
  { value: "monospace", label: "monospace" },
];

const FONT_LABEL_BY_VALUE = new Map(DEFAULT_FONT_FAMILIES.map((font) => [font.value, font.label]));

const snippets = {
  formula: "\n$$ {#eq:new}\nu_t + u u_x = \\\\nu u_{xx}\n$$\n",
  theorem: "\n::: theorem 定理标题{#thm:new}\n这里写定理内容。\n:::\n",
  figure: "\n![图片标题](../assets/figures/example.svg){#fig:new}\n",
  step: "\n### 内容块[fade-up]{#block-new}\n#### [1]\n第一步内容\n#### [2]\n第二步内容\n",
};

const messages = {
  zh: {
    documentTitle: "SJTU Slide 可视化编辑器",
    appTitle: "SJTU Slide 编辑器",
    appKicker: "源码、布局与实时预览",
    openMenu: "打开应用菜单",
    closeMenu: "关闭应用菜单",
    project: "项目",
    projectGroup: "项目",
    projectList: "项目列表",
    createProject: "新建项目",
    projectNamePrompt: "项目名称",
    backToEditor: "返回编辑器",
    allProjects: "所有项目",
    searchProjects: "在所有项目中搜索...",
    projectTitle: "标题",
    projectFiles: "文件",
    projectUpdated: "最近修改",
    projectAction: "操作",
    openProject: "打开",
    deleteProject: "删除",
    deleteProjectTitle: "删除项目 {project}",
    deleteProjectConfirm: "确定要删除项目“{project}”吗？项目文件夹内的文件会一起删除。",
    defaultProjectProtected: "默认项目不能删除",
    noProjects: "还没有项目。请先新建项目或上传文件/文件夹。",
    fileBrowser: "文件",
    collapseFiles: "收起文件栏",
    expandFiles: "展开文件栏",
    noFiles: "导入文件夹后，这里会列出所有 .sjtu.md 文件。",
    file: "文件",
    open: "打开",
    uploadFiles: "上传文件/文件夹",
    newFile: "新建文件",
    newFolder: "新建文件夹",
    rootFolder: "项目根目录",
    folderNamePrompt: "文件夹名称",
    fileNamePrompt: "文件名",
    buildGroup: "构建",
    saveBuild: "保存并构建",
    saveBuildTitle: "Ctrl+S 保存并构建",
    build: "仅构建",
    exportZip: "导出 ZIP",
    importFolder: "导入文件夹",
    view: "视图",
    mode: "模式",
    modeShortcutTitle: "Ctrl+H 切换编辑/阅读模式",
    editMode: "编辑",
    readMode: "阅读",
    language: "语言",
    theme: "主题",
    lightTheme: "浅色",
    darkTheme: "深色",
    object: "对象",
    step: "出现步数",
    effect: "动画效果",
    keep: "保持",
    font: "字号倍率",
    fontFamily: "字体",
    fontSize: "字号",
    scanFonts: "扫描字体",
    scanFontsTitle: "读取本机可用字体",
    apply: "应用",
    insert: "插入",
    insertFormula: "公式",
    insertTheorem: "定理",
    insertFigure: "图片",
    insertStep: "分步",
    sourcePanel: ".sjtu.md 源稿",
    sourceHint: "语义内容",
    layoutPanel: ".layout.json 布局",
    layoutHint: "视觉补丁",
    lineCount: "{count} 行",
    preview: "Slide Canvas",
    previewTitle: "SJTU slide 预览",
    prevSlide: "上一页",
    nextSlide: "下一页",
    noSelection: "未选择对象",
    noSelectionHint: "请在预览中选择对象",
    loading: "加载中...",
    ready: "就绪",
    opening: "正在打开...",
    opened: "已打开",
    saving: "正在保存...",
    saved: "已保存",
    building: "正在构建...",
    built: "已构建",
    printing: "正在打开打印...",
    importing: "正在导入...",
    imported: "已导入",
    creating: "正在创建...",
    created: "已创建",
    openingProject: "正在进入项目...",
    moving: "正在移动...",
    moved: "已移动",
    deleting: "正在删除...",
    deleted: "已删除",
    deleteFile: "删除文件",
    deleteFileTitle: "删除 {file}",
    deleteConfirm: "确定要删除“{file}”吗？会同时删除对应的 layout 和 HTML 输出。",
    selectObjectFirst: "请先选择对象",
    fontSizeInvalid: "字号格式无效",
    fontScanUnsupported: "当前浏览器不支持本机字体扫描",
    fontsLoaded: "已读取 {count} 个字体",
    undone: "已撤销上一步编辑",
    nothingToUndo: "没有可撤销的编辑",
    layoutUpdated: "布局已更新",
    layoutJsonOk: "Layout JSON 正常",
    layoutJsonBad: "Layout JSON 有错误",
    layoutJsonError: "Layout JSON 错误：{message}",
    requestFailed: "操作失败：{message}",
  },
  en: {
    documentTitle: "SJTU Slide Visual Editor",
    appTitle: "SJTU Slide Editor",
    appKicker: "Source, layout, and live preview",
    openMenu: "Open app menu",
    closeMenu: "Close app menu",
    project: "Project",
    projectGroup: "Project",
    projectList: "Project List",
    createProject: "New Project",
    projectNamePrompt: "Project name",
    backToEditor: "Back to Editor",
    allProjects: "All Projects",
    searchProjects: "Search all projects...",
    projectTitle: "Title",
    projectFiles: "Files",
    projectUpdated: "Last modified",
    projectAction: "Action",
    openProject: "Open",
    deleteProject: "Delete",
    deleteProjectTitle: "Delete project {project}",
    deleteProjectConfirm: "Delete project \"{project}\"? Files inside the project folder will be removed.",
    defaultProjectProtected: "The default project cannot be deleted",
    noProjects: "No projects yet. Create a project or upload files/folders first.",
    fileBrowser: "Files",
    collapseFiles: "Collapse file panel",
    expandFiles: "Expand file panel",
    noFiles: "Import a folder to list .sjtu.md files here.",
    file: "File",
    open: "Open",
    uploadFiles: "Upload Files/Folder",
    newFile: "New File",
    newFolder: "New Folder",
    rootFolder: "Project Root",
    folderNamePrompt: "Folder name",
    fileNamePrompt: "File name",
    buildGroup: "Build",
    saveBuild: "Save & Build",
    saveBuildTitle: "Ctrl+S Save & Build",
    build: "Build Only",
    exportZip: "Export ZIP",
    importFolder: "Import Folder",
    view: "View",
    mode: "Mode",
    modeShortcutTitle: "Ctrl+H toggles Edit/Read mode",
    editMode: "Edit",
    readMode: "Read",
    language: "Language",
    theme: "Theme",
    lightTheme: "Light",
    darkTheme: "Dark",
    object: "Object",
    step: "Appear Step",
    effect: "Animation",
    keep: "Keep",
    font: "Font Scale",
    fontFamily: "Font",
    fontSize: "Size",
    scanFonts: "Scan Fonts",
    scanFontsTitle: "Read local font families",
    apply: "Apply",
    insert: "Insert",
    insertFormula: "Formula",
    insertTheorem: "Theorem",
    insertFigure: "Figure",
    insertStep: "Step",
    sourcePanel: ".sjtu.md Source",
    sourceHint: "Semantic content",
    layoutPanel: ".layout.json Layout",
    layoutHint: "Visual patch",
    lineCount: "{count} lines",
    preview: "Slide Canvas",
    previewTitle: "SJTU slide preview",
    prevSlide: "Previous slide",
    nextSlide: "Next slide",
    noSelection: "No selection",
    noSelectionHint: "Select an object in the preview",
    loading: "Loading...",
    ready: "Ready",
    opening: "Opening...",
    opened: "Opened",
    saving: "Saving...",
    saved: "Saved",
    building: "Building...",
    built: "Built",
    printing: "Opening print...",
    importing: "Importing...",
    imported: "Imported",
    creating: "Creating...",
    created: "Created",
    openingProject: "Opening project...",
    moving: "Moving...",
    moved: "Moved",
    deleting: "Deleting...",
    deleted: "Deleted",
    deleteFile: "Delete file",
    deleteFileTitle: "Delete {file}",
    deleteConfirm: "Delete \"{file}\"? The matching layout and HTML output will also be deleted.",
    selectObjectFirst: "Select an object first",
    fontSizeInvalid: "Invalid font size",
    fontScanUnsupported: "Local font scanning is not supported in this browser",
    fontsLoaded: "Loaded {count} fonts",
    undone: "Undid last edit",
    nothingToUndo: "Nothing to undo",
    layoutUpdated: "Layout updated",
    layoutJsonOk: "Layout JSON ok",
    layoutJsonBad: "Layout JSON has errors",
    layoutJsonError: "Layout JSON error: {message}",
    requestFailed: "Failed: {message}",
  },
};

init();

async function init() {
  bindEvents();
  setFontFamilyOptions();
  applyTheme();
  applyLanguage();
  updateModeButtons();
  updateLanguageButtons();
  updateThemeButtons();
  updateSidebar();
  updateObjectControls();
  await runSafely(() => loadState());
}

function bindEvents() {
  els.appMenuButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    setAppMenuOpen(els.appMenuPopover?.hidden !== false);
  });
  els.projectViewButton?.addEventListener("click", () => showProjectView());
  els.projectBackButton?.addEventListener("click", () => showEditorView());
  els.projectCreateButton?.addEventListener("click", () => runSafely(() => createProject()));
  els.menuCreateProjectButton?.addEventListener("click", () => runSafely(() => createProject()));
  els.projectSearch?.addEventListener("input", renderProjectList);
  els.saveButton.addEventListener("click", () => runSafely(() => saveAndBuild()));
  els.buildButton.addEventListener("click", () => runSafely(() => buildOnly()));
  els.openButton.addEventListener("click", () => runSafely(() => openSelectedFile()));
  els.exportButton.addEventListener("click", () => exportProject());
  els.importInput.addEventListener("change", () => runSafely(() => importFolder()));
  els.newFileButton?.addEventListener("click", () => runSafely(() => createFile()));
  els.newFolderButton?.addEventListener("click", () => runSafely(() => createFolder()));
  els.sidebarToggle.addEventListener("click", toggleSidebar);
  els.modeSelect.addEventListener("change", () => setMode(els.modeSelect.value));
  els.modeButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.modeButton));
  });
  els.languageSelect.addEventListener("change", () => setLanguage(els.languageSelect.value));
  els.languageButtons.forEach((button) => {
    button.addEventListener("click", () => setLanguage(button.dataset.languageButton));
  });
  els.themeSelect?.addEventListener("change", () => setTheme(els.themeSelect.value));
  els.themeButtons.forEach((button) => {
    button.addEventListener("click", () => setTheme(button.dataset.themeButton));
  });
  els.applyStyleButton.addEventListener("click", applyStyleControls);
  [els.source, els.layout].forEach((textarea) => {
    textarea.addEventListener("beforeinput", handleEditorBeforeInput);
    textarea.addEventListener("input", handleEditorInput);
  });
  els.source.addEventListener("click", focusPreviewFromSourceCursor);
  els.source.addEventListener("keyup", handleSourceKeyup);
  els.layout.addEventListener("input", validateLayoutSoon);
  els.layout.addEventListener("click", focusPreviewFromLayoutCursor);
  bindCodeEditorChrome(els.source, els.sourceLineNumbers, els.sourceLineCount, els.sourceHighlight);
  bindCodeEditorChrome(els.layout, els.layoutLineNumbers, els.layoutLineCount);
  els.preview.addEventListener("load", wirePreview);
  els.previewPrevButton?.addEventListener("click", () => navigatePreview("previous"));
  els.previewNextButton?.addEventListener("click", () => navigatePreview("next"));
  els.scanFontsButton?.addEventListener("click", () => runSafely(scanLocalFonts));
  window.addEventListener("resize", () => {
    updatePreviewScale();
    syncAllEditorChrome();
  });
  if (window.ResizeObserver && els.previewStage) {
    new ResizeObserver(updatePreviewScale).observe(els.previewStage);
  }
  if (window.ResizeObserver) {
    const editorObserver = new ResizeObserver(syncAllEditorChrome);
    document.querySelectorAll(".code-editor-shell").forEach((node) => editorObserver.observe(node));
  }
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleEditorShortcuts);
  document.querySelectorAll("[data-snippet]").forEach((button) => {
    button.addEventListener("click", () => insertSnippet(button.dataset.snippet));
  });
}

function handleDocumentClick(event) {
  if (!els.appMenu?.contains(event.target)) setAppMenuOpen(false);
}

function showProjectView() {
  setAppMenuOpen(false);
  renderProjectList();
  document.body.classList.add("project-mode");
  els.projectView.hidden = false;
  els.appMain.hidden = true;
  els.projectSearch?.focus({ preventScroll: true });
}

function showEditorView() {
  document.body.classList.remove("project-mode");
  els.projectView.hidden = true;
  els.appMain.hidden = false;
  updatePreviewScale();
}

function renderProjectList() {
  if (!els.projectList) return;
  const query = normalizePath(els.projectSearch?.value || "").toLowerCase();
  const projects = (state.projects || []).filter((entry) => (
    !query || entry.name.toLowerCase().includes(query) || normalizePath(entry.root).toLowerCase().includes(query)
  ));
  els.projectList.innerHTML = "";
  const header = document.createElement("div");
  header.className = "project-list-header";
  header.innerHTML = `<span>${t("projectTitle")}</span><span>${t("projectFiles")}</span><span>${t("projectUpdated")}</span><span>${t("projectAction")}</span>`;
  els.projectList.appendChild(header);
  if (!projects.length) {
    const empty = document.createElement("div");
    empty.className = "project-empty";
    empty.textContent = t("noProjects");
    els.projectList.appendChild(empty);
    return;
  }
  projects.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "project-row";
    row.classList.toggle("is-active", normalizePath(entry.root) === state.projectRoot);
    row.innerHTML = `
      <span class="project-name"></span>
      <span class="project-meta">${entry.files}</span>
      <span class="project-meta">${formatProjectTime(entry.updatedAt)}</span>
      <span class="project-actions">
        <button class="project-action-button button tertiary" type="button" data-project-open>${t("openProject")}</button>
        <button class="project-action-button button tertiary" type="button" data-project-delete>${t("deleteProject")}</button>
      </span>
    `;
    row.querySelector(".project-name").textContent = entry.name;
    row.title = entry.root || entry.name;
    row.querySelector("[data-project-open]").addEventListener("click", () => runSafely(() => openProject(entry.root)));
    const deleteButton = row.querySelector("[data-project-delete]");
    deleteButton.title = t("deleteProjectTitle", { project: entry.name });
    deleteButton.disabled = !entry.root;
    deleteButton.addEventListener("click", () => runSafely(() => deleteProject(entry)));
    els.projectList.appendChild(row);
  });
}

async function openProject(projectRoot) {
  setStatus("openingProject");
  const data = await postJson("/api/project/open", { root: normalizePath(projectRoot || "") });
  applyState(data);
  state.selectedFolder = "";
  localStorage.setItem("sjtuEditorSelectedFolder", "");
  renderFileList();
  showEditorView();
  await refreshPreview();
  setStatus("opened");
}

async function createProject() {
  const input = window.prompt(t("projectNamePrompt"), "");
  if (input == null) return;
  const name = input.trim();
  if (!name) return;
  setStatus("creating");
  const data = await postJson("/api/project/create", { name });
  applyState(data);
  state.selectedFolder = "";
  localStorage.setItem("sjtuEditorSelectedFolder", "");
  renderFileList();
  showEditorView();
  await refreshPreview();
  setStatus("created");
}

async function deleteProject(entry) {
  if (!entry?.root) {
    setStatus("defaultProjectProtected");
    return;
  }
  if (!window.confirm(t("deleteProjectConfirm", { project: entry.name }))) return;
  setStatus("deleting");
  const data = await postJson("/api/project/delete", { root: entry.root });
  applyState(data);
  await refreshPreview();
  setStatus("deleted");
}

function formatProjectTime(value) {
  const time = Number(value);
  if (!time) return "-";
  const date = new Date(time);
  return date.toLocaleDateString(state.language === "zh" ? "zh-CN" : "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function handleEditorShortcuts(event) {
  if (event.key === "Escape" && els.appMenuPopover?.hidden === false) {
    event.preventDefault();
    setAppMenuOpen(false);
    els.appMenuButton?.focus();
    return;
  }
  if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === "n" && !isTextEditingTarget(event.target)) {
    event.preventDefault();
    togglePreviewNotes();
    return;
  }
  if (event.isComposing || !(event.ctrlKey || event.metaKey) || event.altKey) return;
  const key = event.key.toLowerCase();
  if (key === "z" && !event.shiftKey) {
    if (isTextEditingTarget(event.target)) return;
    event.preventDefault();
    undoLastEdit();
    return;
  }
  if (key === "s") {
    event.preventDefault();
    runSafely(() => saveAndBuild());
    return;
  }
  if (key === "p") {
    event.preventDefault();
    printPreview();
    return;
  }
  if (key === "h") {
    event.preventDefault();
    toggleMode();
  }
}

async function loadState() {
  setStatus("loading");
  const data = await getJson("/api/state");
  state.sourcePath = data.sourcePath;
  state.layoutPath = data.layoutPath;
  state.previewUrl = data.previewUrl || "/preview";
  state.projectRoot = normalizePath(data.projectRoot || "");
  state.projects = data.projects || [];
  state.files = data.files || [];
  state.folders = data.folders || [];
  els.source.value = data.source || "";
  els.layout.value = data.layoutText || "{\n  \"version\": 1,\n  \"slides\": {}\n}\n";
  syncAllEditorChrome();
  populateFileSelect();
  renderProjectList();
  await refreshPreview();
  setStatus("ready");
}

async function openSelectedFile(pathOverride = "") {
  const path = pathOverride || els.fileSelect.value;
  if (!path) return;
  setStatus("opening");
  const data = await postJson("/api/open", { path });
  applyState(data);
  await refreshPreview();
  setStatus("opened");
}

function applyState(data) {
  state.sourcePath = data.sourcePath;
  state.layoutPath = data.layoutPath;
  state.previewUrl = data.previewUrl || state.previewUrl;
  state.projectRoot = normalizePath(data.projectRoot || state.projectRoot || "");
  state.projects = data.projects || state.projects || [];
  state.files = data.files || [];
  state.folders = data.folders || [];
  state.selected = null;
  els.source.value = data.source || "";
  els.layout.value = data.layoutText || "{\n  \"version\": 1,\n  \"slides\": {}\n}\n";
  els.selectionLabel.textContent = t("noSelection");
  state.undoStack = [];
  syncAllEditorChrome();
  updateObjectControls();
  populateFileSelect();
  renderProjectList();
}

function bindCodeEditorChrome(textarea, gutter, countEl, highlightEl = null) {
  if (!textarea || !gutter) return;
  textarea.addEventListener("input", () => syncCodeEditorChrome(textarea, gutter, countEl, highlightEl));
  textarea.addEventListener("scroll", () => {
    syncCodeEditorScroll(textarea, gutter, highlightEl);
  });
  syncCodeEditorChrome(textarea, gutter, countEl, highlightEl);
}

function syncAllEditorChrome() {
  syncCodeEditorChrome(els.source, els.sourceLineNumbers, els.sourceLineCount, els.sourceHighlight);
  syncCodeEditorChrome(els.layout, els.layoutLineNumbers, els.layoutLineCount);
}

function syncCodeEditorChrome(textarea, gutter, countEl, highlightEl = null) {
  if (!textarea || !gutter) return;
  const lines = textarea.value.split("\n");
  const lineCount = Math.max(1, lines.length);
  let html = "";
  for (let line = 1; line <= lineCount; line += 1) html += `<span>${line}</span>`;
  gutter.innerHTML = html;
  syncCodeEditorMetrics(textarea);
  syncCodeStripes(textarea, lines);
  syncSourceHighlight(textarea, highlightEl);
  syncCodeLineHeights(textarea, gutter);
  syncCodeEditorScroll(textarea, gutter, highlightEl);
  if (countEl) countEl.textContent = t("lineCount", { count: lineCount });
}

function syncCodeStripes(textarea, lines = textarea.value.split("\n")) {
  const stripes = getCodeStripes(textarea);
  if (!stripes) return;
  stripes.innerHTML = lines.map((line) => `<span>${escapeEditorHtml(line) || " "}</span>`).join("");
}

function syncCodeEditorMetrics(textarea) {
  const shell = textarea.closest(".code-editor-shell");
  if (!shell) return;
  shell.style.setProperty("--code-scrollbar-width", `${Math.max(0, textarea.offsetWidth - textarea.clientWidth)}px`);
}

function syncCodeLineHeights(textarea, gutter) {
  const stripes = getCodeStripes(textarea);
  if (!stripes || !gutter) return;
  window.requestAnimationFrame(() => {
    const stripeRows = Array.from(stripes.children);
    Array.from(gutter.children).forEach((row, index) => {
      const height = stripeRows[index]?.offsetHeight || Number.parseFloat(getComputedStyle(textarea).lineHeight) || 21.7;
      row.style.height = `${height}px`;
      row.style.lineHeight = `${height}px`;
    });
  });
}

function syncCodeEditorScroll(textarea, gutter, highlightEl = null) {
  const stripes = getCodeStripes(textarea);
  if (gutter) gutter.scrollTop = textarea.scrollTop;
  if (stripes) {
    stripes.scrollTop = textarea.scrollTop;
    stripes.scrollLeft = textarea.scrollLeft;
  }
  syncCodeHighlightScroll(textarea, highlightEl);
}

function getCodeStripes(textarea) {
  return textarea.closest(".code-editor-shell")?.querySelector(".code-stripes") || null;
}

function syncSourceHighlight(textarea, highlightEl) {
  if (!textarea || !highlightEl) return;
  const syntaxState = { block: "", code: false, formula: false };
  highlightEl.innerHTML = textarea.value.split("\n").map((line) => renderSourceHighlightLine(line, syntaxState)).join("");
  syncCodeHighlightScroll(textarea, highlightEl);
}

function syncCodeHighlightScroll(textarea, highlightEl) {
  if (!textarea || !highlightEl) return;
  highlightEl.scrollTop = textarea.scrollTop;
  highlightEl.scrollLeft = textarea.scrollLeft;
}

function renderSourceHighlightLine(line, syntaxState = {}) {
  const className = getSourceHighlightClass(line, syntaxState);
  const text = renderSourceHighlightText(line, className) || " ";
  updateSourceHighlightState(line, syntaxState);
  return className ? `<span class="${className}">${text}</span>` : `<span>${text}</span>`;
}

function getSourceHighlightClass(line, syntaxState = {}) {
  if (syntaxState.code) return "syntax-block";
  if (syntaxState.formula) return "syntax-formula";
  if (syntaxState.block) return syntaxState.block;
  const blockStart = getMarkupBlockStart(line);
  if (blockStart) return blockStart === "formula" ? "syntax-formula" : "syntax-block";
  if (/^\s*```/.test(line)) return "syntax-block";
  if (/^\s*(\$\$|\\\[|\\\])/.test(line)) return "syntax-formula";
  if (/^\s{0,3}---(?:\s+|$)/.test(line)) return "syntax-section";
  if (/^\s{0,3}####(?:\s+|$)/.test(line)) return "syntax-heading-4";
  if (/^\s{0,3}###(?:\s+|$)/.test(line)) return "syntax-heading-3";
  if (/^\s{0,3}##\s+/.test(line)) return "syntax-heading-2";
  if (/^\s{0,3}#\s+/.test(line)) return "syntax-heading-1";
  if (/^\s*%\s*\w[\w-]*\s*:/.test(line)) return "syntax-directive";
  if (/^\s*%/.test(line)) return "syntax-comment";
  if (/^\s*>\s*notes?:/i.test(line)) return "syntax-directive";
  if (/^\s*\[\^[^\]]+\]:/.test(line)) return "syntax-directive";
  if (/^\s*!\[[^\]]*\]\([^)]+\)/.test(line)) return "syntax-directive";
  if (/^\s*#\w[\w-]*\s*(?:\(|\[|$)/.test(line)) return "syntax-command";
  return "";
}

function updateSourceHighlightState(line, syntaxState) {
  const trimmed = line.trim();
  if (syntaxState.code) {
    if (/^```/.test(trimmed)) syntaxState.code = false;
    return;
  }
  if (syntaxState.formula) {
    if (trimmed === "$$" || trimmed === "\\]") syntaxState.formula = false;
    return;
  }
  if (syntaxState.block) {
    if (/^:{3,}$/.test(trimmed)) syntaxState.block = "";
    return;
  }
  const blockStart = getMarkupBlockStart(line);
  if (blockStart) {
    syntaxState.block = blockStart === "formula" ? "syntax-formula" : "syntax-block";
  } else if (/^\s*```/.test(line)) {
    syntaxState.code = true;
  } else if (/^\s*(\$\$|\\\[)/.test(line)) {
    syntaxState.formula = true;
  }
}

function getMarkupBlockStart(line) {
  const match = line.match(/^\s*:{3,}\s*([a-z-]+)\b/i);
  const kind = match?.[1]?.toLowerCase();
  return MARKUP_BLOCKS.has(kind) ? kind : "";
}

function renderSourceHighlightText(line, className) {
  const ranges = [];
  line.replace(/\[[^\]\n]+\]/g, (match, offset) => {
    const value = match.slice(1, -1).trim();
    const tokenClass = isAnimationOption(value) ? "syntax-animation" : "syntax-option";
    ranges.push({ start: offset, end: offset + match.length, className: tokenClass });
    return match;
  });
  line.replace(/\{#[^}\n]+\}/g, (match, offset) => {
    ranges.push({ start: offset, end: offset + match.length, className: "syntax-id" });
    return match;
  });
  if (!ranges.length) return escapeEditorHtml(line);
  ranges.sort((a, b) => a.start - b.start);
  let cursor = 0;
  let html = "";
  for (const range of ranges) {
    if (range.start < cursor) continue;
    html += escapeEditorHtml(line.slice(cursor, range.start));
    html += `<span class="${range.className}">${escapeEditorHtml(line.slice(range.start, range.end))}</span>`;
    cursor = range.end;
  }
  html += escapeEditorHtml(line.slice(cursor));
  return html;
}

function isAnimationOption(value) {
  if (MARKUP_EFFECTS.has(value)) return true;
  if (/^transition\s*=/.test(value)) return true;
  return false;
}

function escapeEditorHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function snapshotEditors() {
  return {
    source: els.source.value,
    layout: els.layout.value,
    selected: state.selected ? { ...state.selected } : null,
  };
}

function snapshotSignature(snapshot) {
  return `${snapshot.source}\u0000${snapshot.layout}\u0000${JSON.stringify(snapshot.selected || null)}`;
}

function handleEditorBeforeInput(event) {
  if (state.isRestoring || event.isComposing) return;
  if (state.inputUndoArmed) {
    pushUndoSnapshot();
    state.inputUndoArmed = false;
  }
}

function handleEditorInput() {
  state.inputUndoArmed = true;
}

function pushUndoSnapshot() {
  if (state.isRestoring) return;
  const snapshot = snapshotEditors();
  snapshot.signature = snapshotSignature(snapshot);
  if (state.undoStack.at(-1)?.signature === snapshot.signature) return;
  state.undoStack.push(snapshot);
  if (state.undoStack.length > MAX_UNDO_STEPS) state.undoStack.shift();
}

function undoLastEdit() {
  const snapshot = state.undoStack.pop();
  if (!snapshot) {
    setStatus("nothingToUndo");
    return;
  }
  state.isRestoring = true;
  try {
    els.source.value = snapshot.source;
    els.layout.value = snapshot.layout;
    state.selected = snapshot.selected ? { ...snapshot.selected } : null;
    syncAllEditorChrome();
    restoreSelectedPreviewNode();
    validateLayoutSoon();
    setStatus("undone");
  } finally {
    state.isRestoring = false;
  }
}

function restoreSelectedPreviewNode() {
  if (!state.selected) {
    els.selectionLabel.textContent = t("noSelection");
    els.selectionLabel.title = t("noSelectionHint");
    updateObjectControls();
    return;
  }
  applySelectedLayoutToPreview();
  const node = findPreviewNode(state.selected.editorId, state.selected.targetKind);
  if (node) selectPreviewNode(node);
  syncAllEditorChrome();
}

function applySelectedLayoutToPreview() {
  if (!state.selected) return;
  const node = findPreviewNode(state.selected.editorId, state.selected.targetKind);
  if (!node) return;
  const entry = getSelectedLayoutEntry() || {};
  node.style.position = "";
  node.style.left = "";
  node.style.top = "";
  node.style.width = "";
  node.style.minHeight = "";
  node.style.fontSize = "";
  node.style.fontFamily = "";
  if (entry.rect) applyRectToNode(node, entry.rect);
  else if (entry.offset) applyOffsetToNode(node, entry.offset);
  if (entry.fontScale) node.style.fontSize = `${entry.fontScale}em`;
  if (entry.fontFamily) node.style.fontFamily = entry.fontFamily;
  if (entry.fontSize) node.style.fontSize = entry.fontSize;
}

function populateFileSelect() {
  els.fileSelect.innerHTML = "";
  for (const file of getProjectFileEntries().map((entry) => entry.fullPath)) {
    const option = document.createElement("option");
    option.value = file;
    option.textContent = file;
    option.selected = file === state.sourcePath;
    els.fileSelect.appendChild(option);
  }
  renderFileList();
}

function renderFileList() {
  if (!els.fileList) return;
  const files = getProjectFileEntries();
  const folders = getProjectFolderEntries();
  els.fileList.innerHTML = "";
  if (!files.length && !folders.length) {
    const empty = document.createElement("div");
    empty.className = "file-empty";
    empty.textContent = t("noFiles");
    els.fileList.appendChild(empty);
    return;
  }
  const tree = buildProjectTree(files, folders);
  const rootChildren = document.createElement("div");
  rootChildren.className = "tree-root";
  rootChildren.addEventListener("dragover", (event) => {
    if (event.target !== rootChildren) return;
    event.preventDefault();
    rootChildren.classList.add("is-drop-target");
  });
  rootChildren.addEventListener("dragleave", () => rootChildren.classList.remove("is-drop-target"));
  rootChildren.addEventListener("drop", (event) => {
    if (event.target !== rootChildren) return;
    event.preventDefault();
    rootChildren.classList.remove("is-drop-target");
    const file = event.dataTransfer.getData("text/sjtu-file");
    if (file) runSafely(() => moveFile(file, ""));
  });
  tree.folders.forEach((child) => rootChildren.appendChild(renderFolderNode(child, 0)));
  tree.files.forEach((file) => rootChildren.appendChild(renderFileRow(file)));
  els.fileList.appendChild(rootChildren);
}

function renderFolderNode(folder, depth) {
  const collapsed = isFolderCollapsed(folder.path);
  const container = document.createElement("section");
  container.className = "folder-node";
  container.dataset.folderPath = folder.path;

  const row = document.createElement("button");
  row.className = "folder-row";
  row.type = "button";
  row.title = folder.path;
  row.classList.toggle("is-selected", folder.path === state.selectedFolder);
  row.classList.toggle("is-collapsed", collapsed);
  row.innerHTML = `<span class="folder-icon" aria-hidden="true">▸</span><span class="folder-name"></span>`;
  row.querySelector(".folder-name").textContent = folder.name;
  row.addEventListener("click", () => {
    setSelectedFolder(folder.path, { render: false });
    toggleFolderCollapsed(folder.path);
  });
  row.addEventListener("dragover", (event) => {
    event.preventDefault();
    row.classList.add("is-drop-target");
  });
  row.addEventListener("dragleave", () => row.classList.remove("is-drop-target"));
  row.addEventListener("drop", (event) => {
    event.preventDefault();
    row.classList.remove("is-drop-target");
    const file = event.dataTransfer.getData("text/sjtu-file");
    if (file) runSafely(() => moveFile(file, folder.path));
  });
  container.appendChild(row);

  const children = document.createElement("div");
  children.className = "tree-children";
  if (!collapsed) {
    folder.folders.forEach((child) => children.appendChild(renderFolderNode(child, depth + 1)));
    folder.files.forEach((file) => children.appendChild(renderFileRow(file)));
    if (children.childElementCount) container.appendChild(children);
  }
  return container;
}

function renderFileRow(file) {
    const active = file.fullPath === state.sourcePath;
    const row = document.createElement("div");
    row.className = "file-row";
    row.classList.toggle("is-active", active);
    row.draggable = true;
    row.addEventListener("dragstart", (event) => {
      row.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/sjtu-file", file.fullPath);
      event.dataTransfer.setData("text/plain", file.fullPath);
    });
    row.addEventListener("dragend", () => row.classList.remove("is-dragging"));

    const button = document.createElement("button");
    button.className = "file-item";
    button.type = "button";
    button.classList.toggle("is-active", active);
    button.title = file.fullPath;
    const name = document.createElement("span");
    name.className = "file-item-name";
    name.textContent = formatFileName(file.localPath);
    const location = document.createElement("span");
    location.className = "file-item-path";
    location.textContent = formatFileLocation(file.localPath);
    button.append(name, location);
    button.addEventListener("click", () => runSafely(() => openSelectedFile(file.fullPath)));

    const deleteButton = document.createElement("button");
    deleteButton.className = "file-delete";
    deleteButton.type = "button";
    deleteButton.textContent = "×";
    deleteButton.title = t("deleteFileTitle", { file: formatFileName(file.localPath) });
    deleteButton.setAttribute("aria-label", t("deleteFileTitle", { file: file.fullPath }));
    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      runSafely(() => deleteFile(file.fullPath));
    });

    row.append(button, deleteButton);
    return row;
}

function buildProjectTree(files, folders) {
  const root = createFolderNode("", "");
  const folderMap = new Map([["", root]]);
  const ensureFolder = (folderPath) => {
    const normalized = normalizePath(folderPath).replace(/\/+$/, "");
    if (folderMap.has(normalized)) return folderMap.get(normalized);
    const parentPath = normalized.split("/").slice(0, -1).join("/");
    const parent = ensureFolder(parentPath);
    const node = createFolderNode(normalized, normalized.split("/").pop() || t("rootFolder"));
    parent.folders.push(node);
    folderMap.set(normalized, node);
    return node;
  };

  folders.forEach((folder) => ensureFolder(folder.localPath));
  files.forEach((file) => {
    const parts = normalizePath(file.localPath).split("/");
    parts.pop();
    ensureFolder(parts.join("/")).files.push(file);
  });

  folderMap.forEach((folder) => {
    folder.folders.sort((a, b) => a.name.localeCompare(b.name));
    folder.files.sort((a, b) => formatFileName(a.localPath).localeCompare(formatFileName(b.localPath)));
  });
  return root;
}

function createFolderNode(pathValue, name) {
  return { path: pathValue, name, folders: [], files: [] };
}

function getProjectFileEntries() {
  return (state.files || [])
    .filter((file) => isInsideCurrentProject(file))
    .map((file) => ({
      fullPath: normalizePath(file),
      localPath: stripProjectRoot(file),
    }));
}

function getProjectFolderEntries() {
  return (state.folders || [])
    .filter((folder) => isInsideCurrentProject(folder))
    .map((folder) => ({
      fullPath: normalizePath(folder),
      localPath: stripProjectRoot(folder),
    }))
    .filter((folder) => folder.localPath);
}

function isInsideCurrentProject(value) {
  const pathValue = normalizePath(value);
  if (!state.projectRoot) {
    const projectRoots = knownProjectRoots();
    return !projectRoots.some((root) => (
      pathValue === root ||
      pathValue.startsWith(`${root}/`) ||
      root.startsWith(`${pathValue}/`)
    ));
  }
  return pathValue === state.projectRoot || pathValue.startsWith(`${state.projectRoot}/`);
}

function knownProjectRoots() {
  return (state.projects || [])
    .map((entry) => normalizePath(entry.root))
    .filter(Boolean);
}

function stripProjectRoot(value) {
  const pathValue = normalizePath(value);
  if (!state.projectRoot) return pathValue;
  return pathValue === state.projectRoot ? "" : pathValue.replace(`${state.projectRoot}/`, "");
}

function withProjectRoot(value) {
  const cleaned = normalizeProjectInput(value);
  if (!state.projectRoot) return cleaned;
  return cleaned ? `${state.projectRoot}/${cleaned}` : state.projectRoot;
}

function folderKey(folderPath) {
  return `${state.projectRoot || "."}:${normalizeProjectInput(folderPath)}`;
}

function isFolderCollapsed(folderPath) {
  return state.collapsedFolders.has(folderKey(folderPath));
}

function toggleFolderCollapsed(folderPath) {
  const key = folderKey(folderPath);
  if (state.collapsedFolders.has(key)) state.collapsedFolders.delete(key);
  else state.collapsedFolders.add(key);
  localStorage.setItem("sjtuEditorCollapsedFolders", JSON.stringify(Array.from(state.collapsedFolders)));
  renderFileList();
}

function formatFileName(file) {
  const name = normalizePath(file).split("/").pop() || file;
  return name.replace(/\.sjtu\.md$/i, "");
}

function formatFileLocation(file) {
  const parts = normalizePath(file).split("/");
  parts.pop();
  let directory = parts.join("/");
  directory = directory.replace(/^imports\/project-\d+\/?/, "");
  if (!directory) return "";
  const compactParts = directory.split("/");
  if (compactParts.length <= 2) return directory;
  return `${compactParts[0]}/.../${compactParts[compactParts.length - 1]}`;
}

function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/");
}

function setSelectedFolder(folderPath, options = {}) {
  state.selectedFolder = normalizeProjectInput(folderPath);
  localStorage.setItem("sjtuEditorSelectedFolder", state.selectedFolder);
  if (options.render !== false) renderFileList();
}

async function createFolder() {
  const input = window.prompt(t("folderNamePrompt"), "");
  if (input == null) return;
  const folderPath = resolveProjectInput(input);
  if (!folderPath) return;
  setStatus("creating");
  const data = await postJson("/api/folder", { path: withProjectRoot(folderPath) });
  state.selectedFolder = folderPath;
  localStorage.setItem("sjtuEditorSelectedFolder", state.selectedFolder);
  applyState(data);
  setStatus("created");
}

async function createFile() {
  const input = window.prompt(t("fileNamePrompt"), "");
  if (input == null) return;
  const filePath = resolveProjectInput(input);
  if (!filePath) return;
  setStatus("creating");
  const data = await postJson("/api/create", { path: withProjectRoot(filePath) });
  state.selectedFolder = getFileDirectory(stripProjectRoot(data.sourcePath));
  localStorage.setItem("sjtuEditorSelectedFolder", state.selectedFolder);
  applyState(data);
  await refreshPreview();
  setStatus("created");
}

async function moveFile(file, targetFolder) {
  const currentFolder = getFileDirectory(stripProjectRoot(file));
  const nextFolder = normalizeProjectInput(targetFolder);
  if (currentFolder === nextFolder) return;
  setStatus("moving");
  const data = await postJson("/api/move", { path: file, targetDir: withProjectRoot(nextFolder) });
  state.selectedFolder = nextFolder;
  localStorage.setItem("sjtuEditorSelectedFolder", state.selectedFolder);
  applyState(data);
  await refreshPreview();
  setStatus("moved");
}

function resolveProjectInput(input) {
  const cleaned = normalizeProjectInput(input);
  if (!cleaned) return "";
  if (!state.selectedFolder || cleaned.includes("/")) return cleaned;
  return `${state.selectedFolder}/${cleaned}`;
}

function normalizeProjectInput(value) {
  return normalizePath(value)
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
}

function getFileDirectory(file) {
  const parts = normalizePath(file).split("/");
  parts.pop();
  return parts.join("/");
}

function toggleSidebar() {
  state.sidebarCollapsed = !state.sidebarCollapsed;
  localStorage.setItem("sjtuEditorSidebarCollapsed", String(state.sidebarCollapsed));
  updateSidebar();
}

function updateSidebar() {
  els.appMain?.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
  window.requestAnimationFrame(syncAllEditorChrome);
  if (!els.sidebarToggle) return;
  els.sidebarToggle.setAttribute("aria-expanded", String(!state.sidebarCollapsed));
  els.sidebarToggle.setAttribute("aria-label", t(state.sidebarCollapsed ? "expandFiles" : "collapseFiles"));
  els.sidebarToggle.title = t(state.sidebarCollapsed ? "expandFiles" : "collapseFiles");
}

function setAppMenuOpen(open) {
  if (!els.appMenuButton || !els.appMenuPopover) return;
  els.appMenuPopover.hidden = !open;
  els.appMenuButton.setAttribute("aria-expanded", String(open));
  els.appMenuButton.title = t(open ? "closeMenu" : "openMenu");
}

async function saveAndBuild() {
  const parsed = parseLayoutEditor();
  if (!parsed) return;
  setStatus("saving");
  const data = await postJson("/api/save", {
    source: els.source.value,
    layoutText: els.layout.value,
  });
  applyState(data);
  await refreshPreview();
  setStatus("saved");
}

async function buildOnly() {
  setStatus("building");
  const data = await postJson("/api/build", {});
  applyState(data);
  await refreshPreview();
  setStatus("built");
}

function exportProject() {
  window.location.href = "/api/export";
}

function printPreview() {
  const win = els.preview.contentWindow;
  if (!win) return;
  setStatus("printing");
  win.focus();
  if (typeof win.printSlides === "function") win.printSlides();
  else win.print();
  window.setTimeout(() => {
    if (state.statusKey === "printing") setStatus("ready");
  }, 800);
}

async function importFolder() {
  const files = Array.from(els.importInput.files || []);
  if (!files.length) return;
  setStatus("importing");
  const form = new FormData();
  files.forEach((file) => {
    form.append("files", file, file.webkitRelativePath || file.name);
  });
  const data = await postForm("/api/import", form);
  applyState(data);
  await refreshPreview();
  els.importInput.value = "";
  setStatus("imported");
}

async function deleteFile(file) {
  if (!file) return;
  const label = formatFileName(file);
  if (!window.confirm(t("deleteConfirm", { file: label }))) return;
  setStatus("deleting");
  const data = await postJson("/api/delete", { path: file });
  applyState(data);
  await refreshPreview();
  setStatus("deleted");
}

async function refreshPreview() {
  return new Promise((resolve) => {
    const url = `${state.previewUrl}${state.previewUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
    els.preview.addEventListener("load", () => {
      updatePreviewScale();
      resolve();
    }, { once: true });
    updatePreviewScale();
    els.preview.src = url;
  });
}

function wirePreview() {
  updatePreviewScale();
  const doc = els.preview.contentDocument;
  const win = els.preview.contentWindow;
  if (!doc || !win) return;
  state.sourceMap = win.sjtuSourceMap || { slides: {}, fragments: {} };
  injectPreviewEditorStyle(doc);
  doc.body?.classList.toggle("sjtu-editor-read-mode", state.mode === "read");
  doc.body?.classList.toggle("sjtu-editor-edit-mode", state.mode !== "read");
  if (!doc._sjtuEditorWired) {
    doc.addEventListener("keydown", handleEditorShortcuts, true);
    doc.addEventListener("click", handlePreviewClick, true);
    doc.addEventListener("pointerdown", handlePreviewPointerDown, true);
    doc._sjtuEditorWired = true;
  }
  if (state.selected?.editorId) {
    const node = findPreviewNode(state.selected.editorId, state.selected.targetKind);
    if (node) selectPreviewNode(node, { skipScroll: true });
  }
}

function navigatePreview(action) {
  const win = els.preview.contentWindow;
  const api = win?.sjtuDeckApi;
  if (api?.[action]) {
    api[action]();
    return;
  }
  const fallback = action === "next" ? "#next-slide" : "#prev-slide";
  const button = els.preview.contentDocument?.querySelector(fallback);
  if (button) {
    button.click();
    return;
  }
  const targetOrigin = window.location.origin === "null" ? "*" : window.location.origin;
  win?.postMessage({ type: "sjtu-deck:navigate", action }, targetOrigin);
}

function togglePreviewNotes() {
  const win = els.preview.contentWindow;
  const api = win?.sjtuDeckApi;
  if (api?.toggleNotes) {
    api.toggleNotes();
    return;
  }
  const targetOrigin = window.location.origin === "null" ? "*" : window.location.origin;
  win?.postMessage({ type: "sjtu-deck:navigate", action: "toggleNotes" }, targetOrigin);
}

function isTextEditingTarget(target) {
  return Boolean(target?.closest?.("textarea, input, select, [contenteditable='true']"));
}

function updatePreviewScale() {
  if (!els.previewStage || !els.previewScaleBox || !els.preview) return;
  const rect = els.previewStage.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const scale = Math.min(rect.width / PREVIEW_BASE_WIDTH, rect.height / PREVIEW_BASE_HEIGHT);
  const width = PREVIEW_BASE_WIDTH * scale;
  const height = PREVIEW_BASE_HEIGHT * scale;
  Object.assign(els.previewScaleBox.style, {
    width: `${width}px`,
    height: `${height}px`,
  });
  Object.assign(els.preview.style, {
    width: `${PREVIEW_BASE_WIDTH}px`,
    height: `${PREVIEW_BASE_HEIGHT}px`,
    transform: `scale(${scale})`,
  });
}

function handlePreviewClick(event) {
  const target = getSelectablePreviewTarget(event);
  if (!target) return;
  event.preventDefault();
  event.stopPropagation();
  selectPreviewNode(target);
}

function handlePreviewPointerDown(event) {
  if (state.mode !== "edit") return;
  if (event.target.closest?.(".sjtu-editor-resize")) return;
  const target = getSelectablePreviewTarget(event);
  if (target?.classList.contains("fragment")) startDrag(event, target);
}

function getSelectablePreviewTarget(event) {
  const target = event.target;
  if (!target?.closest) return null;
  if (target.closest(".deck-controls, button, input, select, textarea, a[href], .figure-card")) return null;
  const selected = target.closest(".fragment[data-editor-id]") || target.closest("[data-editor-id]");
  if (selected?.closest(".deck-controls")) return null;
  return selected;
}

function injectPreviewEditorStyle(doc) {
  if (doc.querySelector("#sjtu-editor-style")) return;
  const style = doc.createElement("style");
  style.id = "sjtu-editor-style";
  style.textContent = `
    :root {
      --sjtu-editor-outline: rgba(181, 18, 27, 0.62);
      --sjtu-editor-outline-read: rgba(181, 18, 27, 0.45);
      --sjtu-editor-glow: rgba(181, 18, 27, 0.08);
      --sjtu-editor-glow-read: rgba(181, 18, 27, 0.06);
      --sjtu-editor-handle-border: #fff;
      --sjtu-editor-handle-bg: #b5121b;
      --sjtu-editor-handle-shadow: 0 1px 4px rgba(0, 0, 0, 0.22);
      --sjtu-editor-flash-glow: 0 0 0 8px rgba(181, 18, 27, 0.16);
    }
    [data-editor-id].sjtu-editor-selected {
      outline: 2px solid var(--sjtu-editor-outline) !important;
      outline-offset: 2px;
      box-shadow: 0 0 0 4px var(--sjtu-editor-glow) !important;
    }
    body.sjtu-editor-read-mode [data-editor-id].sjtu-editor-selected {
      outline: 2px solid var(--sjtu-editor-outline-read) !important;
      outline-offset: 2px;
      box-shadow: 0 0 0 3px var(--sjtu-editor-glow-read) !important;
    }
    body.sjtu-editor-read-mode .deck-controls,
    body.sjtu-editor-edit-mode .deck-controls {
      opacity: 1 !important;
    }
    .sjtu-editor-resize {
      position: absolute;
      right: -7px;
      bottom: -7px;
      width: 14px;
      height: 14px;
      border-radius: 999px;
      border: 2px solid var(--sjtu-editor-handle-border);
      background: var(--sjtu-editor-handle-bg);
      box-shadow: var(--sjtu-editor-handle-shadow);
      cursor: nwse-resize;
      z-index: 40;
    }
    .sjtu-editor-flash {
      animation: sjtuEditorFlash .9s ease;
    }
    @keyframes sjtuEditorFlash {
      0%, 100% { box-shadow: none; }
      40% { box-shadow: var(--sjtu-editor-flash-glow); }
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
  const targetKind = node.classList.contains("slide") ? "slide" : "fragment";
  const layoutPath = node.dataset.layoutPath || (targetKind === "slide" ? `slides.${slideId}` : `slides.${slideId}.fragments.${editorId}`);
  state.selected = { editorId, slideId, layoutPath, targetKind };
  els.selectionLabel.textContent = `${slideId || "slide"} / ${editorId}`;
  updateObjectControls();
  updateControlsFromLayout();
  if (!options.skipSourceHighlight) highlightSourceFor(editorId);
  highlightLayoutFor(editorId, layoutPath);
  if (state.mode === "edit" && node.classList.contains("fragment")) addResizeHandle(node);
  if (options.scroll) node.scrollIntoView({ block: "center", inline: "nearest" });
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
  pushUndoSnapshot();
  node.setPointerCapture?.(event.pointerId);
  const gridRect = grid.getBoundingClientRect();
  const rect = node.getBoundingClientRect();
  const layoutEntry = getSelectedLayoutEntry();
  const hasRectPatch = Boolean(layoutEntry?.rect);
  const start = {
    pointerX: event.clientX,
    pointerY: event.clientY,
    x: (rect.left - gridRect.left) / gridRect.width,
    y: (rect.top - gridRect.top) / gridRect.height,
    w: rect.width / gridRect.width,
    h: rect.height / gridRect.height,
    offsetX: Number(layoutEntry?.offset?.x) || 0,
    offsetY: Number(layoutEntry?.offset?.y) || 0,
  };
  const move = (moveEvent) => {
    const dx = (moveEvent.clientX - start.pointerX) / gridRect.width;
    const dy = (moveEvent.clientY - start.pointerY) / gridRect.height;
    if (!hasRectPatch) {
      const offsetPatch = snapOffset({
        x: start.offsetX + dx,
        y: start.offsetY + dy,
      }, moveEvent);
      applyOffsetToNode(node, offsetPatch);
      writeSelectedLayout({ offset: offsetPatch }, { skipHighlight: true, skipUndo: true });
      return;
    }
    const rectPatch = snapRect({
      x: start.x + dx,
      y: start.y + dy,
      w: start.w,
      h: start.h,
    }, moveEvent);
    applyRectToNode(node, rectPatch);
    writeSelectedLayout({ rect: rectPatch }, { skipHighlight: true, skipUndo: true });
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

function snapOffset(offset, event) {
  return {
    x: snapForEvent(Math.max(-1.5, Math.min(1.5, offset.x)), event),
    y: snapForEvent(Math.max(-1.5, Math.min(1.5, offset.y)), event),
  };
}

function startResize(event, node) {
  const grid = node.closest(".content-grid");
  if (!grid) return;
  event.preventDefault();
  event.stopPropagation();
  pushUndoSnapshot();
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
    writeSelectedLayout({ rect: rectPatch }, { skipHighlight: true, skipUndo: true });
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
  return {
    x: snapForEvent(rect.x, event),
    y: snapForEvent(rect.y, event),
    w: snapForEvent(rect.w, event),
    h: snapForEvent(rect.h, event),
  };
}

function snapForEvent(value, event) {
  const grid = event.altKey ? 0 : event.shiftKey ? 0.025 : 0.01;
  const snapped = grid ? Math.round(value / grid) * grid : value;
  return Number(snapped.toFixed(4));
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

function applyOffsetToNode(node, offset) {
  Object.assign(node.style, {
    position: "relative",
    left: `${offset.x * 100}%`,
    top: `${offset.y * 100}%`,
  });
}

function applyStyleControls() {
  if (!state.selected) {
    setStatus("selectObjectFirst");
    return;
  }
  const patch = {};
  const fontScale = Number(els.fontScaleInput.value);
  if (Number.isFinite(fontScale) && fontScale > 0) patch.fontScale = fontScale;
  const fontFamily = els.fontFamilySelect?.value.trim();
  if (fontFamily) patch.fontFamily = fontFamily;
  const rawFontSize = els.fontSizeInput?.value.trim();
  const fontSize = normalizeFontSizeInput(rawFontSize);
  if (rawFontSize && !fontSize) {
    setStatus("fontSizeInvalid");
    return;
  }
  if (fontSize) patch.fontSize = fontSize;
  const appear = Number(els.appearInput.value);
  const effect = els.effectSelect.value;
  patch.animation = {};
  if (Number.isFinite(appear)) patch.animation.appear = appear;
  if (effect) patch.animation.effect = effect;
  writeSelectedLayout(patch);
  const node = findPreviewNode(state.selected.editorId);
  if (node) {
    if (patch.fontScale) node.style.fontSize = `${patch.fontScale}em`;
    if (patch.fontFamily) node.style.fontFamily = patch.fontFamily;
    if (patch.fontSize) node.style.fontSize = patch.fontSize;
    if (patch.animation?.appear != null) node.dataset.appear = patch.animation.appear;
    if (patch.animation?.effect) node.dataset.effect = patch.animation.effect;
  }
  setStatus("layoutUpdated");
}

function writeSelectedLayout(patch, options = {}) {
  if (!state.selected) return;
  const json = parseLayoutEditor();
  if (!json) return;
  if (!options.skipUndo) pushUndoSnapshot();
  json.version = json.version || 1;
  json.slides = json.slides || {};
  const slide = json.slides[state.selected.slideId] ||= {};
  if (state.selected.targetKind === "slide") {
    deepMerge(slide, patch);
    els.layout.value = `${JSON.stringify(json, null, 2)}\n`;
    syncAllEditorChrome();
    if (!options.skipHighlight) highlightLayoutFor(state.selected.editorId, state.selected.layoutPath);
    return;
  }
  slide.fragments = slide.fragments || {};
  const entry = slide.fragments[state.selected.editorId] ||= {};
  deepMerge(entry, patch);
  els.layout.value = `${JSON.stringify(json, null, 2)}\n`;
  syncAllEditorChrome();
  if (!options.skipHighlight) highlightLayoutFor(state.selected.editorId, state.selected.layoutPath);
}

function updateObjectControls() {
  const hasSelection = Boolean(state.selected);
  els.objectControls?.classList.toggle("is-empty", !hasSelection);
  els.appearInput.disabled = !hasSelection;
  els.effectSelect.disabled = !hasSelection;
  els.fontScaleInput.disabled = !hasSelection;
  if (els.fontFamilySelect) els.fontFamilySelect.disabled = !hasSelection;
  if (els.fontSizeInput) els.fontSizeInput.disabled = !hasSelection;
  els.applyStyleButton.disabled = !hasSelection;
  if (!hasSelection) {
    els.selectionLabel.textContent = t("noSelection");
    els.selectionLabel.title = t("noSelectionHint");
  } else {
    els.selectionLabel.title = els.selectionLabel.textContent;
  }
}

function updateControlsFromLayout() {
  const entry = getSelectedLayoutEntry();
  els.fontScaleInput.value = entry?.fontScale || 1;
  setFontFamilyValue(entry?.fontFamily || "");
  if (els.fontSizeInput) els.fontSizeInput.value = entry?.fontSize || "";
  els.appearInput.value = entry?.animation?.appear ?? 1;
  els.effectSelect.value = entry?.animation?.effect || "";
}

function getSelectedLayoutEntry() {
  if (!state.selected) return null;
  const json = parseLayoutEditor({ quiet: true });
  if (state.selected.targetKind === "slide") return json?.slides?.[state.selected.slideId] || null;
  return json?.slides?.[state.selected.slideId]?.fragments?.[state.selected.editorId] || null;
}

function parseLayoutEditor(options = {}) {
  try {
    return JSON.parse(els.layout.value || "{}");
  } catch (error) {
    if (!options.quiet) setStatus("layoutJsonError", { message: error.message });
    return null;
  }
}

function validateLayoutSoon() {
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => {
    const json = parseLayoutEditor({ quiet: true });
    setStatus(json ? "layoutJsonOk" : "layoutJsonBad");
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
  if (entry) focusPreviewNode(entry.id, state.sourceMap.fragments?.[entry.id] ? "fragment" : "slide", { skipSourceHighlight: true });
}

function handleSourceKeyup(event) {
  if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
  if (!["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(event.key)) return;
  focusPreviewFromSourceCursor();
}

function focusPreviewFromLayoutCursor() {
  const around = els.layout.value.slice(Math.max(0, els.layout.selectionStart - 80), els.layout.selectionStart + 80);
  const match = around.match(/"([^"]+)"/g)?.map((item) => item.slice(1, -1)).find((id) => findPreviewNode(id));
  if (match) focusPreviewNode(match, around.includes(".fragments.") ? "fragment" : "");
}

function findSourceMapEntryForLine(line) {
  const fragments = Object.values(state.sourceMap.fragments || {});
  const slides = Object.values(state.sourceMap.slides || {});
  const exactFragment = fragments
    .filter((entry) => line >= entry.sourceStart && line <= (entry.sourceEnd || entry.sourceStart))
    .sort((a, b) => {
      const aSpan = (a.sourceEnd || a.sourceStart) - a.sourceStart;
      const bSpan = (b.sourceEnd || b.sourceStart) - b.sourceStart;
      return aSpan - bSpan;
    })[0];
  if (exactFragment) return exactFragment;
  const exactSlide = slides
    .filter((entry) => line >= entry.sourceStart && line <= (entry.sourceEnd || entry.sourceStart))
    .sort((a, b) => {
      const aSpan = (a.sourceEnd || a.sourceStart) - a.sourceStart;
      const bSpan = (b.sourceEnd || b.sourceStart) - b.sourceStart;
      return aSpan - bSpan;
    })[0];
  if (!exactSlide) return null;
  if (line === exactSlide.sourceStart) return exactSlide;
  const nearest = fragments
    .filter((entry) => entry.slideId === exactSlide.id)
    .map((entry) => ({
      entry,
      distance: line < entry.sourceStart
        ? entry.sourceStart - line
        : line - (entry.sourceEnd || entry.sourceStart),
    }))
    .sort((a, b) => a.distance - b.distance)[0];
  return nearest?.distance <= 2 ? nearest.entry : exactSlide;
}

function focusPreviewNode(editorId, targetKind = "", options = {}) {
  const node = findPreviewNode(editorId, targetKind);
  if (!node) return;
  const slide = node.closest(".slide");
  if (slide?.dataset.index) {
    const appear = Number(node.dataset.appear || 0);
    const stepSuffix = Number.isFinite(appear) && appear > 0 ? `.${appear}` : "";
    els.preview.contentWindow.location.hash = `#slide-${Number(slide.dataset.index) + 1}${stepSuffix}`;
  }
  node.classList.add("sjtu-editor-flash");
  selectPreviewNode(node, options);
  setTimeout(() => node.classList.remove("sjtu-editor-flash"), 900);
}

function findPreviewNode(editorId, targetKind = "") {
  const doc = els.preview.contentDocument;
  if (!doc) return null;
  const matches = Array.from(doc.querySelectorAll("[data-editor-id]")).filter((node) => node.dataset.editorId === editorId);
  if (targetKind === "fragment") return matches.find((node) => node.classList.contains("fragment")) || matches[0] || null;
  if (targetKind === "slide") return matches.find((node) => node.classList.contains("slide")) || matches[0] || null;
  return matches.find((node) => !node.classList.contains("slide")) || matches[0] || null;
}

function inferSlideIdFor(editorId) {
  return state.sourceMap.fragments?.[editorId]?.slideId || "";
}

async function scanLocalFonts() {
  if (typeof window.queryLocalFonts !== "function") {
    setStatus("fontScanUnsupported");
    return;
  }
  const fonts = await window.queryLocalFonts();
  const names = Array.from(new Set(fonts.map((font) => font.family).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
  state.localFonts = names;
  setFontFamilyOptions(names);
  setStatus("fontsLoaded", { count: names.length });
}

function setFontFamilyOptions(fonts = []) {
  if (!els.fontFamilySelect) return;
  const current = els.fontFamilySelect.value;
  const keep = document.createElement("option");
  keep.value = "";
  keep.dataset.i18n = "keep";
  keep.textContent = t("keep");
  const seen = new Set();
  const options = [keep];
  [
    ...DEFAULT_FONT_FAMILIES,
    ...fonts.map((font) => ({ value: font, label: FONT_LABEL_BY_VALUE.get(font) || font })),
  ].forEach((font) => {
    const family = String(font?.value || "").trim();
    if (!family || seen.has(family.toLowerCase())) return;
    seen.add(family.toLowerCase());
    const option = document.createElement("option");
    option.value = family;
    option.textContent = font.label || family;
    options.push(option);
  });
  els.fontFamilySelect.replaceChildren(...options);
  setFontFamilyValue(current);
}

function setFontFamilyValue(fontFamily) {
  if (!els.fontFamilySelect) return;
  const value = String(fontFamily || "").trim();
  if (value && !Array.from(els.fontFamilySelect.options).some((option) => option.value === value)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = FONT_LABEL_BY_VALUE.get(value) || value;
    els.fontFamilySelect.appendChild(option);
  }
  els.fontFamilySelect.value = value;
}

function normalizeFontSizeInput(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const normalized = /^\d*\.?\d+$/.test(raw) ? `${raw}em` : raw;
  return /^\d*\.?\d+(px|em|rem|pt|%|vw|vh)$/.test(normalized) ? normalized : "";
}

function setMode(mode) {
  state.mode = mode === "read" ? "read" : "edit";
  els.modeSelect.value = state.mode;
  els.workspace.classList.toggle("read-mode", state.mode === "read");
  els.workspace.classList.toggle("edit-mode", state.mode !== "read");
  updateModeButtons();
  wirePreview();
  window.requestAnimationFrame(updatePreviewScale);
}

function toggleMode() {
  setMode(state.mode === "read" ? "edit" : "read");
}

function updateModeButtons() {
  els.modeButtons.forEach((button) => {
    const isActive = button.dataset.modeButton === state.mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function updateLanguageButtons() {
  els.languageButtons.forEach((button) => {
    const isActive = button.dataset.languageButton === state.language;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setTheme(theme) {
  state.theme = theme === "dark" ? "dark" : "light";
  localStorage.setItem("sjtuEditorTheme", state.theme);
  applyTheme();
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  if (els.themeSelect) els.themeSelect.value = state.theme;
  updateThemeButtons();
}

function updateThemeButtons() {
  els.themeButtons.forEach((button) => {
    const isActive = button.dataset.themeButton === state.theme;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setLanguage(language) {
  state.language = messages[language] ? language : "zh";
  localStorage.setItem("sjtuEditorLanguage", state.language);
  applyLanguage();
}

function applyLanguage() {
  setFontFamilyOptions(state.localFonts);
  document.documentElement.lang = state.language === "zh" ? "zh-CN" : "en";
  document.title = t("documentTitle");
  els.languageSelect.value = state.language;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((node) => {
    node.title = t(node.dataset.i18nTitle);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  if (!state.selected) updateObjectControls();
  updateLanguageButtons();
  updateThemeButtons();
  updateSidebar();
  setAppMenuOpen(els.appMenuPopover?.hidden === false);
  renderFileList();
  renderProjectList();
  syncAllEditorChrome();
  setStatus(state.statusKey, state.statusVars);
}

function t(key, vars = {}) {
  const table = messages[state.language] || messages.zh;
  const fallback = messages.en[key] || key;
  const value = table[key] || fallback;
  return value.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
}

function insertSnippet(name) {
  const snippet = snippets[name];
  if (!snippet) return;
  pushUndoSnapshot();
  const start = els.source.selectionStart;
  const end = els.source.selectionEnd;
  els.source.value = `${els.source.value.slice(0, start)}${snippet}${els.source.value.slice(end)}`;
  els.source.focus();
  els.source.setSelectionRange(start + snippet.length, start + snippet.length);
  syncAllEditorChrome();
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
  const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight) || 21.7;
  textarea.scrollTop = Math.max(0, (line - 5) * lineHeight);
  syncAllEditorChrome();
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

async function runSafely(action) {
  try {
    await action();
  } catch (error) {
    setStatus("requestFailed", { message: error.message || String(error) });
    console.error(error);
  }
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

function setStatus(key, vars = {}) {
  state.statusKey = key;
  state.statusVars = vars;
  els.status.textContent = t(key, vars);
  els.status.classList.toggle("is-busy", BUSY_STATUSES.has(key));
  els.status.classList.toggle("is-ok", OK_STATUSES.has(key));
  els.status.classList.toggle("is-error", ERROR_STATUSES.has(key));
}
