#!/usr/bin/env node
// v1.3 · 全本地化后这个脚本是 no-op
// 历史：
//   v1.1 之前 bundle.js 是 IIFE，里面会有 esbuild 输出的 `__require("https://esm.sh/react@18")`
//         这种形式；这个脚本负责把它们改成 `window.React` 全局引用，让打包更轻、避免重复下载。
//   v1.2 改成 ESM（--format=esm），alias 直接输出 esm.sh URL，浏览器自己 fetch；这个脚本变 no-op。
//   v1.3 alias 全删，所有依赖从 node_modules 本地化进 bundle.js；postbuild 仍为 no-op。
// 这个文件保留只为不破坏历史引用路径，实际什么都不做。
console.log('[postbuild] v1.3·local-bundle: no-op (build.js emits ESM from node_modules)');
