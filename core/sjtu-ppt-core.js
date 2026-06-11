const sjtuTheme = mergeTheme({
  transition: "fade",
  footer: "上海交通大学",
  mathjax: {
    local: "vendor/mathjax/tex-svg.js",
    cdn: "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js",
  },
  cssVars: {},
  info: {
    title: "SJTU HTML PPT",
    subtitle: "",
    author: "",
    date: new Date().toLocaleDateString("zh-CN"),
    institution: "Shanghai Jiao Tong University",
  },
}, window.sjtuTheme || {});

window.sjtuTheme = sjtuTheme;

const sjtuCoreScriptUrl = document.currentScript?.src
  || document.querySelector('script[src$="sjtu-ppt-core.js"]')?.src
  || document.baseURI;

const sjtuDefaults = mergeTheme({
  slide: { layout: "one" },
  figure: { zoomable: true },
  formula: {},
  code: { language: "js" },
  fragment: { effect: "fade-up" },
  grid: {},
  theorem: {},
  example: {},
  definition: {},
  alert: {},
  note: {},
  proof: {},
}, window.sjtuDefaults || {});

window.sjtuDefaults = sjtuDefaults;

function configureSJTUTheme(options = {}) {
  mergeTheme(sjtuTheme, options);
  applyThemeCSSVars();
  return sjtuTheme;
}

function setDefaults(kind, options) {
  if (typeof kind === "string") {
    sjtuDefaults[kind] = mergeTheme(sjtuDefaults[kind] || {}, options || {});
  } else {
    mergeTheme(sjtuDefaults, kind || {});
  }
  return sjtuDefaults;
}

function titleSlide(info = {}) {
  return { type: "title", variant: "red", info };
}

function outlineSlide(title = "目录") {
  return { type: "outline", title };
}

function sectionSlide(section) {
  return { type: "section", section: normalizeSectionTitle(section) };
}

function subsection(title) {
  return { type: "subsection", subsection: title };
}

const subsectionSlide = subsection;

function slide(options = {}, ...fragments) {
  if (typeof options === "string") {
    const extraOptions = isSlideOptions(fragments[0]) ? fragments.shift() : {};
    options = { ...extraOptions, title: options };
  }
  return { type: "slide", ...sjtuDefaults.slide, ...options, fragments: fragments.flat() };
}

const oneSlide = (title, ...fragments) => slide(title, { layout: "one" }, ...fragments);
const twoSlide = (title, ...fragments) => slide(title, { layout: "two" }, ...fragments);
const asideSlide = (title, ...fragments) => slide(title, { layout: "aside" }, ...fragments);

function focusSlide(text) {
  return { type: "focus", text };
}

function endSlide(text = "Thanks for Listening!") {
  return { type: "end", text };
}

function list(...items) {
  return { kind: "list", items: items.flat() };
}

function figure(label, options = {}) {
  return { kind: "figure", ...sjtuDefaults.figure, label, ...options };
}

function columns(...items) {
  return { kind: "columns", items: items.flat() };
}

function columnFlow(items = [], options = {}) {
  return { kind: "column-flow", items, ...options };
}

function contentGroup(title, items = [], options = {}) {
  return { kind: "content-group", title, items, ...options };
}

function stepVariant(title, items = [], options = {}) {
  return { kind: "step-variant", title, items, ...options };
}

function vSpace(size = "1em") {
  return { kind: "vspace", size: normalizeCssLength(size), appear: 0 };
}

function grid(items = [], options = {}) {
  return { kind: "grid", ...sjtuDefaults.grid, items, ...options };
}

function equationCompare(left, right, options = {}) {
  return { kind: "equation-compare", left, right, ...options };
}

function quoteBlock(body, source = "") {
  return { kind: "quote", body, source };
}

function block(kind, title, body, options = {}) {
  return { kind, ...(sjtuDefaults[kind] || {}), title, body, ...options };
}

const formula = (title, body, options = {}) => block("formula", title, body, { ...sjtuDefaults.formula, ...options });
const eqRef = (label, text = "") => `[[eqref:${label}|${text}]]`;
const figureRef = (label, text = "") => `[[figref:${label}|${text}]]`;
const theorem = (title, body, options = {}) => block("theorem", title, body, options);
const example = (title, body, options = {}) => block("example", title, body, options);
const definition = (title, body, options = {}) => block("definition", title, body, options);
const alertBlock = (title, body, options = {}) => block("alert", title, body, options);
const note = (title, body, options = {}) => block("note", title, body, options);
const proof = (title, body, options = {}) => block("proof", title, body, options);
const text = (body, options = {}) => ({ kind: "text", body, ...options });
const strong = (body) => inlineCommand("strong", body);
const emph = (body) => inlineCommand("emph", body);
const muted = (body) => inlineCommand("muted", body);
const mark = (body) => inlineCommand("mark", body);
const inlineMath = (body) => inlineCommand("math", body);
const link = (body, href) => inlineCommand("link", body, href);
const html = (body) => ({ kind: "html", body });
const code = (body, options = {}) => ({ kind: "code", body, ...sjtuDefaults.code, ...options });
const pause = (steps = 1) => ({ kind: "pause", steps });
const frag = (content, options = {}) => ({ ...sjtuDefaults.fragment, ...normalizeFragment(content), ...options });
const uncover = (step, content, options = {}) => frag(content, { ...options, appear: step });
const only = (step, content, options = {}) => frag(content, { ...options, appear: step, disappear: step });
const moveBetween = (content, options = {}) => frag(content, {
  effect: "move-between",
  appear: 1,
  moveAt: 2,
  from: "left",
  to: "center",
  ...options,
});
const speakerNotes = (...lines) => ({ kind: "speaker-notes", body: lines.flat().join("\n") });

const slideTransitions = new Set(["fade", "slide", "rise", "zoom", "none"]);

function setSlideTransition(name = "fade") {
  const deck = document.querySelector("#deck");
  const transition = slideTransitions.has(name) ? name : "fade";
  if (deck) deck.dataset.transition = transition;
  return transition;
}

function printSlides() {
  window.print();
}

