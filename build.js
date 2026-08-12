#!/usr/bin/env node
// esbuild 包装：优先用本地 node_modules/.bin/esbuild；找不到则回退到全局 esbuild
// 用法：
//   node build.js               # 一次性编译
//   node build.js --watch       # 监听 src/ 改动自动重编译
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const LOCAL = path.join(__dirname, 'node_modules/.bin/esbuild');
const GLOBAL = '/Users/gear/go/bin/esbuild';
const ESBUILD = fs.existsSync(LOCAL) ? LOCAL : (fs.existsSync(GLOBAL) ? GLOBAL : null);
const ROOT = __dirname;
const watch = process.argv.includes('--watch');

if (!ESBUILD) {
  console.error('找不到 esbuild：既无本地 node_modules/.bin/esbuild，也无全局 ' + GLOBAL);
  console.error('请运行：npm install  或  npm install -g esbuild');
  process.exit(1);
}

const args = [
  'src/App.jsx',
  '--bundle',
  '--outfile=dist/bundle.js',
  '--jsx=transform',
  '--loader:.jsx=jsx',
  '--format=iife',
  '--target=es2020',
  '--define:process.env.NODE_ENV=\'"development"\'',
  '--sourcemap=inline',
  `--alias:react=https://esm.sh/react@18`,
  `--alias:react-dom=https://esm.sh/react-dom@18`,
  `--alias:react-dom/client=https://esm.sh/react-dom@18/client`,
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
    console.log('build OK → dist/bundle.js');
  } catch (e) {
    console.error('build FAILED');
    process.exit(1);
  }
}