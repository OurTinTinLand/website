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
//     │                              └─ children → 整个 React 应用子树
//     │                                  └─ <PrivyNativeLauncher /> 监听 app:openPrivyNative
//     │                                     直接调 useLogin().login() 弹 Privy 原生 modal
//     └─ window.PRIVY_APP_ID 不在    → children 直通；PrivyNativeLauncher 不挂载，
//                                       点登录按钮事件没人监听（环境配置错误时静默失败）
//
// 运行入口：<PrivyProviderRoot><App/></PrivyProviderRoot>（App.jsx）。
// 唯一区分点：loginMethods 白名单 + 是否包 <PrivyProvider>。
// =============================================================================
import React, { useEffect } from 'react';
import { PrivyProvider, useLogin, usePrivy } from '@privy-io/react-auth';
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

// ---- 2. PrivyProviderRoot 顶层 ----
//
// 何时包 <PrivyProvider>：cfg.enabled（PRIVY_APP_ID 存在）= true。
// 启用时同时挂 <PrivyNativeLauncher />（监听 app:openPrivyNative 弹原生 modal）
// 和 <PrivyAuthSync />（PB / Privy session 同步）。
export function PrivyProviderRoot({ children }) {
  const cfg = readPrivyConfig();

  if (!cfg.enabled) {
    // 没配 APP_ID → 不包 Provider；children 直接渲染；登录事件无人监听（环境配置错误）
    return children;
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
      <PrivyNativeLauncher />
      <PrivyAuthSync />
      {children}
    </PrivyProvider>
  );
}

// ---- 3. <PrivyNativeLauncher />（app:openPrivyNative 监听器） ----
// 设计：所有登录入口（TopNav / AdminPage / DetailModal / MemberPage / AuthLoginPage）
//      都通过 Shell.openLogin() → dispatch 'app:openPrivyNative' 事件。
//      这个组件作为监听者被挂在 PrivyProvider 内（只能 enabled=true 时挂），
//      直接调 useLogin().login() 弹 Privy native modal，零中间步骤。
//      onComplete 回调里走 PB 桥接 + 调用方传入的 after 回调。
//      PRIVY_APP_ID 未配置时这个组件不挂载，事件无人监听（环境配置错误，按钮静默无响应）。
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

// ---- 4. <PrivyAuthSync />：PB 与 Privy 两套 session 之间的桥 ----
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