function bootstrapSJTUDeck(slides) {
  configureSJTUTheme(window.sjtuTheme || {});
  loadSJTuMathJax();
  slides = normalizeDeck(slides);
  const equationRegistry = collectEquationRegistry(slides);
  const figureRegistry = collectFigureRegistry(slides);
  const deck = document.querySelector("#deck");
  const status = document.querySelector("#slide-status");
  const prevButton = document.querySelector("#prev-slide");
  const nextButton = document.querySelector("#next-slide");
  const fullscreenButton = document.querySelector("#toggle-fullscreen");
  const sections = collectSections(slides);
  const state = { index: 0, step: 0, renderedIndex: -1 };
  const notesPanel = createSpeakerNotesPanel();
  const referenceReturnStack = [];

  function collectSections(items) {
    const map = new Map();
    for (const item of items) {
      if (item.type === "subsection") continue;
      if (!item.section) continue;
      if (!map.has(item.section)) map.set(item.section, new Set());
      if (item.subsection) map.get(item.section).add(item.subsection);
    }
    return Array.from(map, ([title, subsectionSet], index) => ({
      title,
      index,
      label: `${toChineseSectionNumber(index + 1)}、${title}`,
      subsections: Array.from(subsectionSet),
    }));
  }

  function renderDeck() {
    deck.innerHTML = "";
    deck.appendChild(createFigureZoomOverlay());
    deck.appendChild(notesPanel);
    slides.forEach((item, index) => {
      if (item.type === "subsection") return;
      const node = document.createElement("article");
      node.className = "slide";
      node.dataset.index = index;
      node.dataset.layout = getLayout(item);
      node.dataset.transition = item.transition || "";
      node.innerHTML = renderSlide(prepareSlide(item), index);
      deck.appendChild(node);
    });
    bindFigureZoom();
    bindReferenceLinks();
    renderCurrent();
    typesetMath();
  }

  function getLayout(item) {
    if (item.type === "title" && item.variant === "red") return "title-red";
    return item.type;
  }

  function renderSlide(item, index) {
    if (item.type === "title") return renderTitle(item);
    if (item.type === "outline") return renderOutline(item);
    if (item.type === "section") return renderSection(item);
    if (item.type === "focus") return `<div class="focus-copy">${escapeHtml(item.text)}</div>`;
    if (item.type === "end") return renderEnd(item);
    return renderContentSlide(item, index);
  }

  function renderTitle(item) {
    const info = { ...sjtuTheme.info, ...item.info };
    return `
      <div class="red-title-band">
        <h1>${escapeHtml(info.title)}</h1>
        <h2>${escapeHtml(info.subtitle || "")}</h2>
        <div class="red-title-meta">
          <div>
            <div>${escapeHtml(info.author || "")}</div>
            <div>${escapeHtml(info.date || "")}</div>
            <div>${escapeHtml(info.institution || "")}</div>
          </div>
          <img class="red-title-logo" src="${resolveTemplateAsset("../assets/vi/sjtu-vi-logo-white.png")}" alt="SJTU logo">
        </div>
      </div>
    `;
  }

  function renderOutline(item) {
    const entries = sections.map((section) => `
      <li>
        <div class="outline-section">${escapeHtml(section.title)}</div>
        <ul class="outline-subsections">
          ${section.subsections.map((subsection) => `<li>${escapeHtml(subsection)}</li>`).join("")}
        </ul>
      </li>
    `).join("");
    return `
      <div class="outline ${getOutlineClass(sections.length)}">
        <h1>${escapeHtml(item.title || "目录")}</h1>
        <ol class="outline-list">${entries}</ol>
      </div>
    `;
  }

  function getOutlineClass(count) {
    if (count <= 3) return "outline--sparse";
    if (count >= 7) return "outline--dense";
    return "outline--normal";
  }

  function renderSection(item) {
    const section = sections.find((entry) => entry.title === item.section);
    const subsections = section?.subsections ?? [];
    return `
      <div class="section-wrap">
        <h1 class="section-title">${escapeHtml(section?.label || item.section)}</h1>
        <div class="section-rule"></div>
        <ol class="section-sublist">
          ${subsections.map((subsection) => `<li>${escapeHtml(subsection)}</li>`).join("")}
        </ol>
      </div>
    `;
  }

function renderContentSlide(item, index) {
    const fragments = getVisualFragments(item);
    return `
      ${renderMiniSlides(item)}
      <div class="slide-body">
        ${renderSlideTitleBlock(item)}
        <div class="content-grid ${escapeHtml(item.layout || "one")}" ${renderContentGridStyle(item)}>
          ${fragments.map((fragment, fragmentIndex) => renderFragment(fragment, fragmentIndex)).join("")}
        </div>
      </div>
      ${renderFooter(index)}
    `;
  }

  function renderSlideTitleBlock(item) {
    const subsection = String(item.subsection || "").trim();
    const title = String(item.title || "").trim();
    const displayTitle = buildContentSlideTitle(subsection, title, item.section);
    return `
      <div class="slide-title-block">
        <h1 class="slide-title">${escapeHtml(displayTitle)}</h1>
      </div>
    `;
  }

  function renderContentGridStyle(item) {
    if (!item.columns && !item.widths) return "";
    const columns = Math.max(1, Number(item.columns) || item.widths?.length || 1);
    const widths = normalizeColumnWidths(item.widths, columns);
    return `style="--content-columns: ${escapeAttribute(widths.map((width) => `${width}fr`).join(" "))}"`;
  }

  function renderMiniSlides(item) {
    const section = sections.find((entry) => entry.title === item.section);
    const subsections = section?.subsections ?? [];
    const active = subsections.indexOf(item.subsection);
    const sectionIndex = sections.findIndex((entry) => entry.title === item.section);
    const prevSection = sectionIndex > 0 ? sections[sectionIndex - 1] : null;
    const nextSection = sectionIndex >= 0 && sectionIndex < sections.length - 1 ? sections[sectionIndex + 1] : null;
    return `
      <header class="slide-header">
        <div class="mini-nav-row">
          <div class="mini-adjacent mini-prev">
            <div class="mini-side-label">${escapeHtml(prevSection?.label || "")}</div>
            ${renderSideDots(prevSection, true)}
          </div>
          <div class="mini-current">
            <div class="mini-heading">${escapeHtml(section?.label || item.section || "")}</div>
            <div class="mini-dots" aria-label="Subsection progress">
              ${subsections.map((_, index) => `<span class="mini-dot ${index <= active ? "is-done" : ""}"></span>`).join("")}
            </div>
          </div>
          <div class="mini-adjacent mini-next">
            <div class="mini-side-label">${escapeHtml(nextSection?.label || "")}</div>
            ${renderSideDots(nextSection, false)}
          </div>
        </div>
      </header>
    `;
  }

  function renderSideDots(section, done) {
    if (!section || section.subsections.length === 0) return "";
    return `
      <div class="mini-side-dots">
        ${section.subsections.map(() => `<span class="mini-side-dot ${done ? "is-done" : ""}"></span>`).join("")}
      </div>
    `;
  }

  function renderFooter(index) {
    return `
      <footer class="slide-footer">
        <span>${escapeHtml(sjtuTheme.footer)}</span>
        <span>${index + 1} / ${slides.length}</span>
      </footer>
    `;
  }

  function renderFragment(fragment, index) {
    const effect = fragment.effect || "fade-up";
    return `
      <div
        class="fragment"
        data-fragment="${index}"
        data-appear="${escapeAttribute(fragment.appear)}"
        data-disappear="${escapeAttribute(fragment.disappear ?? "")}"
        data-move-at="${escapeAttribute(fragment.moveAt ?? "")}"
        data-effect="${escapeAttribute(effect)}"
        ${renderMotionId(fragment)}
        style="${renderMotionStyle(fragment)}"
      >${renderFragmentBody(fragment)}</div>
    `;
  }

  function renderMotionId(fragment) {
    const id = fragment.motionId || fragment.move;
    return id ? `data-motion-id="${escapeAttribute(id)}"` : "";
  }

  function renderFragmentBody(fragment) {
    if (fragment.kind === "list") {
      return `<ul class="lead-list">${fragment.items.map((item) => `<li>${renderRichText(item)}</li>`).join("")}</ul>`;
    }
    if (fragment.kind === "columns") {
      return `<div class="inner-columns">${fragment.items.map((item) => `<div>${renderFragmentBody(normalizeFragment(item))}</div>`).join("")}</div>`;
    }
    if (fragment.kind === "column-flow") {
      const count = Math.max(1, Number(fragment.columns) || fragment.items.length || 1);
      const widths = normalizeColumnWidths(fragment.widths, count);
      const groups = Array.from({ length: count }, (_, index) => fragment.items[index] || []);
      return `
        <div class="column-flow ${fragment.nested ? "is-nested" : ""}" style="--column-flow-widths: ${escapeAttribute(widths.map((width) => `${width}fr`).join(" "))}">
          ${groups.map((group, index) => renderColumnFlowColumn(group, fragment.specs?.[index])).join("")}
        </div>
      `;
    }
    if (fragment.kind === "content-group") {
      return `
        <section class="content-group">
          <div class="content-group-body">
            ${renderContentGroupItems(fragment.items)}
          </div>
        </section>
      `;
    }
    if (fragment.kind === "step-variant") {
      return `
        <section class="step-variant">
          <div class="step-variant-body">
            ${fragment.items.map((item) => renderFragmentBody(normalizeFragment(item))).join("")}
          </div>
        </section>
      `;
    }
    if (fragment.kind === "vspace") {
      return `<div class="vspace" style="--vspace-size: ${escapeAttribute(normalizeCssLength(fragment.size))}"></div>`;
    }
    if (fragment.kind === "grid") {
      const count = Math.max(1, Number(fragment.columns || fragment.items.length || 1));
      return `
        <div class="inner-grid" style="--inner-grid-columns: ${escapeAttribute(count)}">
          ${fragment.items.map((item) => `<div>${renderFragmentBody(normalizeFragment(item))}</div>`).join("")}
        </div>
      `;
    }
    if (fragment.kind === "equation-compare") {
      return `
        <div class="equation-compare">
          <div>
            ${fragment.leftLabel ? `<h3>${escapeHtml(fragment.leftLabel)}</h3>` : ""}
            <div class="equation-cell">${escapeHtml(fragment.left)}</div>
          </div>
          <div>
            ${fragment.rightLabel ? `<h3>${escapeHtml(fragment.rightLabel)}</h3>` : ""}
            <div class="equation-cell">${escapeHtml(fragment.right)}</div>
          </div>
        </div>
      `;
    }
    if (fragment.kind === "quote") {
      return `
        <figure class="quote-card">
          <blockquote>${escapeHtml(fragment.body)}</blockquote>
          ${fragment.source ? `<figcaption>${escapeHtml(fragment.source)}</figcaption>` : ""}
        </figure>
      `;
    }
    if (fragment.kind === "figure") {
      const zoomable = fragment.zoomable !== false && Boolean(fragment.src);
      const refKey = getFigureRefKey(fragment);
      const id = refKey ? `figure-${safeDomId(refKey)}` : "";
      const caption = renderFigureCaption(fragment);
      const media = fragment.src
        ? `<img src="${escapeAttribute(fragment.src)}" alt="${escapeAttribute(fragment.label || "")}">`
        : `<div>${escapeHtml(fragment.label)}</div>`;
      return `
        <div ${id ? `id="${id}"` : ""}>
          <div
            class="figure-card ${zoomable ? "is-zoomable" : ""}"
            ${zoomable ? `data-zoom-src="${escapeAttribute(fragment.src)}" data-zoom-caption="${escapeAttribute(caption || fragment.caption || fragment.label || "")}"` : ""}
            ${zoomable ? 'role="button" tabindex="0" aria-label="放大图片"' : ""}
          >${media}</div>
          ${caption ? `<div class="caption">${escapeHtml(caption)}</div>` : ""}
        </div>
      `;
    }
    const blockKinds = {
      formula: "formula-card",
      theorem: "theorem-card",
      example: "example-card",
      definition: "definition-card",
      alert: "alert-card",
      note: "note-card",
      proof: "proof-card",
    };
    if (fragment.kind === "formula") return renderFormulaBlock(fragment);
    if (blockKinds[fragment.kind]) return renderBlock(blockKinds[fragment.kind], fragment);
    if (fragment.kind === "text") return `<div class="text-block">${renderRichText(fragment.body)}</div>`;
    if (fragment.kind === "html") return `<div class="card html-card">${fragment.body}</div>`;
    if (fragment.kind === "code") return renderCode(fragment);
    return `<div class="card">${escapeHtml(fragment.body || "")}</div>`;
  }

  function renderColumnFlowColumn(group, spec = {}) {
    if (!spec?.slots) {
      return `
        <div class="column-flow-column">
          ${group.map((item) => renderColumnFlowItem(item)).join("")}
        </div>
      `;
    }
    const slotCount = Math.max(Number(spec.slots) || 1, group.length);
    const heights = normalizeColumnWidths(spec.heights, slotCount);
    const rows = heights.map((height) => `${height}fr`).join(" ");
    return `
      <div class="column-flow-column has-slots" style="--column-slot-rows: ${escapeAttribute(rows)}">
        ${Array.from({ length: slotCount }, (_, index) => `
          <div class="column-flow-slot">
            <div class="column-slot-content">${group[index] ? renderColumnFlowItem(group[index]) : ""}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderColumnFlowItem(item) {
    const normalized = normalizeFragment(item);
    return normalized.kind === "content-group" ? renderNestedFragment(normalized) : renderFragmentBody(normalized);
  }

  function renderContentGroupItems(items = []) {
    let html = "";
    let variants = [];
    const flushVariants = () => {
      if (!variants.length) return;
      html += `<div class="step-variant-stack">${variants.map((item) => renderNestedFragment(item)).join("")}</div>`;
      variants = [];
    };
    items.forEach((item) => {
      const normalized = normalizeFragment(item);
      if (normalized.kind === "step-variant") {
        variants.push(normalized);
        return;
      }
      flushVariants();
      html += renderFragmentBody(normalized);
    });
    flushVariants();
    return html;
  }

  function renderBlock(className, fragment) {
    return `<section class="beamer-block ${className}"><h3>${escapeHtml(fragment.title)}</h3><p>${renderRichText(fragment.body)}</p></section>`;
  }

  function renderNestedFragment(fragment) {
    return `
      <div
        class="fragment nested-fragment"
        data-appear="${escapeAttribute(fragment.appear ?? 1)}"
        data-disappear="${escapeAttribute(fragment.disappear ?? "")}"
        data-move-at="${escapeAttribute(fragment.moveAt ?? "")}"
        data-effect="${escapeAttribute(fragment.effect || "fade-up")}"
        ${renderMotionId(fragment)}
        style="${renderMotionStyle(fragment)}"
      >${renderFragmentBody(fragment)}</div>
    `;
  }

  function renderFormulaBlock(fragment) {
    const id = fragment.label ? `equation-${safeDomId(fragment.label)}` : "";
    if (fragment.boxed === false) {
      return `
        <section class="plain-formula" ${id ? `id="${id}"` : ""}>
          <div class="formula-body">
            <div class="formula-content">${renderRichText(fragment.body)}</div>
            <span class="equation-number">(${fragment.equationNumber})</span>
          </div>
        </section>
      `;
    }
    return `
      <section class="beamer-block formula-card" ${id ? `id="${id}"` : ""}>
        <h3>${escapeHtml(fragment.title)}</h3>
        <div class="formula-body">
          <div class="formula-content">${renderRichText(fragment.body)}</div>
          <span class="equation-number">(${fragment.equationNumber})</span>
        </div>
      </section>
    `;
  }

  function renderCode(fragment) {
    const language = fragment.language || "text";
    return `<pre class="code-card" data-language="${escapeAttribute(language)}"><code>${highlightCode(fragment.body, language)}</code></pre>`;
  }

  function renderRichText(value = "") {
    const rendered = escapeHtml(value)
      .replace(/\[\[eqref:([^|\]]+)\|([^\]]*)\]\]/g, (_, label, customText) => {
      const equation = equationRegistry.get(label);
      const text = customText || (equation ? `式 (${equation.number})` : "式 (?)");
      if (!equation) return `<span class="equation-ref is-missing">${escapeHtml(text)}</span>`;
      return `<a class="equation-ref sjtu-ref" href="#slide-${equation.slideIndex + 1}.${equation.appear}">${escapeHtml(text)}</a>`;
      })
      .replace(/\[\[figref:([^|\]]+)\|([^\]]*)\]\]/g, (_, label, customText) => {
        const figure = figureRegistry.get(label);
        const text = customText || (figure ? `图 ${figure.number}` : "图 ?");
        if (!figure) return `<span class="figure-ref is-missing">${escapeHtml(text)}</span>`;
        return `<a class="figure-ref sjtu-ref" href="#slide-${figure.slideIndex + 1}.${figure.appear}">${escapeHtml(text)}</a>`;
      })
      .replace(/\[\[sjtu:([^:]+):([^:\]]*)(?::([^\]]*))?\]\]/g, (_, kind, encodedBody, encodedExtra) => {
        const body = escapeHtml(decodeInline(encodedBody));
        const extra = decodeInline(encodedExtra || "");
        if (kind === "link") return `<a class="inline-link" href="${escapeAttribute(extra)}">${body}</a>`;
        if (kind === "math") return `<span class="inline-math">\\(${body}\\)</span>`;
        if (["strong", "emph", "muted", "mark"].includes(kind)) return `<span class="inline-${kind}">${body}</span>`;
        return body;
      });
    return renderInlineDollarMath(rendered);
  }

  function buildContentSlideTitle(subsection, title, section) {
    if (!subsection) return title || section || "";
    if (!title || title === subsection) return subsection;
    if (new RegExp(`^${escapeRegExp(subsection)}\\s*[:：]\\s*`).test(title)) return title;
    return `${subsection}：${title}`;
  }

  function renderFigureCaption(fragment) {
    const caption = fragment.caption || "";
    if (!fragment.figureNumber) return caption;
    const body = caption || fragment.label || "";
    return body ? `图 ${fragment.figureNumber}：${body}` : `图 ${fragment.figureNumber}`;
  }

  function renderInlineDollarMath(html = "") {
    let output = "";
    let index = 0;
    while (index < html.length) {
      if (html[index] === "<") {
        const tagEnd = html.indexOf(">", index + 1);
        if (tagEnd === -1) break;
        output += html.slice(index, tagEnd + 1);
        index = tagEnd + 1;
        continue;
      }
      if (html[index] === "$" && html[index + 1] === "$") {
        const close = html.indexOf("$$", index + 2);
        if (close !== -1) {
          output += html.slice(index, close + 2);
          index = close + 2;
          continue;
        }
      }
      if (html[index] === "$" && html[index + 1] !== "$" && html[index - 1] !== "$" && html[index - 1] !== "\\") {
        const close = findInlineMathClose(html, index + 1);
        if (close !== -1) {
          const body = html.slice(index + 1, close);
          if (body.trim() && !body.includes("<")) {
            output += `<span class="inline-math">\\(${body}\\)</span>`;
            index = close + 1;
            continue;
          }
        }
      }
      output += html[index];
      index += 1;
    }
    return output + html.slice(index);
  }

  function findInlineMathClose(html, start) {
    for (let index = start; index < html.length; index += 1) {
      if (html[index] !== "$") continue;
      if (html[index - 1] === "\\" || html[index - 1] === "$" || html[index + 1] === "$") continue;
      return index;
    }
    return -1;
  }

  function renderEnd(item) {
    return `
      <div class="end-wrap">
        <img src="${resolveTemplateAsset("../assets/vi/sjtu-vi-logo-ud.png")}" alt="SJTU logo">
        <div class="end-text">${escapeHtml(item.text)}</div>
      </div>
    `;
  }

  function createFigureZoomOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "figure-zoom-overlay";
    overlay.innerHTML = `
      <div class="figure-zoom-inner">
        <img alt="">
        <div class="figure-zoom-caption"></div>
      </div>
    `;
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeFigureZoom();
    });
    return overlay;
  }

  function createSpeakerNotesPanel() {
    const panel = document.createElement("aside");
    panel.className = "speaker-notes-panel";
    panel.setAttribute("aria-live", "polite");
    panel.innerHTML = `
      <div class="speaker-notes-title">Speaker Notes</div>
      <div class="speaker-notes-body"></div>
    `;
    return panel;
  }

  function bindFigureZoom() {
    deck.querySelectorAll(".figure-card.is-zoomable").forEach((card) => {
      card.addEventListener("click", () => openFigureZoom(card));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openFigureZoom(card);
        }
      });
    });
  }

  function bindReferenceLinks() {
    if (deck.dataset.refLinksBound) return;
    deck.dataset.refLinksBound = "true";
    deck.addEventListener("click", (event) => {
      const link = event.target.closest?.("a.sjtu-ref");
      if (!link || !deck.contains(link)) return;
      const target = link.getAttribute("href") || "";
      if (!target.startsWith("#slide-")) return;
      const current = getCurrentHash();
      if (target !== current) referenceReturnStack.push(current);
    });
  }

  function openFigureZoom(card) {
    const overlay = deck.querySelector(".figure-zoom-overlay");
    const img = overlay.querySelector("img");
    const caption = overlay.querySelector(".figure-zoom-caption");
    overlay._sourceCard = card;
    overlay._zoomAnimation?.cancel();
    img.src = card.dataset.zoomSrc;
    img.alt = card.dataset.zoomCaption || "";
    caption.textContent = card.dataset.zoomCaption || "";
    caption.style.display = card.dataset.zoomCaption ? "block" : "none";
    overlay.classList.add("is-open");
    const animate = () => {
      const source = card.querySelector("img") || card;
      const transform = getFigureZoomTransform(source, img);
      const inner = overlay.querySelector(".figure-zoom-inner");
      if (!inner.animate) return;
      overlay._zoomAnimation = inner.animate([
        { opacity: 0.72, transform },
        { opacity: 1, transform: "translate(0, 0) scale(1)" },
      ], {
        duration: 420,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      });
    };
    if (img.decode) img.decode().catch(() => {}).then(() => window.requestAnimationFrame(animate));
    else window.requestAnimationFrame(animate);
  }

  function closeFigureZoom() {
    const overlay = deck.querySelector(".figure-zoom-overlay");
    if (!overlay?.classList.contains("is-open")) return;
    const inner = overlay.querySelector(".figure-zoom-inner");
    const img = overlay.querySelector("img");
    const source = overlay._sourceCard?.querySelector("img") || overlay._sourceCard;
    overlay._zoomAnimation?.cancel();
    if (!source?.isConnected || !inner.animate) {
      overlay.classList.remove("is-open");
      return;
    }
    overlay._zoomAnimation = inner.animate([
      { opacity: 1, transform: "translate(0, 0) scale(1)" },
      { opacity: 0.72, transform: getFigureZoomTransform(source, img) },
    ], {
      duration: 320,
      easing: "cubic-bezier(0.4, 0, 0.8, 0.2)",
      fill: "both",
    });
    overlay._zoomAnimation.finished.catch(() => {}).then(() => {
      overlay.classList.remove("is-open");
      overlay._zoomAnimation?.cancel();
      overlay._zoomAnimation = null;
      overlay._sourceCard = null;
    });
  }

  function getFigureZoomTransform(source, target) {
    const from = source.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    if (!from.width || !from.height || !to.width || !to.height) return "translate(0, 0) scale(0.25)";
    const x = from.left + from.width / 2 - (to.left + to.width / 2);
    const y = from.top + from.height / 2 - (to.top + to.height / 2);
    const scale = Math.min(from.width / to.width, from.height / to.height);
    return `translate(${x}px, ${y}px) scale(${scale})`;
  }

  function getCurrentHash() {
    return `#slide-${state.index + 1}.${state.step}`;
  }

  function returnToReferenceSource() {
    const hash = referenceReturnStack.pop();
    if (!hash) return;
    location.hash = hash;
  }

  function renderCurrent() {
    const nodes = getSlideNodes();
    const previousSlide = state.renderedIndex >= 0 ? nodes[state.renderedIndex] : null;
    const currentSlide = nodes[state.index];
    setSlideTransition(currentSlide?.dataset.transition || sjtuTheme.transition);
    const slideChanged = previousSlide && previousSlide !== currentSlide;
    if (slideChanged && deck.dataset.transition !== "none") {
      previousSlide.classList.add("is-leaving");
      window.setTimeout(() => previousSlide.classList.remove("is-leaving"), 360);
    }
    nodes.forEach((node, index) => {
      node.classList.toggle("is-active", index === state.index);
      if (node !== previousSlide) node.classList.remove("is-leaving");
    });
    state.renderedIndex = state.index;
    const motionRects = collectMotionRects(currentSlide);
    getCurrentFragments().forEach((fragment) => {
      const appear = Number(fragment.dataset.appear || 1);
      const disappear = fragment.dataset.disappear === "" ? Infinity : Number(fragment.dataset.disappear);
      fragment.classList.toggle("is-visible", state.step >= appear && state.step <= disappear);
      const moveAt = fragment.dataset.moveAt === "" ? Infinity : Number(fragment.dataset.moveAt);
      fragment.classList.toggle("is-moved", state.step >= moveAt);
    });
    status.textContent = `${state.index + 1} / ${slides.length}`;
    updateSpeakerNotes();
    location.hash = getCurrentHash();
    updateMathSteps(currentSlide, state.step);
    typesetMath(currentSlide, () => updateMathSteps(currentSlide, state.step));
    window.requestAnimationFrame(() => {
      playMotionIdAnimations(currentSlide, motionRects);
      fitOverflowingContent(currentSlide);
    });
  }

  function collectMotionRects(slideNode) {
    const map = new Map();
    if (!slideNode) return map;
    slideNode.querySelectorAll(".fragment.is-visible[data-motion-id]").forEach((fragment) => {
      map.set(fragment.dataset.motionId, {
        rect: fragment.getBoundingClientRect(),
        element: fragment,
      });
    });
    return map;
  }

  function playMotionIdAnimations(slideNode, previousRects) {
    if (!slideNode || !previousRects?.size) return;
    slideNode.querySelectorAll(".fragment.is-visible[data-motion-id]").forEach((fragment) => {
      const previous = previousRects.get(fragment.dataset.motionId);
      if (!previous || previous.element === fragment) return;
      const current = fragment.getBoundingClientRect();
      const dx = previous.rect.left - current.left;
      const dy = previous.rect.top - current.top;
      const sx = current.width ? previous.rect.width / current.width : 1;
      const sy = current.height ? previous.rect.height / current.height : 1;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return;
      fragment._motionAnimation?.cancel();
      fragment.classList.add("is-motion-moving");
      fragment._motionAnimation = fragment.animate([
        {
          opacity: 1,
          transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
        },
        {
          opacity: 1,
          transform: "translate(0, 0) scale(1, 1)",
        },
      ], {
        duration: 560,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      });
      fragment._motionAnimation.finished.catch(() => {}).then(() => {
        fragment.classList.remove("is-motion-moving");
        fragment._motionAnimation = null;
      });
    });
  }

  function getCurrentFragments() {
    return Array.from(getSlideNodes()[state.index]?.querySelectorAll(".fragment") || []);
  }

  function getSlideNodes() {
    return Array.from(deck.querySelectorAll(".slide"));
  }

  function next() {
    const maxStep = getMaxStep(slides[state.index]);
    if (state.step < maxStep) state.step += 1;
    else if (state.index < slides.length - 1) {
      state.index += 1;
      state.step = 0;
    }
    renderCurrent();
  }

  function previous() {
    if (state.step > 0) state.step -= 1;
    else if (state.index > 0) {
      state.index -= 1;
      state.step = getMaxStep(slides[state.index]);
    }
    renderCurrent();
  }

  function loadHash() {
    const match = location.hash.match(/slide-(\d+)(?:\.(\d+))?/);
    if (!match) return;
    state.index = clamp(Number(match[1]) - 1, 0, slides.length - 1);
    state.step = clamp(Number(match[2] || 0), 0, getMaxStep(slides[state.index]));
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && deck.querySelector(".figure-zoom-overlay.is-open")) {
      closeFigureZoom();
      return;
    }
    if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(event.key)) {
      event.preventDefault();
      next();
    }
    if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(event.key)) {
      event.preventDefault();
      previous();
    }
    if (event.key.toLowerCase() === "f") toggleFullscreen();
    if (event.key.toLowerCase() === "n") {
      event.preventDefault();
      deck.classList.toggle("show-notes");
    }
    if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      returnToReferenceSource();
    }
    if (event.key.toLowerCase() === "p") {
      event.preventDefault();
      printSlides();
    }
  });
  prevButton.addEventListener("click", previous);
  nextButton.addEventListener("click", next);
  fullscreenButton.addEventListener("click", toggleFullscreen);
  window.addEventListener("hashchange", () => {
    loadHash();
    renderCurrent();
  });

  loadHash();
  setSlideTransition(sjtuTheme.transition);
  renderDeck();
  return { next, previous, setSlideTransition };

  function updateSpeakerNotes() {
    const body = notesPanel.querySelector(".speaker-notes-body");
    const notes = getSlideNotes(slides[state.index]);
    body.textContent = notes || "本页没有备注。";
  }
}

