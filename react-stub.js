// react-stub.js: 编译时让 esbuild 把 'react' import 替换成 IIFE 全局变量引用。
// 运行时通过 index.html 加载 React UMD 提供 window.React / window.ReactDOM。
//
// 注意：esbuild 会发出 `var react_default = require_react()` 这样的代码，
// 但 IIFE 模式 + --external:react 会让 esbuild 把 'react' 留作运行时引用。
// 我们的 bundle.js 用 `var React = window.React` 直接拿，避开 require。

export const __USE_GLOBAL_REACT__ = true;