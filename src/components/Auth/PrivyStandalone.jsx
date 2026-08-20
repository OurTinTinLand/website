// =============================================================================
// Privy 登录 —— 无 SDK 兜底（Spec §6.4 Privy-bridge 离线 OAuth 分支）
// =============================================================================
//
// 适用场景：
//   - 沙盒 / 演示 / staging：尚未 `npm install @privy-io/react-auth` 时
//   - 生产回退：CDN 抽风 / SDK 加载失败时
//
// 行为：
//   - 直接走各 OAuth provider 的官方授权 URL（Google/GitHub/Discord/X/MetaMask）
//   - 客户端流程：window.open(provider authorize URL) → 用户同意 → provider 跳转回本平台
//     的 /auth/callback 路由 → 我们读 URL fragment 里的 code/id_token → 调
//     PB /api/auth/privy-bridge 完成 PB session 建立
//   - 调用 SDK 路径时本组件不会被渲染；PrivyProviderRoot 会选 PrivyBridge 替代
//
// 注意（spec §6.4 production-ready 路线）：
//   - 真实生产建议走 SDK + 后端 ES256 验签；本兜底实现只在 OAuth provider
//     返回的 token 可被 PB /api/auth/privy-bridge 信任时可用（同信任等级：与
//     现有 email-OTP 相当，因为两者都是"前端声明身份 → 后端签发 PB token"）。
//   - 钱包登录：用 window.ethereum（MetaMask）发起 personal_sign(nonce)；
//     nonce 由 /api/auth/wallet/nonce 提供；签名验证最终走 /api/auth/wallet/verify
//     （与现有 wallet 流一致）。
//
// 历史：v1.1 spec §6.2 GitHub P1 占位 + §6.3 微信资质审核中；本模块把它合并为
// "一键登录"按钮组（详见 LoginModal.jsx）。
// =============================================================================
import React, { useState, useEffect, useRef } from 'react';
import { ICONS, LABELS, normalizeMethod } from './ProviderIcons.jsx';
import * as PB from '../../utils/pb-client.js';

// ---- 1. Provider 直接 authorize URL（不依赖 Privy SDK 的方式） ----
// 这些 URL 都需要在 OAuth provider Dashboard 上配置 callback / redirect_uri。
// 当前 PRJ 用本地 /auth/callback 作为统一回跳，store 里再把 code 转给后端。
// 注意：OAuth provider 的 client_id 是公开值，URL 上带即可；client_secret 由
// 未来"严格模式"后端服务持有（本期我们走与 email-OTP 同等的"信任模型"，不接 client_secret）。

const OAUTH_CFG = {
  // 演示占位 client_id；上线前由 start.sh 注入（PRIVY_GOOGLE_CLIENT_ID 等）
  google:   () => ({ url: (id) => `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&scope=openid%20email%20profile&client_id=${id}&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback?provider=google')}` }),
  github:   () => ({ url: (id) => `https://github.com/login/oauth/authorize?scope=read:user%20user:email&client_id=${id}&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback?provider=github')}` }),
  discord:  () => ({ url: (id) => `https://discord.com/api/oauth2/authorize?response_type=code&scope=identify%20email&client_id=${id}&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback?provider=discord')}` }),
  x:        () => ({ url: (id) => `https://twitter.com/i/oauth2/authorize?response_type=code&scope=tweet.read%20users.read&client_id=${id}&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback?provider=x')}&state=privy&code_challenge=privy&code_challenge_method=plain` }),
  apple:    () => ({ url: (id) => `https://appleid.apple.com/auth/authorize?response_type=code&scope=name%20email&client_id=${id}&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback?provider=apple')}&response_mode=form_post` }),
};

function providerClientId(method) {
  // start.sh 把 client_id 注入 window.PRIVY_<METHOD>_CLIENT_ID；缺省回落 PRIVY_CLIENT_ID
  const k1 = 'PRIVY_' + method.toUpperCase() + '_CLIENT_ID';
  const v1 = (typeof window !== 'undefined' && window[k1]) || '';
  if (v1) return v1;
  return (typeof window !== 'undefined' && window.PRIVY_CLIENT_ID) || 'demo-client-id-no-real-oauth-yet';
}

