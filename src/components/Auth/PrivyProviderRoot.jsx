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
import React, { useEffect, useRef, useCallback } from 'react';
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
  const { ready, authenticated, user, getAccessToken, logout } = usePrivy();
  // pendingAfter：调用方传入的 after 回调（如 () => openPay(courseId)）。
  // 注意：调用方不要再传硬刷页面的回调 —— setSession 已经把新 role/logged 同步
  // 进了 React state，AdminPage 等会自然 re-render；硬刷会和 saveState debounce /
  // Privy rehydration 互相冲掉，导致登录后页面回到旧 role / 反复弹 LoginPrompt。
  let pendingAfter = null;
  // 防止同一登录态被桥接两次：onComplete（fresh login）和下面的 authenticated
  // watcher（cookie rehydration）都可能触发；bridgingRef 串行化保证只跑一次。
  const bridgingRef = useRef(false);

  // Bridge helper：从 Privy user 拉 PB token，写进 store + localStorage + 派 app:auth:login。
  // 同时被 onComplete（fresh login 路径）和下面 bridge-on-auth watcher（cookie rehydrate /
  // onComplete 未派发的兜底路径）调用；bridgingRef 串行化保证只跑一次。
  const runPrivyBridge = useCallback(async () => {
    if (bridgingRef.current) return false;
    if (!user) return false;
    bridgingRef.current = true;
    try {
      const email   = pickEmail(user);
      const subject = pickSubject(user);
      const method  = pickMethod(user) || 'privy';
      if (!email) {
        console.warn('[PrivyNativeLauncher] no email in user; skip bridge');
        return false;
      }
      let accessToken = '';
      try { accessToken = (await getAccessToken()) || ''; } catch (_) {}
      // [AUTH-DEBUG] 临时埋点 — 调试完删
      try { console.warn('[AUTH-DEBUG] runPrivyBridge start', { email, subject, method, hasAccessToken: !!accessToken }); } catch (_) {}
      const data = await PB.requestPrivyBridge({
        email, subject, method, access_token: accessToken,
      });
      // [AUTH-DEBUG] 临时埋点 — 调试完删
      try { console.warn('[AUTH-DEBUG] runPrivyBridge bridge returned', { ok: data && data.ok, hasToken: !!(data && data.token), hasRecord: !!(data && data.record), role: data && data.role, errField: data && (data.error || data.message) }); } catch (_) {}
      if (data && data.token && data.record) {
        // loginPrivyBridge 是 StoreProvider 里的局部 const，不是模块 export。
        // StoreProvider render 期间会同步挂到 module-level holder，
        // 这里通过 getter 取，避免 dynamic import 拿到 undefined。
        const { getLoginPrivyBridge } = await import('../../state/store.jsx');
        const loginPrivyBridge = getLoginPrivyBridge();
        if (typeof loginPrivyBridge !== 'function') {
          console.warn('[PrivyNativeLauncher] loginPrivyBridge not registered yet (StoreProvider not mounted?)');
          return false;
        }
        try { await loginPrivyBridge(data); console.warn('[AUTH-DEBUG] loginPrivyBridge resolved'); } catch (e) { console.warn('[AUTH-DEBUG] loginPrivyBridge threw', e && e.message); }
        // 同步 flush session 到 localStorage（saveState 有 500ms debounce，
        // 如果不等 flush 就 reload，新 session 没写出去 → reload 后看起来未登录）
        try {
          const persist = await import('../../state/persist.js');
          persist.flushState('session');
          console.warn('[AUTH-DEBUG] flushState(session) done');
        } catch (_) {}
        window.dispatchEvent(new CustomEvent('app:auth:login', { detail: data }));
        console.warn('[AUTH-DEBUG] dispatched app:auth:login');
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[PrivyNativeLauncher] bridge failed:', e);
      return false;
    } finally {
      bridgingRef.current = false;
    }
  }, [user, getAccessToken]);

  const { login } = useLogin({
    onComplete: async ({ isNewUser, loginMethod, loginAccount }) => {
      // fresh login 路径。bridge 实际上由 bridge-on-auth watcher 兜底（它覆盖
      // fresh login / cookie rehydrate / onComplete 未派发 三种情况）。
      // 这里只 await 一下，确保 pendingAfter 在 session 落地之后再触发；
      // bridgingRef 防止双重调用。
      try { await runPrivyBridge(); } catch (_) {}
      // after 是"调用方登录后想做的事"（DetailModal 走 openPay(courseId) 等）；
      // 它本身就是调用方选的更新策略，我们不再叠加任何自动 reload。
      // 调用方传 null 就什么都不做 —— 默认路径是 AdminPage，session 已经
      // 通过 setSession 同步更新进 React state，UI 会自然 re-render。
      const after = pendingAfter;
      pendingAfter = null;
      if (typeof after === 'function') {
        try { await after(); } catch (e) { console.warn('[PrivyNativeLauncher] after() failed:', e); }
      }
    },
    onError: (error) => {
      console.warn('[PrivyNativeLauncher] login error:', error);
    },
  });

  // —— bridge-on-auth watcher ——
  // Privy authenticated 一变 true 就检查 PB：未登录就调 bridge。
  // 这是 onComplete 之外唯一的桥接触发点，专门覆盖：
  //   1) Privy cookie rehydrate（onComplete 不会派）
  //   2) onComplete 因为其他原因未派发
  // 不 watch user 单独变化 —— user 是 authenticated 的派生量；deps 含 authenticated 就够。
  // bridgingRef 防止 onComplete 路径同时触发时双跑。
  useEffect(() => {
    if (!ready || !authenticated || !user) return;
    if (PB.isLoggedIn()) return;
    // [AUTH-DEBUG] 临时埋点 — 调试完删
    try { console.warn('[AUTH-DEBUG] bridge-on-auth watch fires', { pbLoggedIn: PB.isLoggedIn() }); } catch (_) {}
    runPrivyBridge().catch((e) => console.warn('[PrivyNativeLauncher] bridge-on-auth failed:', e));
  }, [ready, authenticated, user, runPrivyBridge]);

  useEffect(() => {
    const handler = async (e) => {
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
      const pbLoggedIn = PB.isLoggedIn();
      console.warn('[PrivyNativeLauncher] app:openPrivyNative branch check', {
        ready, authenticated, pbLoggedIn, reactLogged,
      });

      if (!reactLogged) {
        if (pbLoggedIn) {
          console.warn('[PrivyNativeLauncher] React logged-out but PB token still present — clearing');
          try { PB.logout(); } catch (_) {}
        }
        if (authenticated) {
          console.warn('[PrivyNativeLauncher] React logged-out but Privy still authenticated — clearing');
          // 这里要等 sessions/logout 真的发出去再 login()。否则 logout 的网络请求
          // 还在飞、login() 已经触发了 passwordless/authenticate；用户快手验证码场景
          // 下会看到 passwordless/authenticate 先返回、然后 sessions/logout 才落地，
          // 表现就是"刚登进去立刻被踢"（修复 commit 前的同款 race，mount 路径由
          // PrivyAuthSync 覆盖、按钮路径在这里覆盖）。
          // [AUTH-DEBUG] 临时埋点 — 调试完删
          try { console.warn('[AUTH-DEBUG] app:openPrivyNative: !reactLogged && authenticated → usePrivy().logout()', '\nstack:', new Error().stack); } catch (_) {}
          try { await logout(); } catch (_) {}
        }
        // fall through —— 让下面的 login() 弹 modal
      } else if (authenticated && pbLoggedIn) {
        // 三方一致（React session + Privy + PB 都认为已登录）：真正的"已登录"，跳过 modal。
        // 这里才是不弹 modal 的合法场景；其他 desync 已经在上面兜底过了。
        console.warn('[PrivyNativeLauncher] session/auth/PB all agree: already logged in; skip modal');
        pendingAfter = null;
        return;
      } else if (authenticated && !pbLoggedIn) {
        console.warn('[PrivyNativeLauncher] Privy stale-auth, PB logged out — forcing Privy logout');
        // 同上，必须等 sessions/logout 落地再 login()，否则会出现 passwordless/authenticate
        // 之后立刻被 sessions/logout 覆盖的 race。
        // [AUTH-DEBUG] 临时埋点 — 调试完删
        try { console.warn('[AUTH-DEBUG] app:openPrivyNative: authenticated && !pbLoggedIn → usePrivy().logout()', '\nstack:', new Error().stack); } catch (_) {}
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

  // [AUTH-DEBUG] 临时埋点 — 监听 Privy SDK 自身的 authenticated 翻转
  useEffect(() => {
    try { console.warn('[AUTH-DEBUG] PrivyAuthSync: usePrivy().authenticated =', authenticated, 'PB.isLoggedIn =', PB.isLoggedIn()); } catch (_) {}
  }, [authenticated]);

  // (1) 监听 StoreProvider 的显式 logout
  useEffect(() => {
    const handler = () => {
      // 没在 Privy 登着时跳过 —— 不然 Privy 会去 POST /sessions/logout，服务端
      // 找不到对应 session 直接 400 + "Error destroying session"，控制台一堆噪音。
      // 典型触发：bridge-on-auth watcher 把 React session 设上了但 Privy 内部
      // 没有真实 server-side session（cookie 只剩 rehydrate 状态）。
      if (!authenticated) {
        // [AUTH-DEBUG] 临时埋点 — 调试完删
        try { console.warn('[AUTH-DEBUG] app:auth:logout listener skipped (Privy not authenticated)'); } catch (_) {}
        return;
      }
      // [AUTH-DEBUG] 临时埋点 — 调试完删
      try { console.warn('[AUTH-DEBUG] app:auth:logout listener → usePrivy().logout()', '\nstack:', new Error().stack); } catch (_) {}
      // logout() 返回 Promise；用 try/catch 抓不到 rejection，必须 .catch。
      // 极端情况下 Privy 服务端仍可能 400（比如 cookie 已过期）—— 静默吞掉，
      // 本地 PB/React session 已经被 store.logout() 清掉了，功能上已经登出。
      Promise.resolve(logout()).catch((err) => {
        // [AUTH-DEBUG] 临时埋点 — 调试完删
        try { console.warn('[AUTH-DEBUG] usePrivy().logout() rejected:', err && err.message); } catch (_) {}
      });
    };
    window.addEventListener('app:auth:logout', handler);
    return () => window.removeEventListener('app:auth:logout', handler);
  }, [authenticated, logout]);

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
    // [AUTH-DEBUG] 临时埋点 — 调试完删
    let _dbgReactLogged = false;
    try {
      const _raw = window.localStorage.getItem('tintin:session');
      const _j = _raw ? JSON.parse(_raw) : null;
      _dbgReactLogged = !!(_j && _j.value && _j.value.logged);
    } catch (_) {}
    try { console.warn('[AUTH-DEBUG] PrivyAuthSync mount effect', { authenticated, pbLoggedIn: PB.isLoggedIn(), reactLoggedFromLS: _dbgReactLogged }); } catch (_) {}
    if (!authenticated || PB.isLoggedIn()) return;
    let reactLogged = false;
    try {
      const raw = window.localStorage.getItem('tintin:session');
      const j = raw ? JSON.parse(raw) : null;
      reactLogged = !!(j && j.value && j.value.logged);
    } catch (_) {}
    if (reactLogged) return;        // 用户已登录，这只是 PB bridge 还没追上的瞬态
    // [AUTH-DEBUG] 临时埋点 — 调试完删
    try { console.warn('[AUTH-DEBUG] PrivyAuthSync: desync confirmed → usePrivy().logout()', '\nstack:', new Error().stack); } catch (_) {}
    try { logout(); } catch (_) {}  // 真正的 desync：清掉 Privy 残留
  }, [logout]);  // logout 来自 usePrivy 是稳定引用，等价于 mount-only

  return null;
}
