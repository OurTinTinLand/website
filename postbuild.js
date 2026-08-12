#!/usr/bin/env node
// post-build: 把 bundle 里 esm.sh dynamic require 替换为 window.React 全局引用
// 关键：保留 `import_react29.createElement` 这种属性访问，只替换 `import_react*.default`

const fs = require('fs');
const path = require('path');

const BUNDLE = path.join(__dirname, 'dist/bundle.js');
let src = fs.readFileSync(BUNDLE, 'utf8');

// 1. 把 __toESM(__require("https://esm.sh/react@18")) 替换为 window.React
//    （__toESM 包了 default 属性，esbuild 把 React 当作有 default export）
src = src.replace(/__toESM\(__require\("https:\/\/esm\.sh\/react@18"\)\)/g, 'window.React');
src = src.replace(/__toESM\(__require\("https:\/\/esm\.sh\/react-dom@18"\)\)/g, 'window.ReactDOM');
src = src.replace(/__toESM\(__require\("https:\/\/esm\.sh\/react-dom@18\/client"\)\)/g, 'window.ReactDOMClient');

// 2. 把 `import_react*.default` 替换为对应全局（**只匹配 .default**）
src = src.replace(/import_react\d*\.default/g, 'window.React');

fs.writeFileSync(BUNDLE, src);
console.log('post-build OK: React globals wired');