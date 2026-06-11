const fs = require("fs");
const path = require("path");

const inputArg = process.argv[2] || "markdown/example.sjtu.md";
const outputArg = process.argv[3] || inputArg.replace(/\.sjtu\.md$/i, ".html");
const input = path.resolve(inputArg);
const output = path.resolve(outputArg);
const source = fs.readFileSync(input, "utf8").replace(/<\/script/gi, "<\\/script");
const title = source.match(/^%\s*title\s*:\s*(.+)$/m)?.[1] || "SJTU Markup PPT";
const assetBase = getAssetBase(output);

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
    <script type="text/sjtu-markup">
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
