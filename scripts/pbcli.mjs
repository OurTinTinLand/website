#!/usr/bin/env node
// scripts/pbcli.mjs —— vendored pocketbase-cli 的快捷 shim
//
// 用法：
//   node scripts/pbcli.mjs <args...>
// 例：
//   node scripts/pbcli.mjs --json preflight
//   node scripts/pbcli.mjs records list courses --per-page 5
//
// 把 vendored CLI 包了薄薄一层，让"从仓库内任何地方都能跑 pbcli"。
// 它直接 exec 同一份 vendored binary，行为 100% 等同于全局 `pocketbase-cli`。
//
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const candidates = [
    path.join(__dirname, 'vendor', 'pocketbase-cli', 'dist', 'bin.js'),
    path.join(process.env.HOME || '', '.local', 'share', 'pocketbase-cli', 'dist', 'bin.js'),
];

let bin = null;
for (const c of candidates) {
    if (existsSync(c)) { bin = c; break; }
}
if (!bin) bin = 'pocketbase-cli';   // PATH fallback

const child = spawn(process.execPath, [bin, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: process.env,
});
child.on('close', (code) => process.exit(code ?? 0));
child.on('error', (e) => { console.error('pbcli spawn failed:', e.message); process.exit(127); });
