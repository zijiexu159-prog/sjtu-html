# SJTU HTML PPT 模板

> 说明：本模板是个人学习与实验项目，维护以个人时间为准，更新不保证及时，也不代表上海交通大学官方模板或官方视觉识别规范。模板主要面向上海交通大学学生的课程展示、答辩或学术汇报场景；模板代码按 MIT License 开源，但使用者不应暗示本项目获得学校官方授权或背书。涉及校徽、视觉识别素材、字体、图片、论文图表等第三方或官方资源时，请自行确认使用权限。

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

## 可视化编辑器

在 `html-template/` 目录运行：

```powershell
npm run editor
```

也可以指定某个源文件：

```powershell
node editor/server.js markdown/example.sjtu.md
```

编辑器默认打开 `http://127.0.0.1:5174/`，界面分为三块：

- 左上：`.sjtu.md` 语义源稿；
- 左下：`.layout.json` 视觉补丁；
- 右侧：生成后的 HTML slide 实时预览。

点击右侧预览对象会同步定位源码行和 layout 节点。编辑模式下可以在预览中拖动或缩放 fragment，结果会写入 `.layout.json` 的相对坐标；工具栏可以设置出现 step、动画效果和字号比例。这样 `.sjtu.md` 保持语义清晰，频繁的排版微调都留在 layout 补丁中。

建议在 `.sjtu.md` 头部显式写出 layout 文件：

```markdown
% layout: example.layout.json
```

需要可视化编辑的页面和对象也建议写稳定 id：

```markdown
--- 控制方程[2]{#slide-control}

### 主公式[zoom]{#main-formula}

![相图](../assets/figures/example.svg){#fig:phase}
```

## Docker 一键运行

如果不想在本机安装 Node.js，可以直接用 Docker：

```powershell
docker compose up --build
```

然后打开 `http://127.0.0.1:5174/`。

如果构建时报错类似 `failed to fetch anonymous token`、`auth.docker.io` 超时，说明 Docker 没能从 Docker Hub 拉取基础镜像 `node:24-alpine`。这通常是网络或镜像源问题，不是模板代码问题。可以用下面任一办法：

1. 先不用 Docker，直接本地运行：

```powershell
npm run editor
```

2. 给 Docker 配置可访问的 registry mirror，然后重新运行：

```powershell
docker compose up --build
```

3. 指定一个你当前网络可访问的 Node 镜像。可以复制 `.env.example` 为 `.env`，把其中的 `NODE_IMAGE` 改成可访问的镜像地址：

```text
NODE_IMAGE=<your-registry-mirror>/library/node:24-alpine
```

也可以临时在 PowerShell 中指定：

```powershell
$env:NODE_IMAGE="<your-registry-mirror>/library/node:24-alpine"
docker compose up --build
```

如果你已经在其他机器上拉好了镜像，也可以先 `docker save` / `docker load` 到本机，然后把 `NODE_IMAGE` 改成本地已有的镜像名。

`docker-compose.yml` 会把本地的 `./workspace` 挂载到容器里的 `/workspace`：

```yaml
volumes:
  - ./workspace:/workspace
```

因此编辑器保存时，实际写回的是本地 `workspace` 文件夹。你可以先把 `.sjtu.md`、`.layout.json`、图片和 bib 文件放进去再启动，也可以在编辑器里用 `Import Folder` 上传一个项目文件夹。

也可以手动运行镜像：

```powershell
docker build -t sjtu-html-editor .
docker run --rm -p 5174:5174 -v ${PWD}/workspace:/workspace sjtu-html-editor
```

可用环境变量：

```text
HOST=0.0.0.0
PORT=5174
SJTU_WORKSPACE=/workspace
```

如果挂载目录里没有 `.sjtu.md`，server 会自动放入一份示例。如果你不使用持久化挂载、只通过网页上传文件夹，关闭容器前请点击 `Export ZIP` 导出项目。

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
% bibliography: references.bib

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
文献引用写作 @cite:turing1950，脚注写作这样[^note-demo]。

::: theorem 局部存在性
在适当初值条件下，解局部存在。
:::

![相图](../assets/figures/三重根.svg){#fig:phase}

参见 @fig:phase。

[^note-demo]: 这条脚注只会显示在当前页底部。
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

文献引用使用 `@cite:key`，在文件头写 `% bibliography: references.bib` 后，构建脚本会把 `.bib` 内联进 HTML 并自动生成参考文献页。脚注使用 `[^id]`，脚注定义使用 `[^id]: 脚注内容`。

## 参考文献页

默认情况下，只要正文出现 `@cite:key`，模板会自动在结尾追加“参考文献”页。常用配置：

```markdown
% bibliography: references.bib
% bibliography-title: 参考文献
% bibliography-position: last
% bibliography-include-uncited: false
```

如果你希望 Thanks 页仍然是最后一页，可写：

```markdown
% bibliography-position: before-end
```

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
