# SJTU Slide Visual Editor

Run from the `html-template/` directory:

```powershell
node editor/server.js markdown/example.sjtu.md
```

Then open `http://127.0.0.1:5174/`.

The editor keeps semantic content and visual adjustments separate:

- `.sjtu.md` stores slide content, sections, formulas, figures, and stable ids.
- `.layout.json` stores visual patches such as `rect`, `fontScale`, `zIndex`, and fragment animation.
- The preview iframe renders the generated HTML and exposes selectable objects through `data-editor-id`.

In edit mode, click a fragment in the preview, drag it to move, drag the lower-right handle to resize, and use the toolbar to adjust step, effect, and font scale. These operations update `.layout.json`; they do not rewrite the semantic source.

In read mode, preview clicks only locate the corresponding `.sjtu.md` lines and `.layout.json` node.
