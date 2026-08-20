// CLI 脚本通用工具
//  - createClient(opts)         构造一个 PB client（带 superuser 配置 + OTP 日志 hook）
//  - waitForOtpFromLog(opts)    从 pb.log 里捞最近的 OTP 验证码
//  - section / pass / fail      输出格式
//  - sleep / withTimeout        异步助手
//
// 设计：所有 CLI 脚本复用同一套工具，避免每个脚本自己写一遍。

import fs from 'node:fs';
import path from 'node:path';
import { createPbClient, PbError, asPbError } from '../../src/lib/pb-sdk.mjs';

// 默认超级账号（与 backend/start.sh / api.md 一致）
export const DEFAULT_ADMIN = {
    email: 'admin@tintin.land',
    password: 'tintinland2026',
};

// 颜色（ANSI），用 process.stderr.isTTY 判断
const useColor = process.stderr.isTTY;
const c = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const red = c('31');
const green = c('32');
const yellow = c('33');
const cyan = c('36');
const gray = c('90');
const bold = c('1');

let _counters = { pass: 0, fail: 0, sections: 0 };

export function resetCounters() { _counters = { pass: 0, fail: 0, sections: 0 }; }
export function getCounters() { return { ..._counters }; }

export function section(name) {
    _counters.sections++;
    process.stderr.write('\n' + bold(cyan(`── ${name} ──`)) + '\n');
}
export function pass(label, detail) {
    _counters.pass++;
    const head = green('  ✓ ') + label;
    process.stderr.write(head + (detail ? gray('  · ' + detail) : '') + '\n');
}
export function fail(label, err, detail) {
    _counters.fail++;
    const head = red('  ✗ ') + label;
    let msg = '';
    if (err) {
        const e = asPbError(err);
        msg = e.status ? `[${e.status}] ` : '';
        msg += e.message;
    }
    process.stderr.write(head + (msg ? red('  · ' + msg) : '') + (detail ? gray('  · ' + detail) : '') + '\n');
}
export function info(label, detail) {
    process.stderr.write(gray('  · ') + label + (detail ? gray(' · ' + detail) : '') + '\n');
}
export function warn(label) {
    process.stderr.write(yellow('  ! ') + label + '\n');
}

// 异步 sleep
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- createClient ----
//
// 配置项：
//   - baseUrl       显式 PB URL
//   - adminEmail / adminPassword   超管凭据（默认 admin@tintin.land / tintinland2026）
//   - logPath       pb.log 文件路径（用于 OTP 反查）
//   - skipAdminAuth 不去 superuser 登录（只读 spec conformance 用）
export function createClient(opts = {}) {
    const adminEmail = (opts.adminEmail || DEFAULT_ADMIN.email);
    const adminPassword = (opts.adminPassword || DEFAULT_ADMIN.password);
    return createPbClient({
        baseUrl: opts.baseUrl,
        admin: { email: adminEmail, password: adminPassword },
    });
}

// ---- waitForOtpFromLog ----
//
// 从 pb.log 里找最近一条 "[auth.email-code] mail send failed (dev fallback) <email> code = <code>"
// 行，返回 code。CLI 默认无 SMTP → 必然走 fallback，code 一定在 log 里。
//
// opts:
//   - email    必填，要找哪个邮箱
//   - logPath  必填，pb.log 文件路径
//   - timeoutMs 默认 5000
//   - pollMs   默认 100
export async function waitForOtpFromLog({ email, logPath, timeoutMs = 5000, pollMs = 100 }) {
    if (!email) throw new Error('waitForOtpFromLog: email is required');
    if (!logPath) throw new Error('waitForOtpFromLog: logPath is required');
    if (!fs.existsSync(logPath)) {
        throw new Error('waitForOtpFromLog: logPath does not exist: ' + logPath);
    }
    const needleRe = new RegExp(
        'mail send failed \\(dev fallback\\)\\s+' +
        email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
        '\\s+code\\s*=\\s*(\\d{4,8})',
    );
    const deadline = Date.now() + timeoutMs;
    let lastSize = 0;
    while (Date.now() < deadline) {
        try {
            const stat = fs.statSync(logPath);
            if (stat.size > lastSize) {
                const fd = fs.openSync(logPath, 'r');
                const buf = Buffer.alloc(stat.size - lastSize);
                fs.readSync(fd, buf, 0, buf.length, lastSize);
                fs.closeSync(fd);
                lastSize = stat.size;
                const text = buf.toString('utf8');
                const lines = text.split(/\r?\n/);
                // 取最后一个匹配
                let found = null;
                for (const line of lines) {
                    const m = line.match(needleRe);
                    if (m) found = m[1];
                }
                if (found) return found;
            }
        } catch (_) {}
        await sleep(pollMs);
    }
    return null;
}

// ---- 截短打印 ----
export function short(obj, n = 200) {
    const s = JSON.stringify(obj, null, 2);
    return s.length > n ? s.slice(0, n) + '…' : s;
}

// ---- 退出码辅助 ----
export function exitIfFailed(code = 1) {
    const c = getCounters();
    if (c.fail > 0) {
        process.stderr.write('\n' + red(`${c.fail} failed / ${c.pass} passed`) + '\n');
        process.exit(code);
    } else {
        process.stderr.write('\n' + green(`All ${c.pass} checks passed`) + '\n');
    }
}

// 等待 PB /api/health 通
export async function waitForPb({ baseUrl, timeoutMs = 30000, pollMs = 200 }) {
    const url = (baseUrl || process.env.PB_URL || 'http://127.0.0.1:8090').replace(/\/$/, '');
    const deadline = Date.now() + timeoutMs;
    let lastErr = null;
    while (Date.now() < deadline) {
        try {
            const r = await fetch(url + '/api/health');
            if (r.ok) {
                const j = await r.json().catch(() => null);
                return { ok: true, body: j };
            }
            lastErr = 'HTTP ' + r.status;
        } catch (e) {
            lastErr = e.message || String(e);
        }
        await sleep(pollMs);
    }
    return { ok: false, error: lastErr || 'timeout' };
}

export { PbError, asPbError };