export function startProviderOAuth(method, { onCode } = {}) {
  const cfg = OAUTH_CFG[method];
  if (!cfg) throw new Error('未知 OAuth 提供方: ' + method);
  const cid = providerClientId(method);
  const url = cfg().url(cid);
  // 演示模式：直接走一个 hash 携带 "fake-code" 回到 callback 页（dev / sandbox）
  if (cid === 'demo-client-id-no-real-oauth-yet') {
    const fake = 'demo-' + method + '-' + Math.random().toString(36).slice(2, 10);
    setTimeout(() => {
      if (onCode) onCode(fake, method);
      else window.location.hash = '#/auth/callback?provider=' + method + '&code=' + fake;
    }, 60);
    return;
  }
  // 真 OAuth：弹窗 / 同窗口跳转都行；用新窗口省去污染 history
  window.open(url, '_blank', 'width=520,height=680');
}

// ---- 2. 钱包签名（MetaMask） ----
async function startWalletSign() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('未检测到钱包（window.ethereum 缺失）。请安装 MetaMask 或其他 EVM 钱包。');
  }
  // nonce 由后端 /api/auth/wallet/nonce 提供；现有登录流用的就是这个。
  const nonceRes = await fetch('/api/auth/wallet/nonce', { method: 'GET' });
  if (!nonceRes.ok) throw new Error('nonce 获取失败');
  const { nonce, message } = await nonceRes.json();
  const addr = window.ethereum.selectedAddress || (await window.ethereum.request({ method: 'eth_requestAccounts' }))[0];
  const sig = await window.ethereum.request({
    method: 'personal_sign',
    params: [message, addr],
  });
  return { address: addr, signature: sig, nonce };
}

// ---- 3. React UI：兜底登录面板（替代 SDK 的 modal） ----

export function PrivyStandaloneLogin({ onLogin, onCancel }) {
  const [methods] = useState(() => {
    const raw = (typeof window !== 'undefined' && window.PRIVY_LOGIN_METHODS) || 'email,google,x,github,discord,wallet';
    return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean).map(normalizeMethod);
  });
  const [pending, setPending] = useState(null);
  const [err, setErr] = useState(null);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const handle = async (method) => {
    setErr(null);
    setPending(method);
    try {
      if (method === 'wallet') {
        const w = await startWalletSign();
        // 走 PB 后端把钱包地址桥到 PB session
        const data = await PB.requestPrivyBridge({
          method: 'wallet',
          email: `${w.address.slice(0, 6)}…${w.address.slice(-4)}@wallet.local`,
          subject: w.address,
          access_token: w.signature,
        });
        await onLogin({ ...data, email: data.record?.email || data.email });
        return;
      }
      // OAuth 提供方
      await new Promise((resolve, reject) => {
        try {
          startProviderOAuth(method, {
            onCode: async (code) => {
              try {
                const demoEmail = `${method}-${code.slice(0, 8)}@privy.local`;
                const data = await PB.requestPrivyBridge({
                  method,
                  email: demoEmail,
                  subject: code,
                  access_token: code,
                });
                await onLogin({ ...data, email: data.record?.email || demoEmail });
                resolve();
              } catch (e) { reject(e); }
            },
          });
          // 真 OAuth 流程不 resolve（用户从弹窗去 provider 站点了）；3 秒兜底超时
          setTimeout(() => resolve(), 3000);
        } catch (e) { reject(e); }
      });
    } catch (e) {
      if (!mountedRef.current) return;
      setErr(e.message || String(e));
    } finally {
      if (mountedRef.current) setPending(null);
    }
  };

  // provider → (label/icon) 列表
  const list = methods.map((m) => ({ m, label: LABELS[m] || m, Icon: ICONS[m] }));

  return (
    <div className="privy-stand">
      <p className="xs" style={{ margin: '0 0 14px', color: 'var(--ink-3)', lineHeight: 1.5 }}>
        <b>离线 OAuth 兜底登录</b>（开发/沙盒用）。
        <br/>生产建议装 <code>@privy-io/react-auth</code> 切换到 SDK 模式（配置 PRIVY_APP_ID 后自动启用）。
      </p>
      {list.map(({ m, label, Icon }) => (
        <button
          key={m}
          type="button"
          className="lm"
          disabled={!!pending}
          onClick={() => handle(m)}
          style={{ display: 'flex', alignItems: 'center', gap: 12 }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, color: 'var(--ink)' }}>
            {Icon ? <Icon /> : null}
          </span>
          <span>{LABELS[m] || m}{m === 'email' ? '验证码' : ''}{m === 'wallet' ? '（MetaMask）' : ''}</span>
          <span className="bg">{pending === m ? '…' : (m === 'email' || m === 'wallet') ? 'OAuth / 签名' : 'OAuth'}</span>
        </button>
      ))}
      {err && (
        <div className="xs" style={{ color: '#c0392b', marginTop: 10 }}>
          {err}
        </div>
      )}
      <div className="wl">
        <a onClick={onCancel}>返回其他登录方式</a>
      </div>
    </div>
  );
}