function prepareSlide(item) {
  if (!item.fragments) return item;
  let cursor = 1;
  const fragments = [];
  const notes = [];
  for (const raw of item.fragments.flat()) {
    const fragment = normalizeFragment(raw);
    if (fragment.kind === "speaker-notes") {
      notes.push(fragment.body);
      continue;
    }
    if (fragment.kind === "pause") {
      cursor += Math.max(1, Number(fragment.steps) || 1);
      continue;
    }
    const hasExplicitAppear = fragment.appear != null;
    const appear = Number(fragment.appear ?? cursor);
    const disappear = fragment.disappear == null ? undefined : Number(fragment.disappear);
    fragment.appear = appear;
    fragment.disappear = disappear;
    fragments.push(fragment);
    if (!hasExplicitAppear) cursor = appear + 1;
  }
  return {
    ...item,
    notes: [item.notes, ...notes].filter(Boolean).join("\n\n"),
    fragments,
  };
}

function normalizeDeck(items) {
  let currentSection = "";
  let currentSubsection = "";
  const normalized = [];
  for (const raw of items) {
    const item = typeof raw === "string" ? slide(raw) : raw;
    if (item.type === "section") {
      currentSection = normalizeSectionTitle(item.section);
      currentSubsection = "";
      normalized.push({ ...item, section: currentSection });
      continue;
    }
    if (item.type === "subsection") {
      currentSubsection = item.subsection;
      continue;
    }
    if (item.type === "slide") {
      const next = { ...item };
      if (!next.section) next.section = currentSection;
      else next.section = normalizeSectionTitle(next.section);
      if (next.subsection) currentSubsection = next.subsection;
      else next.subsection = currentSubsection || next.title || "";
      if (!next.title) next.title = next.subsection || next.section || "";
      normalized.push(next);
      continue;
    }
    normalized.push(item);
  }
  return normalized;
}

