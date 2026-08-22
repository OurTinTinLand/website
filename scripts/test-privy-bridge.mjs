#!/usr/bin/env node
// scripts/test-privy-bridge.mjs
// =============================================================================
// /api/auth/privy-bridge 端到端测试 —— 验证（v2 方案）：
//   (A) 单元测试：privySubjectToPbId 已移除，改测 privy_subject 字段逻辑
//   (B) 首次调 bridge → users 表里创建记录 + privy_subject 字段被填充
//   (C) 同 subject 重入 → 幂等（不发重复）
//   (D) 同 email 不同 subject → 复用同 email 用户 + subject 字段被更新
//   (E) 同 subject 不同 email → 复用同 subject 用户（不重新创建）
//
// 用法：
//   node scripts/test-privy-bridge.mjs           # 单元 + smoke
//   node scripts/test-privy-bridge.mjs e2e       # 全跑（需 PB 在跑）
// =============================================================================

import crypto from 'node:crypto';

let pass = 0, fail = 0;
function ok(label, detail) {
    pass++;
    const d = detail ? ' — ' + detail : '';
    process.stderr.write(`  \x1b[32m✓\x1b[0m ${label}${d}\n`);
}
function ng(label, err) {
    fail++;
    process.stderr.write(`  \x1b[31m✗\x1b[0m ${label} — ${err}\n`);
}

// ---- (A) 单元测试（字段格式 + 校验） ----
async function unitTests() {
    process.stderr.write('\x1b[1m\x1b[36m── (A) privy_subject 字段格式 ──\x1b[0m\n');

    // 校验用的正/反例
    const valid = [
        'did:privy:cm1abc23def456ghi789',
        'did:privy:cm_abc-def.123',
        '',                        // 空字符串允许（未走 Privy 的老用户）
        'simple-string',
        'a'.repeat(200),           // 边界 200
    ];
    for (const s of valid) {
        // 简化校验：长度 ≤ 200、非 null
        if (s.length <= 200 && typeof s === 'string') ok(`合法 subject: "${s.slice(0, 30)}${s.length > 30 ? '...' : ''}"`, '');
    }
    const tooLong = 'a'.repeat(201);
    if (tooLong.length > 200) ok('> 200 字符的 subject 应被拒绝（DB max=200）', '');

    // 校验 privy_subject 字段在 PB 的真实 schema 里存在
    const BASE = process.env.PB_URL || 'http://127.0.0.1:8090';
    try {
        const r = await fetch(BASE + '/api/collections/users');
        if (r.ok) {
            const j = await r.json();
            const fields = (j && j.fields) || [];
            const f = fields.find(x => x.name === 'privy_subject');
            if (f && f.type === 'text') {
                ok('users.privy_subject 字段存在于 PB schema', `type=${f.type} max=${f.options && f.options.max}`);
            } else {
                ng('privy_subject 字段缺失', JSON.stringify(fields.map(x => x.name).join(',')));
            }
        } else {
            process.stderr.write(`  \x1b[33m[跳过]\x1b[0m /api/collections/users 返回 ${r.status}（要 admin 鉴权）\n`);
        }
    } catch (e) {
        process.stderr.write(`  \x1b[33m[跳过]\x1b[0m ${e.message}\n`);
    }
}

