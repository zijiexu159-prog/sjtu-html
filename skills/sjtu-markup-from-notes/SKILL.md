---
name: sjtu-markup-from-notes
description: Convert MinerU-generated Markdown, paper parsing text, or user notes into SJTU HTML PPT `.sjtu.md` source using the local SJTU markup syntax. Use when the user gives article notes, OCR/Markdown extraction, or a Touying/Typst outline and wants a slide-ready SJTU markup deck.
---

# SJTU Markup From Notes

Use this skill to turn rough research notes into `html-template/markdown/*.sjtu.md`.

## Workflow

1. Identify the talk goal, audience, expected length, and source language.
2. Extract a hierarchy: title, motivation, model, assumptions, main results, proof ideas, examples, experiments, conclusion.
3. Map the hierarchy to SJTU markup:
   - `#` for major sections.
   - `##` for subsection context.
   - `--- title[columns][widths]` for slides.
   - `### name[effect]` for content blocks.
   - `#### name[steps]` for step variants.
   - `||` for page-level columns.
   - `|||` for object-internal columns.
4. Preserve mathematical content exactly where possible.
5. Add labels to important equations and figures:
   - `$$ {#eq:name}`
   - `![caption](path){#fig:name}`
6. Add references with `@eq:name` and `@fig:name` only when they help the narrative.
7. Keep slides sparse. Split one dense note section into multiple slides instead of shrinking everything.
8. Build the HTML with `node core/build-sjtu-markup.js input.sjtu.md output.html`.
9. Check generated pages for overflow, broken images, unrendered formulas, and awkward columns.

## Conversion Rules

- A paper abstract usually becomes one motivation slide plus one contribution slide.
- Long derivations should become several slides with `####` step variants.
- Theorems, lemmas, propositions, and assumptions should use `::: theorem` or `::: definition`.
- Examples, cases, and numerical illustrations should use `::: example`.
- Warnings or key constraints should use `::: alert`.
- Plain equations should stay as `$$ ... $$`; use `::: formula` only when a framed equation is intended.
- Tables in source notes can be converted to compact Markdown-like text or an HTML block until table syntax is added.
- Figures should be copied under `assets/figures/` and referenced from Markdown as `../assets/figures/name.ext`.

## Slide Density

Use these limits unless the user explicitly wants dense slides:

- At most 2 columns per theorem-heavy slide.
- At most 3 content blocks per normal slide.
- At most 1 large display equation per content block.
- Prefer `#v(0.5em)` or splitting slides over overfilling a column.

## Output Checklist

- The `.sjtu.md` source starts with `% title`, `% author`, and `% footer`.
- Every `#` section has at least one content slide.
- Important equations and figures have stable labels.
- All image paths are relative to the generated HTML.
- The deck builds without JS syntax errors.
- The generated HTML is self-contained within `html-template`.

