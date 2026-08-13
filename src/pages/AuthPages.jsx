// /auth/login 和 /auth/callback 的最简壳
// - /auth/login  打开登录弹层，自动定位到原意图（?next= 或详情 id）
// - /auth/callback 处理微信/钱包回调，本周仅放占位文案，等资质/SDK 接入
import React, { useEffect } from 'react';
import { useRoute } from '../utils/router';
import { useStore, useToast } from '../state/store';
import { dogUrl } from '../utils/constants';

export function AuthLoginPage({ openLogin }) {
  const { go } = useRoute();
  const toast = useToast();
  useEffect(() => {
    openLogin && openLogin(() => go('home'));
    toast.show('邮箱验证码 / 微信 / 钱包 · 三选一');
  }, []);
  return (
    <div className="container" style={{ padding: '80px 28px', textAlign: 'center' }}>
      <img src={dogUrl('dog-sit')} style={{ width: 160, margin: '0 auto 10px' }} alt="" />
      <h2>登录中…</h2>
      <p className="sec-desc">弹窗已自动打开，登录完成后会回到你想去的页面。</p>
    </div>
  );
}

export function AuthCallbackPage() {
  const { go } = useRoute();
  const toast = useToast();
  useEffect(() => {
    const h = (location.hash.split('?')[1]) || '';
    const params = new URLSearchParams(h);
    const provider = params.get('provider') || '微信';
    toast.show(`（演示）${provider} 授权已返回，V1.1 接通开放平台后会自动建立会话`);
    setTimeout(() => go('home'), 800);
  }, []);
  return (
    <div className="container" style={{ padding: '80px 28px', textAlign: 'center' }}>
      <img src={dogUrl('dog-harness')} style={{ width: 160, margin: '0 auto 10px' }} alt="" />
      <h2>正在完成授权…</h2>
      <p className="sec-desc">微信/钱包开放平台资质审核通过后，本页面会拉起真正的回调处理。本周为占位。</p>
    </div>
  );
}