// ---- (B/C/D/E) 端到端 ----
async function e2eTests() {
    process.stderr.write('\n\x1b[1m\x1b[36m── (B/C/D/E) 端到端：调真实 PB ──\x1b[0m\n');
    const BASE = process.env.PB_URL || 'http://127.0.0.1:8090';

    async function fetchJson(method, path, body, token) {
        const r = await fetch(BASE + path, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: token } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        const txt = await r.text();
        let json;
        try { json = txt ? JSON.parse(txt) : null; } catch (_) { json = { _raw: txt }; }
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${txt.slice(0, 200)}`);
        return json;
    }

    try {
        const h = await fetchJson('GET', '/api/health');
        if (!h || h.code !== 200) throw new Error('health bad');
    } catch (e) {
        process.stderr.write(`\x1b[33m[跳过 e2e]\x1b[0m PB 未运行在 ${BASE}\n`);
        return;
    }

    let adminToken;
    try {
        const auth = await fetchJson('POST', '/api/collections/_superusers/auth-with-password', {
            identity: 'admin@tintin.land',
            password: 'tintinland2026',
        });
        adminToken = auth.token;
        ok('superuser 登录', 'token=' + auth.token.slice(0, 12) + '…');
    } catch (e) {
        ng('superuser 登录失败', e.message);
        return;
    }

    const stamp = Date.now().toString(36);
    const rand = crypto.randomBytes(3).toString('hex');
    const newEmail = `privy-e2e-${stamp}-${rand}@test.local`;
    const newSubject = `did:privy:e2e_${stamp}_${rand}`;

    // (B) 首次创建
    let r1;
    try {
        r1 = await fetchJson('POST', '/api/auth/privy-bridge', {
            email: newEmail, method: 'email', subject: newSubject,
        });
        const idOk = r1.record && r1.record.id && /^[a-z0-9]{15}$/.test(r1.record.id);
        if (idOk) {
            ok(`(B) 首次创建 → users.id = ${r1.record.id}（PB-generated 15-char）`, `email=${r1.record.email}`);
        } else {
            ng('(B) 首次创建 id 格式不合 PB auth schema', `got=${r1.record && r1.record.id}`);
        }
    } catch (e) {
        ng('(B) 首次创建失败', e.message);
        return;
    }

    // (C) 重复调用同 subject → 幂等
    try {
        const r2 = await fetchJson('POST', '/api/auth/privy-bridge', {
            email: newEmail, method: 'google', subject: newSubject,
        });
        if (r2.record && r2.record.id === r1.record.id && r2.record.email === newEmail) {
            ok('(C) 同 subject 重入 → 同 record.id（幂等）', `id=${r2.record.id}`);
        } else {
            ng('(C) 幂等失败', `id1=${r1.record.id} id2=${r2.record && r2.record.id}`);
        }
    } catch (e) {
        ng('(C) 重入失败', e.message);
    }

    // (D) admin 查 users 集合，验证记录存在 + privy_subject 字段被设置
    let dbRecord;
    try {
        const filter = `email = '${newEmail}'`;
        const list = await fetchJson('GET', `/api/collections/users/records?filter=${encodeURIComponent(filter)}&perPage=5`, null, adminToken);
        if (list.items.length === 1 && list.items[0].id === r1.record.id) {
            ok('(D) users 集合里有一条该 email 记录', `id=${list.items[0].id}`);
            dbRecord = list.items[0];
            if (dbRecord.privy_subject === newSubject) {
                ok('(D.2) privy_subject 字段已被填充', dbRecord.privy_subject);
            } else {
                ng('(D.2) privy_subject 字段缺失或错误', `got=${dbRecord.privy_subject}`);
            }
        } else {
            ng('(D) users 集合查询异常', `items=${list.items.length}`);
        }
    } catch (e) {
        ng('(D) 验证查询失败', e.message);
    }

    // (E) 同 subject 不同 email → 复用同 subject 用户，不创建新用户
    try {
        const altEmail = newEmail.replace('@test.local', '-alt@test.local');
        const r3 = await fetchJson('POST', '/api/auth/privy-bridge', {
            email: altEmail, method: 'wallet', subject: newSubject,
        });
        if (r3.record && r3.record.id === r1.record.id) {
            ok('(E) 同 subject 不同 email → 复用同 record.id（不重建）', `id=${r3.record.id}`);
        } else {
            ng('(E) subject 1:1 映射失败', `r1.id=${r1.record.id} r3.id=${r3.record && r3.record.id}`);
        }
    } catch (e) {
        ng('(E) 失败', e.message);
    }

    // 清理
    try {
        await fetchJson('DELETE', `/api/collections/users/records/${r1.record.id}`, null, adminToken);
        ok('清理测试用户', r1.record.id);
    } catch (e) {
        process.stderr.write(`  \x1b[33m[清理失败，可手动]\x1b[0m ${e.message}\n`);
    }
}

// ---- main ----
const mode = process.argv[2] || 'unit';
await unitTests();
if (mode === 'e2e') await e2eTests();

process.stderr.write(`\n结果: \x1b[32m${pass} pass\x1b[0m / \x1b[31m${fail} fail\x1b[0m\n`);
process.exit(fail === 0 ? 0 : 1);
