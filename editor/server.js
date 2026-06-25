const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(process.env.SJTU_WORKSPACE || root);
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 5174);
const rootUrlPrefix = `/${path.basename(root)}`;

fs.mkdirSync(workspaceRoot, { recursive: true });

let project = createProject(resolveInitialSource());
ensureProjectReady(project);

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (request.method === "GET" && url.pathname === "/") return serveFile(response, path.join(__dirname, "index.html"));
    if (request.method === "GET" && url.pathname === "/api/state") return sendJson(response, readState());
    if (request.method === "GET" && url.pathname === "/api/files") return sendJson(response, { files: listMarkupFiles() });
    if (request.method === "GET" && url.pathname === "/api/export") return handleExport(response);
    if (request.method === "POST" && url.pathname === "/api/open") return handleOpen(request, response);
    if (request.method === "POST" && url.pathname === "/api/save") return handleSave(request, response);
    if (request.method === "POST" && url.pathname === "/api/build") return handleBuild(response);
    if (request.method === "POST" && url.pathname === "/api/import") return handleImport(request, response);
    if (request.method === "GET" && url.pathname === "/preview") return servePreviewHtml(response, project.outputPath);
    if (request.method === "GET") return serveStatic(response, url.pathname);
    send(response, 405, "Method not allowed");
  } catch (error) {
    sendJson(response, { error: error.message }, 500);
  }
});

listen(port);

function listen(nextPort) {
  const onError = (error) => {
    server.removeListener("listening", onListening);
    if (error.code === "EADDRINUSE") {
      server.close(() => listen(nextPort + 1));
      return;
    }
    throw error;
  };
  const onListening = () => {
    server.removeListener("error", onError);
    const shownHost = host === "0.0.0.0" ? "127.0.0.1" : host;
    console.log(`SJTU editor: http://${shownHost}:${nextPort}/`);
    console.log(`Workspace: ${workspaceRoot}`);
    console.log(`Source: ${relativeToWorkspace(project.sourcePath)}`);
    console.log(`Layout: ${relativeToWorkspace(project.layoutPath)}`);
  };
  server.once("error", onError);
  server.once("listening", onListening);
  server.listen(nextPort, host);
}

async function handleOpen(request, response) {
  const body = await readJsonBody(request);
  const nextSource = resolveWorkspacePath(String(body.path || ""));
  if (!/\.sjtu\.md$/i.test(nextSource)) throw new Error("Only .sjtu.md files can be opened");
  ensureInsideWorkspace(nextSource);
  project = createProject(nextSource);
  ensureProjectReady(project);
  sendJson(response, readState());
}

async function handleSave(request, response) {
  const body = await readJsonBody(request);
  const source = String(body.source ?? "");
  const layoutText = String(body.layoutText ?? "");
  JSON.parse(layoutText || "{}");
  fs.writeFileSync(project.sourcePath, source, "utf8");
  fs.writeFileSync(project.layoutPath, layoutText, "utf8");
  buildMarkup(project);
  sendJson(response, readState());
}

function handleBuild(response) {
  buildMarkup(project);
  sendJson(response, readState());
}

async function handleImport(request, response) {
  const contentType = request.headers["content-type"] || "";
  const boundary = contentType.match(/boundary=(.+)$/)?.[1];
  if (!boundary) throw new Error("Missing multipart boundary");
  const body = await readRawBody(request, 80 * 1024 * 1024);
  const files = parseMultipartFiles(body, boundary);
  if (!files.length) throw new Error("No files uploaded");

  const targetDir = path.join(workspaceRoot, "imports", `project-${Date.now()}`);
  fs.mkdirSync(targetDir, { recursive: true });
  const written = [];
  for (const file of files) {
    const safeName = sanitizeRelativePath(file.filename);
    if (!safeName) continue;
    const target = path.resolve(targetDir, safeName);
    ensureInsideDirectory(target, targetDir);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.content);
    written.push(target);
  }

  const firstMarkup = written.find((filePath) => /\.sjtu\.md$/i.test(filePath));
  if (!firstMarkup) throw new Error("Imported files did not include a .sjtu.md source");
  project = createProject(firstMarkup);
  ensureProjectReady(project);
  sendJson(response, readState());
}

