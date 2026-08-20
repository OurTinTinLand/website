// =============================================================================
// Privy Provider Root —— 自适应 SDK / fallback
// =============================================================================
//
// 决策树：
//
//   PrivyProviderRoot（顶层组件）
//     ├─ 有 window.PRIVY_APP_ID ?  → 包装 <PrivyProvider>（动态 import @privy-io/react-auth）
//     │                              ├─ children        → 整个 React 应用子树
//     │                              └─ SdkLoginEntry  → 在 LoginModal 里用
//     └─ 无 window.PRIVY_APP_ID     → children 直通 + StandaloneLoginEntry
//
//   SdkLoginEntry：
//     调 usePrivy().login()；PrivyAuthenticatedBridge 把已登录身份推到 onLogin
//
//   StandaloneLoginEntry（无 SDK）：
//     渲染 <PrivyStandaloneLogin />；onLogin 直接拿 fake-OAuth demo 信息
//
// 所有调用方只 import `<PrivyLoginEntry onLogin onCancel />` 一个组件；
// 它自己根据 SDK 是否可用切换内部实现。
// =============================================================================
import React, { createContext, useContext, useEffect, useState } from 'react';
import { PrivyStandaloneLogin } from './PrivyStandalone.jsx';
import { pickEmail, pickSubject, pickMethod } from './_privy-utils.js';
import * as PB from '../../utils/pb-client.js';

// ---- 1. Privy 配置自省 ----
function readPrivyConfig() {
  if (typeof window === 'undefined') return { enabled: false, appId: '', methods: [] };
  const appId = String(window.PRIVY_APP_ID || '').trim();
  const methods = String(window.PRIVY_LOGIN_METHODS || 'email,google,x,github,discord,wallet')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const clientId = String(window.PRIVY_CLIENT_ID || '');
  return { enabled: !!appId, appId, methods, clientId };
}

// ---- 2. Privy Context：让子树知道 SDK 是否可用 ----
const PrivyCtx = createContext({ enabled: false, sdkReady: false, methods: [] });
export function usePrivyStatus() {
  return useContext(PrivyCtx);
}

// ---- 3. 顶层 Provider：有 PRIVY_APP_ID 时套 <PrivyProvider>（动态 import） ----
export function PrivyProviderRoot({ children }) {
  const cfg = readPrivyConfig();
  const [sdk, setSdk] = useState({ status: 'idle', PrivyProvider: null });

  useEffect(() => {
    let alive = true;
    if (!cfg.enabled) { setSdk({ status: 'idle', PrivyProvider: null }); return; }
    setSdk({ status: 'loading', PrivyProvider: null });
    ((s) => Function('s', 'return import(s)')(s))('@privy-io/react-auth')
      .then((mod) => {
        if (!alive) return;
        setSdk({ status: 'ready', PrivyProvider: mod.PrivyProvider });
      })
      .catch((e) => {
        if (!alive) return;
        // eslint-disable-next-line no-console
        console.warn('[PrivyProviderRoot] @privy-io/react-auth 未安装或加载失败:', e && e.message);
        setSdk({ status: 'missing', PrivyProvider: null });
      });
    return () => { alive = false; };
  }, [cfg.enabled]);

  const ctx = { enabled: cfg.enabled, sdkReady: sdk.status === 'ready', methods: cfg.methods };

  // 不挂 SDK → 直通 children（fallback 模式）
  if (!cfg.enabled || sdk.status === 'missing') {
    return <PrivyCtx.Provider value={ctx}>{children}</PrivyCtx.Provider>;
  }

  // SDK 加载中：先渲 children 占位，避免 loading 阶段 modal 拒绝渲染
  if (sdk.status !== 'ready' || !sdk.PrivyProvider) {
    return (
      <PrivyCtx.Provider value={ctx}>
        {children}
      </PrivyCtx.Provider>
    );
  }

  const Provider = sdk.PrivyProvider;
  return (
    <Provider
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
      <PrivyCtx.Provider value={ctx}>{children}</PrivyCtx.Provider>
    </Provider>
  );
}

