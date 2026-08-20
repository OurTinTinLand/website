// =============================================================================
// Privy 登录 —— @privy-io/react-auth 集成（spec §6.4 主路径）
// =============================================================================
//
// 默认导出：<PrivyBridge /> —— 仅在 window.PRIVY_APP_ID 存在时挂载
// 监听 usePrivy 的 authenticated 变化 → 提取 user.email.addresses / linkedAccounts
// → 调 PB /api/auth/privy-bridge 完成 PB session 建立 → onLogin({ email, method, ... })
//
// 历史：
//   - v1.1 spec §6.2 GitHub P1 占位 + §6.3 微信资质审核中 → 本 PR 升级到正式集成
//   - V1.2 路线：server-side ES256 JWT 验签（详见 backend/pb_hooks/auth.pb.js 注释）
// =============================================================================
import React, { useEffect, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import * as PB from '../../utils/pb-client.js';

// 共享工具
import { pickEmail, pickSubject, pickMethod } from './_privy-utils.js';

// 主桥接组件：拿 usePrivy，把"Privy 已登录"消息推给上层 onLogin 回调
export function PrivyBridge({ onLogin, onReady }) {
  const { ready, authenticated, user, getAccessToken, logout: privyLogout } = usePrivy();
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState(null);
  const lastUserIdRef   = useRef(null);

  useEffect(() => {
    if (ready && onReady) onReady({ ready });
  }, [ready]);

  useEffect(() => {
    if (!ready || !authenticated || !user) return;
    if (lastUserIdRef.current === user.id) return; // 已经处理过
    lastUserIdRef.current = user.id;
    (async () => {
      setBusy(true);
      setErr(null);
      try {
        const email   = pickEmail(user);
        const subject = pickSubject(user);
        const method  = pickMethod(user);
        let accessToken = '';
        try { accessToken = (await getAccessToken()) || ''; } catch (_) {}
        if (!email) {
          throw new Error('Privy 登录成功但没拿到 email（需要确保在 Privy Dashboard 启用了 email 登录方式或绑定了 OAuth 邮箱）');
        }
        const data = await PB.requestPrivyBridge({
          email,
          method,
          subject,
          access_token: accessToken,
        });
        if (onLogin) await onLogin({ ...data, email, method, subject });
      } catch (e) {
        setErr(e.message || String(e));
        // 出错时让用户重试一次 — 清掉 ref
        lastUserIdRef.current = null;
      } finally {
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, user && user.id]);

  if (err) {
    return (
      <div className="xs" style={{ color: '#c0392b', marginTop: 10 }}>
        Privy 桥接失败：{err}<br />
        <a style={{ cursor: 'pointer' }} onClick={() => { lastUserIdRef.current = null; setErr(null); }}>重试</a>
      </div>
    );
  }
  if (busy) {
    return <div className="xs" style={{ color: 'var(--ink-3)', marginTop: 10 }}>…正在同步登录态到 PocketBase</div>;
  }
  return null;
}

// "Privy 一键登录"按钮：直接绑 usePrivy().login()，配合应用层 onClick 触发
export function PrivyLoginButton({ onBeforeLogin, children, disabled, ...rest }) {
  const { ready, authenticated, login } = usePrivy();
  const handle = async () => {
    if (onBeforeLogin) onBeforeLogin();
    // openIn：新标签弹出 / 'new-tab' ；默认走 popup
    try {
      await login();
    } catch (e) {
      // SDK 抛错时上层 toast 会展示
      // eslint-disable-next-line no-console
      console.warn('[PrivyLoginButton] login() 失败：', e);
    }
  };
  return (
    <button
      type="button"
      className="lm"
      disabled={disabled || !ready || authenticated}
      onClick={handle}
      style={{ display: 'flex', alignItems: 'center', gap: 12 }}
      {...rest}
    >
      {children || (
        <>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 2 12l10 10 10-10z" /></svg>
          </span>
          <span>Privy 一键登录（OAuth + 钱包）</span>
          <span className="bg">SDK 已启用</span>
        </>
      )}
    </button>
  );
}

// 解绑（登出 Privy）—— LoginModal 关 modal 前调用
export function usePrivyLogout() {
  const { logout } = usePrivy();
  return async () => {
    try { await logout(); } catch (_) { /* ignore */ }
  };
}