function collectEquationRegistry(slides) {
  const registry = new Map();
  let number = 0;
  slides.forEach((slideItem, slideIndex) => {
    if (slideItem.type !== "slide") return;
    getVisualFragments(slideItem).forEach((fragment) => {
      visitFragment(fragment, (entry, inheritedAppear) => {
        if (entry.kind !== "formula") return;
        number += 1;
        entry.equationNumber = number;
        if (entry.label) {
          registerReference(registry, entry.label, {
            number,
            slideIndex,
            appear: Number(entry.appear ?? inheritedAppear ?? fragment.appear ?? 0),
          }, "eq");
        }
      });
    });
  });
  return registry;
}

function collectFigureRegistry(slides) {
  const registry = new Map();
  let number = 0;
  slides.forEach((slideItem, slideIndex) => {
    if (slideItem.type !== "slide") return;
    getVisualFragments(slideItem).forEach((fragment) => {
      visitFragment(fragment, (entry, inheritedAppear) => {
        if (entry.kind !== "figure") return;
        number += 1;
        entry.figureNumber = number;
        const ref = getFigureRefKey(entry);
        if (ref) {
          registerReference(registry, ref, {
            number,
            slideIndex,
            appear: Number(entry.appear ?? inheritedAppear ?? fragment.appear ?? 0),
          }, "fig");
        }
      });
    });
  });
  return registry;
}

