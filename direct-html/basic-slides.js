configureSJTUTheme({
  transition: "fade",
  footer: "上海交通大学",
  info: {
    title: "SJTU HTML PPT",
    subtitle: "Touying-like 静态 HTML 模板",
    author: "SJTUG",
    date: new Date().toLocaleDateString("zh-CN"),
    institution: "Shanghai Jiao Tong University",
  },
});

const slides = [
  titleSlide(),
  outlineSlide(),

  sectionSlide("快速开始"),
  subsection("基本结构"),
  slide("基本结构", { layout: "two" },
    list(
      "用函数描述页面，而不是手写整页 DOM。",
      "目录、页眉圆点、页脚页码会自动生成。",
      "公式由 MathJax 渲染，图片可点击放大。",
      "按 N 可以查看演讲者备注。"
    ),
    code(`const slides = [
  titleSlide(),
  outlineSlide(),
  sectionSlide("模型"),
  subsection("方程"),
  slide("方程",
    formula("控制方程", "$u_t + u u_x = \\\\nu u_{xx}$")
  ),
  endSlide()
];`)
  ),

  slide("公式与框", { layout: "two" },
    formula("Burgers 方程", "$u_t + u u_x = \\nu u_{xx} + f(x,t)$"),
    theorem("局部存在性", "在适当光滑性与边界条件下，可以建立局部解。"),
    speakerNotes("这里可以提醒自己：先解释公式符号，再讲定理假设。")
  ),

  sectionSlide("版式与多栏"),
  subsection("多栏工具"),
  slide("多栏工具", { layout: "one" },
    columns(
      list("左栏", "自动成为内部两栏"),
      example("右栏", "`columns(a, b)` 可以嵌在普通页中。")
    )
  ),

  subsection("对比工具"),
  slide("公式对比", { layout: "one" },
    equationCompare(
      "$u_t + u u_x = 0$",
      "$u_t + u u_x = \\nu u_{xx}$",
      { leftLabel: "无粘性", rightLabel: "有粘性" }
    )
  ),

  sectionSlide("动画与交互"),
  subsection("分步显隐"),
  slide("分步显隐", { layout: "two" },
    uncover(1, list("第 1 步出现"), { effect: "slide-left" }),
    uncover(2, theorem("第 2 步", "`uncover(step, content)` 在指定步出现。"), { effect: "zoom" }),
    only(3, alertBlock("第 3 步替换", "`only(step, content)` 只在指定步显示。"), { effect: "blur" }),
    moveBetween(example("位置移动", "第 2 步从 A 飘到 B。"), {
      appear: 1,
      moveAt: 2,
      from: { x: "-24vw", y: "10vh", scale: 0.9 },
      to: { x: "24vw", y: "10vh", scale: 1 }
    })
  ),

  subsection("图片放大"),
  slide("图片放大", { layout: "two" },
    list("带 `src` 的图片默认可点击放大。", "不点击时不会触发 overlay。", "点击背景或按 Esc 关闭。"),
    figure("SJTU thumbnail", {
      src: "../assets/thumbnail.png",
      caption: "点击图片放大。"
    })
  ),

  endSlide("Thanks for Listening!"),
];

bootstrapSJTUDeck(slides);
