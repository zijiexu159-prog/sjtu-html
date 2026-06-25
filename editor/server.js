const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const sourceArg = process.argv[2] || "markdown/example.sjtu.md";
const sourcePath = path.resolve(root, sourceArg);
const layoutPath = getLayoutPath(sourcePath);
const outputPath = sourcePath.replace(/\.sjtu\.md$/i, ".html");
const port = Number(process.env.PORT || 5174);

ensureInsideRoot(sourcePath);
ensureInsideRoot(layoutPath);
ensureInsideRoot(outputPath);
ensureLayoutFile();
buildMarkup();

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (request.method === "GET" && url.pathname === "/") return serveFile(response, path.join(__dirname, "index.html"));
    if (request.method === "GET" && url.pathname === "/api/state") return sendJson(response, readState());
    if (request.method === "POST" && url.pathname === "/api/save") return handleSave(request, response);
    if (request.method === "POST" && url.pathname === "/api/build") return handleBuild(response);
    if (request.method === "GET" && url.pathname === "/preview") return serveFile(response, outputPath, "text/html; charset=utf-8");
    if (request.method === "GET") return serveStatic(response, url.pathname);
    send(response, 405, "Method not allowed");
  } catch (error) {
    sendJson(response, { error: error.message }, 500);
  }
});

listen(port);

function listen(nextPort) {
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE") {
      listen(nextPort + 1);
      return;
    }
    throw error;
  });
  server.listen(nextPort, () => {
    console.log(`SJTU editor: http://127.0.0.1:${nextPort}/`);
    console.log(`Source: ${relativeToRoot(sourcePath)}`);
    console.log(`Layout: ${relativeToRoot(layoutPath)}`);
  });
}

async function handleSave(request, response) {
  const body = await readJsonBody(request);
  const source = String(body.source ?? "");
  const layoutText = String(body.layoutText ?? "");
  JSON.parse(layoutText || "{}");
  fs.writeFileSync(sourcePath, source, "utf8");
  fs.writeFileSync(layoutPath, layoutText, "utf8");
  buildMarkup();
  sendJson(response, readState());
}

function handleBuild(response) {
  buildMarkup();
  sendJson(response, readState());
}

function readState() {
  return {
    sourcePath: relativeToRoot(sourcePath),
    layoutPath: relativeToRoot(layoutPath),
    outputPath: relativeToRoot(outputPath),
    previewUrl: "/preview",
    source: fs.readFileSync(sourcePath, "utf8"),
    layoutText: fs.readFileSync(layoutPath, "utf8"),
  };
}

function buildMarkup() {
  const result = spawnSync(process.execPath, [
    path.join(root, "core", "build-sjtu-markup.js"),
    sourcePath,
    outputPath,
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

function ensureLayoutFile() {
  if (fs.existsSync(layoutPath)) return;
  fs.writeFileSync(layoutPath, "{\n  \"version\": 1,\n  \"slides\": {}\n}\n", "utf8");
  const source = fs.readFileSync(sourcePath, "utf8");
  if (!/^%\s*layout\s*:/m.test(source)) {
    const relative = path.relative(path.dirname(sourcePath), layoutPath).replace(/\\/g, "/");
    fs.writeFileSync(sourcePath, `% layout: ${relative}\n${source}`, "utf8");
  }
}

function serveStatic(response, pathname) {
  const allowedPrefixes = ["/editor/", "/core/", "/assets/", "/markdown/", "/direct-html/", "/reference/"];
  if (!allowedPrefixes.some((prefix) => pathname.startsWith(prefix))) return send(response, 404, "Not found");
  const filePath = path.resolve(root, pathname.replace(/^\/+/, ""));
  ensureInsideRoot(filePath);
  return serveFile(response, filePath);
}

function serveFile(response, filePath, contentType = mimeType(filePath)) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return send(response, 404, "Not found");
  response.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(filePath).pipe(response);
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

function ensureInsideRoot(filePath) {
  const resolved = path.resolve(filePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Path is outside template root: ${filePath}`);
  }
}

function relativeToRoot(filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}