function getFigureRefKey(fragment) {
  return fragment.ref || fragment.figureRef || fragment.tag || "";
}

function registerReference(registry, label, value, prefix) {
  registry.set(label, value);
  const marker = `${prefix}:`;
  if (label.startsWith(marker)) registry.set(label.slice(marker.length), value);
  else registry.set(`${marker}${label}`, value);
}

function visitFragment(fragment, visitor, inheritedAppear = 0) {
  const appear = Number(fragment.appear ?? inheritedAppear ?? 0);
  visitor(fragment, appear);
  if (fragment.kind === "columns" || fragment.kind === "grid") {
    fragment.items.forEach((item) => visitFragment(normalizeFragment(item), visitor, appear));
  }
  if (fragment.kind === "column-flow") {
    fragment.items.flat().forEach((item) => visitFragment(normalizeFragment(item), visitor, appear));
  }
  if (fragment.kind === "content-group" || fragment.kind === "step-variant") {
    fragment.items.forEach((item) => visitFragment(normalizeFragment(item), visitor, appear));
  }
}

function renderMotionStyle(fragment) {
  if (fragment.effect !== "move-between") return "";
  const from = normalizeMotionPoint(fragment.from);
  const to = normalizeMotionPoint(fragment.to);
  return [
    `--motion-from-x: ${escapeAttribute(from.x)}`,
    `--motion-from-y: ${escapeAttribute(from.y)}`,
    `--motion-from-scale: ${escapeAttribute(from.scale)}`,
    `--motion-to-x: ${escapeAttribute(to.x)}`,
    `--motion-to-y: ${escapeAttribute(to.y)}`,
    `--motion-to-scale: ${escapeAttribute(to.scale)}`,
  ].join("; ");
}

