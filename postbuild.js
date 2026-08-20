#!/usr/bin/env node
// v1.2 · ESM 改造后这个脚本是 no-op
// 历史：之前 bundle.js 是 IIFE，里面会有 esbuild 输出的 `__require("https://esm.sh/react@18")` 这种
//       形式；这个脚本负责把它们改成 `window.React` 全局引用，让打包更轻、避免重复下载。
// 现在 bundle.js 是 ESM（`--format=esm`），并且 react alias 已经直接输出 esm.sh URL，
// 浏览器自己有 importmap 处理，不需要全局 Rewrite。所以这个文件保留只为不破坏历史引用，
// 实际什么都不做。
console.log('[postbuild] v1.2·ESM: no-op (build.js emits ESM with esm.sh URLs directly)');
