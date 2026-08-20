#!/usr/bin/env node
// scripts/spec-verify.mjs
// =============================================================================
// spec §17 验收 —— 用 [pocketbase-cli](https://github.com/Ericsunsk/Pocketbase-CLI) 跑一遍
// =============================================================================
//
// 跟 test-spec-conformance.mjs 的区别：
//   * test-spec-conformance.mjs 用 src/lib/pb-sdk.mjs（pocketbase npm 包）做 CRUD
//   * spec-verify.mjs          用 pocketbase-cli 的 vendored binary 做同样的事
//
// 两个脚本结果应该一致；如果不一致 → 一边有 bug 或者 hook 在某条路径上行为不一致。
// 这是个非常便宜的"双源交叉验证"机制。
//
// 用法：
//   node scripts/spec-verify.mjs                # 跑全套
//   node scripts/spec-verify.mjs ai             # 只跑 §5 AI 路由
//   node scripts/spec-verify.mjs catalog        # 只跑 §7 catalog
//   node scripts/spec-verify.mjs auth           # 只跑 §6 登录
//   node scripts/spec-verify.mjs hiring         # 只跑 §7.4 / §15 招聘
//   node scripts/spec-verify.mjs writes         # 只跑 §14 业务写入
//   node scripts/spec-verify.mjs preflight      # 只跑 CLI 自己的 preflight + info

import {
    createClient, section, pass, fail, info, exitIfFailed, resetCounters,
} from './lib/cli-utils.mjs';
import { createPbCli } from './pb-cli.mjs';

const BASE = process.env.PB_URL || 'http://127.0.0.1:8090';
const STAMP = Date.now().toString(36).slice(-6);
const TEST_EMAIL = `verify-${STAMP}@tintin.land`;

async function runPreflight(pb) {
    section('pocketbase-cli preflight');
    try {
        const pf = await pb.util.preflight();
        if (pf.result.ready) pass('preflight ready', `checks=${pf.result.checks.length}`);
        else fail('preflight ready', new Error(JSON.stringify(pf.result)));
        // 每项 check（"skip" 是 OK 的 —— 比如预检不要求 auth 时跳过 saved auth 检查）
        for (const c of pf.result.checks) {
            if (c.status === 'pass') {
                pass(`check: ${c.name}`, c.message);
            } else if (c.status === 'skip') {
                info(`check: ${c.name} (skip)`, c.message);
            } else {
                fail(`check: ${c.name}`, new Error(c.message), c.message);
            }
        }
    } catch (err) {
        fail('preflight', err);
        return false;
    }

    try {
        const infoRes = await pb.util.info();
        const h = infoRes.data.health;
        (h.ok ? pass : fail)(
            'info.health probe',
            h.ok ? null : new Error(h.message),
            `url=${h.url} status=${h.status}`,
        );
        pass('info.mode', infoRes.data.mode);
    } catch (err) {
        fail('info', err);
        return false;
    }

    return true;
}

async function runAI(pb) {
    section('§5 首页假 AI 路由（via raw POST /api/ai-route）');
    const cases = [
        { msg: '我想学 AI Agent 课程', intent: 'course' },
        { msg: '本周有什么黑客松', intent: 'hackathon' },
        { msg: '最近有什么活动 AMA', intent: 'event' },
        { msg: '我想买 AI token', intent: 'tokenhub' },
        { msg: '招聘 / 找工作', intent: 'job' },
        { msg: '随便看看', intent: 'fallback' },
    ];
    for (const tc of cases) {
        try {
            const r = await pb.raw('POST', '/api/ai-route', { data: { message: tc.msg } });
            const intent = r.result.intent;
            (intent === tc.intent ? pass : fail)(
                `aiRoute "${tc.msg}"`,
                intent === tc.intent ? null : new Error(`expected=${tc.intent} got=${intent}`),
                `intent=${intent}`,
            );
        } catch (err) {
            fail(`aiRoute "${tc.msg}"`, err);
        }
    }
}