function handleExport(response) {
  const dir = path.dirname(project.sourcePath);
  const zip = createZipFromDirectory(dir);
  const base = path.basename(project.sourcePath).replace(/\.sjtu\.md$/i, "") || "sjtu-slides";
  response.writeHead(200, {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${base}.zip"`,
    "Content-Length": zip.length,
  });
  response.end(zip);
}

function readState() {
  return {
    sourcePath: relativeToWorkspace(project.sourcePath),
    layoutPath: relativeToWorkspace(project.layoutPath),
    outputPath: relativeToWorkspace(project.outputPath),
    previewUrl: filesUrl(project.outputPath),
    workspaceRoot,
    files: listMarkupFiles(),
    source: fs.readFileSync(project.sourcePath, "utf8"),
    layoutText: fs.readFileSync(project.layoutPath, "utf8"),
  };
}

function resolveInitialSource() {
  if (process.argv[2]) {
    const fromCwd = path.resolve(process.cwd(), process.argv[2]);
    const fromRoot = path.resolve(root, process.argv[2]);
    const explicit = path.isAbsolute(process.argv[2]) ? path.resolve(process.argv[2]) : (fs.existsSync(fromCwd) ? fromCwd : fromRoot);
    if (fs.existsSync(explicit)) return explicit;
  }
  const existing = listMarkupFiles();
  if (existing.length) return resolveWorkspacePath(existing[0]);
  return seedWorkspaceExample();
}

function seedWorkspaceExample() {
  const source = path.join(workspaceRoot, "example.sjtu.md");
  const layout = path.join(workspaceRoot, "example.layout.json");
  if (!fs.existsSync(source)) fs.copyFileSync(path.join(root, "markdown", "example.sjtu.md"), source);
  if (!fs.existsSync(layout)) fs.copyFileSync(path.join(root, "markdown", "example.layout.json"), layout);
  return source;
}

function createProject(sourcePath) {
  const resolvedSource = path.resolve(sourcePath);
  ensureWritableSource(resolvedSource);
  const layoutPath = getLayoutPath(resolvedSource);
  const outputPath = resolvedSource.replace(/\.sjtu\.md$/i, ".html");
  ensureWritableSource(layoutPath);
  ensureWritableSource(outputPath);
  return { sourcePath: resolvedSource, layoutPath, outputPath };
}

function ensureProjectReady(nextProject) {
  ensureLayoutFile(nextProject);
  buildMarkup(nextProject);
}

function buildMarkup(nextProject) {
  const result = spawnSync(process.execPath, [
    path.join(root, "core", "build-sjtu-markup.js"),
    nextProject.sourcePath,
    nextProject.outputPath,
  ], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error([result.stdout, result.stderr].filter(Boolean).join("\n") || "Build failed");
  }
}

function getLayoutPath(markupPath) {
  const explicit = readExplicitLayoutPath(markupPath);
  if (explicit) return explicit;
  return markupPath.replace(/\.sjtu\.md$/i, ".layout.json");
}

function readExplicitLayoutPath(markupPath) {
  if (!fs.existsSync(markupPath)) throw new Error(`Source file not found: ${markupPath}`);
  const source = fs.readFileSync(markupPath, "utf8");
  const match = source.replace(/\r\n?/g, "\n").match(/^%\s*layout\s*:\s*(.+)$/m);
  if (!match) return "";
  return path.resolve(path.dirname(markupPath), match[1].trim());
}

