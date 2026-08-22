#!/usr/bin/env node
// scripts/test-pick-email.mjs
// =============================================================================
// pickEmail() 单元测试 —— 防止 Privy 升级时 user 对象结构漂移导致登录桥接失败
//
// 历史教训：2026-08 升级到 @privy-io/react-auth@3.37 后，user.email 从 string
// 变成 {address}，user.linkedAccounts 里 email 账号的 type 从 'email_oauth' 变成
// 'email'，导致纯 email OTP 登录后 pickEmail 返回 ''，触发
// '[PrivyNativeLauncher] no email in user; skip bridge'。
//
// 用法：
//   node scripts/test-pick-email.mjs
//
// 依赖：Node >= 18（用内置 node:test / node:assert/strict，无需安装任何包）
// =============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickEmail, pickSubject, pickMethod } from '../src/components/Auth/_privy-utils.js';

// ---- 1. pickEmail -------------------------------------------------------

test('pickEmail: v3 email OTP — user.email.address + linkedAccount type=email', () => {
    const user = {
        id: 'did:privy:abc',
        email: { address: 'a@b.com' },
        linkedAccounts: [
            { type: 'email', address: 'a@b.com', verifiedAt: '2026-08-22T00:00:00Z' },
        ],
    };
    assert.equal(pickEmail(user), 'a@b.com');
});

test('pickEmail: v3 Google OAuth — user.email.address + linkedAccount.email', () => {
    const user = {
        id: 'did:privy:xyz',
        email: { address: 'g@gmail.com' },
        linkedAccounts: [
            { type: 'google_oauth', email: 'g@gmail.com', subject: 'goog-sub-1', name: 'G' },
        ],
    };
    assert.equal(pickEmail(user), 'g@gmail.com');
});

test('pickEmail: v3 wallet-only user — returns "" (无邮箱是合法状态)', () => {
    const user = {
        id: 'did:privy:w',
        linkedAccounts: [{ type: 'wallet', address: '0xabc', chainType: 'ethereum' }],
    };
    assert.equal(pickEmail(user), '');
});

test('pickEmail: v3 multiple linked accounts (wallet + email) — 仍能拿到 email', () => {
    const user = {
        id: 'did:privy:m',
        email: { address: 'm@x.com' },
        linkedAccounts: [
            { type: 'wallet', address: '0xw', chainType: 'ethereum' },
            { type: 'email', address: 'm@x.com', verifiedAt: '2026-08-22' },
        ],
    };
    assert.equal(pickEmail(user), 'm@x.com');
});

test('pickEmail: 旧版字符串 email — 仍向后兼容', () => {
    const user = { id: 'did:privy:old', email: 'old@b.com', linkedAccounts: [] };
    assert.equal(pickEmail(user), 'old@b.com');
});

test('pickEmail: 旧版 linkedAccounts[].email — 兜底', () => {
    // 假设某旧版本 Privy 把 email 直接挂在 linkedAccount 里（无 type 字段）
    const user = {
        id: 'did:privy:legacy',
        linkedAccounts: [{ email: 'legacy@b.com', type: 'custom_auth' }],
    };
    assert.equal(pickEmail(user), 'legacy@b.com');
});

test('pickEmail: email 对象但 addresses[] 为空 — 不应崩，回退到 ""', () => {
    const user = {
        id: 'did:privy:empty',
        email: { addresses: [] },
        linkedAccounts: [{ type: 'wallet', address: '0x' }],
    };
    assert.equal(pickEmail(user), '');
});

test('pickEmail: email 对象 addresses[0].address 扩展字段（防御性兼容）', () => {
    const user = {
        id: 'did:privy:ext',
        email: { addresses: [{ address: 'ext@b.com', verifiedAt: 'x' }] },
        linkedAccounts: [],
    };
    assert.equal(pickEmail(user), 'ext@b.com');
});

test('pickEmail: addresses[0] 存在但 .address 为空字符串 — 跳过该槽', () => {
    const user = {
        id: 'did:privy:noaddr',
        email: { addresses: [{ address: '' }] },
        linkedAccounts: [{ type: 'email', address: 'fallback@b.com' }],
    };
    assert.equal(pickEmail(user), 'fallback@b.com');
});

