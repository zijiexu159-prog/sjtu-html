// Publication hygiene, not a complete PII detector or a Git-history scrubber.
const fs = require("fs");
const path = require("path");
const assert = require("assert/strict");
const { execFileSync } = require("child_process");
const root = path.resolve(__dirname, "..");
const textExtensions = /\.(?:md|html|js|json|css|svg|bib|ya?ml|toml|txt|ps1|cmd)$/i;
const privateRoots = /^(?:output|workspace|imports|\.private-archive|\.playwright-cli)(?:\/|$)/;
const demoAuthors = new Set(["示例作者", "作者", "张三", "Your Name", "Demo Author", "HTML 模板说明", "Design Systems Lab", "Layout Workstream", "SJTUG", "Turing, Alan M."]);

function inspect(file, content, privateTerms = []) {
  const findings = [];
  if (privateRoots.test(file)) findings.push({ rule: "private-artifact-in-public-files", line: 1 });
  if (file.startsWith("assets/figures/")) findings.push({ rule: "retired-research-assets", line: 1 });
  if (file.startsWith("assets/demos/")) findings.push({ rule: "retired-demo-asset", line: 1 });
  if (file === "assets/thumbnail.png") findings.push({ rule: "retired-demo-screenshot", line: 1 });
  const bundledDemo = /^(?:markdown\/|direct-html\/|assets\/demo\/)/.test(file);
  const demoReference = /^(?:README[^/]*|markdown\/|direct-html\/|assets\/demos?\/)/i.test(file);
  content.split(/\r?\n/).forEach((line, index) => {
    const report = (rule) => findings.push({ rule, line: index + 1 });
    if (demoReference && /assets\/figures\/|assets\/demos\/|assets\/thumbnail\.png|phase-portrait|Ericksen|Leslie|液晶|毕业答辩|相平面|分岔|研究背景|u_t\s*\+\s*u\s*u_x|\\partial_t|\\nabla/i.test(line)) report("retired-demo-content");
    const homes = [...line.matchAll(/[A-Za-z]:[\\/]+Users[\\/]+([^\\/\s<>"'`]+)/gi)];
    if (homes.some((match) => !/^(?:user|username|demo|example|test|public)$/i.test(match[1]))) report("personal-home-path");
    if (/\/(?:home|Users)\/[a-z0-9._-]+\//i.test(line)) report("personal-unix-home-path");
    if (privateTerms.some((term) => term && line.toLowerCase().includes(term.toLowerCase()))) report("local-private-term");
    if (!bundledDemo && !/^README(?:[^/]*)$/i.test(file)) return;
    const author = line.match(/^\s*%\s*author\s*:\s*(.+?)\s*$/)?.[1];
    if (author && !demoAuthors.has(author)) report("non-placeholder-demo-author");
    for (const match of line.matchAll(/\bauthor\s*:\s*["']([^"'\n]+)["']/g)) {
      if (!demoAuthors.has(match[1])) report("non-placeholder-demo-author");
    }
    for (const match of line.matchAll(/[a-z0-9._%+-]+@([a-z0-9.-]+\.[a-z]{2,})/gi)) {
      if (!/^example\.(?:com|org|net)$/i.test(match[1])) report("non-example-email-in-demo");
    }
  });
  return findings;
}

function selfTest() {
  const home = ["C:", "Users", "private-person", "draft.md"].join("\\");
  assert(inspect("reference/test.md", home).some((item) => item.rule === "personal-home-path"));
  assert(inspect("markdown/test.sjtu.md", "% author: A Real Person").length);
  assert(inspect("markdown/test.html", "name" + "@" + "private.invalid").length);
  assert(inspect("output/capture.png", "").length);
  assert(inspect("assets/figures/old.svg", "").length);
  assert(inspect("assets/thumbnail.png", "").some(({ rule }) => rule === "retired-demo-screenshot"));
  assert(inspect("markdown/example.md", "u_t + u u_x = 0").some(({ rule }) => rule === "retired-demo-content"));
  assert(inspect("assets/demo/test.svg", "demo@private.invalid").some(({ rule }) => rule === "non-example-email-in-demo"));
  assert(inspect("markdown/manual.sjtu.md", 'src="../assets/demos/old.html"').some(({ rule }) => rule === "retired-demo-content"));
  assert(inspect("README.md", '![Demo](../assets/figures/old.svg)').some(({ rule }) => rule === "retired-demo-content"));
  assert.deepEqual(inspect("markdown/manual.sjtu.md", 'src="../assets/demo/reading-counter.html"'), []);
  assert(inspect("reference/test.md", "private-marker", ["private-marker"]).length);
  assert.deepEqual(inspect("markdown/test.sjtu.md", "% author: 示例作者\nmail@example.com"), []);
  assert.deepEqual(inspect("direct-html/manual.html", 'author: "Turing, Alan M."'), []);
}

function main() {
  selfTest();
  if (process.argv.includes("--self-test")) return console.log("Public-content guard regression checks passed");
  const staged = process.argv.includes("--staged");
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  const files = [...new Set(git("ls-files", "-z", "--cached", ...(staged ? [] : ["--others", "--exclude-standard"])).split("\0").filter(Boolean))];
  const privateTerms = (process.env.SJTU_PRIVATE_TERMS || "").split(";").map((value) => value.trim()).filter(Boolean);
  let checked = 0;
  const failures = [];
  for (const file of files) {
    const local = path.join(root, file);
    if (!staged && !fs.existsSync(local)) continue; // Pending deletion in the working tree.
    if (file.startsWith("core/vendor/") || /(?:^|\/)LICENSE(?:\.|$)/i.test(file)) continue; // Preserve upstream attribution.
    const isText = textExtensions.test(file);
    const content = isText ? (staged ? git("show", `:${file}`) : fs.readFileSync(local, "utf8")) : "";
    checked++;
    const privateFilename = privateTerms.some((term) => file.toLowerCase().includes(term.toLowerCase()));
    const reportPath = privateFilename ? "<redacted-filename>" : file;
    for (const finding of inspect(file, content, privateTerms)) failures.push(`${reportPath}:${finding.line} [${finding.rule}]`);
    if (privateFilename) failures.push(`${reportPath}:1 [private-term-in-filename]`);
  }
  if (failures.length) {
    // Never echo matched personal values into CI logs.
    console.error(`Public-content check failed (${staged ? "index" : "working tree"}):\n${failures.join("\n")}`);
    process.exitCode = 1;
  } else {
    console.log(`Public-content check passed: ${checked} files (${staged ? "index" : "working tree"}); history, ignored files, and image pixels are not covered.`);
  }
}

if (require.main === module) main();
module.exports = { inspect, selfTest };
