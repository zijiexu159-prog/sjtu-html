const MARKUP_EFFECTS = new Set(["fade", "fade-up", "rise", "slide-left", "slide-right", "zoom", "blur", "move-between"]);

function parseMarkupColumnBreak(line) {
  const groups = parseMarkupGroups(line);
  const slots = /^\d+$/.test(groups[0] || "") ? Math.max(1, Number(groups[0])) : undefined;
  const heights = groups[1] ? parseMarkupWidths(groups[1], slots) : undefined;
  return slots ? { slots, heights } : {};
}

function parseMarkupGroups(line) {
  return Array.from(line.matchAll(/\[([^\]]*)\]/g), (match) => match[1].trim());
}

function parseMarkupWidths(value, columns) {
  const widths = value.split(",").map((part) => Number(part.trim().replace(/%$/, ""))).filter((part) => Number.isFinite(part) && part > 0);
  if (!widths.length || (columns && widths.length !== columns)) return undefined;
  return widths;
}

function parseMarkupInline(value = "", footnotes = new Map()) {
  return String(value)
    .replace(/@eq:([\w:.-]+)/g, (_, label) => eqRef(label))
    .replace(/@fig:([\w:.-]+)/g, (_, label) => figureRef(label))
    .replace(/@cite:([\w:.-]+)/g, (_, key) => cite(key))
    .replace(/\[\^([^\]]+)\]/g, (_, id) => footnote(footnotes.get(id) || id, id))
    .replace(/\*\*([^*]+)\*\*/g, (_, body) => strong(body))
    .replace(/==([^=]+)==/g, (_, body) => mark(body))
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_, body) => emph(body))
    .replace(/`([^`]+)`/g, (_, body) => strong(body));
}

function makeMarkupBlock(kind, title, body, footnotes = new Map()) {
  const parsed = parseMarkupInline(body, footnotes);
  const makers = { theorem, example, definition, alert: alertBlock, note, proof };
  if (kind === "formula") return formula(title, body, { boxed: true });
  return makers[kind](title, parsed);
}

function parseSJTUMarkup(source) {
  const footnoteDefinitions = new Map();
  const extracted = extractMarkupFootnotesWithLines(String(source || "").replace(/\r\n?/g, "\n").split("\n"), footnoteDefinitions);
  const lines = extracted.lines;
  const lineMap = extracted.lineMap;
  const meta = {};
  const slides = [];
  const sourceMap = { slides: {}, fragments: {} };
  const counters = { slide: 0, fragment: 0 };
  let index = 0;
  let page = null;

  const lineAt = (offset) => lineMap[Math.max(0, Math.min(offset, lineMap.length - 1))] || offset + 1;
  const currentLine = () => lineAt(index);
  const previousLine = () => lineAt(Math.max(0, index - 1));

  const makeId = (prefix, title) => makeMarkupEditorId(prefix, title, ++counters.fragment);

  const markFragment = (fragment, startLine, endLine, prefix, title = "", explicitId = "") => {
    const id = fragment.editorId || explicitId || makeId(prefix || "fragment", title);
    fragment.editorId = id;
    fragment.sourceStart = startLine;
    fragment.sourceEnd = endLine || startLine;
    sourceMap.fragments[id] = {
      id,
      kind: fragment.kind || prefix || "fragment",
      title: fragment.title || fragment.label || title || "",
      sourceStart: fragment.sourceStart,
      sourceEnd: fragment.sourceEnd,
    };
    return fragment;
  };

  const flushPage = () => {
    if (!page) return;
    const sourceEnd = previousLine();
    const editorId = page.editorId || makeMarkupEditorId("slide", page.title, ++counters.slide);
    const slideOptions = {
      editorId,
      sourceStart: page.sourceStart || sourceEnd,
      sourceEnd,
    };
    sourceMap.slides[editorId] = {
      id: editorId,
      title: page.title,
      sourceStart: slideOptions.sourceStart,
      sourceEnd,
    };
    assignSlideToMarkupFragments(page.fragments, editorId, sourceMap);
    assignSlideToMarkupFragments(page.columnGroups, editorId, sourceMap);
    if (page.columnGroups) {
      const columns = Math.max(page.columns || 1, page.columnGroups.length);
      slides.push(slide(page.title, { ...slideOptions, layout: "one", transition: page.transition },
        columnFlow(page.columnGroups, { columns, widths: page.widths, specs: page.columnSpecs, appear: 0 })
      ));
      page = null;
      return;
    }
    slides.push(slide(page.title, {
      ...slideOptions,
      layout: page.layout,
      columns: page.columns,
      widths: page.widths,
      transition: page.transition,
    }, ...page.fragments));
    page = null;
  };

  const ensurePage = () => {
    if (!page) {
      page = {
        title: "Untitled",
        layout: "one",
        fragments: [],
        sourceStart: currentLine(),
      };
    }
    return page;
  };

  const pushFragment = (fragment) => {
    const target = ensurePage();
    if (target.activeInnerFlow) {
      target.activeInnerFlow.items[target.activeInnerFlow.items.length - 1].push(fragment);
      return;
    }
    if (target.activeVariant) {
      target.activeVariant.items.push(fragment);
      return;
    }
    if (target.activeGroup) {
      target.activeGroup.items.push(fragment);
      return;
    }
    if (target.columnGroups) target.columnGroups[target.columnGroups.length - 1].push(fragment);
    else target.fragments.push(fragment);
  };

  const pushTopLevelFragment = (fragment) => {
    const target = ensurePage();
    if (target.columnGroups) target.columnGroups[target.columnGroups.length - 1].push(fragment);
    else target.fragments.push(fragment);
  };

  while (index < lines.length) {
    const raw = lines[index];
    const line = raw.trim();
    if (!line) {
      index += 1;
      continue;
    }

    const metaMatch = line.match(/^%\s*([\w-]+)\s*:\s*(.+)$/);
    if (metaMatch) {
      meta[metaMatch[1]] = metaMatch[2];
      index += 1;
      continue;
    }

    const vspaceMatch = line.match(/^#v\(([^)]+)\)$/);
    if (vspaceMatch) {
      pushFragment(markFragment(vSpace(vspaceMatch[1]), currentLine(), currentLine(), "vspace", "vertical-space"));
      index += 1;
      continue;
    }

    if (/^####(?:\s+|$)/.test(line)) {
      const target = ensurePage();
      if (!target.activeGroup) {
        const group = markFragment(contentGroup("", [], { appear: 0 }), currentLine(), currentLine(), "group", "step-group");
        target.activeGroup = group;
        pushTopLevelFragment(group);
      }
      const variantHeader = parseMarkupStepVariantHeaderWithId(line);
      const isFirstVariant = !target.activeGroup.items.some((item) => item.kind === "step-variant");
      if (variantHeader.options.appear == null) {
        variantHeader.options.appear = isFirstVariant
          ? Math.max(1, Number(target.activeGroup.appear) || 1)
          : (target.groupStep || 0) + 1;
        variantHeader.options.autoRange = true;
      }
      if (target.activeVariant?.autoRange && target.activeVariant.disappear == null) {
        target.activeVariant.disappear = Math.max(target.activeVariant.appear, variantHeader.options.appear - 1);
      }
      const variant = markFragment(
        stepVariant(variantHeader.title, [], variantHeader.options),
        currentLine(),
        currentLine(),
        "step",
        variantHeader.title,
        variantHeader.id
      );
      if (isFirstVariant) target.activeGroup.appear = variantHeader.options.appear;
      target.activeVariant = variant;
      target.activeInnerFlow = null;
      target.activeGroup.items.push(variant);
      target.groupStep = Math.max(target.groupStep || 0, variantHeader.options.appear || 0, variantHeader.options.disappear || 0);
      index += 1;
      continue;
    }

    if (/^#\s+/.test(line)) {
      flushPage();
      slides.push(sectionSlide(parseEditorIdSuffix(line.replace(/^#\s+/, "")).text));
      index += 1;
      continue;
    }

    if (/^##\s+/.test(line)) {
      flushPage();
      slides.push(subsection(parseEditorIdSuffix(line.replace(/^##\s+/, "")).text));
      index += 1;
      continue;
    }

    if (/^###(?:\s+|$)/.test(line)) {
      const target = ensurePage();
      const groupHeader = parseMarkupContentGroupHeaderWithId(line);
      target.groupStep = target.groupStep || 0;
      if (groupHeader.options.appear == null) groupHeader.options.appear = target.groupStep + 1;
      target.groupStep = Math.max(target.groupStep, groupHeader.options.appear || 0);
      const group = markFragment(
        contentGroup(groupHeader.title, [], groupHeader.options),
        currentLine(),
        currentLine(),
        "group",
        groupHeader.title,
        groupHeader.id
      );
      target.activeGroup = group;
      target.activeVariant = null;
      target.activeInnerFlow = null;
      pushTopLevelFragment(group);
      index += 1;
      continue;
    }

    if (/^---/.test(line)) {
      flushPage();
      const header = parseMarkupPageHeaderWithId(line);
      page = {
        title: header.title || "Untitled",
        layout: header.layout || meta.layout || "one",
        columns: header.columns,
        widths: header.widths,
        transition: header.transition,
        editorId: header.id,
        sourceStart: currentLine(),
        fragments: [],
      };
      index += 1;
      continue;
    }

    if (/^\|\|\|(?:\[|$)/.test(line)) {
      const target = ensurePage();
      const owner = target.activeVariant || target.activeGroup;
      if (owner) {
        if (!target.activeInnerFlow) {
          const flow = columnFlow([owner.items, []], { columns: 2, appear: 0, nested: true });
          owner.items = [flow];
          target.activeInnerFlow = flow;
        } else {
          target.activeInnerFlow.items.push([]);
          target.activeInnerFlow.columns = target.activeInnerFlow.items.length;
        }
        index += 1;
        continue;
      }
    }

    if (/^\|\|(?:\[|$)/.test(line)) {
      const target = ensurePage();
      target.activeGroup = null;
      target.activeVariant = null;
      target.activeInnerFlow = null;
      const spec = parseMarkupColumnBreak(line);
      if (!target.columnGroups) {
        target.columnGroups = [target.fragments];
        target.columnSpecs = [target.fragments.length === 0 ? spec : {}];
        target.fragments = [];
        if (target.columnGroups[0].length === 0) {
          index += 1;
          continue;
        }
      }
      target.columnGroups.push([]);
      target.columnSpecs.push(spec);
      index += 1;
      continue;
    }

    if (/^-\s+/.test(line)) {
      const startLine = currentLine();
      const items = [];
      while (index < lines.length && /^\s*-\s+/.test(lines[index])) {
        items.push(parseMarkupInline(lines[index].replace(/^\s*-\s+/, ""), footnoteDefinitions));
        index += 1;
      }
      pushFragment(markFragment(list(...items), startLine, previousLine(), "list", "list"));
      continue;
    }

    const fenceMatch = line.match(/^```(\w*)$/);
    if (fenceMatch) {
      const startLine = currentLine();
      const body = [];
      index += 1;
      while (index < lines.length && lines[index].trim() !== "```") {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      pushFragment(markFragment(code(body.join("\n"), { language: fenceMatch[1] || "text" }), startLine, previousLine(), "code", fenceMatch[1] || "code"));
      continue;
    }

    const formulaMatch = line.match(/^\$\$\s*(?:\{#([^}]+)\})?\s*$/);
    if (formulaMatch) {
      const startLine = currentLine();
      const body = [];
      index += 1;
      while (index < lines.length && lines[index].trim() !== "$$") {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      pushFragment(markFragment(
        formula("", `$$${body.join("\n")}$$`, { ...(formulaMatch[1] ? { label: formulaMatch[1] } : {}), boxed: false }),
        startLine,
        previousLine(),
        "formula",
        formulaMatch[1] || "formula",
        formulaMatch[1]
      ));
      continue;
    }

    const blockMatch = line.match(/^(:{3,})\s*(theorem|example|definition|alert|note|proof|formula)\s*(.*)$/);
    if (blockMatch) {
      const fence = blockMatch[1];
      const startLine = currentLine();
      const titleInfo = parseEditorIdSuffix(blockMatch[3] || blockMatch[2]);
      const body = [];
      index += 1;
      while (index < lines.length && !isClosingColonFence(lines[index], fence.length)) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      pushFragment(markFragment(
        makeMarkupBlock(blockMatch[2], titleInfo.text || blockMatch[2], body.join("\n"), footnoteDefinitions),
        startLine,
        previousLine(),
        blockMatch[2],
        titleInfo.text || blockMatch[2],
        titleInfo.id
      ));
      continue;
    }

    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*(?:\{#([^}]+)\})?$/);
    if (imageMatch) {
      pushFragment(markFragment(figure(imageMatch[1], {
        src: imageMatch[2],
        caption: imageMatch[1],
        ...(imageMatch[3] ? { ref: imageMatch[3] } : {}),
      }), currentLine(), currentLine(), "figure", imageMatch[1] || imageMatch[2], imageMatch[3]));
      index += 1;
      continue;
    }

    const notesMatch = line.match(/^>\s*notes?:\s*(.+)$/i);
    if (notesMatch) {
      pushFragment(speakerNotes(notesMatch[1]));
      index += 1;
      continue;
    }

    const paragraph = [raw.trim()];
    const startLine = currentLine();
    index += 1;
    while (index < lines.length && lines[index].trim() && !isMarkupControl(lines[index].trim())) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    pushFragment(markFragment(text(parseMarkupInline(paragraph.join(" "), footnoteDefinitions)), startLine, previousLine(), "text", paragraph.join(" ").slice(0, 24)));
  }

  flushPage();
  return { meta, slides, sourceMap };
}

function extractMarkupFootnotesWithLines(lines, footnotes) {
  const output = [];
  const lineMap = [];
  let inFence = false;
  lines.forEach((line, sourceIndex) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      output.push(line);
      lineMap.push(sourceIndex + 1);
      return;
    }
    if (inFence) {
      output.push(line);
      lineMap.push(sourceIndex + 1);
      return;
    }
    const match = line.match(/^\s*\[\^([^\]]+)\]:\s*(.+)$/);
    if (match) {
      footnotes.set(match[1].trim(), match[2].trim());
      return;
    }
    output.push(line);
    lineMap.push(sourceIndex + 1);
  });
  return { lines: output, lineMap };
}

function parseMarkupPageHeaderWithId(line) {
  const groups = parseMarkupGroups(line);
  const parsed = parseEditorIdSuffix(line.replace(/^---\s*/, "").replace(/\s*\[[^\]]*\]/g, "").trim());
  const transitionGroup = groups.find((group) => /^transition\s*=/.test(group));
  const layoutGroups = groups.filter((group) => !/^transition\s*=/.test(group));
  const first = layoutGroups[0] || "";
  const legacyLayouts = { one: 1, two: 2, aside: 2 };
  const columns = /^\d+$/.test(first) ? Math.max(1, Number(first)) : legacyLayouts[first];
  const widths = layoutGroups[1] ? parseMarkupWidths(layoutGroups[1], columns) : undefined;
  return {
    title: parsed.text,
    id: parsed.id,
    layout: first === "aside" ? "aside" : columns ? "custom-columns" : "one",
    columns,
    widths,
    transition: transitionGroup?.split("=").slice(1).join("=").trim(),
  };
}

function parseMarkupContentGroupHeaderWithId(line) {
  const groups = parseMarkupGroups(line);
  const parsed = parseEditorIdSuffix(line.replace(/^###\s*/, "").replace(/\s*\[[^\]]*\]/g, "").trim());
  const options = {};
  for (const group of groups) {
    if (MARKUP_EFFECTS.has(group)) options.effect = group;
    else if (/^step\s*=/.test(group)) options.appear = Number(group.split("=")[1]);
    else if (/^move\s*=/.test(group)) options.motionId = group.split("=").slice(1).join("=").trim();
    else if (/^only\s*=/.test(group)) {
      options.appear = Number(group.split("=")[1]);
      options.disappear = options.appear;
    } else if (/^until\s*=/.test(group)) options.disappear = Number(group.split("=")[1]);
  }
  return { title: parsed.text, id: parsed.id, options };
}

function parseMarkupStepVariantHeaderWithId(line) {
  const groups = parseMarkupGroups(line);
  const parsed = parseEditorIdSuffix(line.replace(/^####\s*/, "").replace(/\s*\[[^\]]*\]/g, "").trim());
  const range = groups.find((group) => /^\d+\s*(?:-\s*\d*)?$/.test(group));
  const options = { effect: "fade" };
  const effect = groups.find((group) => MARKUP_EFFECTS.has(group));
  if (effect) options.effect = effect;
  const move = groups.find((group) => /^move\s*=/.test(group));
  if (move) options.motionId = move.split("=").slice(1).join("=").trim();
  if (range) {
    const match = range.match(/^(\d+)\s*(?:-\s*(\d*)?)?$/);
    options.appear = Number(match[1]);
    if (range.includes("-") && match[2]) options.disappear = Number(match[2]);
    else if (!range.includes("-")) options.disappear = options.appear;
  }
  return { title: parsed.text, id: parsed.id, options };
}

function parseEditorIdSuffix(value = "") {
  const text = String(value || "").trim();
  const match = text.match(/\s*\{#([A-Za-z0-9_:.@-]+)\}\s*$/);
  if (!match) return { text, id: "" };
  return {
    text: text.slice(0, match.index).trim(),
    id: match[1],
  };
}

function makeMarkupEditorId(prefix = "fragment", title = "", counter = 0) {
  const slug = String(title || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
  return `${prefix}-${slug || counter || Date.now().toString(36)}`;
}

function assignSlideToMarkupFragments(value, slideId, sourceMap) {
  if (!value) return;
  const visit = (entry) => {
    if (!entry) return;
    if (Array.isArray(entry)) {
      entry.forEach(visit);
      return;
    }
    if (typeof entry !== "object") return;
    if (entry.editorId && sourceMap.fragments[entry.editorId]) {
      sourceMap.fragments[entry.editorId].slideId = slideId;
      sourceMap.fragments[entry.editorId].layoutPath = `slides.${slideId}.fragments.${entry.editorId}`;
    }
    if (Array.isArray(entry.items)) entry.items.forEach(visit);
  };
  visit(value);
}

function isMarkupControl(line) {
  return /^(%|#|---|\|\||-\s+|```|\$\$|:::|!\[|>\s*notes?:|\[\^[^\]]+\]:)/i.test(line);
}

function isClosingColonFence(line = "", minLength = 3) {
  const match = String(line || "").trim().match(/^:{3,}$/);
  return Boolean(match && match[0].length >= minLength);
}

function configureFromSJTUMarkup(meta = {}) {
  configureSJTUTheme({
    transition: meta.transition || "fade",
    footer: meta.footer || "上海交通大学",
    bibliography: {
      source: window.sjtuBibSource || meta["bibliography-source"] || "",
      title: meta["bibliography-title"] || "参考文献",
      position: meta["bibliography-position"] || "last",
      includeUncited: meta["bibliography-include-uncited"] === "true",
    },
    info: {
      title: meta.title || "SJTU HTML PPT",
      subtitle: meta.subtitle || "",
      author: meta.author || "",
      date: meta.date || new Date().toLocaleDateString("zh-CN"),
      institution: meta.institution || "Shanghai Jiao Tong University",
    },
  });
}

function bootstrapSJTUMarkup(source) {
  const result = parseSJTUMarkup(source);
  window.sjtuSourceMap = result.sourceMap || { slides: {}, fragments: {} };
  configureFromSJTUMarkup(result.meta);
  const slides = [
    ...(result.meta["title-slide"] === "false" ? [] : [titleSlide()]),
    ...(result.meta.outline === "false" ? [] : [outlineSlide()]),
    ...result.slides,
    ...(result.meta["end-slide"] === "false" ? [] : [endSlide(result.meta.end || "Thanks for Listening!")]),
  ];
  const deckApi = bootstrapSJTUDeck(slides);
  return { ...deckApi, sourceMap: window.sjtuSourceMap };
}

function autoBootstrapSJTUMarkup() {
  const source = document.querySelector('script[type="text/sjtu-markup"]');
  if (source) bootstrapSJTUMarkup(source.textContent);
}

Object.assign(window, {
  parseSJTUMarkup,
  bootstrapSJTUMarkup,
  autoBootstrapSJTUMarkup,
});
