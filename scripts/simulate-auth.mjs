#!/usr/bin/env node
// scripts/simulate-auth.mjs
// =============================================================================
// 端到端登录流程模拟 —— 把 §6 三种登录方式都跑一遍
// =============================================================================
//
// 不只是个 PASS/FAIL 的检查脚本，而是个 "Demo 跑得通" 的演示脚本：
//   1) 邮箱验证码：发码 → 从 pb.log 拿码 → 校验 → 拿 user token → 读自己 profile
//   2) 钱包签名：拿 nonce → 模拟签名（dev 用 dummy sig）→ 拿 user token
//   3) 微信一键：UI 占位（not_configured / 501）
//
// 每个流程都把关键中间产物打到 stderr，方便排障。
//
// 用法：
//   node scripts/simulate-auth.mjs email alice@example.com
//   node scripts/simulate-auth.mjs wallet 0x... 0x... 0x...
//   node scripts/simulate-auth.mjs wechat
//   node scripts/simulate-auth.mjs all        # 三种全跑

import {
    createClient, section, pass, fail, info, warn, exitIfFailed, resetCounters,
    waitForOtpFromLog,
} from './lib/cli-utils.mjs';

const BASE = process.env.PB_URL || 'http://127.0.0.1:8090';
const LOG = process.env.PB_LOG || '/tmp/pb.log';

function usage() {
    process.stderr.write('用法:\n');
    process.stderr.write('  node scripts/simulate-auth.mjs email <addr>     # 邮箱验证码登录\n');
    process.stderr.write('  node scripts/simulate-auth.mjs wallet <addr> <sig> <nonce>\n');
    process.stderr.write('  node scripts/simulate-auth.mjs wechat           # 微信 UI 占位\n');
    process.stderr.write('  node scripts/simulate-auth.mjs all              # 三种全跑（钱包自动取 nonce）\n');
}

async function flowEmail(client, email) {
    section('邮箱验证码登录（§6.1）');
    info('email', email);

    const STAMP = Date.now().toString(36).slice(-6);
    const target = email || `cli-${STAMP}@tintin.land`;
    info('实际收码邮箱', target);

    // 1. 发码
    let reqRes;
    try {
        reqRes = await client.requestEmailCode(target);
        pass('POST /api/auth/email-code', `mail_sent=${reqRes.mail_sent} ttl=${reqRes.ttl_minutes}min`);
    } catch (err) {
        fail('POST /api/auth/email-code', err);
        return null;
    }
    if (reqRes.mail_sent) {
        warn('mail_sent=true：SMTP 配了，code 不会进 log。CLI 验证逻辑跳过');
        return null;
    }

    // 2. 从 log 拿 code
    const code = await waitForOtpFromLog({ email: target, logPath: LOG });
    if (!code) {
        fail('从 pb.log 提取 OTP', new Error('超时'));
        return null;
    }
    pass('OTP 提取', `code=${code}`);

    // 3. 校验
    let ver;
    try {
        ver = await client.verifyEmailCode(target, code);
        pass('POST /api/auth/email-code/verify', `token=${ver.token.slice(0, 16)}… record.id=${ver.record.id} login_method=${ver.login_method}`);
    } catch (err) {
        fail('POST /api/auth/email-code/verify', err);
        return null;
    }

    // 4. 用 token 读 profile
    try {
        const prof = await client.getUserProfileByUserIdNormalized(ver.record.id);
        if (prof) {
            pass('POST /api/collections/user_profiles/records (find by user_id)',
                `email=${prof.email} login_method=${prof.login_method} wallet_address=${prof.wallet_address || '(空)'}`);
        } else {
            warn('user_profiles 记录尚未建（auth hook 应自动建）');
        }
    } catch (err) {
        fail('读 user_profiles', err);
    }

    return ver;
}