// ---- 4. <PrivyLoginEntry />：LoginModal 用，分发 SDK / standalone ----
export function PrivyLoginEntry({ onLogin, onCancel }) {
  const status = usePrivyStatus();

  // SDK 路径
  if (status.enabled && status.sdkReady) {
    return <SdkLoginEntry onLogin={onLogin} onCancel={onCancel} />;
  }

  // 等待 SDK 加载
  if (status.enabled && !status.sdkReady) {
    return <SdkLoadingEntry onCancel={onCancel} />;
  }

  // 离线兜底
  return <PrivyStandaloneLogin onLogin={onLogin} onCancel={onCancel} />;
}

// ---- 5. SDK 子组件：动态 import 后渲染（避免编译期硬绑定） ----
function SdkLoadingEntry({ onCancel }) {
  return (
    <div className="privy-loading">
      <p className="xs" style={{ margin: '0 0 14px', color: 'var(--ink-3)' }}>
        <b>Privy SDK</b> 正在加载…若长时间未显示，请检查网络。
      </p>
      <div className="wl">
        <a onClick={onCancel}>返回其他登录方式</a>
      </div>
    </div>
  );
}

function SdkLoginEntry({ onLogin, onCancel }) {
  const [M, setM] = useState(null);
  useEffect(() => {
    let alive = true;
    ((s) => Function('s', 'return import(s)')(s))('@privy-io/react-auth')
      .then((mod) => { if (alive) setM(() => mod); });
    return () => { alive = false; };
  }, []);
  if (!M) return <SdkLoadingEntry onCancel={onCancel} />;
  return <SdkLoginEntryInner M={M} onLogin={onLogin} onCancel={onCancel} />;
}

function SdkLoginEntryInner({ M, onLogin, onCancel }) {
  const { usePrivy } = M;
  return (
    <SdkInnerOnce usePrivy={usePrivy}>
      <SdkLoginBody M={M} onLogin={onLogin} onCancel={onCancel} />
    </SdkInnerOnce>
  );
}

// Privy 官方要求 usePrivy 调用必须严格在 <PrivyProvider> 子树中；
// 我们已经在 PrivyProviderRoot 里包了，所以这里再嵌一层是 OK 的；
// 但绝不能在 <PrivyProvider> 之外调 usePrivy。
function SdkInnerOnce({ usePrivy, children }) {
  const { ready } = usePrivy();
  return ready ? children : <SdkLoadingEntry onCancel={null} />;
}

function SdkLoginBody({ M, onLogin, onCancel }) {
  const { usePrivy } = M;
  const { login, ready, authenticated, user, getAccessToken } = usePrivy();

  // 用户已登录 → 触一次桥接；后续由 PrivyAuthenticatedBridge 监听
  useEffect(() => {
    if (!ready || !authenticated || !user) return;
    (async () => {
      try {
        const email   = pickEmail(user);
        const subject = pickSubject(user);
        const method  = pickMethod(user);
        let accessToken = '';
        try { accessToken = (await getAccessToken()) || ''; } catch (_) {}
        if (!email) return;
        const data = await PB.requestPrivyBridge({ email, subject, method, access_token: accessToken });
        if (onLogin) onLogin({ ...data, email, method, subject });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[SdkLoginBody] bridge failed:', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        disabled={!ready || authenticated}
        onClick={() => { try { login(); } catch (e) { /* eslint-disable-next-line no-console */ console.warn(e); } }}
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
        <a onClick={onCancel}>返回其他登录方式</a>
      </div>
    </div>
  );
}

// 公共：检查环境是否配了 Privy（其它组件如 LoginModal 也可读）
export function getPrivyEnabled() {
  return readPrivyConfig().enabled;
}
