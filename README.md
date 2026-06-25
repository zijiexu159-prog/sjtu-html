# SJTU HTML PPT Template

SJTU HTML PPT Template is a standalone HTML presentation template with a Shanghai Jiao Tong University inspired visual style. It supports both direct JavaScript slide authoring and a lightweight Markdown-like `.sjtu.md` workflow for users who prefer writing slide content as text.

中文说明见 [README_zh.md](README_zh.md).

## Use And Disclaimer

This repository is a personal learning project. It is maintained on a best-effort basis, and updates may not be timely or synchronized with upstream projects, official SJTU visual identity materials, browser changes, or related presentation libraries.

This template is not an official Shanghai Jiao Tong University product, template, or visual identity package, and it is not endorsed by Shanghai Jiao Tong University. It is primarily intended for academic presentation preparation by students of Shanghai Jiao Tong University. Use, modification, and redistribution of the template code are permitted under the MIT License, but users must not imply official authorization or endorsement by Shanghai Jiao Tong University.

Users are responsible for checking whether their final presentation satisfies the requirements of their course, supervisor, department, event, or institution.

## Features

- SJTU-style title pages, outline pages, section pages, headers, footers, and ending pages.
- Direct HTML/JavaScript authoring through helper functions such as `slide()`, `theorem()`, `formula()`, `figure()`, and `columns()`.
- Markdown-like `.sjtu.md` authoring for users who do not want to write JavaScript.
- MathJax formulas with labels, numbering, references, and formula pause effects.
- Figure labels, figure references, click-to-zoom images, and return-to-reference navigation with `R`.
- BibTeX citation support through `@cite:key`, automatic bibliography slides, and inline `.bib` embedding during build.
- Per-slide footnotes through `[^id]` and `[^id]: footnote text`.
- Page transitions, fragment reveal animations, fixed column slots, object-internal columns, and move-between animations.
- Local IDE-style visual editor with `.sjtu.md`, `.layout.json`, and live HTML preview panes.
- Speaker notes toggled with `N`.
- Print/PDF export support through the browser.

## Project Structure

```text
html-template/
  assets/          Static images, SJTU VI assets, and example figures
  core/            Runtime CSS, JavaScript helpers, and the markup builder
  direct-html/     Direct JavaScript examples and manual
  editor/          Local visual editor for source, layout patches, and live preview
  markdown/        .sjtu.md sources and generated HTML examples
  reference/       API and CSS reference
  skills/          Codex skills for conversion and layout polishing
```

## Quick Start

From the repository root:

```powershell
node core/build-sjtu-markup.js markdown/example.sjtu.md markdown/example.html
```

Open `markdown/example.html` in a browser.

To rebuild all bundled Markdown examples:

```powershell
node core/build-sjtu-markup.js markdown/example.sjtu.md markdown/example.html
node core/build-sjtu-markup.js markdown/manual.sjtu.md markdown/manual.html
node core/build-sjtu-markup.js markdown/touying-main-complete.sjtu.md markdown/touying-main-complete.html
```

If `npm` is available:

```powershell
npm run build
```

## Visual Editor

Run the local editor from `html-template/`:

```powershell
npm run editor
```

Or open a specific source:

```powershell
node editor/server.js markdown/example.sjtu.md
```

The editor opens at `http://127.0.0.1:5174/` and shows three synchronized panes:

- left top: `.sjtu.md` semantic source;
- left bottom: `.layout.json` visual patch;
- right: generated HTML slide preview.

Click a preview object to jump to the corresponding source lines and layout node. In edit mode, drag or resize a fragment in the preview to write its relative `rect` into `.layout.json`; use the toolbar to set `appear`, animation effect, and font scale. The Markdown source stays semantic, while frequent visual adjustments live in the layout patch.

Add a layout file explicitly with:

```markdown
% layout: example.layout.json
```

Stable ids are recommended for visual editing:

```markdown
--- Control Equation[2]{#slide-control}

### Main Formula[zoom]{#main-formula}

![Phase portrait](../assets/figures/example.svg){#fig:phase}
```