function normalizeMotionPoint(point = {}) {
  const presets = {
    left: { x: "-18vw", y: "0", scale: 0.94 },
    right: { x: "18vw", y: "0", scale: 0.94 },
    top: { x: "0", y: "-14vh", scale: 0.94 },
    bottom: { x: "0", y: "14vh", scale: 0.94 },
    center: { x: "0", y: "0", scale: 1 },
  };
  if (typeof point === "string") return presets[point] || presets.center;
  if (Array.isArray(point)) {
    return { x: point[0] ?? "0", y: point[1] ?? "0", scale: point[2] ?? 1 };
  }
  return { x: point.x ?? "0", y: point.y ?? "0", scale: point.scale ?? 1 };
}

function normalizeColumnWidths(widths, columns) {
  const values = Array.isArray(widths)
    ? widths.map(Number).filter((value) => Number.isFinite(value) && value > 0)
    : [];
  if (values.length !== columns) return Array(columns).fill(1);
  const total = values.reduce((sum, value) => sum + value, 0);
  return values.map((value) => Number((value / total).toFixed(6)));
}

function normalizeCssLength(value = "1em") {
  const text = String(value).trim();
  return /^-?(?:\d+|\d*\.\d+)(?:px|em|rem|vh|vw|%)$/.test(text) ? text : "1em";
}