async function flowWallet(client, address, sig, nonce) {
    section('Web3 钱包签名登录（§6.2，本周 nonce-only 演示版）');
    info('address', address || '(auto)');

    // 1. 拿 nonce
    let n;
    try {
        n = await client.getWalletNonce();
        pass('GET /api/auth/wallet/nonce', `nonce=${n.nonce.slice(0, 16)}…`);
    } catch (err) {
        fail('GET /api/auth/wallet/nonce', err);
        return null;
    }

    // 2. 默认用 dummy signature（dev 演示；生产要 ethers.verifyMessage）
    const STAMP = Date.now().toString(36).slice(-6);
    const stampHex = (s) => {
        const num = parseInt(s, 36) || 0;
        const hex = num.toString(16);
        return (hex + '0'.repeat(40)).slice(0, 40);
    };
    const useAddress = address || '0x' + stampHex(STAMP);
    // 64 bytes of zeros + v=0x1b (27)
    const useSig = sig || ('0x' + '00'.repeat(64) + '1b');
    const useNonce = nonce || n.nonce;
    info('实际使用', `address=${useAddress}\n        sig=${useSig}\n        nonce=${useNonce}`);

    // 3. 校验
    let ver;
    try {
        ver = await client.verifyWallet(useAddress, useSig, useNonce);
        pass('POST /api/auth/wallet/verify', `token=${(ver.token || '').slice(0, 16)}… record.id=${(ver.record || {}).id || '(none)'}\n        signature_verified=${ver.signature_verified}`);
    } catch (err) {
        fail('POST /api/auth/wallet/verify', err);
        return null;
    }

    // 4. 读 profile
    if (ver && ver.record) {
        try {
            const prof = await client.getUserProfileByUserIdNormalized(ver.record.id);
            if (prof) {
                pass('user_profiles (wallet 模式)', `email=${prof.email} login_method=${prof.login_method} wallet_address=${prof.wallet_address}`);
            } else {
                warn('user_profiles 记录尚未建');
            }
        } catch (err) {
            fail('读 user_profiles', err);
        }
    }
    return ver;
}

async function flowWechat(client) {
    section('微信一键登录（§6.2，本周 UI 占位）');

    try {
        const url = await client.getWechatAuthUrl();
        info('GET /api/auth/wechat/url', JSON.stringify(url));
        if (url && url.status === 'not_configured') {
            pass('wechat/url → not_configured（预期）', url.message || '');
        } else if (url && url.ok === false) {
            pass('wechat/url 返回非 ok（预期）', JSON.stringify(url).slice(0, 120));
        } else {
            fail('wechat/url 状态', new Error('本应 not_configured'), JSON.stringify(url).slice(0, 120));
        }
    } catch (err) {
        fail('GET /api/auth/wechat/url', err);
    }

    try {
        const cb = await client.wechatCallbackStub('dummy-code');
        info('POST /api/auth/wechat/callback', JSON.stringify(cb).slice(0, 200));
        // 预期 501 not_implemented
        if (cb && (cb.status === 'not_implemented' || cb.code === 501 || cb.ok === false)) {
            pass('wechat/callback → 501 not_implemented（预期）');
        } else {
            fail('wechat/callback 状态', new Error('本应 501'), JSON.stringify(cb).slice(0, 120));
        }
    } catch (err) {
        // 也可能直接抛 PbError 501；视为符合预期
        if (err && err.status === 501) {
            pass('wechat/callback → 501（通过异常抛出，符合预期）');
        } else {
            fail('wechat/callback', err);
        }
    }
}

async function main() {
    resetCounters();
    const mode = process.argv[2];
    if (!mode || mode === '--help' || mode === '-h') { usage(); return; }

    const client = createClient({ baseUrl: BASE });

    if (mode === 'email') {
        const email = process.argv[3];
        await flowEmail(client, email);
    } else if (mode === 'wallet') {
        const [, , , address, sig, nonce] = process.argv;
        await flowWallet(client, address, sig, nonce);
    } else if (mode === 'wechat') {
        await flowWechat(client);
    } else if (mode === 'all') {
        await flowEmail(client, process.argv[3]);
        await flowWallet(client);
        await flowWechat(client);
    } else {
        usage();
        process.exit(1);
    }

    exitIfFailed();
}

main().catch((e) => {
    process.stderr.write('FATAL: ' + (e.stack || e.message || e) + '\n');
    process.exit(2);
});
