# SJTU Slide Editor 前端美化实施计划

## Design Read

Reading this as: an existing local academic slide IDE for SJTU presentation authors, with a calm dense tooling language, leaning toward vanilla HTML/CSS plus restrained product UI polish rather than a landing page, dashboard framework, or decorative redesign.

## Taste Skill Configuration

- Source: `Leonxlnx/taste-skill`
- Installed skills:
  - `design-taste-frontend`
  - `redesign-existing-projects`
- Redesign mode: targeted evolution
- Dials:
  - `DESIGN_VARIANCE: 4`
  - `MOTION_INTENSITY: 2`
  - `VISUAL_DENSITY: 7`
- Design system decision: no React/Vue/Tailwind migration and no new component system. Use the existing vanilla HTML/CSS/JS stack.
- Theme lock: light mode only for this editor pass, using SJTU red as the single accent and warm neutral surfaces for structure.

## Current State Audit

### What to preserve

- The editor is already a three-surface IDE: `.sjtu.md`, `.layout.json`, and preview iframe.
- Existing DOM ids are part of the interaction contract and must stay stable.
- Existing server API, preview iframe behavior, source-map selection, drag, resize, snippets, save/build/import/export, and language switching must remain intact.
- The dense toolbar is functionally useful. It should be clarified, not replaced with a marketing-style navigation.

### What to retire

- Toolbar controls currently read as a long flat strip.
- Buttons use one heavy filled red treatment too broadly.
- The source and layout editors look like plain textareas rather than editing surfaces.
- Preview iframe lacks a canvas/workbench feeling.
- Object controls do not clearly communicate selected vs empty state.
- Status and file-path text compete with primary actions.
- Focus, disabled, hover, loading, and error states are under-specified.

## Implementation Plan

### 1. Visual tokens

- Add semantic CSS variables in `editor/editor.css` for ink, muted text, SJTU red, warm gray backgrounds, borders, focus ring, success, warning, and danger.
- Keep one accent family: SJTU red and red-brown only.
- Avoid AI-purple, blue glows, large decorative gradients, glassmorphism, decorative dots, and heavy shadows.
- Set a consistent radius scale:
  - Panels: 8px
  - Buttons and inputs: 6px
  - Status pills only when semantic status needs compact emphasis.

### 2. Toolbar

- Keep the current toolbar structure and ids, but visually group controls into project, build, view, object, and insert clusters.
- Make `save-button` the only primary filled red button.
- Make open, build, export, import, and snippet buttons quieter secondary actions.
- Keep desktop toolbar to one visual row where possible; if it wraps below about 1100px, buttons must remain readable and not squeeze text.
- Move status and current file path into a quieter status area that does not steal focus from save/build.

### 3. Editor panels

- Style `.sjtu.md` and `.layout.json` panels as code work surfaces.
- Use monospace font, stronger focus state, and subtle warm off-white background.
- Keep native `textarea` for v1. Do not introduce CodeMirror/Monaco in this pass.
- Add clear panel titles and hints, but keep them compact.

### 4. Preview canvas

- Wrap the iframe in a neutral slide-canvas stage.
- Keep iframe background white and avoid dark preview chrome.
- Make selected-object text visible in the preview panel title.
- Preserve iframe sizing and all `wirePreview()` behavior.

### 5. Object state and controls

- Add an explicit empty state for object controls:
  - Inputs disabled until an object is selected.
  - Apply button disabled until an object is selected.
  - Selection label says "未选择对象" / "No selection".
- When selected, show `slideId / editorId` as currently implemented.
- Do not rename `appear-input`, `effect-select`, `font-scale-input`, or `apply-style-button`.

### 6. Interaction polish

- Add hover, active, focus-visible, disabled, success, warning, and error states.
- Use only transform/opacity for transitions.
- Motion level is low: no automatic animated decoration, no scroll effects, no perpetual loops.
- Respect reduced motion by keeping transitions short and non-essential.

### 7. Language and copy

- Keep Chinese as default and English as optional.
- Ensure all new visible strings exist in both language tables.
- Avoid poetic labels, fake status wording, exclamation marks, and decorative separators.
- Use direct status text: "正在保存...", "已保存", "构建失败", "请选择对象".

### 8. Responsive behavior

- Desktop: left column contains the two editors, right column contains preview.
- Read mode: preview moves left, editors stack on the right as existing behavior intends.
- Narrow screen: panels stack vertically, toolbar wraps, no horizontal overflow.
- Validate at 1280px desktop, wide desktop, and a narrow viewport around 820px.

## Non-goals

- Do not redesign the slide template itself.
- Do not rewrite the editor in React/Vue.
- Do not add a large component library.
- Do not change `.sjtu.md` syntax, `.layout.json` schema, server API, or build pipeline.
- Do not remove or rename existing ids used by `editor/editor.js`.
- Do not modify `workspace/`, which is a local runtime artifact.

## Files to touch in the future implementation

- `editor/index.html`
- `editor/editor.css`
- `editor/editor.js`
- Optional: `editor/README.md` if documenting visual editor usage changes becomes necessary.

## Acceptance Checklist

- `npm run check:js` passes.
- `npm run editor` starts with an available port.
- Existing flows still work:
  - file select and open
  - save and build
  - build only
  - import folder
  - export ZIP
  - edit/read mode switch
  - language switch
  - preview iframe loading
  - object click selection
  - source/layout jump
  - drag/resize layout writeback
  - step/effect/fontScale controls
  - formula/theorem/figure/step snippet insertion
- Desktop toolbar is readable and does not wrap at 1280px unless unavoidable.
- Narrow layout has no horizontal overflow.
- Button labels do not wrap on desktop.
- Focus rings are visible.
- Disabled object controls clearly read as unavailable.
- No em dash characters in newly added visible UI strings.
- No decorative dots unless they represent real state.
- No purple/blue AI gradient or generic glass effect.

## Suggested implementation order

1. Restore baseline and confirm clean tracked editor files.
2. Apply CSS token system and button hierarchy.
3. Adjust HTML grouping while preserving ids.
4. Add minimal JS empty-state and status-class behavior.
5. Run static check.
6. Start editor locally and inspect desktop screenshot.
7. Inspect narrow screenshot.
8. Test one preview object selection and one layout writeback.
9. Document any remaining visual debt before committing.