function normalizeSectionTitle(title = "") {
  return String(title)
    .trim()
    .replace(/^\s*(第\s*)?[一二三四五六七八九十百千万〇零两]+[章节篇部分讲课、.．:：\s-]*/u, "")
    .replace(/^\s*\d+\s*[、.．:：\s-]*/u, "")
    .trim();
}

function toChineseSectionNumber(value) {
  const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  if (value <= 10) return value === 10 ? "十" : digits[value];
  if (value < 20) return `十${digits[value % 10]}`;
  if (value < 100) {
    const ten = Math.floor(value / 10);
    const one = value % 10;
    return `${digits[ten]}十${one ? digits[one] : ""}`;
  }
  return String(value);
}

function getVisualFragments(item) {
  return prepareSlide(item).fragments || [];
}

function getMaxStep(item) {
  const fragments = getVisualFragments(item);
  let max = 0;
  fragments.forEach((fragment) => visitFragment(fragment, (entry) => {
    const appear = Number(entry.appear || 0);
    const disappear = entry.disappear == null ? 0 : Number(entry.disappear);
    max = Math.max(max, appear, disappear);
  }));
  return max;
}

function getSlideNotes(item) {
  return prepareSlide(item).notes || "";
}

function normalizeFragment(content) {
  if (content && typeof content === "object") return content;
  return { kind: "text", body: String(content ?? "") };
}

function inlineCommand(kind, body, extra = "") {
  return `[[sjtu:${kind}:${encodeURIComponent(String(body ?? ""))}:${encodeURIComponent(String(extra ?? ""))}]]`;
}

function decodeInline(value = "") {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isSlideOptions(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.kind || value.type) return false;
  return ["layout", "columns", "widths", "transition", "section", "subsection", "notes", "className"].some((key) => key in value);
}

