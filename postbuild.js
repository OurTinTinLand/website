#!/usr/bin/env node
// post-build: 把 bundle 里 esm.sh dynamic require 替换为 window.React 全局引用
// 三种形态都要处理：
//   1. __toESM(__require("https://esm.sh/react@18"))      ← 默认导入（混合 import React, { x }）
//   2. __require("https://esm.sh/react@18")               ← 纯命名导入 { x }
//   3. __toESM(__require("https://esm.sh/react-dom@18")) ← react-dom
//   4. import_reactN.default 已在全局替换

const fs = require('fs');
const path = require('path');

const BUNDLE = path.join(__dirname, 'dist/bundle.js');
let src = fs.readFileSync(BUNDLE, 'utf8');

// 1) __toESM(...) 包裹的形式（default 导入混 named）
src = src.replace(/__toESM\(__require\("https:\/\/esm\.sh\/react@18"\)\)/g, 'window.React');
src = src.replace(/__toESM\(__require\("https:\/\/esm\.sh\/react-dom@18"\)\)/g, 'window.ReactDOM');
src = src.replace(/__toESM\(__require\("https:\/\/esm\.sh\/react-dom@18\/client"\)\)/g, 'window.ReactDOMClient');

// 2) 直接 __require(...)（纯命名导入，不再走 __toESM）
src = src.replace(/__require\("https:\/\/esm\.sh\/react@18"\)/g, 'window.React');
src = src.replace(/__require\("https:\/\/esm\.sh\/react-dom@18"\)/g, 'window.ReactDOM');
src = src.replace(/__require\("https:\/\/esm\.sh\/react-dom@18\/client"\)/g, 'window.ReactDOMClient');

// 3) import_reactN.default 走全局
src = src.replace(/import_react\d*\.default/g, 'window.React');

fs.writeFileSync(BUNDLE, src);
console.log('post-build OK: React globals wired');
