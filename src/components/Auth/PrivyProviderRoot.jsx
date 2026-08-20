// =============================================================================
// Privy Provider Root —— v1.2 静态版
// =============================================================================
//
// 设计：
//   - @privy-io/react-auth 是项目的 regular dep，已经在 node_modules 里
//   - esbuild 在 build time 直接把它打进 bundle.js；不再需要运行时动态 import
//   - 浏览器加载 ESM bundle，所有 React/Privy 共享一份 React 实例（都用 esm.sh React @18）
//
// 决策树（在浏览器里）：
//
//   PrivyProviderRoot（顶层组件）
//     ├─ window.PRIVY_APP_ID 存在  → 包 <PrivyProvider>（来自 @privy-io/react-auth 的静态 import）
//     │                              ├─ children → 整个 React 应用子树
//     │                              └─ LoginModal 用 <PrivyLoginEntry /> 触发 usePrivy().login()
//     └─ window.PRIVY_APP_ID 不在    → children 直通；LoginModal 用 <PrivyStandaloneLogin/> 兜底
//
// 运行入口：<PrivyProviderRoot><App/></PrivyProviderRoot>（App.jsx 第 N 行）。
// 唯一区分点：loginMethods 白名单 + 是否包 <PrivyProvider>。
// =============================================================================
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { PrivyStandaloneLogin } from './PrivyStandalone.jsx';
import { pickEmail, pickSubject, pickMethod } from './_privy-utils.js';
import * as PB from '../../utils/pb-client.js';

// ---- 1. 配置自省 ----
function readPrivyConfig() {
  if (typeof window === 'undefined') return { enabled: false, appId: '', methods: [], clientId: '' };
  const appId = String(window.PRIVY_APP_ID || '').trim();
  const clientId = String(window.PRIVY_CLIENT_ID || '').trim();
  const methods = String(window.PRIVY_LOGIN_METHODS || 'email,google,x,github,discord,wallet')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return { enabled: !!appId, appId, methods, clientId };
}

// ---- 2. Context ----
const PrivyCtx = createContext({ enabled: false, sdkReady: true, methods: [] });
export function usePrivyStatus() {
  return useContext(PrivyCtx);
}

// ---- 3. PrivyProviderRoot 顶层 ----
//
// 何时包 <PrivyProvider>：cfg.enabled（PRIVY_APP_ID 存在）= true。
// 由于 @privy-io/react-auth 静态 import 进了 bundle，"sdkReady" 在这里恒为 true
// （保留它是为后续切回离线 fallback 留接口）。
export function PrivyProviderRoot({ children }) {
  const cfg = readPrivyConfig();

  if (!cfg.enabled) {
    // 没配 APP_ID → 不包 Provider；children 直接渲染；LoginModal 会走 StandaloneLogin
    return (
      <PrivyCtx.Provider value={{ enabled: false, sdkReady: true, methods: cfg.methods }}>
        {children}
      </PrivyCtx.Provider>
    );
  }

  // 配置了 APP_ID → 真实包 PrivyProvider
  return (
    <PrivyProvider
      appId={cfg.appId}
      config={{
        loginMethods: cfg.methods,
        embeddedWallets: {
          ethereum: { createOnLogin: 'users-without-wallets' },
        },
        appearance: {
          theme: 'light',
          accentColor: '#1f1f29',
        },
      }}
    >
      <PrivyCtx.Provider value={{ enabled: true, sdkReady: true, methods: cfg.methods }}>
        {children}
      </PrivyCtx.Provider>
    </PrivyProvider>
  );
}

// ---- 4. <PrivyLoginEntry />：LoginModal 里唯一入口 ----
//
// 简化分支：
//   - cfg.enabled  → 渲染 <PrivyButton />，里面调 usePrivy().login()
//   - 没 cfg.enabled → 渲染 <PrivyStandaloneLogin />
export function PrivyLoginEntry({ onLogin, onCancel }) {
  const status = usePrivyStatus();

  if (status.enabled) {
    return <PrivyButton onLogin={onLogin} onCancel={onCancel} />;
  }
  return <PrivyStandaloneLogin onLogin={onLogin} onCancel={onCancel} />;
}

// ---- 5. <PrivyButton />（cfg.enabled=true 路径，里面调 usePrivy） ----
function PrivyButton({ onLogin, onCancel }) {
  const { ready, authenticated, user, getAccessToken, login, logout } = usePrivy();

  // 用户登录后 → 桥接到 PB /api/auth/privy-bridge
  useEffect(() => {
    if (!ready || !authenticated || !user) return;
    (async () => {
      try {
        const email = pickEmail(user);
        const subject = pickSubject(user);
        const method = pickMethod(user);
        let accessToken = '';
        try { accessToken = (await getAccessToken()) || ''; } catch (_) {}
        if (!email) return;
        const data = await PB.requestPrivyBridge({
          email,
          subject,
          method,
          access_token: accessToken,
        });
        if (onLogin) await onLogin({
          ...data,
          email: data.record?.email || email,
          method: data.login_method || method,
          subject: data.subject || subject,
        });
      } catch (e) {
        console.warn('[PrivyButton] bridge failed:', e);
      }
    })();
  }, [ready, authenticated, user && user.id]);

  return (
    <div className="privy-sdk-entry">
      <p className="xs" style={{ margin: '0 0 14px', color: 'var(--ink-3)', lineHeight: 1.5 }}>
        <b>Privy 官方 SDK 已启用</b>。点击下面按钮弹出 Privy 自带登录面板
        （邮箱 / Google / X / GitHub / Discord / Apple / MetaMask 钱包，按本平台配置的顺序展示）。
        登录成功后会自动同步会话到 PocketBase。
      </p>
      <button
        type="button"
        className="lm"
        disabled={!ready}
        onClick={() => { try { login(); } catch (e) { console.warn(e); } }}
        style={{ display: 'flex', alignItems: 'center', gap: 12 }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 2 12l10 10 10-10z"/></svg>
        </span>
        <span>Privy 一键登录（OAuth + 钱包）</span>
        <span className="bg">SDK 已启用</span>
      </button>
      {authenticated && (
        <p className="xs" style={{ marginTop: 12, color: 'var(--ink-2)' }}>
          正在同步登录态到 PocketBase…
        </p>
      )}
      <div className="wl" style={{ marginTop: 18 }}>
        <a onClick={() => { try { logout(); } catch (_) {} onCancel && onCancel(); }}>返回其他登录方式</a>
      </div>
    </div>
  );
}

// ---- 6. Public helpers ----
export function getPrivyEnabled() {
  return readPrivyConfig().enabled;
}
