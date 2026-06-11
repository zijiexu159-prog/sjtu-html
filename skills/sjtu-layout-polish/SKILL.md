---
name: sjtu-layout-polish
description: Review and polish SJTU HTML PPT decks, including `.sjtu.md` source, generated HTML, columns, fixed content slots, formulas, figures, animations, and theme consistency. Use when the user asks to improve layout, fix overflow, make slides prettier, or verify the deck visually.
---

# SJTU Layout Polish

Use this skill when polishing an existing SJTU HTML PPT deck.

## Workflow

1. Inspect the source file and generated HTML.
2. Build or rebuild generated pages:
   - `node core/build-sjtu-markup.js markdown/example.sjtu.md markdown/example.html`
   - or the specific source/output pair requested by the user.
3. Check static references:
   - CSS/JS should point to `../core/...`.
   - images should point to `../assets/...`.
4. Run JS syntax checks:
   - `npm run check:js`
5. Open the generated HTML when browser tooling is available.
6. Review these slide qualities:
   - no overflow beyond the 16:9 page;
   - header line and SJTU art align cleanly;
   - subsection/page title reads as `subsection: slide title`, unless identical;
   - formulas are centered and MathJax-rendered;
   - list bullets render correctly;
   - columns preserve intended proportions;
   - content slots do not jump between animation steps;
   - image zoom and reference-return shortcut work.
7. Apply small, local edits. Prefer source `.sjtu.md` changes before CSS changes.
8. Regenerate HTML and re-check.

## Layout Tactics

- Use `--- title[2][0.42,0.58]` for text plus formula or figure.
- Use `||[2][0.4,0.6]` when a column needs stable vertical regions.
- Use `|||` for object-internal comparisons.
- Use `#v(0.5em)` for tiny vertical adjustment inside a step.
- Split slides when more than one theorem and one large formula compete for space.
- For dense formula slides, leave formulas unboxed unless the frame itself carries meaning.
- Use red-brown block variants already defined by `.theorem-card`, `.example-card`, `.definition-card`, `.formula-card`, `.note-card`, and `.proof-card`.

## Animation Tactics

- Use `fade-up` for ordinary reveal.
- Use `slide-right` or `slide-left` for entrance from outside the page.
- Use `zoom` for a final result or highlighted object.
- Use `blur` sparingly for secondary notes.
- Use `move-between` only when the same idea/object is intentionally moving between positions.
- Give `####` variants explicit ranges when replacing content, for example `#### old[1]` and `#### new[2]`.

## CSS Guardrails

- Keep the SJTU red-brown palette unless the user requests otherwise.
- Do not add large decorative cards around whole page sections.
- Prefer CSS variables over broad selector rewrites.
- Avoid changing `core/` behavior when a source-level layout fix is enough.
- If a change affects all decks, document it in `reference/api-css-reference.md`.

## Final Verification

Report:

- which source files changed;
- which generated HTML files were rebuilt;
- whether static reference checks passed;
- whether browser/visual verification was possible;
- any remaining layout risks.

