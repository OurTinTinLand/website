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
        {/* 把 PB / Privy 两个 session 源同步起来。详见函数注释。 */}
        <PrivyAuthSync />
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
  const { ready, authenticated, getAccessToken, logout } = usePrivy();
  // pendingAfter：调用方传入的 after 回调（如 () => openPay(courseId)）。
  // 注意：调用方不要再传硬刷页面的回调 —— setSession 已经把新 role/logged 同步
  // 进了 React state，AdminPage 等会自然 re-render；硬刷会和 saveState debounce /
  // Privy rehydration 互相冲掉，导致登录后页面回到旧 role / 反复弹 LoginPrompt。
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

          // after 才是"调用方登录后想做的事"（DetailModal 走 openPay(courseId)
          // 等）；它本身就是调用方选的更新策略，我们不再叠加任何自动 reload。
          // 调用方传 null 就什么都不做 —— 默认路径是 AdminPage，session 已经
          // 通过 setSession 同步更新进 React state，UI 会自然 re-render。
          const after = pendingAfter;
          pendingAfter = null;
          if (typeof after === 'function') {
            try { await after(); } catch (e) { console.warn('[PrivyNativeLauncher] after() failed:', e); }
          }
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

      // 权威源：tintin:session.logged。store.logout() 已经把三向源都清掉了，
      // 任何 "React 已登出 但 PB/Privy 还在线" 的路径都视为 desync，强制清掉再 login。
      // 这条路径只补漏（比如 LoginModal 曾经直接调 usePrivy().logout() 不走 store）；
      // 正常 store.logout() 之后这里 reactLogged 已经是 false，PB 和 Privy 也都空了。
      let reactLogged = false;
      try {
        const raw = window.localStorage.getItem('tintin:session');
        const j = raw ? JSON.parse(raw) : null;
        reactLogged = !!(j && j.value && j.value.logged);
      } catch (_) {}

      if (!reactLogged) {
        if (PB.isLoggedIn()) {
          console.warn('[PrivyNativeLauncher] React logged-out but PB token still present — clearing');
          try { PB.logout(); } catch (_) {}
        }
        if (authenticated) {
          console.warn('[PrivyNativeLauncher] React logged-out but Privy still authenticated — clearing');
          try { logout(); } catch (_) {}
        }
        // fall through —— 让下面的 login() 弹 modal
      } else if (authenticated && PB.isLoggedIn()) {
        // 三方一致（React session + Privy + PB 都认为已登录）：真正的"已登录"，跳过 modal。
        // 这里才是不弹 modal 的合法场景；其他 desync 已经在上面兜底过了。
        console.warn('[PrivyNativeLauncher] session/auth/PB all agree: already logged in; skip modal');
        pendingAfter = null;
        return;
      } else if (authenticated && !PB.isLoggedIn()) {
        console.warn('[PrivyNativeLauncher] Privy stale-auth, PB logged out — forcing Privy logout');
        try { logout(); } catch (_) {}
        // 不 return —— 让下面的 login() 继续跑，弹出 modal 让用户登新号
      }
      try {
        login();
      } catch (e) {
        console.warn('[PrivyNativeLauncher] login() threw:', e);
      }
    };
    window.addEventListener('app:openPrivyNative', handler);
    return () => window.removeEventListener('app:openPrivyNative', handler);
  }, [ready, authenticated, login, logout]);

  return null;
}

// ---- 7. <PrivyAuthSync />：PB 与 Privy 两套 session 之间的桥 ----
//
// 历史：logout() 之前只调 PB.logout()，没碰 Privy SDK。结果 Privy SDK 还凭着自己的
// cookie/localStorage 继续认为用户已登录（即使 PB token 已经被清掉）。reload 后
// 还会从 cookie 复活 —— 这种情况点 "登录" 按钮，PrivyNativeLauncher 走
// "already authenticated; skip" 分支，Privy modal 不弹，用户以为被卡死。
//
// 这个组件做两件事：
//   1) 监听 StoreProvider.logout() 派发的 'app:auth:logout' 事件，
//      调 usePrivy().logout() 同步清掉 Privy。
//   2) 页面 mount / Privy 状态变化时，检查 "Privy 认为登录，但 PB 没 token" 这种
//      desync；命中就强制 logout()，让 PrivyNativeLauncher 下次能正常弹 modal。
//      （处理 reload 后从 cookie 复活 + PB 已登出的情况。）
//
// 只能挂在 PrivyProvider 内（要用 usePrivy）。
function PrivyAuthSync() {
  const { authenticated, logout } = usePrivy();

  // (1) 监听 StoreProvider 的显式 logout
  useEffect(() => {
    const handler = () => {
      try { logout(); } catch (_) {}
    };
    window.addEventListener('app:auth:logout', handler);
    return () => window.removeEventListener('app:auth:logout', handler);
  }, [logout]);

  // (2) mount only：处理 reload 后 Privy 从 cookie 复活 + PB 已登出 的 desync。
  //
  // 不能订阅 authenticated 变化！那样会在 login 流程中间（Privy 刚返回 authenticated=true
  // 但 PB bridge 还没跑完，PB.isLoggedIn() 还是 false）命中条件，调 logout() 把刚成功的
  // 登录干掉，向 Privy 重复发 sessions/logout —— 用户表现就是 passwordless/authenticate
  // 之后立刻被踢。
  //
  // 真要兜底"按钮被点但仍有 desync"走 PrivyNativeLauncher 的 app:openPrivyNative handler，
  // 那里有 reactLogged 权威校验；这里只负责 mount 时的 reload-revival 检测。
  useEffect(() => {
    if (!authenticated || PB.isLoggedIn()) return;
    let reactLogged = false;
    try {
      const raw = window.localStorage.getItem('tintin:session');
      const j = raw ? JSON.parse(raw) : null;
      reactLogged = !!(j && j.value && j.value.logged);
    } catch (_) {}
    if (reactLogged) return;        // 用户已登录，这只是 PB bridge 还没追上的瞬态
    try { logout(); } catch (_) {}  // 真正的 desync：清掉 Privy 残留
  }, [logout]);  // logout 来自 usePrivy 是稳定引用，等价于 mount-only

  return null;
}