## Docker

Docker is the easiest way to run the editor on a machine that does not have Node.js installed.

```powershell
docker compose up --build
```

Then open `http://127.0.0.1:5174/`.

The compose file mounts `./workspace` on your host to `/workspace` inside the container:

```yaml
volumes:
  - ./workspace:/workspace
```

Files saved by the editor are written back to that local `workspace` folder. Put your `.sjtu.md`, `.layout.json`, images, and bibliography files there before starting the container, or use the editor's `Import Folder` button to upload a project into the workspace.

You can also run the image manually:

```powershell
docker build -t sjtu-html-editor .
docker run --rm -p 5174:5174 -v ${PWD}/workspace:/workspace sjtu-html-editor
```

Useful environment variables:

```text
HOST=0.0.0.0
PORT=5174
SJTU_WORKSPACE=/workspace
```

If no `.sjtu.md` exists in the mounted workspace, the server seeds a copy of the bundled example. If you use the import-only sandbox flow without a persistent mount, remember to use `Export ZIP` before stopping the container.

## Markdown-Like Authoring

```markdown
% title: My Talk
% subtitle: Defense Presentation
% author: Your Name
% footer: Shanghai Jiao Tong University
% transition: fade
% bibliography: references.bib

# Background
## Model

--- Control Equation[2][0.45,0.55][transition=rise]

### Motivation[fade-up]
- Research object
- Modeling assumptions

||

### Equation[zoom]
$$ {#eq:model}
u_t + u u_x = \nu u_{xx}
$$

According to @eq:model and @cite:turing1950, we obtain the main estimate.[^note]

![Phase portrait](../assets/figures/三重根.svg){#fig:phase}

See @fig:phase.

[^note]: This is a slide-level footnote.
```

## Bibliography And Footnotes

Add a BibTeX file relative to the `.sjtu.md` source:

```markdown
% bibliography: references.bib
```

Use citations in text:

```markdown
See @cite:turing1950.
```

The builder embeds the `.bib` contents into the generated HTML. A bibliography slide is generated automatically when citations are used.

Useful options:

```markdown
% bibliography-title: References
% bibliography-position: last
% bibliography-include-uncited: false
```

Use `% bibliography-position: before-end` if you want the bibliography before the final Thanks slide.

Footnotes use standard Markdown-like labels:

```markdown
This sentence has a footnote.[^demo]

[^demo]: Footnotes are shown at the bottom of the current slide.
```

## Direct JavaScript Authoring

```html
<link rel="stylesheet" href="../core/sjtu-ppt.css">
<script src="../core/sjtu-ppt-core.js"></script>
<script>
configureSJTUTheme({
  info: {
    title: "My Talk",
    author: "Your Name"
  },
  bibliography: {
    entries: {
      turing1950: {
        author: "Turing, Alan M.",
        title: "Computing Machinery and Intelligence",
        journal: "Mind",
        year: "1950"
      }
    }
  }
});

const slides = [
  titleSlide(),
  outlineSlide(),
  sectionSlide("Model"),
  subsection("Equation"),
  slide("Control Equation",
    formula("Equation", "$$u_t + u u_x = \\nu u_{xx}$$"),
    text(`Citation ${cite("turing1950")} and footnote${footnote("A slide-level note")}.`)
  ),
  endSlide()
];

bootstrapSJTUDeck(slides);
</script>
```

## Navigation

- Arrow keys, PageUp/PageDown, Space, and Backspace move through slides and fragments.
- `F` toggles fullscreen.
- `N` toggles speaker notes.
- `R` returns to the previous reference source after jumping through a formula, figure, or citation reference.
- `P` opens the browser print workflow.

## License And Assets

The template code is released under the MIT License. Before publishing or redistributing slides, verify that any included images, logos, visual identity materials, fonts, figures, and bibliography data may be used in your context. The MIT License applies to this repository's code, but it does not automatically grant rights to third-party assets or official visual identity materials.
