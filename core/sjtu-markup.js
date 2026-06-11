function parseSJTUMarkup(source) {
  const lines = String(source || "").replace(/\r\n?/g, "\n").split("\n");
  const meta = {};
  const slides = [];
  let index = 0;
  let page = null;

  const flushPage = () => {
    if (!page) return;
    if (page.columnGroups) {
      const columns = Math.max(page.columns || 1, page.columnGroups.length);
      slides.push(slide(page.title, { layout: "one", transition: page.transition },
        columnFlow(page.columnGroups, { columns, widths: page.widths, specs: page.columnSpecs, appear: 0 })
      ));
      page = null;
      return;
    }
    slides.push(slide(page.title, {
      layout: page.layout,
      columns: page.columns,
      widths: page.widths,
      transition: page.transition,
    }, ...page.fragments));
    page = null;
  };

  const ensurePage = () => {
    if (!page) page = { title: "未命名页面", layout: "one", fragments: [] };
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
      pushFragment(vSpace(vspaceMatch[1]));
      index += 1;
      continue;
    }

    if (/^####(?:\s+|$)/.test(line)) {
      const target = ensurePage();
      if (!target.activeGroup) {
        const group = contentGroup("", [], { appear: 0 });
        target.activeGroup = group;
        pushTopLevelFragment(group);
      }
      const variantHeader = parseMarkupStepVariantHeader(line);
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
      const variant = stepVariant(variantHeader.title, [], variantHeader.options);
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
      slides.push(sectionSlide(line.replace(/^#\s+/, "")));
      index += 1;
      continue;
    }

    if (/^##\s+/.test(line)) {
      flushPage();
      slides.push(subsection(line.replace(/^##\s+/, "")));
      index += 1;
      continue;
    }

    if (/^###(?:\s+|$)/.test(line)) {
      const target = ensurePage();
      const groupHeader = parseMarkupContentGroupHeader(line);
      target.groupStep = target.groupStep || 0;
      if (groupHeader.options.appear == null) groupHeader.options.appear = target.groupStep + 1;
      target.groupStep = Math.max(target.groupStep, groupHeader.options.appear || 0);
      const group = contentGroup(groupHeader.title, [], groupHeader.options);
      target.activeGroup = group;
      target.activeVariant = null;
      target.activeInnerFlow = null;
      pushTopLevelFragment(group);
      index += 1;
      continue;
    }

    if (/^---/.test(line)) {
      flushPage();
      const header = parseMarkupPageHeader(line);
      page = {
        title: header.title || "未命名页面",
        layout: header.layout || meta.layout || "one",
        columns: header.columns,
        widths: header.widths,
        transition: header.transition,
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
      // Keep old documents working when ||| is used outside a content block.
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
      const items = [];
      while (index < lines.length && /^\s*-\s+/.test(lines[index])) {
        items.push(parseMarkupInline(lines[index].replace(/^\s*-\s+/, "")));
        index += 1;
      }
      pushFragment(list(...items));
      continue;
    }

    const fenceMatch = line.match(/^```(\w*)$/);
    if (fenceMatch) {
      const body = [];
      index += 1;
      while (index < lines.length && lines[index].trim() !== "```") {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      pushFragment(code(body.join("\n"), { language: fenceMatch[1] || "text" }));
      continue;
    }

    const formulaMatch = line.match(/^\$\$\s*(?:\{#([^}]+)\})?\s*$/);
    if (formulaMatch) {
      const body = [];
      index += 1;
      while (index < lines.length && lines[index].trim() !== "$$") {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      pushFragment(formula("", `$$${body.join("\n")}$$`, { ...(formulaMatch[1] ? { label: formulaMatch[1] } : {}), boxed: false }));
      continue;
    }

    const blockMatch = line.match(/^:::\s*(theorem|example|definition|alert|note|proof|formula)\s*(.*)$/);
    if (blockMatch) {
      const body = [];
      index += 1;
      while (index < lines.length && lines[index].trim() !== ":::") {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      pushFragment(makeMarkupBlock(blockMatch[1], blockMatch[2] || blockMatch[1], body.join("\n")));
      continue;
    }

    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*(?:\{#([^}]+)\})?$/);
    if (imageMatch) {
      pushFragment(figure(imageMatch[1], {
        src: imageMatch[2],
        caption: imageMatch[1],
        ...(imageMatch[3] ? { ref: imageMatch[3] } : {}),
      }));
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
    index += 1;
    while (index < lines.length && lines[index].trim() && !isMarkupControl(lines[index].trim())) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    pushFragment(text(parseMarkupInline(paragraph.join(" "))));
  }

  flushPage();
  return { meta, slides };
}

function parseMarkupPageHeader(line) {
  const groups = Array.from(line.matchAll(/\[([^\]]*)\]/g), (match) => match[1].trim());
  const title = line.replace(/^---\s*/, "").replace(/\s*\[[^\]]*\]/g, "").trim();
  const transitionGroup = groups.find((group) => /^transition\s*=/.test(group));
  const layoutGroups = groups.filter((group) => !/^transition\s*=/.test(group));
  const first = layoutGroups[0] || "";
  const legacyLayouts = { one: 1, two: 2, aside: 2 };
  const columns = /^\d+$/.test(first) ? Math.max(1, Number(first)) : legacyLayouts[first];
  const widths = layoutGroups[1] ? parseMarkupWidths(layoutGroups[1], columns) : undefined;
  return {
    title,
    layout: first === "aside" ? "aside" : columns ? "custom-columns" : "one",
    columns,
    widths,
    transition: transitionGroup?.split("=").slice(1).join("=").trim(),
  };
}

function parseMarkupContentGroupHeader(line) {
  const groups = Array.from(line.matchAll(/\[([^\]]*)\]/g), (match) => match[1].trim());
  const title = line.replace(/^###\s*/, "").replace(/\s*\[[^\]]*\]/g, "").trim();
  const effects = new Set(["fade", "fade-up", "rise", "slide-left", "slide-right", "zoom", "blur"]);
  const options = {};
  for (const group of groups) {
    if (effects.has(group)) options.effect = group;
    else if (/^step\s*=/.test(group)) options.appear = Number(group.split("=")[1]);
    else if (/^move\s*=/.test(group)) options.motionId = group.split("=").slice(1).join("=").trim();
    else if (/^only\s*=/.test(group)) {
      options.appear = Number(group.split("=")[1]);
      options.disappear = options.appear;
    } else if (/^until\s*=/.test(group)) options.disappear = Number(group.split("=")[1]);
  }
  return { title, options };
}

function parseMarkupStepVariantHeader(line) {
  const groups = Array.from(line.matchAll(/\[([^\]]*)\]/g), (match) => match[1].trim());
  const title = line.replace(/^####\s*/, "").replace(/\s*\[[^\]]*\]/g, "").trim();
  const range = groups.find((group) => /^\d+\s*(?:-\s*\d*)?$/.test(group));
  const options = { effect: "fade" };
  const effects = new Set(["fade", "fade-up", "rise", "slide-left", "slide-right", "zoom", "blur"]);
  const effect = groups.find((group) => effects.has(group));
  if (effect) options.effect = effect;
  const move = groups.find((group) => /^move\s*=/.test(group));
  if (move) options.motionId = move.split("=").slice(1).join("=").trim();
  if (range) {
    const match = range.match(/^(\d+)\s*(?:-\s*(\d*)?)?$/);
    options.appear = Number(match[1]);
    if (range.includes("-") && match[2]) options.disappear = Number(match[2]);
    else if (!range.includes("-")) options.disappear = options.appear;
  }
  return { title, options };
}

function parseMarkupColumnBreak(line) {
  const groups = Array.from(line.matchAll(/\[([^\]]*)\]/g), (match) => match[1].trim());
  const slots = /^\d+$/.test(groups[0] || "") ? Math.max(1, Number(groups[0])) : undefined;
  const heights = groups[1] ? parseMarkupWidths(groups[1], slots) : undefined;
  return slots ? { slots, heights } : {};
}

function parseMarkupWidths(value, columns) {
  const widths = value.split(",").map((part) => Number(part.trim().replace(/%$/, ""))).filter((part) => Number.isFinite(part) && part > 0);
  if (!widths.length || (columns && widths.length !== columns)) return undefined;
  return widths;
}

function parseMarkupInline(value = "") {
  return String(value)
    .replace(/@eq:([\w:.-]+)/g, (_, label) => eqRef(label))
    .replace(/@fig:([\w:.-]+)/g, (_, label) => figureRef(label))
    .replace(/\*\*([^*]+)\*\*/g, (_, body) => strong(body))
    .replace(/==([^=]+)==/g, (_, body) => mark(body))
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_, body) => emph(body))
    .replace(/`([^`]+)`/g, (_, body) => strong(body));
}

function makeMarkupBlock(kind, title, body) {
  const parsed = parseMarkupInline(body);
  const makers = { theorem, example, definition, alert: alertBlock, note, proof };
  if (kind === "formula") return formula(title, body, { boxed: true });
  return makers[kind](title, parsed);
}

function isMarkupControl(line) {
  return /^(%|#|---|\|\||-\s+|```|\$\$|:::|!\[|>\s*notes?:)/i.test(line);
}

function configureFromSJTUMarkup(meta = {}) {
  configureSJTUTheme({
    transition: meta.transition || "fade",
    footer: meta.footer || "上海交通大学",
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
  configureFromSJTUMarkup(result.meta);
  const slides = [
    ...(result.meta["title-slide"] === "false" ? [] : [titleSlide()]),
    ...(result.meta.outline === "false" ? [] : [outlineSlide()]),
    ...result.slides,
    ...(result.meta["end-slide"] === "false" ? [] : [endSlide(result.meta.end || "Thanks for Listening!")]),
  ];
  return bootstrapSJTUDeck(slides);
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
