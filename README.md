# SJTU HTML PPT 模板

这是一个可独立发布的上海交通大学风格 HTML 演示文稿模板。它保留了直接写 HTML/JS 的入口，也提供了更接近 Markdown / Typst 的 `.sjtu.md` 写稿方式，适合把论文笔记、MinerU 解析文本或 Touying 示例快速转成可演示的网页幻灯片。

## 目录结构

- `core/`：模板核心库、样式和构建脚本。
- `direct-html/`：直接用 JavaScript 写 slides 数组的示例和说明书。
- `markdown/`：类 Markdown 源稿与对应生成的 HTML。
- `assets/`：模板图片、SJTU VI 素材和示例图。
- `reference/`：命令、函数和 CSS 参考。
- `skills/`：给 Codex 使用的转换与排版 skill。

## 快速开始

推荐从类 Markdown 入口开始：

```powershell
cd html-template
node core/build-sjtu-markup.js markdown/example.sjtu.md markdown/example.html
```

然后直接用浏览器打开 `markdown/example.html`。完整示例可以生成：

```powershell
node core/build-sjtu-markup.js markdown/touying-main-complete.sjtu.md markdown/touying-main-complete.html
node core/build-sjtu-markup.js markdown/manual.sjtu.md markdown/manual.html
```

如果安装了 npm，也可以使用：

```powershell
npm run build
```

## 两种写法

直接 HTML/JS 写法适合熟悉 JavaScript 的场景：

- `direct-html/index.html`
- `direct-html/basic.html`
- `direct-html/basic-slides.js`
- `direct-html/manual.html`

类 Markdown 写法适合主要写内容、不想碰 JS 的场景：

- `markdown/example.sjtu.md`
- `markdown/manual.sjtu.md`
- `markdown/touying-main-complete.sjtu.md`

## 常用类 Markdown 语法

```markdown
% title: 我的报告
% subtitle: 答辩报告
% author: 张三
% footer: 上海交通大学
% transition: fade

# 研究背景
## 模型建立

--- 控制方程[2][0.45,0.55][transition=rise]

### 左侧说明[fade-up]
- 研究对象
- 建模假设

||

### 右侧公式[zoom]
$$ {#eq:model}
u_t + u u_x = \nu u_{xx}
$$

由 @eq:model 可得到能量估计。

::: theorem 局部存在性
在适当初值条件下，解局部存在。
:::

![相图](../assets/figures/三重根.svg){#fig:phase}

参见 @fig:phase。
```

## 分栏与内容块

- `--- 标题[1]`：单栏页面。
- `--- 标题[2][0.4,0.6]`：两栏页面，并指定宽度比例。
- `||`：切换到下一页级栏目。
- `||[2][0.35,0.65]`：为当前栏目预设两个纵向内容槽。
- `|||`：在当前内容块内部继续分栏。
- `### 名称[动画]`：创建一个内容块；名称只用于源稿组织，不显示。
- `#### 名称[1-2]`：创建同一内容块的 step 内容，可控制出现步数。
- `#v(1em)`：手动插入竖向间距。

## 动画

页面切换动画可在开头设置默认值：

```markdown
% transition: fade
```

单页可以覆盖：

```markdown
--- 关键结论[2][transition=zoom]
```

内容块动画写在 `###` 或 `####` 后：

```markdown
### 结论卡片[slide-right]
#### 第二步[2][zoom]
```

支持的常用效果包括 `fade`、`fade-up`、`slide-left`、`slide-right`、`zoom`、`blur`、`move-between`。更完整的写法见 `reference/api-css-reference.md` 和 `markdown/manual.html`。

## 公式、图片和引用

普通公式不会自动加框：

```markdown
$$ {#eq:plain}
E = mc^2
$$
```

需要公式框时显式使用：

```markdown
::: formula 控制方程
$$ {#eq:burgers}
u_t + u u_x = \nu u_{xx}
$$
:::
```

公式引用使用 `@eq:burgers`，图片引用使用 `@fig:phase`。点击引用会跳转到对应页面，按 `R` 可返回跳转前的位置。

## 路径约定

项目现在是独立子项目，不再依赖外层 `touying-sjtu`：

- CSS/JS 固定从 `core/` 引入。
- 示例图片固定放在 `assets/`。
- Markdown 页面内引用图片时，路径相对生成后的 HTML，例如 `../assets/thumbnail.png`。

## 独立 Git

`html-template` 可以作为单独仓库初始化和上传；不要把外层 `touying-sjtu` 当作这次发布目标。

```powershell
cd html-template
git init
git add .
git commit -m "Initial SJTU HTML PPT template"
```

推送到 GitHub 时再添加你自己的远端地址：

```powershell
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

