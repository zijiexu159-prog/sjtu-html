# SJTU HTML PPT 命令与样式参考

## 构建命令

在 `html-template` 目录下运行：

```powershell
node core/build-sjtu-markup.js markdown/example.sjtu.md markdown/example.html
node core/build-sjtu-markup.js markdown/manual.sjtu.md markdown/manual.html
node core/build-sjtu-markup.js markdown/touying-main-complete.sjtu.md markdown/touying-main-complete.html
```

也可以使用 npm 脚本：

```powershell
npm run build
npm run check:js
```

## Markdown 元信息

```markdown
% title: 报告标题
% subtitle: 副标题
% author: 作者
% date: 日期
% footer: 页脚
% transition: fade
% title-slide: false
% outline: false
% end-slide: false
% end: Thanks for Listening!
```

## 页面命令

- `# 章节名`：生成章节页，并成为后续页面的 section。
- `## 小节名`：设置后续页面的 subsection，不单独生成页面。
- `--- 页面标题[1]`：单栏页面。
- `--- 页面标题[2][0.4,0.6]`：两栏页面，指定宽度比例。
- `--- 页面标题[3][0.25,0.5,0.25][transition=zoom]`：三栏页面，当前页覆盖切换动画。
- `||`：切换到下一页级栏目。
- `||[2][0.35,0.65]`：当前栏目预设两个纵向内容槽。
- `|||`：当前内容块内部继续分栏。
- `### 源码中的内容块名[fade-up]`：建立一个可单独出现的内容块，名称不显示。
- `#### step 名称[2-3][zoom]`：建立内容块内部的 step，仅在指定步数显示。
- `#v(1em)`：插入竖向空白。
- `> notes: ...`：演讲者备注。

## 内容块命令

```markdown
::: theorem 定理名
内容
:::

::: example 例
内容
:::

::: definition 定义
内容
:::

::: formula 公式框标题
$$ {#eq:main}
u_t = u_{xx}
$$
:::
```

支持的块类型：

- `formula`：公式框。
- `theorem`：定理框。
- `example`：例子框。
- `definition`：定义框。
- `alert`：强调框。
- `note`：备注框。
- `proof`：证明框。

普通 `$$ ... $$` 只生成居中公式，不会自动加框。

## 引用

- `$$ {#eq:name}`：给公式加标签。
- `![说明](../assets/figures/a.svg){#fig:name}`：给图片加标签。
- `@eq:name`：引用公式。
- `@fig:name`：引用图片。
- 点击引用会跳转到目标页。
- 按 `R` 返回上一次引用跳转前的位置。

## 动画

页面切换动画：

- `fade`
- `slide`
- `rise`
- `zoom`
- `none`

内容块动画：

- `fade`
- `fade-up`
- `slide-left`
- `slide-right`
- `zoom`
- `blur`
- `move-between`

`move-between` 用于同一内容在不同 step 中从 A 位置移动到 B 位置。Markdown 中通常给两个内容块使用相同 `move=...` 标识，并用 step 范围控制：

```markdown
### 位置 A[move-between][move=idea]
#### A[1]
这里是第 1 步的位置。

||

### 位置 B[move-between][move=idea]
#### B[2]
这里是第 2 步的位置。
```

## 直接 JS API

常用全局函数由 `core/sjtu-ppt-core.js` 暴露：

- `configureSJTUTheme(options)`：设置标题页、页脚、主题、默认切换动画和 MathJax 路径。
- `setDefaults(kind, options)`：设置某类对象默认值，例如 `setDefaults("fragment", { effect: "fade-up" })`。
- `titleSlide(info)`：标题页。
- `outlineSlide(title)`：目录页。
- `sectionSlide(section)`：章节页。
- `subsection(title)` / `subsectionSlide(title)`：设置小节上下文。
- `slide(titleOrOptions, ...fragments)`：内容页。
- `endSlide(text)`：结束页。
- `list(...items)`：列表。
- `figure(label, options)`：图片。
- `formula(title, body, options)`：公式框。
- `theorem(title, body, options)`：定理框。
- `example(title, body, options)`：例子框。
- `definition(title, body, options)`：定义框。
- `alertBlock(title, body, options)`：强调框。
- `note(title, body, options)`：备注框。
- `proof(title, body, options)`：证明框。
- `columns(...items)`：对象内分栏。
- `columnFlow(items, options)`：页级栏目流。
- `contentGroup(title, items, options)`：内容块。
- `stepVariant(title, items, options)`：step 内容。
- `vSpace(size)`：竖向间距。
- `equationCompare(left, right, options)`：公式比较。
- `eqRef(label, text)`：公式引用。
- `figureRef(label, text)`：图片引用。
- `frag(content, options)`：手动 fragment。
- `uncover(step, content, options)`：指定某步后显示。
- `only(step, content, options)`：仅某步显示。
- `moveBetween(content, options)`：位置移动动画。
- `speakerNotes(...lines)`：演讲者备注。
- `bootstrapSJTUDeck(slides)`：渲染整份 slides。

## 关键 CSS 类

多数情况下不需要手写 CSS。需要微调时优先覆盖 CSS 变量或给对象添加 `className`。

主要结构类：

- `.deck-shell`：演示外壳。
- `.deck`：幻灯片容器。
- `.slide`：单页。
- `.slide-header`：页眉。
- `.slide-footer`：页脚。
- `.content-grid`：页面主体网格。
- `.fragment`：逐步出现对象。
- `.content-group`：内容块。
- `.block-card`：定理、例子、公式等框的基础样式。
- `.formula-card`：公式框。
- `.plain-formula`：普通公式。
- `.figure-card`：图片。
- `.figure-zoom-overlay`：图片放大浮层。

主题变量：

- `--sjtu-red`
- `--sjtu-red-dark`
- `--paper`
- `--ink`
- `--muted`

块样式变量：

- `--block-main`
- `--block-dark`
- `--block-soft`

示例：

```css
:root {
  --sjtu-red: #c9141e;
}

.my-card {
  --block-main: #9f1018;
  --block-dark: #6f0a10;
  --block-soft: #fff5f5;
}
```

## 路径约定

从 `markdown/*.html` 中引用：

- 核心 CSS/JS：`../core/...`
- 图片资源：`../assets/...`

从 `direct-html/*.html` 中引用：

- 核心 CSS/JS：`../core/...`
- 图片资源：`../assets/...`