test('pickEmail: snake_case linked_accounts（防御性）', () => {
    const user = {
        id: 'did:privy:snake',
        email: { address: 'sn@x.com' },
        linked_accounts: [{ type: 'email', address: 'sn@x.com' }],
    };
    assert.equal(pickEmail(user), 'sn@x.com');
});

test('pickEmail: null / undefined user — 返回 "" 不崩', () => {
    assert.equal(pickEmail(null), '');
    assert.equal(pickEmail(undefined), '');
    assert.equal(pickEmail({}), '');
});

test('pickEmail: email 是对象但无 address 也无 addresses — 走 linkedAccounts', () => {
    const user = {
        id: 'did:privy:obj',
        email: { foo: 'bar' },  // 不合规但不应崩
        linkedAccounts: [{ type: 'email', address: 'fb@b.com' }],
    };
    assert.equal(pickEmail(user), 'fb@b.com');
});

// ---- 2. pickSubject -----------------------------------------------------

test('pickSubject: 优先 user.id（v3）', () => {
    assert.equal(pickSubject({ id: 'did:privy:x', subject: 'old-sub' }), 'did:privy:x');
});

test('pickSubject: 无 id 时回退到 user.subject（兼容）', () => {
    assert.equal(pickSubject({ subject: 'old-sub' }), 'old-sub');
});

test('pickSubject: 都没有 — 返回 ""', () => {
    assert.equal(pickSubject({}), '');
    assert.equal(pickSubject(null), '');
});

// ---- 3. pickMethod ------------------------------------------------------

test('pickMethod: wallet 优先级最高', () => {
    const u = {
        linkedAccounts: [
            { type: 'email' },
            { type: 'wallet', address: '0xw' },
            { type: 'google_oauth' },
        ],
    };
    assert.equal(pickMethod(u), 'wallet');
});

test('pickMethod: email OTP 登录', () => {
    const u = { linkedAccounts: [{ type: 'email', address: 'a@b.com' }] };
    assert.equal(pickMethod(u), 'email');
});

test('pickMethod: Google OAuth — 归一为 "google"', () => {
    const u = { linkedAccounts: [{ type: 'google_oauth', email: 'g@x.com' }] };
    assert.equal(pickMethod(u), 'google');
});

test("pickMethod: type 直接是 'x' — 走 order 数组里第一个 'x' 槽", () => {
    // 某些旧/自定义 provider 会直接给 type='x'，order 数组同时保留 'x' 和 'twitter'
    // 两条目是为了兼容多种历史格式，期望 'x' 命中
    const u = { linkedAccounts: [{ type: 'x', username: 'me' }] };
    assert.equal(pickMethod(u), 'x');
});

test('pickMethod: Twitter OAuth — type 是 twitter_oauth', () => {
    const u = { linkedAccounts: [{ type: 'twitter_oauth', username: 'me' }] };
    assert.equal(pickMethod(u), 'twitter');
});

test('pickMethod: 无任何 linked account — 回退 "privy"', () => {
    assert.equal(pickMethod({}), 'privy');
    assert.equal(pickMethod(null), 'privy');
});

// ---- 4. 集成场景（模拟 PrivyNativeLauncher 真正拿到的 user） ----------

test('integration: 模拟真实 email OTP 登录完整链路', () => {
    // 这正是修复前会失败的场景
    const realUser = {
        id: 'did:privy:cm123abc',
        createdAt: '2026-08-22T10:00:00Z',
        email: { address: 'user@example.com', verifiedAt: '2026-08-22T10:00:00Z' },
        linkedAccounts: [
            {
                type: 'email',
                address: 'user@example.com',
                verifiedAt: '2026-08-22T10:00:00Z',
                firstVerifiedAt: '2026-08-22T10:00:00Z',
                latestVerifiedAt: '2026-08-22T10:00:00Z',
            },
        ],
    };
    assert.equal(pickEmail(realUser), 'user@example.com');
    assert.equal(pickSubject(realUser), 'did:privy:cm123abc');
    assert.equal(pickMethod(realUser), 'email');
});
