#!/usr/bin/env node
// scripts/admin-crud.mjs
// =============================================================================
// 运营后台 CRUD + 审核 + 订单核销 —— 把 §14 整块流程用 SDK 跑一遍
// =============================================================================
//
// 覆盖：
//   §14.2 内容管理  → 创建 / 更新 / 上下架 / 删除课程（catalog 全套）
//   §14.4 报名/投递审核 → signups review_status
//   §14.5 订单核销 → orders status 状态机 + advisor_code 补发
//   §14.5 订单核销 → /api/orders/{id}/resend-advisor-code 手动补发
//
// 用 superuser（admin）token，因为：
//   - 写 catalog 必须是 superuser
//   - 状态机变更 signups / orders / intents 必须 superuser
//   - resend-advisor-code 必须 superuser
//
// 用法：
//   node scripts/admin-crud.mjs                # 默认跑全套
//   node scripts/admin-crud.mjs content        # 只跑内容管理
//   node scripts/admin-crud.mjs orders         # 只跑订单核销
//   node scripts/admin-crud.mjs review         # 只跑报名审核

import {
    createClient, section, pass, fail, info, exitIfFailed, resetCounters,
} from './lib/cli-utils.mjs';

const BASE = process.env.PB_URL || 'http://127.0.0.1:8090';
const STAMP = Date.now().toString(36).slice(-6);

async function adminLogin(client) {
    await client.getSuperuserToken();   // 用 config.admin 默认值
    pass('superuser 登录', '拿到 admin token');
}

async function runContent(client) {
    section('§14.2 内容管理（catalog CRUD）');
    await adminLogin(client);

    // 创建一门课
    let course;
    try {
        course = await client.raw.collection('courses').create({
            title: '[admin-crud] ' + STAMP,
            slug: 'admin-crud-' + STAMP,
            category: 'AI 应用',
            difficulty: '入门',
            form: '录播',
            price_type: 'paid',
            price_amount: 999,
            content_source: 'native',
            published: true,
            state: 'upcoming',
            desc: 'admin-crud 临时测试课',
        });
        pass('admin create course', `id=${course.id} title="${course.title}"`);
    } catch (err) { fail('admin create course', err); return; }

    // 更新
    try {
        const updated = await client.raw.collection('courses').update(course.id, {
            desc: 'updated by admin-crud.mjs',
            price_amount: 1299,
        });
        pass('admin update course', `desc="${updated.desc}" price=${updated.price_amount}`);
    } catch (err) { fail('admin update course', err); }

    // 上下架（unpublish / republish）
    try {
        const unpublished = await client.raw.collection('courses').update(course.id, { published: false });
        if (unpublished.published === false) pass('admin unpublish', 'published=false');
        else fail('admin unpublish', new Error('published 仍为 true'));

        const republished = await client.raw.collection('courses').update(course.id, { published: true });
        if (republished.published === true) pass('admin republish', 'published=true');
        else fail('admin republish', new Error('published 仍为 false'));
    } catch (err) { fail('admin unpublish/republish', err); }

    // 字段断言：published=1 过滤应能找到这门课
    try {
        const filtered = await client.listCourses({ published: '1', perPage: 100 });
        const found = filtered.items.find((c) => c.id === course.id);
        if (found) pass('published=1 过滤能找到', `totalItems=${filtered.totalItems}`);
        else fail('published=1 过滤能找到', new Error('没找到'));
    } catch (err) { fail('published=1 过滤', err); }

    // 删除（admin-only）
    try {
        await client.raw.collection('courses').delete(course.id);
        pass('admin delete course', `id=${course.id}`);
    } catch (err) { fail('admin delete course', err); }
}

async function runReview(client) {
    section('§14.4 报名/投递审核（signups review_status）');
    await adminLogin(client);

    // 先创建一个 signup（匿名 + signup_review_required=true → review_status=submitted）
    let course, signup;
    try {
        course = await client.raw.collection('courses').create({
            title: '[review] ' + STAMP, slug: 'review-' + STAMP,
            category: 'AI 应用', difficulty: '入门', form: '录播',
            price_type: 'free', content_source: 'native',
            published: true, state: 'upcoming',
            signup_review_required: true,
        });
        pass('create course (signup_review_required=true)', `id=${course.id}`);

        signup = await client.createSignup({
            user_email: `review-${STAMP}@tintin.land`,
            kind: 'course',
            item_id: course.id,
            item_title: course.title,
            payload: { name: 'Reviewer', phone: '13900000000' },
        });
        pass('create signup (review_status=submitted)', `id=${signup.id} status=${signup.review_status}`);
    } catch (err) { fail('create course/signup', err); return; }

    // 运营审核 approved
    try {
        const reviewed = await client.reviewSignup(signup.id, 'approved', 'ok from cli');
        if (reviewed.review_status === 'approved' && reviewed.review_notes === 'ok from cli') {
            pass('review signup → approved', `notes="${reviewed.review_notes}"`);
        } else fail('review signup → approved', new Error(`status=${reviewed.review_status} notes=${reviewed.review_notes}`));
    } catch (err) { fail('review signup → approved', err); }

    // 运营审核 rejected
    try {
        const reviewed = await client.reviewSignup(signup.id, 'rejected', 'too late');
        if (reviewed.review_status === 'rejected') pass('review signup → rejected', `notes="${reviewed.review_notes}"`);
        else fail('review signup → rejected', new Error(`status=${reviewed.review_status}`));
    } catch (err) { fail('review signup → rejected', err); }

    // 清理
    try { await client.raw.collection('courses').delete(course.id); } catch (_) {}
}

