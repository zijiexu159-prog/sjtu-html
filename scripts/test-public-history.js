const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const { scanHistory } = require('./check-public-history.js');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'sjtu-history-test-'));
const emptyConfig = path.join(fixture, 'empty-global-config');
fs.writeFileSync(emptyConfig, '');
const git = (...args) => cp.execFileSync('git', args, {
  cwd: fixture, encoding: 'utf8', windowsHide: true,
  env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: emptyConfig },
  stdio: ['pipe', 'pipe', 'pipe'],
});
git('init', '-q');
git('config', 'user.name', 'Demo Author');
git('config', 'user.email', 'demo@example.com');
const file = path.join(fixture, 'markdown', 'demo.sjtu.md');
fs.mkdirSync(path.dirname(file));
const commit = (text) => {
  fs.writeFileSync(file, text);
  git('add', '.');
  git('commit', '-qm', 'Synthetic guard fixture');
  return git('rev-parse', 'HEAD').trim();
};
const clean = commit('% author: Demo Author\n');
assert.equal(scanHistory(fixture).findings.length, 0);
const previousPrivateTerms = process.env.SJTU_PRIVATE_TERMS;
process.env.SJTU_PRIVATE_TERMS = 'demo@example.com';
assert(scanHistory(fixture).findings.some((finding) => finding.rules.includes('private-term-in-commit-metadata')),
  'Private markers in commit metadata must not bypass file-only scans');
if (previousPrivateTerms === undefined) delete process.env.SJTU_PRIVATE_TERMS;
else process.env.SJTU_PRIVATE_TERMS = previousPrivateTerms;
const unsafe = commit('% author: Synthetic Unexpected Author\n');
const unsafeTree = git('rev-parse', 'HEAD^{tree}').trim();
commit('% author: Demo Author\n');
assert(scanHistory(fixture).findings.length > 0, 'A clean tip must not hide an unsafe ancestor');
const branch = git('symbolic-ref', 'HEAD').trim();
git('update-ref', branch, clean);
git('update-ref', 'refs/test/tree-checkpoint', unsafeTree);
assert(scanHistory(fixture).findings.length > 0, 'Tree-only checkpoints must be scanned');
git('update-ref', '-d', 'refs/test/tree-checkpoint');
assert.equal(scanHistory(fixture).findings.length, 0);
const guard = path.join(__dirname, 'check-public-history.js');
const hook = (input) => cp.spawnSync(process.execPath, [guard, `--repo=${fixture}`, '--pre-push'], { input, encoding: 'utf8' });
assert.equal(hook(`refs/heads/main ${clean} refs/heads/main ${clean}\n`).status, 0);
assert.equal(hook(`refs/heads/main ${unsafe} refs/heads/main ${clean}\n`).status, 1);
assert.equal(hook('malformed input\n').status, 1);
assert.equal(hook(`(delete) ${'0'.repeat(40)} refs/heads/main ${clean}\n`).status, 0);
// Only this newly created, synthetic fixture is removed, never a user repository.
assert(path.basename(fixture).startsWith('sjtu-history-test-'));
assert.equal(path.dirname(fixture), path.resolve(os.tmpdir()));
fs.rmSync(fixture, { recursive: true, force: true });
console.log('History guard passed: clean tip, unsafe ancestor, tree checkpoint, push input and deletion.');