function highlightCode(body = "", language = "text") {
  let escaped = escapeCodeHtml(body);
  if (!["js", "javascript"].includes(language)) return escaped;
  const strings = [];
  escaped = escaped.replace(/(`[^`]*`|"[^"]*"|'[^']*')/g, (value) => {
    const token = `@@SJTU_STRING_${strings.length}@@`;
    strings.push(value);
    return token;
  });
  escaped = escaped.replace(/\b(const|let|var|function|return|if|else|for|while|new|class|extends|import|from|export|await|async|true|false|null|undefined)\b/g, '<span class="code-keyword">$1</span>');
  escaped = escaped.replace(/\b(setDefaults|titleSlide|outlineSlide|sectionSlide|subsectionSlide|subsection|slide|oneSlide|twoSlide|asideSlide|text|strong|emph|muted|mark|inlineMath|link|list|figure|formula|eqRef|figureRef|theorem|example|definition|alertBlock|note|proof|columns|columnFlow|contentGroup|stepVariant|vSpace|grid|equationCompare|quoteBlock|pause|frag|uncover|only|moveBetween|speakerNotes|configureSJTUTheme|setSlideTransition|bootstrapSJTUDeck)\b/g, '<span class="code-call">$1</span>');
  escaped = escaped.replace(/(\/\/.*)$/gm, '<span class="code-comment">$1</span>');
  escaped = escaped.replace(/@@SJTU_STRING_(\d+)@@/g, (_, index) => `<span class="code-string">${strings[Number(index)]}</span>`);
  return escaped;
}

function escapeCodeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function typesetMath(scope = document.querySelector("#deck"), afterTypeset) {
  if (!window.MathJax?.startup?.promise) {
    updateMathSteps(scope);
    afterTypeset?.();
    fitOverflowingContent(scope);
    return;
  }
  window.MathJax.startup.promise.then(() => {
    if (window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([scope]).then(() => {
        updateMathSteps(scope);
        afterTypeset?.();
        fitOverflowingContent(scope);
      });
    }
  });
}

function updateMathSteps(scope = document.querySelector("#deck"), step = getCurrentDeckStep()) {
  if (!scope) return;
  scope.querySelectorAll(".sjtu-math-step").forEach((node) => {
    const stepClass = Array.from(node.classList).find((name) => /^sjtu-math-step-\d+$/.test(name));
    const appear = Number(stepClass?.match(/\d+$/)?.[0] || 1);
    node.classList.toggle("is-visible", step >= appear);
  });
}

function getCurrentDeckStep() {
  const match = location.hash.match(/slide-\d+(?:\.(\d+))?/);
  return Number(match?.[1] || 0);
}

function fitOverflowingContent(scope = document.querySelector("#deck")) {
  if (!scope) return;
  scope.querySelectorAll(".column-flow-slot").forEach((slot) => {
    const content = slot.querySelector(":scope > .column-slot-content");
    if (!content) return;
    content.style.setProperty("--slot-scale", "1");
    content.classList.remove("is-scaled");
    const heightScale = slot.clientHeight > 0 ? slot.clientHeight / content.scrollHeight : 1;
    const widthScale = slot.clientWidth > 0 ? slot.clientWidth / content.scrollWidth : 1;
    const scale = Math.max(0.58, Math.min(1, heightScale, widthScale));
    if (scale < 0.995) {
      content.style.setProperty("--slot-scale", scale.toFixed(4));
      content.classList.add("is-scaled");
    }
  });
}

function loadSJTuMathJax(options = {}) {
  const config = { ...sjtuTheme.mathjax, ...options };
  if (window.MathJax?.startup?.promise || document.querySelector("script[data-sjtu-mathjax]")) return;
  window.MathJax = mergeTheme({
    loader: {
      load: ["[tex]/html"],
    },
    tex: {
      inlineMath: [["$", "$"], ["\\(", "\\)"]],
      displayMath: [["$$", "$$"], ["\\[", "\\]"]],
      packages: { "[+]": ["html"] },
      macros: {
        pause: ["\\class{sjtu-math-step sjtu-math-step-#1}{#2}", 2],
        uncover: ["\\class{sjtu-math-step sjtu-math-step-#1}{#2}", 2],
        sjtupause: ["\\class{sjtu-math-step sjtu-math-step-#1}{#2}", 2],
      },
    },
    svg: { fontCache: "global" },
    startup: { typeset: false },
  }, window.MathJax || {});
  appendMathJaxScript(config.local, () => {
    if (config.cdn && config.cdn !== config.local) appendMathJaxScript(config.cdn);
  });
}

const loadSJTUMathJax = loadSJTuMathJax;

function appendMathJaxScript(src, onError) {
  if (!src) return;
  const script = document.createElement("script");
  script.src = resolveTemplateAsset(src);
  script.defer = true;
  script.dataset.sjtuMathjax = "true";
  if (onError) script.addEventListener("error", onError, { once: true });
  document.head.appendChild(script);
}

function resolveTemplateAsset(src = "") {
  if (/^(?:https?:|data:|blob:|file:)/i.test(src)) return src;
  try {
    return new URL(src, sjtuCoreScriptUrl).href;
  } catch {
    return src;
  }
}

function mergeTheme(target, source) {
  for (const [key, value] of Object.entries(source || {})) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      target[key] = mergeTheme(target[key] || {}, value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function applyThemeCSSVars() {
  const root = document.documentElement;
  const vars = sjtuTheme.cssVars || {};
  Object.entries(vars).forEach(([key, value]) => {
    const name = key.startsWith("--") ? key : `--${key}`;
    root.style.setProperty(name, value);
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value = "") {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safeDomId(value = "") {
  return String(value).replace(/[^a-zA-Z0-9_-]+/g, "-");
}

Object.assign(window, {
  sjtuTheme,
  sjtuDefaults,
  configureSJTUTheme,
  setDefaults,
  titleSlide,
  outlineSlide,
  sectionSlide,
  subsectionSlide,
  subsection,
  slide,
  oneSlide,
  twoSlide,
  asideSlide,
  focusSlide,
  endSlide,
  list,
  figure,
  columns,
  columnFlow,
  contentGroup,
  stepVariant,
  vSpace,
  grid,
  equationCompare,
  quoteBlock,
  text,
  strong,
  emph,
  muted,
  mark,
  inlineMath,
  link,
  formula,
  eqRef,
  figureRef,
  theorem,
  example,
  definition,
  alertBlock,
  note,
  proof,
  html,
  code,
  pause,
  frag,
  uncover,
  only,
  moveBetween,
  speakerNotes,
  setSlideTransition,
  printSlides,
  loadSJTuMathJax,
  loadSJTUMathJax,
  bootstrapSJTUDeck,
});
