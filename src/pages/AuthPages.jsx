// /auth/login 与 /auth/callback：登录中转页
// spec §6.1 三选一：邮箱验证码（Privy）/ 钱包（Privy）/ 微信（UI 占位，后端 501）
import React, { useEffect } from 'react';
import { useRoute } from '../utils/router';
import { useToast } from '../state/store';
import * as PB from '../utils/pb-client.js';
import { dogUrl } from '../utils/constants';

export function AuthLoginPage({ openLogin }) {
  const { go } = useRoute();
  const toast = useToast();

  useEffect(() => {
    // 自动弹 Privy 原生登录（邮箱验证码 / 钱包 / Google / X / GitHub / Discord）
    openLogin && openLogin(() => go('home'));
  }, []);

  // §6.3 微信登录：资质审核未完成 → 接口占位，按钮只给反馈不跳转
  const handleWechat = async () => {
    try {
      const r = await PB.getWechatAuthUrl();
      if (r && r.ok && r.url) {
        toast.show('正在跳转微信授权…');
        window.location.href = r.url;
      } else {
        toast.show('微信登录正在接入中（资质审核中），请先用邮箱或钱包登录');
      }
    } catch (_) {
      toast.show('微信登录正在接入中（资质审核中），请先用邮箱或钱包登录');
    }
  };

  return (
    <section className="page page-section">
      <div className="wrap" style={{ textAlign:'center' }}>
        <img src={dogUrl('dog-sit')} style={{ width:160, margin:'0 auto 12px' }} alt="" />
        <h2 className="t2">登录</h2>
        <p className="lead" style={{ margin:'0 auto', maxWidth:480 }}>
          邮箱验证码 / 钱包 / 微信，三选一，几秒完成，不填任何额外资料。
        </p>
        <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:22 }}>
          <button className="btn btn-fill" onClick={() => openLogin && openLogin(() => go('home'))}>邮箱 / 钱包登录</button>
          <button className="btn btn-line" onClick={handleWechat}>微信登录</button>
        </div>
        <p className="xs" style={{ color:'var(--ink-3)', marginTop:16 }}>
          微信登录资质审核完成后自动开通，届时无需重新注册。
        </p>
      </div>
    </section>
  );
}

export function AuthCallbackPage() {
  const { go } = useRoute();
  const toast = useToast();
  useEffect(() => {
    const h = (location.hash.split('?')[1]) || '';
    const params = new URLSearchParams(h);
    const provider = params.get('provider') || '微信';
    toast.show(`${provider} 授权已返回，正在为你建立会话…`);
    setTimeout(() => go('home'), 800);
  }, []);
  return (
    <section className="page page-section">
      <div className="wrap" style={{ textAlign:'center' }}>
        <img src={dogUrl('dog-harness')} style={{ width:160, margin:'0 auto 12px' }} alt="" />
        <h2 className="t2">正在完成授权…</h2>
        <p className="lead" style={{ margin:'0 auto' }}>正在为你完成登录，请稍候。</p>
      </div>
    </section>
  );
}
