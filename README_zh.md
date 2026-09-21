# SJTU HTML PPT 模板

这是一个独立的 HTML 幻灯片模板。附带的桌游示例完全虚构，仅用于展示旧版幻灯片语法和视觉主题。本次发布使用重新编写的示例，已移除旧的个人示例及其链接。

## 构建示例

安装 Node.js 后运行：

```powershell
npm run build
```

命令会根据 `markdown/example.md` 生成 `markdown/example.html`。也可以直接构建其他源稿：

```powershell
node core/build-sjtu-markup.js path/to/slides.md
```

优先使用普通 `.md` 文件；已有 `.sjtu.md` 源稿仍可使用，并继续使用原来的 `.html` 和 `.layout.json` 配套文件名。`talk.md` 与 `talk.sjtu.md` 会指向相同输出，因此构建器和编辑器会拒绝同目录下的这组重名源稿；请只保留一个。

## 打开本地编辑器

```powershell
npm run editor
```

然后访问 <http://127.0.0.1:5174/>。编辑器会在源稿旁保存 `.layout.json` 并重新生成 HTML 预览。文件列表识别 `.sjtu.md` 文件，以及包含幻灯片元数据或分页标记的 `.md` 文件；README 不会被当作演示文稿。

运行 `npm run check:js` 可检查 JavaScript 语法。

本项目并非上海交通大学官方产品，也不代表学校背书。