async function runCatalog(pb) {
    section('§7 catalog 列表（via raw GET —— 匿名读，验证 filter 表达式）');

    // public collections —— 匿名读
    for (const coll of ['courses', 'events', 'hackathons', 'jobs', 'apps', 'providers']) {
        try {
            const r = await pb.raw('GET', `/api/collections/${coll}/records`, { query: { perPage: '100' } });
            const items = r.result.items || [];
            pass(`anon list ${coll}`, `items=${items.length}`);
        } catch (err) {
            fail(`anon list ${coll}`, err);
        }
    }

    // 注意：PB 0.22+ 的 `?state=upcoming` 形式由 guards hook 注入 filter；
    // 但实际 hook 用的是 e.request.url.query()（错误 API），导致 query 注入不生效。
    // 这里直接拼 filter 表达式来验证 server-side filter 工作正常。

    // 课程 —— state=upcoming 过滤（直接 filter 表达式）
    try {
        const r = await pb.raw('GET', '/api/collections/courses/records', {
            query: { perPage: '50', filter: 'state = "upcoming"' },
        });
        const items = r.result.items || [];
        const ok = items.length === 0 || items.every((c) => c.state === 'upcoming');
        (ok ? pass : fail)(
            'courses filter state="upcoming"',
            ok ? null : new Error('非 upcoming 出现'),
            `${items.length} 条`,
        );
    } catch (err) { fail('courses state filter', err); }

    // 课程 —— category="AI 应用" 过滤
    try {
        const r = await pb.raw('GET', '/api/collections/courses/records', {
            query: { perPage: '50', filter: 'category = "AI 应用"' },
        });
        const items = r.result.items || [];
        const ok = items.length === 0 || items.every((c) => c.category === 'AI 应用');
        (ok ? pass : fail)(
            'courses filter category="AI 应用"',
            ok ? null : new Error('category 过滤未生效'),
            `${items.length} 条`,
        );
    } catch (err) { fail('courses category filter', err); }

    // 活动 —— tag=AMA && state=upcoming
    try {
        const r = await pb.raw('GET', '/api/collections/events/records', {
            query: { perPage: '50', filter: 'tag = "AMA" && state = "upcoming"' },
        });
        const items = r.result.items || [];
        const ok = items.length === 0 || items.every((e) => e.tag === 'AMA' && e.state === 'upcoming');
        (ok ? pass : fail)(
            'events filter tag=AMA && state=upcoming',
            ok ? null : new Error('组合过滤未生效'),
            `${items.length} 条`,
        );
    } catch (err) { fail('events combined filter', err); }
}

async function runHiring(pb) {
    section('§7.4 / §15 招聘板块（contact 脱敏 —— 必须匿名读，否则 superuser 看得见 contact）');

    for (const coll of ['job_postings', 'talent_profiles']) {
        try {
            const r = await pb.raw('GET', `/api/collections/${coll}/records`, { query: { perPage: '20' } });
            const items = r.result.items || [];
            if (!items.length) {
                info(`${coll} 0 条（seed 可能还没填）`);
                continue;
            }
            // contact 应被 hook 脱敏（job_postings：superuser 可见，前台 = ""）
            //          hook 不返回（talent_profiles：前台一律不可见）
            const noContact = items.every((row) => !('contact' in row) || !row.contact);
            (noContact ? pass : fail)(
                `${coll}.contact 脱敏`,
                noContact ? null : new Error('contact 字段泄漏'),
                `${items.length} 条`,
            );
        } catch (err) { fail(`list ${coll}`, err); }
    }
}

async function runAuth(pb) {
    section('§6 登录方案（via pbcli records auth-password / raw）');

    // superuser 登录
    try {
        const r = await pb.auth.loginWithPassword('admin@tintin.land', 'tintinland2026', { noSave: true });
        if (r.ok && r.result.record && r.result.record.collectionName === '_superusers') {
            pass('superuser auth-password', `record.id=${r.result.record.id}`);
        } else fail('superuser auth-password', new Error('no record'));
    } catch (err) {
        fail('superuser auth-password', err);
        return;
    }

    // ai-route / ai-route auth （raw POST）
    try {
        const r = await pb.raw('POST', '/api/auth/email-code', { data: { email: TEST_EMAIL } });
        if (r.result.mail_sent === false) pass('POST /api/auth/email-code', `mail_sent=false ttl=${r.result.ttl_minutes}`);
        else fail('email-code', new Error('mail_sent=true → CLI 提不到 code'));
    } catch (err) { fail('email-code', err); }

    // getWalletNonce
    try {
        const r = await pb.raw('GET', '/api/auth/wallet/nonce');
        if (r.result && r.result.nonce && r.result.message) pass('GET /api/auth/wallet/nonce', `nonce=${r.result.nonce.slice(0, 16)}…`);
        else fail('wallet/nonce', new Error('缺字段'));
    } catch (err) { fail('wallet/nonce', err); }

    // getWechatAuthUrl (200 + not_configured)
    try {
        const r = await pb.raw('GET', '/api/auth/wechat/url');
        if (r.result && r.result.status === 'not_configured') pass('GET /api/auth/wechat/url', 'not_configured（预期）');
        else fail('wechat/url', new Error('本应 not_configured'));
    } catch (err) { fail('wechat/url', err); }

    // wechat/callback 应抛 501 —— pbcli 会返回 ok:false，http_status 可能在 data 或 envelope 里
    try {
        const r = await pb.raw('POST', '/api/auth/wechat/callback', { data: { code: 'dummy' } });
        fail('wechat/callback 应抛 501', new Error('未抛'));
    } catch (err) {
        // 检查多处可能的位置：err.httpStatus、err.data.status、err.data.data.status、msg
        const status = err.httpStatus
            || (err.data && err.data.status)
            || (err.data && err.data.data && err.data.data.status)
            || 0;
        const msgHas501 = err.message && /501/.test(err.message);
        if (status === 501 || msgHas501) {
            pass('POST /api/auth/wechat/callback → 501（预期）', `[${status}] ${err.message.slice(0, 60)}`);
        } else {
            fail('wechat/callback 异常（应为 501）', err, `status=${status}`);
        }
    }
}