async function runOrders(client) {
    section('§14.5 订单核销（orders 状态机 + advisor_code）');
    await adminLogin(client);

    // 创建一门 paid 课程 + 一个 order
    let course, order;
    try {
        course = await client.raw.collection('courses').create({
            title: '[order] ' + STAMP, slug: 'order-' + STAMP,
            category: 'AI 应用', difficulty: '入门', form: '录播',
            price_type: 'paid', price_amount: 888,
            content_source: 'native', published: true, state: 'upcoming',
        });
        pass('create paid course', `id=${course.id} amount=${course.price_amount}`);

        // 用 admin 建一个 order（实际场景是用户登录后建，CLI admin 演示也行）
        order = await client.createOrder({
            user_email: `order-${STAMP}@tintin.land`,
            item_type: 'course', item_id: course.id, item_title: course.title,
            amount: course.price_amount, channel: 'icbc_qr',
        });
        pass('create order', `id=${order.id} status=${order.status} advisor_code_sent=${order.advisor_code_sent}`);
    } catch (err) { fail('create course/order', err); return; }

    // 状态机：pending_review → verified
    try {
        const v = await client.verifyOrder(order.id);
        if (v.status === 'verified') pass('verifyOrder pending_review → verified', '');
        else fail('verifyOrder pending_review → verified', new Error(`status=${v.status}`));
    } catch (err) { fail('verifyOrder', err); }

    // 状态机：verified → pending_review 不允许
    try {
        // 直接尝试改回 pending_review（绕过 verifyOrder）—— hook 应拒
        await client.raw.collection('orders').update(order.id, { status: 'pending_review' });
        fail('verified → pending_review 应被拒', new Error('hook 未拦截'));
    } catch (err) {
        if (err.status === 400 && /不允许|不允许|状态/.test(err.message || '')) {
            pass('verified → pending_review 被拒（状态机）', `[${err.status}] ${err.message}`);
        } else fail('verified → pending_review 被拒', err);
    }

    // 手动补发 advisor_code
    try {
        const r = await client.resendAdvisorCode(order.id);
        pass('resend-advisor-code', `ok=${r.ok || '(no ok field)'} advisor_code_sent=${r.advisor_code_sent}`);
    } catch (err) { fail('resend-advisor-code', err); }

    // 清理
    try { await client.raw.collection('orders').delete(order.id); } catch (_) {}
    try { await client.raw.collection('courses').delete(course.id); } catch (_) {}
}

async function runIntents(client) {
    section('§14.5 意向单状态机（intents）');
    await adminLogin(client);

    let intent;
    try {
        intent = await client.createIntent({
            user_email: `intent-${STAMP}@tintin.land`,
            provider: 'admin-crud channel',
            expected_volume: '500k tokens',
            contact: `intent-${STAMP}@tintin.land`,
        });
        pass('create intent', `id=${intent.id} status=${intent.status}`);
    } catch (err) { fail('create intent', err); return; }

    try {
        const c = await client.contactIntent(intent.id);
        if (c.status === 'contacted') pass('contactIntent → contacted', '');
        else fail('contactIntent', new Error(`status=${c.status}`));
    } catch (err) { fail('contactIntent', err); }

    try {
        const c = await client.closeIntent(intent.id);
        if (c.status === 'closed') pass('closeIntent → closed', '');
        else fail('closeIntent', new Error(`status=${c.status}`));
    } catch (err) { fail('closeIntent', err); }
}

async function main() {
    resetCounters();
    const mode = process.argv[2] || 'all';
    const client = createClient({ baseUrl: BASE });

    if (mode === 'all' || mode === 'content') await runContent(client);
    if (mode === 'all' || mode === 'review')  await runReview(client);
    if (mode === 'all' || mode === 'orders')  await runOrders(client);
    if (mode === 'all' || mode === 'intents') await runIntents(client);

    exitIfFailed();
}

main().catch((e) => {
    process.stderr.write('FATAL: ' + (e.stack || e.message || e) + '\n');
    process.exit(2);
});
