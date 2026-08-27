#!/usr/bin/env node
// esbuild 包装：优先用本地 node_modules/.bin/esbuild；找不到则回退到全局 esbuild
// 用法：
//   node build.js               # 一次性编译
//   node build.js --watch       # 监听 src/ 改动自动重编译
//
// 输出：所有构建产物落到 backend/pb_public/，由 PocketBase --publicDir 直接 serve。
//   backend/pb_public/index.html       （从根 index.html 拷）
//   backend/pb_public/dist/bundle.js   （esbuild 打包）
//   backend/pb_public/src/styles/*.css （CSS 直接拷贝）
//   backend/pb_public/assets-claude/   （品牌素材直接拷贝）
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const LOCAL = path.join(__dirname, 'node_modules/.bin/esbuild');
const GLOBAL = '/Users/gear/go/bin/esbuild';
const ESBUILD = fs.existsSync(LOCAL) ? LOCAL : (fs.existsSync(GLOBAL) ? GLOBAL : null);
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'backend', 'pb_public');
const watch = process.argv.includes('--watch');

if (!ESBUILD) {
  console.error('找不到 esbuild：既无本地 node_modules/.bin/esbuild，也无全局 ' + GLOBAL);
  console.error('请运行：npm install  或  npm install -g esbuild');
  process.exit(1);
}

// ---- helper: 同步拷贝整个目录（递归） ----
function copyDirSync(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDirSync(s, d);
    else if (entry.isFile()) fs.copyFileSync(s, d);
  }
}
function copyFileSync(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

// ---- 1) 把静态资源拷到 backend/pb_public/ ----
console.log('[build] copying index.html / styles / assets-claude / manifest → backend/pb_public/');
copyFileSync(path.join(ROOT, 'index.html'),                path.join(PUBLIC, 'index.html'));
copyFileSync(path.join(ROOT, 'manifest.webmanifest'),      path.join(PUBLIC, 'manifest.webmanifest'));
if (fs.existsSync(path.join(ROOT, 'src', 'styles'))) {
  copyDirSync(path.join(ROOT, 'src', 'styles'),             path.join(PUBLIC, 'src', 'styles'));
}
if (fs.existsSync(path.join(ROOT, 'assets-claude'))) {
  copyDirSync(path.join(ROOT, 'assets-claude'),             path.join(PUBLIC, 'assets-claude'));
}

// ---- 2) esbuild 打包到 backend/pb_public/dist/bundle.js ----
// v1.3 · minify 单文件，全本地化（spec §6.4 收尾）：
//   所有依赖（react / react-dom / @privy-io/react-auth / wagmi / viem / zustand /
//   @wagmi/connectors / @solana/kit）从 node_modules 打进单文件 bundle.js。
//   生产环境零 esm.sh 运行时请求；Privy 全栈本地化，单一 React 实例无 context 冲突。
//   --minify 关掉所有 dev-only 路径、压缩源码（48 MB → 6.2 MB）。
//   --legal-comments=none 剥掉 license banner。
//   单文件策略：1 次 HTTP 请求、可整文件 hash 缓存。
const args = [
  'src/App.jsx',
  '--bundle',
  `--outfile=${path.join(PUBLIC, 'dist', 'bundle.js')}`,
  '--jsx=transform',
  '--loader:.jsx=jsx',
  '--format=esm',
  '--target=es2020',
  '--define:process.env.NODE_ENV=\'"production"\'',
  '--minify',
  '--legal-comments=none',
  '--log-level=info',
];

if (watch) {
  const proc = spawn(ESBUILD, [...args, '--watch'], { stdio: 'inherit', cwd: ROOT });
  process.on('SIGINT', () => proc.kill());
  process.on('exit', () => proc.kill());
} else {
  console.log(`Running: esbuild ${args.join(' ')}`);
  try {
    execSync(`${ESBUILD} ${args.join(' ')}`, { stdio: 'inherit', cwd: ROOT });
    execSync(`node "${path.join(ROOT, 'postbuild.js')}"`, { stdio: 'inherit' });
    console.log('build OK → ' + path.join(PUBLIC, 'dist', 'bundle.js'));
  } catch (e) {
    console.error('build FAILED');
    process.exit(1);
  }
}