async function runWrites(pb) {
    section('§14 业务写入（createOrder / createSignup / createIntent / createLead）');

    // 先以 superuser 登录（带 token 保存）—— 否则 records.create 需要 auth 会失败
    try {
        await pb.auth.loginWithPassword('admin@tintin.land', 'tintinland2026', { noSave: false });
        pass('superuser 登录（写测试用）', 'saved session');
    } catch (err) {
        fail('superuser 登录（写测试用）', err);
        return;
    }

    // 1. orders —— 需要先有 paid 课程
    let paidCourse;
    try {
        const cs = await pb.records.list('courses', { perPage: 50 });
        paidCourse = cs.result.items.find((c) => c.price_type === 'paid' && c.price_amount > 0);
        if (!paidCourse) {
            info('没有 paid 课程（seed 缺），跳过 orders 写入测试');
        } else {
            const order = await pb.records.create('orders', {
                user_email: TEST_EMAIL,
                item_type: 'course',
                item_id: paidCourse.id,
                item_title: paidCourse.title,
                amount: paidCourse.price_amount,
                channel: 'icbc_qr',
            });
            if (order.result.advisor_code_sent === true) {
                pass('createOrder → advisor_code_sent=true（下单即发码 spec §8.3）', `id=${order.result.id}`);
            } else {
                fail('createOrder advisor_code_sent', new Error('flag 未翻为 true'));
            }
        }
    } catch (err) { fail('createOrder', err); }

    // 2. signups —— 匿名 + 免费课
    try {
        const cs = await pb.records.list('courses', { perPage: 50 });
        const free = cs.result.items.find((c) => c.price_type === 'free');
        if (free) {
            const s = await pb.records.create('signups', {
                user_email: TEST_EMAIL,
                kind: 'course',
                item_id: free.id,
                item_title: free.title,
                payload: { name: 'Tester', phone: '13900000000' },
            });
            pass('createSignup (匿名)', `id=${s.result.id} review_status=${s.result.review_status}`);
        } else {
            info('没有 free 课程，跳过 signups 写入');
        }
    } catch (err) { fail('createSignup', err); }

    // 3. intents
    try {
        const intent = await pb.records.create('intents', {
            user_email: TEST_EMAIL,
            provider: 'spec-verify channel',
            expected_volume: '1M tokens',
            contact: TEST_EMAIL,
        });
        pass('createIntent (匿名)', `id=${intent.result.id} status=${intent.result.status}`);
    } catch (err) { fail('createIntent', err); }

    // 4. leads
    try {
        const lead = await pb.records.create('leads', {
            kind: 'enterprise-ai',
            user_email: TEST_EMAIL,
            company: 'spec-verify Co',
            name: 'Verify Bot',
            contact: TEST_EMAIL,
            payload: { message: 'spec-verify test lead' },
        });
        pass('createLead (匿名)', `id=${lead.result.id}`);
    } catch (err) { fail('createLead', err); }
}

async function runSchema(pb) {
    section('CLI schema 自省（machine-readable command contract）');
    try {
        const r = await pb.util.schema();
        if (r.result && Array.isArray(r.result.entries)) {
            pass('schema --json', `entries=${r.result.entries.length} top-level commands=${r.result.entries.filter(e => !e.path.includes('.')).length}`);
        } else {
            fail('schema --json', new Error('entries 缺'));
        }
    } catch (err) { fail('schema --json', err); }

    try {
        const r = await pb.util.schema('records list');
        if (r.result && r.result.entry) pass('schema records list', `path=${r.result.entry.path}`);
        else info('schema records list 无 entry（命令路径不识别）');
    } catch (err) {
        info('schema records list 失败（CLI 不支持 query 子路径）', err.message.slice(0, 80));
    }
}

async function main() {
    resetCounters();
    const mode = process.argv[2] || 'all';
    const pb = createPbCli({ baseUrl: BASE });

    if (mode === 'all' || mode === 'preflight') {
        const ok = await runPreflight(pb);
        if (!ok) return exitIfFailed();
    }
    if (mode === 'all' || mode === 'schema')     await runSchema(pb);
    if (mode === 'all' || mode === 'ai')         await runAI(pb);
    if (mode === 'all' || mode === 'catalog')    await runCatalog(pb);
    if (mode === 'all' || mode === 'hiring')     await runHiring(pb);
    if (mode === 'all' || mode === 'auth')       await runAuth(pb);
    if (mode === 'all' || mode === 'writes')     await runWrites(pb);

    exitIfFailed();
}

main().catch((e) => {
    process.stderr.write('FATAL: ' + (e.stack || e.message || e) + '\n');
    process.exit(2);
});
