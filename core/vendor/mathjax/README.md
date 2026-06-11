# 本地 MathJax 放置位置

完全离线演示时，把 MathJax 3 的 `tex-svg.js` 放到这里：

```text
html-template/vendor/mathjax/tex-svg.js
```

模板会先尝试加载这个本地文件；如果不存在，会回退到 `configureSJTUTheme().mathjax.cdn` 指定的 CDN。
