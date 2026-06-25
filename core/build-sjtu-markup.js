const fs = require("fs");
const path = require("path");

const inputArg = process.argv[2] || "markdown/example.sjtu.md";
const outputArg = process.argv[3] || inputArg.replace(/\.sjtu\.md$/i, ".html");
const input = path.resolve(inputArg);
const output = path.resolve(outputArg);
const rawSource = fs.readFileSync(input, "utf8");
const source = rawSource.replace(/<\/script/gi, "<\\/script");
const title = source.match(/^%\s*title\s*:\s*(.+)$/m)?.[1] || "SJTU Markup PPT";
const assetBase = getAssetBase(output);
const bibSource = readBibliographySources(rawSource, input);
const bibScript = bibSource ? `    <script>window.sjtuBibSource = ${JSON.stringify(bibSource)};</script>\n` : "";
const layoutInfo = readLayoutPatch(rawSource, input);
const layoutScript = layoutInfo
  ? `    <script>window.sjtuLayoutPatch = ${JSON.stringify(layoutInfo.patch)}; window.sjtuLayoutPath = ${JSON.stringify(layoutInfo.relativePath)};</script>\n`
  : "";

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="${assetBase}sjtu-ppt.css">
  </head>
  <body>
    <main class="deck-shell" aria-live="polite">
      <section id="deck" class="deck" aria-label="SJTU markup presentation"></section>
      <nav class="deck-controls" aria-label="Presentation controls">
        <button class="icon-button" id="prev-slide" type="button" aria-label="Previous slide">‹</button>
        <span id="slide-status" class="slide-status">1 / 1</span>
        <button class="icon-button" id="next-slide" type="button" aria-label="Next slide">›</button>
        <button class="icon-button" id="toggle-fullscreen" type="button" aria-label="Fullscreen">⛶</button>
      </nav>
    </main>
    <script src="${assetBase}sjtu-ppt-core.js"></script>
    <script src="${assetBase}sjtu-markup.js"></script>
${bibScript}${layoutScript}    <script type="text/sjtu-markup">
${source}
    </script>
    <script>autoBootstrapSJTUMarkup();</script>
  </body>
</html>
`;

fs.writeFileSync(output, html, "utf8");
console.log(`Generated ${output}`);

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getAssetBase(outputFile) {
  const outputDir = path.dirname(outputFile);
  const relative = path.relative(outputDir, __dirname).replace(/\\/g, "/");
  return relative && relative !== "." ? `${relative}/` : "";
}

function readBibliographySources(sourceText, inputFile) {
  const inputDir = path.dirname(inputFile);
  const paths = [];
  let inFence = false;
  for (const line of sourceText.replace(/\r\n?/g, "\n").split("\n")) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = line.match(/^%\s*(?:bibliography|bib)\s*:\s*(.+)$/);
    if (!match) continue;
    match[1]
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => paths.push(item));
  }
  const chunks = [];
  for (const bibPath of paths) {
    const fullPath = path.resolve(inputDir, bibPath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`Warning: bibliography file not found: ${fullPath}`);
      continue;
    }
    chunks.push(fs.readFileSync(fullPath, "utf8"));
  }
  return chunks.join("\n\n");
}

function readLayoutPatch(sourceText, inputFile) {
  const inputDir = path.dirname(inputFile);
  const match = sourceText.replace(/\r\n?/g, "\n").match(/^%\s*layout\s*:\s*(.+)$/m);
  if (!match) return null;
  const relativePath = match[1].trim();
  if (!relativePath) return null;
  const fullPath = path.resolve(inputDir, relativePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`Warning: layout file not found: ${fullPath}`);
    return { relativePath, patch: { version: 1, slides: {} } };
  }
  try {
    return { relativePath, patch: JSON.parse(fs.readFileSync(fullPath, "utf8")) };
  } catch (error) {
    console.warn(`Warning: failed to parse layout file ${fullPath}: ${error.message}`);
    return { relativePath, patch: { version: 1, slides: {} } };
  }
}
