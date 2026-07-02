# SJTU Slide Visual Editor

Run from the `html-template/` directory:

```powershell
node editor/server.js markdown/example.sjtu.md
```

Then open `http://127.0.0.1:5174/`.

For Docker or shared deployments, run without a source argument and point the editor at a writable workspace:

```powershell
$env:HOST="0.0.0.0"
$env:SJTU_WORKSPACE="C:\path\to\slides"
node editor/server.js
```

The server scans the workspace for `.sjtu.md` files. If none are found, it seeds a copy of the bundled example.

The toolbar includes a `Language / 语言` switch. Chinese is the default interface language, and the English UI remains available for shared use.

The editor keeps semantic content and visual adjustments separate:

- `.sjtu.md` stores slide content, sections, formulas, figures, and stable ids.
- `.layout.json` stores visual patches such as `rect`, `fontScale`, `fontFamily`, `fontSize`, `zIndex`, and fragment animation.
- The preview iframe renders the generated HTML and exposes selectable objects through `data-editor-id`.

Use the Slide Canvas `‹` / `›` buttons or the preview's own controls to move through slides. Press `N` to toggle speaker notes in the preview. In edit mode, click a fragment in the preview, drag it to move, drag the lower-right handle to resize, and use the toolbar to adjust step, effect, font scale, font family, and font size. Common Chinese font aliases are listed first; use `Scan Fonts` to append locally installed font families when supported. These operations update `.layout.json`; they do not rewrite the semantic source.

`.layout.json` overrides the semantic layout from `.sjtu.md`. If the generated HTML no longer matches the original column setup, remove the saved patch for that fragment or slide.

For move-between animations in Markdown, use matching motion ids such as `[move=judge]` on the step variants that should move between positions. The toolbar's `move-between` effect only works when `from` / `to` motion points already exist in `.layout.json` or direct JS; selecting it alone does not create those points.

In read mode, preview clicks only locate the corresponding `.sjtu.md` lines and `.layout.json` node.

Use `Import Folder` for a browser-only sandbox flow, and `Export ZIP` to download the current project directory.
