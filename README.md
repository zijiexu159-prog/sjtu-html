# SJTU HTML PPT Template

A small, independent HTML slide template. The bundled board-game deck is fictional and exists only to demonstrate the legacy slide syntax and visual theme. This release uses a newly authored example; links to earlier personal examples have been removed.

## Build the example

With Node.js installed, run:

```powershell
npm run build
```

This builds `markdown/example.html` from `markdown/example.md`. To build another source directly:

```powershell
node core/build-sjtu-markup.js path/to/slides.md
```

Plain `.md` files are the preferred source extension. Existing `.sjtu.md` sources remain supported with their historical `.html` and `.layout.json` companion names. Since `talk.md` and `talk.sjtu.md` share those outputs, the builder and editor reject a same-folder pair as ambiguous; keep only one.

## Open the local editor

```powershell
npm run editor
```

Then open <http://127.0.0.1:5174/>. The editor saves a `.layout.json` beside the source and rebuilds the HTML preview. Its file list recognizes `.sjtu.md` files and `.md` files containing slide metadata or slide separators; README files are not treated as decks.

Run `npm run check:js` for JavaScript syntax checks.

This is not an official Shanghai Jiao Tong University product or endorsement.
