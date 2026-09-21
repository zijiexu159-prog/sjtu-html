// Read-only history guard. Never echoes matched private text into console logs.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { inspect } = require("./check-public-content.js");
const root = path.resolve(__dirname, "..");
const textExtensions = /\.(?:md|html|js|json|css|svg|bib|ya?ml|toml|txt|ps1|cmd)$/i;

function scanHistory(repo, refs = []) {
  const git = (args, input, binary = false) => execFileSync("git", ["-C", repo, ...args], {
    input, encoding: binary ? undefined : "utf8", maxBuffer: 256 * 1024 * 1024, windowsHide: true,
  });
  const commits = git(["rev-list", ...(refs.length ? ["--stdin"] : ["--all"])], refs.length ? refs.join("\n") + "\n" : undefined).trim().split("\n").filter(Boolean);
  // App checkpoints can point directly to trees, which rev-list omits.
  const roots = refs.length ? refs : git(["for-each-ref", "--format=%(objectname)"]).trim().split("\n").filter(Boolean);
  const pairs = new Map();
  for (const commit of new Set([...commits, ...roots])) {
    for (const entry of git(["ls-tree", "-r", "-z", commit]).split("\0")) {
      const match = entry.match(/^\d+ blob ([0-9a-f]+)\t([\s\S]+)$/);
      if (match) pairs.set(`${match[1]}\0${match[2]}`, { blob: match[1], file: match[2] });
    }
  }
  const ids = [...new Set([...pairs.values()].filter(({ file }) => textExtensions.test(file)
    && !file.startsWith("core/vendor/") && !/(?:^|\/)LICENSE(?:\.|$)/i.test(file)).map(({ blob }) => blob))];
  const contents = new Map();
  if (ids.length) {
    const batch = git(["cat-file", "--batch"], ids.join("\n") + "\n", true);
    let offset = 0;
    for (const id of ids) {
      const end = batch.indexOf(10, offset);
      const header = batch.subarray(offset, end).toString("utf8").match(/^([0-9a-f]+) blob (\d+)$/);
      if (!header || header[1] !== id) throw new Error("Unexpected Git object response");
      const size = Number(header[2]);
      offset = end + 1;
      contents.set(id, batch.subarray(offset, offset + size).toString("utf8"));
      offset += size + 1;
    }
  }
  const terms = (process.env.SJTU_PRIVATE_TERMS || "").split(";").map((term) => term.trim()).filter(Boolean);
  const findings = [];
  for (const { blob, file } of pairs.values()) {
    if (file.startsWith("core/vendor/") || /(?:^|\/)LICENSE(?:\.|$)/i.test(file)) continue;
    const content = contents.get(blob) || "";
    const rules = new Set(inspect(file, content, terms).map(({ rule }) => rule));
    if (terms.some((term) => file.toLowerCase().includes(term.toLowerCase()))) rules.add("private-term-in-filename");
    if (rules.size) findings.push({ file, blob, rules: [...rules] });
  }
  // File-only scans miss personal data in authorship and commit messages.
  // Match the process-local private terms without printing their values.
  if (terms.length) {
    for (const commit of commits) {
      const metadata = git(["show", "-s", "--format=%an%n%ae%n%cn%n%ce%n%B", commit]);
      if (terms.some((term) => metadata.toLowerCase().includes(term.toLowerCase()))) {
        findings.push({ file: "<commit-metadata>", blob: commit, rules: ["private-term-in-commit-metadata"] });
      }
    }
  }
  return { version: 1, commits: commits.length, objects: pairs.size,
    affectedPaths: [...new Set(findings.map(({ file }) => file))].sort(), findings,
    limits: ["Image pixels and unknown private prose are not scanned", "Commit metadata is checked only against supplied private terms", "Only reachable history is scanned; hosting caches, forks and clones require separate cleanup"] };
}

function main() {
  const args = process.argv.slice(2);
  const repo = path.resolve(args.find((arg) => arg.startsWith("--repo="))?.slice(7) || root);
  let refs = [];
  if (args.includes("--pre-push")) {
    refs = fs.readFileSync(0, "utf8").trim().split(/\r?\n/).filter(Boolean).map((line) => {
      const fields = line.trim().split(/\s+/);
      if (fields.length !== 4 || !/^[0-9a-f]{40,64}$/.test(fields[1])) throw new Error("Invalid pre-push input");
      return fields[1];
    }).filter((id) => !/^0+$/.test(id));
    if (!refs.length) return;
  }
  const report = scanHistory(repo, refs);
  const reportArg = args.find((arg) => arg.startsWith("--report="));
  if (reportArg) {
    const target = path.resolve(root, reportArg.slice(9));
    const privateRoot = path.join(root, ".private-archive") + path.sep;
    if (!target.startsWith(privateRoot)) throw new Error("History reports must remain in the ignored private archive");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(report, null, 2) + "\n", "utf8");
  }
  const counts = {};
  for (const finding of report.findings) for (const rule of finding.rules) counts[rule] = (counts[rule] || 0) + 1;
  console.log(JSON.stringify({ commits: report.commits, objects: report.objects, affectedPaths: report.affectedPaths.length, rules: counts }));
  if (report.findings.length) {
    console.error("Blocked: reachable history contains publication-risk content. Clean reviewed history before pushing; editing the working tree alone is insufficient.");
    process.exitCode = 1;
  } else console.log("History guard passed its known rules; this is not a complete privacy guarantee.");
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(`History guard failed closed: ${error.message}`); process.exitCode = 1; }
}
module.exports = { scanHistory };
