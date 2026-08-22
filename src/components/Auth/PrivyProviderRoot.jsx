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
//     │                              └─ LoginModal 直接调 useLogin().login()（v1.2.4 起的官方模式）
//     └─ window.PRIVY_APP_ID 不在    → children 直通；LoginModal 用 <PrivyStandaloneLogin/> 兜底
//
// 运行入口：<PrivyProviderRoot><App/></PrivyProviderRoot>（App.jsx 第 N 行）。
// 唯一区分点：loginMethods 白名单 + 是否包 <PrivyProvider>。
// =============================================================================
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { PrivyProvider, useLogin, usePrivy } from '@privy-io/react-auth';
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
        {/* 监听 app:openPrivyNative 事件，点一下"用 Privy 登录"直接弹 Privy native modal（不走 LoginModal） */}
        <PrivyNativeLauncher />
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

// ---- 5. <PrivyButton />（cfg.enabled=true 路径，按 Privy 官方 useLogin 模式） ----
// 官方示例（docs.privy.io/authentication/user-authentication/ui-component）：
//   import { useLogin, usePrivy } from '@privy-io/react-auth';
//   const { ready, authenticated } = usePrivy();
//   const { login } = useLogin({ onComplete, onError });
//   onClick={login}      ← 直接传，不包 try/catch
//   disabled = !ready || (ready && authenticated)
//   onComplete 拿 user / loginMethod / loginAccount 等，替代 useEffect watch authenticated
function PrivyButton({ onLogin, onCancel }) {
  // 一次解构 usePrivy 全部字段（Rules of Hooks 约束：所有 hooks 调用必须在同一层）
  const { ready, authenticated, logout, getAccessToken } = usePrivy();
  // 官方推荐 useLogin()（purpose-built for login flow），带 onComplete / onError 回调
  const { login } = useLogin({
    onComplete: async ({ user, isNewUser, loginMethod, loginAccount }) => {
      // 官方回调：登录成功后走 PB 桥接（替代旧的 useEffect watch authenticated）
      try {
        const email   = pickEmail(user);
        const subject = pickSubject(user);
        // 优先 loginMethod / loginAccount.type（官方 onComplete 给的精确字段），fallback 到 pickMethod
        const method = (loginMethod && String(loginMethod).toLowerCase())
          || (loginAccount && loginAccount.type)
          || pickMethod(user)
          || 'privy';
        let accessToken = '';
        try { accessToken = (await getAccessToken()) || ''; } catch (_) {}
        if (!email) {
          console.warn('[PrivyButton] no email in user; skip bridge');
          return;
        }
        const data = await PB.requestPrivyBridge({
          email, subject, method, access_token: accessToken,
        });
        if (onLogin) await onLogin({
          ...data,
          email:   data.record?.email || email,
          method:  data.login_method || method,
          subject: data.subject       || subject,
        });
      } catch (e) {
        console.warn('[PrivyButton] bridge failed:', e);
      }
    },
    onError: (error) => {
      console.warn('[PrivyButton] login error:', error);
    },
  });

  const disableLogin = !ready || (ready && authenticated);

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
        disabled={disableLogin}
        onClick={login}
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

// ---- 6. <PrivyNativeLauncher />（app:openPrivyNative 监听器） ----
// 设计：AdminPage 的"用 Privy 登录"按钮发 app:openPrivyNative 事件；
//      这个组件作为监听者被挂在 PrivyProvider 内（只能 enabled=true 时挂），
//      直接调 useLogin().login() 弹 Privy native modal，零中间步骤。
//      onComplete 回调里走 PB 桥接 + 刷新页面。
//      PRIVY_APP_ID 未配置时这个组件不挂载；AdminPage 的按钮 fallback 到 app:openLogin（→ LoginModal）。
//
// 注意：必须挂在 PrivyProvider 内才能调 useLogin；所以放在 return <PrivyProvider>...</PrivyProvider> 里。
function PrivyNativeLauncher() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  // pendingAfter：调用方传入的 after 回调（如 () => location.reload() / () => openPay(courseId)）
  // onComplete 跑完 PB 桥接后再调，确保"登录完成后要做什么"的钩子被执行
  let pendingAfter = null;

  const { login } = useLogin({
    onComplete: async ({ user, isNewUser, loginMethod, loginAccount }) => {
      try {
        const email   = pickEmail(user);
        const subject = pickSubject(user);
        const method  = (loginMethod && String(loginMethod).toLowerCase())
          || (loginAccount && loginAccount.type)
          || pickMethod(user)
          || 'privy';
        let accessToken = '';
        try { accessToken = (await getAccessToken()) || ''; } catch (_) {}
        if (!email) {
          console.warn('[PrivyNativeLauncher] no email in user; skip bridge');
          return;
        }
        const data = await PB.requestPrivyBridge({
          email, subject, method, access_token: accessToken,
        });
        if (data && data.token && data.record) {
          const { loginPrivyBridge } = await import('../../state/store.jsx');
          try { await loginPrivyBridge(data); } catch (_) {}
          // 同步 flush session 到 localStorage（saveState 有 500ms debounce，
          // 如果不等 flush 就 reload，新 session 没写出去 → reload 后看起来未登录
          // → 触发再登录 → 死循环）
          try {
            const persist = await import('../../state/persist.js');
            persist.flushState('session');
          } catch (_) {}
          window.dispatchEvent(new CustomEvent('app:auth:login', { detail: data }));

          // 先跑调用方传的 after，再 reload（after 通常自己会 reload）
          const after = pendingAfter;
          pendingAfter = null;
          if (typeof after === 'function') {
            try { await after(); } catch (e) { console.warn('[PrivyNativeLauncher] after() failed:', e); }
          }
          setTimeout(() => location.reload(), 200);
        }
      } catch (e) {
        console.warn('[PrivyNativeLauncher] bridge failed:', e);
      }
    },
    onError: (error) => {
      console.warn('[PrivyNativeLauncher] login error:', error);
    },
  });

  useEffect(() => {
    const handler = (e) => {
      pendingAfter = (e && e.detail && typeof e.detail.after === 'function') ? e.detail.after : null;
      if (!ready) {
        console.warn('[PrivyNativeLauncher] Privy not ready yet; ignored');
        return;
      }
      if (authenticated) {
        // 已经登录 —— 不弹 Privy modal，更不盲目跑 after()。
        // 历史 bug：AdminPage 把 after 当成 location.reload() 来用，已登录时点"用 Privy 登录"
        // 会让这里执行 reload → 状态不变 → 同帧再点 → 同帧 reload → 体感"页面循环重启"。
        // 解决：清掉 pendingAfter；不再调 login() / after()。
        console.warn('[PrivyNativeLauncher] already authenticated; skip');
        pendingAfter = null;
        return;
      }
      try {
        login();
      } catch (e) {
        console.warn('[PrivyNativeLauncher] login() threw:', e);
      }
    };
    window.addEventListener('app:openPrivyNative', handler);
    return () => window.removeEventListener('app:openPrivyNative', handler);
  }, [ready, authenticated, login]);

  return null;
}
