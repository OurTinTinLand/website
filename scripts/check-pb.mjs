#!/usr/bin/env node
// scripts/check-pb.mjs
// =============================================================================
// 最小的连通性 / 健康检查脚本 —— 确认 PB 在线 + superuser 能登录 + 集合齐全
// =============================================================================
//
// 用法：
//   node scripts/check-pb.mjs                # 用 PB_URL 环境变量（默认 127.0.0.1:8090）
//   PB_URL=http://localhost:8090 node scripts/check-pb.mjs
//
// 主要验证项：
//   1. /api/health 200
//   2. superuser 登录成功
//   3. /api/collections 列出 14 张表（v1.1 spec §1）
//   4. 用 SDK 拉每张表 perPage=1（验证 listRule + permissions）
//   5. aiRoute 冒烟一遍（5 个核心意图 + 兜底）

import {
    createClient, section, pass, fail, info, waitForPb, exitIfFailed, resetCounters,
} from './lib/cli-utils.mjs';

const EXPECTED_COLLECTIONS = [
    'users', 'user_profiles',
    'courses', 'events', 'hackathons', 'jobs', 'job_postings', 'talent_profiles',
    'apps', 'providers',
    'orders', 'intents', 'signups', 'leads',
];

async function main() {
    resetCounters();
    const baseUrl = process.env.PB_URL || 'http://127.0.0.1:8090';
    section('0. PB 连通性');
    const health = await waitForPb({ baseUrl });
    if (!health.ok) {
        fail('PB /api/health', new Error(health.error));
        process.stderr.write('提示：先启动 PB：cd backend && ./pocketbase serve --http=127.0.0.1:8090\n');
        process.exit(1);
    }
    pass('PB /api/health', JSON.stringify(health.body));

    const client = createClient({ baseUrl });

    section('1. Superuser 登录');
    try {
        const tok = await client.getSuperuserToken(undefined, undefined, true);
        if (tok && tok.length > 20) pass('superuser auth-with-password → token', tok.slice(0, 16) + '…');
        else fail('superuser token missing', new Error('empty token'));
    } catch (err) {
        fail('superuser auth', err);
        exitIfFailed();
    }

    section('2. 集合清单（spec §1 表）');
    let cols = [];
    try {
        // 用 SDK raw.send，避免 SDK 把请求当成"已授权仍需 auth"的形式
        // PB 的 collections 列表本身需要 superuser auth，所以先登录再拉
        const res = await client.raw.send('/api/collections', { method: 'GET' });
        cols = (res.items || []).map((c) => c.name).sort();
        pass(`fetched ${cols.length} collections`, cols.join(', '));
    } catch (err) {
        fail('list collections', err);
        exitIfFailed();
    }
    for (const expected of EXPECTED_COLLECTIONS) {
        if (cols.includes(expected)) pass(`collection present: ${expected}`);
        else fail(`collection missing: ${expected}`, new Error('not in /api/collections'));
    }

    section('3. 公开 catalog 匿名读（perPage=1）');
    const publicCols = ['courses', 'events', 'hackathons', 'jobs', 'apps', 'providers'];
    for (const c of publicCols) {
        try {
            // SDK 公开方法：listCourses / listEvents / ... → 转 camelCase
            const m = 'list' + c[0].toUpperCase() + c.slice(1);
            const r = await client[m]({ perPage: 1 });
            pass(`anonymous list ${c}`, `totalItems=${r.totalItems}`);
        } catch (err) {
            fail(`anonymous list ${c}`, err);
        }
    }

    section('4. 招聘板块（spec §9.7 / §15）');
    try {
        const r = await client.listJobPostings({ perPage: 1 });
        pass('anonymous list job_postings', `totalItems=${r.totalItems}`);
    } catch (err) {
        fail('list job_postings', err);
    }
    try {
        const r = await client.listTalentProfiles({ perPage: 1 });
        pass('anonymous list talent_profiles', `totalItems=${r.totalItems}`);
    } catch (err) {
        fail('list talent_profiles', err);
    }

    section('5. AI 路由（spec §5）');
    for (const msg of ['想学 AI Agent', '黑客松', 'Token Hub', '招聘', '随便看看']) {
        try {
            const r = await client.aiRoute(msg);
            const intent = r.intent || '(none)';
            const cards = Array.isArray(r.cards) ? r.cards.length : 0;
            pass(`aiRoute "${msg}"`, `intent=${intent} cards=${cards}`);
        } catch (err) {
            fail(`aiRoute "${msg}"`, err);
        }
    }

    exitIfFailed();
}

main().catch((e) => {
    process.stderr.write('FATAL: ' + (e.stack || e.message || e) + '\n');
    process.exit(2);
});
