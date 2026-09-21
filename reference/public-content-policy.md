# Public example policy

The public demonstration is a fictional board-game event. Its writing and SVG
were created for the template, not extracted or anonymized from personal work.
Do not add private drafts, research figures, exports, editor workspaces or complete
working-directory archives to this repository.

Old bundled examples, generated pages and screenshots have been removed from the
rewritten published branch/tag history. Commit metadata is anonymized; existing
license and third-party notices remain intact. New content must pass a source,
generated-output, asset and metadata review before publication.

Run `node scripts/check-public-content.js --staged` after staging and
`node scripts/check-public-history.js` before pushing. Enable the supplied hook
with `git config --local core.hooksPath scripts/hooks` after checking whether a
different custom hook is already installed. Optional exact private markers may
be passed in the process-local `SJTU_PRIVATE_TERMS` environment variable. Never
commit a personal denylist. These checks are guardrails, not a universal PII detector.

Do not merge or force-push a clone from before this rewrite. Reclone the reviewed
remote or migrate changes without importing old history. Do not distribute `.git`,
`workspace`, `output`, or private recovery archives. Rewriting refs cannot recall
external clones, forks, downloads or screenshots, and GitHub cached commit views
may require separate GitHub Support action. No global-erasure claim is made.
