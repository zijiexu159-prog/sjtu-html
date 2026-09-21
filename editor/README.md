# SJTU Slide Editor

From the repository root, run:

```powershell
node editor/server.js markdown/example.md
```

Open <http://127.0.0.1:5174/> in a browser. Or use `npm run editor` for the bundled example.

The preferred slide source extension is `.md`; existing `.sjtu.md` sources remain supported with their historical `.html` and `.layout.json` companion names. The editor's file list recognizes `.md` files with `% title:` metadata or a `--- Slide title` separator, plus all `.sjtu.md` files. README files are excluded. Because `talk.md` and `talk.sjtu.md` would share outputs, the editor and builder reject that same-folder pair as ambiguous. The editor creates a neighboring `.layout.json` file for visual adjustments.