function ensureLayoutFile(nextProject) {
  if (!fs.existsSync(nextProject.layoutPath)) {
    fs.writeFileSync(nextProject.layoutPath, "{\n  \"version\": 1,\n  \"slides\": {}\n}\n", "utf8");
  }
  const source = fs.readFileSync(nextProject.sourcePath, "utf8");
  if (!/^%\s*layout\s*:/m.test(source)) {
    const relative = path.relative(path.dirname(nextProject.sourcePath), nextProject.layoutPath).replace(/\\/g, "/");
    fs.writeFileSync(nextProject.sourcePath, `% layout: ${relative}\n${source}`, "utf8");
  }
}

function listMarkupFiles() {
  const files = [];
  const walk = (dir, depth = 0) => {
    if (depth > 6 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (/\.sjtu\.md$/i.test(entry.name)) {
        files.push(relativeToWorkspace(fullPath));
      }
    }
  };
  walk(workspaceRoot);
  return files.sort((a, b) => a.localeCompare(b));
}

function serveStatic(response, pathname) {
  if (pathname.startsWith("/editor/")) {
    return serveFile(response, path.join(root, pathname.replace(/^\/+/, "")));
  }
  if (pathname.startsWith("/files/")) {
    const filePath = path.resolve(workspaceRoot, decodeURIComponent(pathname.slice("/files/".length)));
    ensureInsideWorkspace(filePath);
    if (path.extname(filePath).toLowerCase() === ".html") return servePreviewHtml(response, filePath);
    return serveFile(response, filePath);
  }
  if (pathname.startsWith(`${rootUrlPrefix}/`)) {
    const filePath = path.resolve(path.dirname(root), decodeURIComponent(pathname.slice(1)));
    ensureInsideRoot(filePath);
    return serveFile(response, filePath);
  }
  const allowedRootPrefixes = ["/core/", "/assets/", "/markdown/", "/direct-html/", "/reference/"];
  if (!allowedRootPrefixes.some((prefix) => pathname.startsWith(prefix))) return send(response, 404, "Not found");
  const filePath = path.resolve(root, pathname.replace(/^\/+/, ""));
  ensureInsideRoot(filePath);
  return serveFile(response, filePath);
}

function serveFile(response, filePath, contentType = mimeType(filePath)) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return send(response, 404, "Not found");
  response.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(filePath).pipe(response);
}

function servePreviewHtml(response, filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return send(response, 404, "Not found");
  const html = fs.readFileSync(filePath, "utf8")
    .replace(/href="[^"]*sjtu-ppt\.css"/, 'href="/core/sjtu-ppt.css"')
    .replace(/src="[^"]*sjtu-ppt-core\.js"/, 'src="/core/sjtu-ppt-core.js"')
    .replace(/src="[^"]*sjtu-markup\.js"/, 'src="/core/sjtu-markup.js"');
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(html);
}

function sendJson(response, payload, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function send(response, status, body) {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(body);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) reject(new Error("Request body too large"));
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function readRawBody(request, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    request.on("data", (chunk) => {
      total += chunk.length;
      if (total > limit) reject(new Error("Upload is too large"));
      else chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function parseMultipartFiles(body, boundary) {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const files = [];
  let cursor = body.indexOf(boundaryBuffer);
  while (cursor >= 0) {
    cursor += boundaryBuffer.length;
    if (body[cursor] === 45 && body[cursor + 1] === 45) break;
    if (body[cursor] === 13 && body[cursor + 1] === 10) cursor += 2;
    const headerEnd = body.indexOf(Buffer.from("\r\n\r\n"), cursor);
    if (headerEnd < 0) break;
    const headers = body.slice(cursor, headerEnd).toString("utf8");
    const filename = headers.match(/filename="([^"]*)"/)?.[1];
    const contentStart = headerEnd + 4;
    const nextBoundary = body.indexOf(boundaryBuffer, contentStart);
    if (nextBoundary < 0) break;
    const contentEnd = body[nextBoundary - 2] === 13 && body[nextBoundary - 1] === 10 ? nextBoundary - 2 : nextBoundary;
    if (filename) files.push({ filename, content: body.slice(contentStart, contentEnd) });
    cursor = nextBoundary;
  }
  return files;
}

function createZipFromDirectory(dir) {
  const entries = [];
  collectFiles(dir).forEach((filePath) => {
    const name = path.relative(dir, filePath).replace(/\\/g, "/");
    entries.push(createZipEntry(name, fs.readFileSync(filePath), fs.statSync(filePath).mtime));
  });
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    localParts.push(entry.local);
    centralParts.push(createCentralDirectory(entry, offset));
    offset += entry.local.length;
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  return Buffer.concat([
    ...localParts,
    ...centralParts,
    createEndOfCentralDirectory(entries.length, centralSize, offset),
  ]);
}

function collectFiles(dir) {
  const files = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else files.push(fullPath);
    }
  };
  walk(dir);
  return files;
}

function createZipEntry(name, data, mtime) {
  const nameBuffer = Buffer.from(name);
  const crc = crc32(data);
  const timeDate = dosTimeDate(mtime);
  const local = Buffer.alloc(30 + nameBuffer.length + data.length);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0, 6);
  local.writeUInt16LE(0, 8);
  local.writeUInt16LE(timeDate.time, 10);
  local.writeUInt16LE(timeDate.date, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuffer.length, 26);
  local.writeUInt16LE(0, 28);
  nameBuffer.copy(local, 30);
  data.copy(local, 30 + nameBuffer.length);
  return { nameBuffer, data, crc, timeDate, local };
}

function createCentralDirectory(entry, offset) {
  const central = Buffer.alloc(46 + entry.nameBuffer.length);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8);
  central.writeUInt16LE(0, 10);
  central.writeUInt16LE(entry.timeDate.time, 12);
  central.writeUInt16LE(entry.timeDate.date, 14);
  central.writeUInt32LE(entry.crc, 16);
  central.writeUInt32LE(entry.data.length, 20);
  central.writeUInt32LE(entry.data.length, 24);
  central.writeUInt16LE(entry.nameBuffer.length, 28);
  central.writeUInt16LE(0, 30);
  central.writeUInt16LE(0, 32);
  central.writeUInt16LE(0, 34);
  central.writeUInt16LE(0, 36);
  central.writeUInt32LE(0, 38);
  central.writeUInt32LE(offset, 42);
  entry.nameBuffer.copy(central, 46);
  return central;
}

function createEndOfCentralDirectory(count, centralSize, centralOffset) {
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(count, 8);
  end.writeUInt16LE(count, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20);
  return end;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function dosTimeDate(date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".md": "text/plain; charset=utf-8",
  };
  return types[ext] || "application/octet-stream";
}

function filesUrl(filePath) {
  return `/files/${encodeURIComponent(relativeToWorkspace(filePath)).replace(/%2F/g, "/")}`;
}

function resolveWorkspacePath(relativePath) {
  const resolved = path.resolve(workspaceRoot, relativePath);
  ensureInsideWorkspace(resolved);
  return resolved;
}

function ensureWritableSource(filePath) {
  if (workspaceRoot === root) ensureInsideRoot(filePath);
  else ensureInsideWorkspace(filePath);
}

function ensureInsideWorkspace(filePath) {
  ensureInsideDirectory(filePath, workspaceRoot);
}

function ensureInsideRoot(filePath) {
  ensureInsideDirectory(filePath, root);
}

function ensureInsideDirectory(filePath, directory) {
  const resolved = path.resolve(filePath);
  const base = path.resolve(directory);
  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) {
    throw new Error(`Path is outside allowed directory: ${filePath}`);
  }
}

function sanitizeRelativePath(value = "") {
  const cleaned = String(value).replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = cleaned.split("/").filter((part) => part && part !== "." && part !== "..");
  return parts.join("/");
}

function relativeToWorkspace(filePath) {
  return path.relative(workspaceRoot, filePath).replace(/\\/g, "/");
}
