// 登录弹层：spec v1.1 §6
// - §6.1 邮箱验证码（主力）：真实调 PB /api/auth/email-code + /verify
// - §6.2 微信一键（P1）：UI 占位，后端返回 501
// - §6.2 GitHub（P1）：本周 UI 占位（OAuth V1.1 接）
// - 钱包签名：真实调 PB /api/auth/wallet/nonce + /verify
import React, { useState, useEffect, useRef } from 'react';
import { useStore, useToast } from '../state/store';
import * as PB from '../utils/pb-client.js';
import { PrivyLoginEntry, usePrivyStatus } from '../components/Auth/PrivyProviderRoot.jsx';

const ESC = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function LoginModal({ open, afterLogin, onClose }) {
  const { loginEmailOtp, loginPrivyBridge } = useStore();
  const toast = useToast();
  const [step, setStep] = useState('choose');
  const privyStatus = usePrivyStatus();
  const LABEL_METHOD = (m) => ({
    google:'Google', x:'X (Twitter)', twitter:'Twitter', github:'GitHub', discord:'Discord',
    apple:'Apple', wallet:'Web3 钱包', email:'邮箱', sms:'短信', privy:'Privy',
  })[m] || 'Privy';
  const [email, setEmail] = useState('demo@tintin.land');
  const [pending, setPending] = useState(false);
  const [devCode, setDevCode] = useState(null);    // dev 环境 mail 没真发时 PB 会返回
  const otpRef = useRef(null);

  useEffect(() => { if (open) setStep('choose'); }, [open]);
  useEffect(() => {
    if (step === 'otp') setTimeout(() => otpRef.current?.querySelector('input')?.focus(), 80);
  }, [step]);

  if (!open) return null;

  const doClose = () => { setStep('choose'); setDevCode(null); onClose(); };

  const onLoginOk = (label) => {
    toast.show(`已用「${label}」登录 · ${email || ''}`);
    doClose();
    if (afterLogin) setTimeout(afterLogin, 320);
  };

  const submitOtp = async () => {
    const inputs = otpRef.current?.querySelectorAll('input') || [];
    const code = [...inputs].map((i) => i.value).join('');
    if (!/^\d{6}$/.test(code)) { toast.show('请输入完整的 6 位验证码'); return; }
    setPending(true);
    try {
      await loginEmailOtp(email, code);
      onLoginOk('邮箱验证码');
    } catch (err) {
      toast.show('登录失败：' + (err.message || 'unknown'));
    } finally {
      setPending(false);
    }
  };

  const sendCode = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast.show('邮箱格式不对'); return; }
    setPending(true);
    try {
      const r = await PB.requestEmailCode(email);
      setDevCode(r.dev_code || null);
      setStep('otp');
      if (r.dev_code) {
        toast.show(`演示验证码已生成：${r.dev_code}（生产环境会发邮件）`);
      } else {
        toast.show(`验证码已发到 ${email}`);
      }
    } catch (err) {
      toast.show('发送失败：' + (err.message || 'unknown'));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mask on" onClick={(e) => { if (e.target === e.currentTarget) doClose(); }}>
      <div className="modal narrow">
        <button className="x" onClick={doClose} aria-label="关闭">✕</button>
        <div className="mb">

          {step === 'choose' && (
            <>
              <h2 style={{ fontSize:26 }}>进来看看</h2>
              <p className="xs" style={{ margin:'12px 0 22px' }}>
                用 <b>Privy</b> 一键登录：邮箱 / Google / X / GitHub / Discord / Apple / MetaMask 任选一。
                <br/>三秒完成 · 零填表 · 不收手机号、不实名、不填职业公司。
              </p>

              {/* 主 CTA — Privy 一键登录（spec §6.4） */}
              <button className="lm" disabled={pending} onClick={() => setStep('privy')}>
                Privy 一键登录（OAuth + 钱包）<span className="bg">{privyStatus.enabled ? (privyStatus.sdkReady ? 'SDK' : '加载中') : '离线 fallback'}</span>
              </button>

              {/* 离线 fallback：没装 SDK / 没设 APP_ID 时才出现 */}
              {!privyStatus.enabled && (
                <button className="lm" disabled={pending} onClick={() => setStep('email')}
                        style={{ marginTop: 6 }}>
                  邮箱验证码<span className="bg">fallback</span>
                </button>
              )}

              <div className="spec">
                登录后：可报名课程 / 活动 / 黑客松；运营账号自动识别角色解锁运营后台。
              </div>
            </>
          )}

          {step === 'email' && (
            <>
              <h2 style={{ fontSize:24 }}>邮箱验证码</h2>
              <p className="xs" style={{ margin:'12px 0 26px' }}>不设密码，收个码就进。</p>
              <div className="fr"><label>邮箱</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <button className="btn btn-fill btn-lg" style={{ width:'100%', marginTop:10 }} disabled={pending} onClick={sendCode}>
                {pending ? '发送中…' : '发送验证码'}
              </button>
            </>
          )}

          {step === 'otp' && (
            <>
              <h2 style={{ fontSize:24 }}>输入验证码</h2>
              <p className="xs" style={{ margin:'12px 0 4px' }}>已发到 {ESC(email)}</p>
              {devCode && (
                <p className="xs" style={{ margin:'0 0 8px', color:'var(--ink-3)' }}>
                  演示验证码：<code style={{ background:'var(--paper-2)', padding:'2px 6px', borderRadius:4 }}>{devCode}</code>
                </p>
              )}
              <div className="otp" ref={otpRef}>
                {[0,1,2,3,4,5].map((i) => (
                  <input key={i} maxLength="1" inputMode="numeric" onInput={(e) => {
                    const all = otpRef.current?.querySelectorAll('input') || [];
                    if (e.target.value && i < 5) all[i + 1].focus();
                  }} />
                ))}
              </div>
              <button className="btn btn-fill btn-lg" style={{ width:'100%' }} disabled={pending} onClick={submitOtp}>
                {pending ? '验证中…' : '进入'}
              </button>
              <p className="xs" style={{ textAlign:'center', marginTop:16 }}>
                没收到？<a style={{ color:'var(--ink)', cursor:'pointer', fontWeight:540 }} onClick={sendCode}>重发</a>
              </p>
            </>
          )}

          {step === 'privy' && (
            <PrivyLoginEntry
              onCancel={() => setStep('choose')}
              onLogin={async (payload) => {
                // payload 已是后端 /api/auth/privy-bridge 的返回值（含 token + record）
                try {
                  if (payload && payload.token && payload.record) {
                    await loginPrivyBridge(payload);
                    const label = LABEL_METHOD(payload.login_method || payload.method);
                    toast.show(`已用「${label}」登录 · ${payload.email || payload.record.email || ''}`);
                    onLoginOk(label);
                  } else if (payload && payload.demo_login) {
                    // 离线 fallback（无 SDK 的演示模式）：直接 fake 一套 session
                    await loginPrivyBridge(payload.demo_login);
                    onLoginOk(LABEL_METHOD(payload.demo_login.login_method));
                  } else {
                    toast.show('Privy 桥接响应缺少 token/record（已忽略）');
                  }
                } catch (e) {
                  toast.show('Privy 桥接失败：' + (e.message || 'unknown'));
                }
              }}
            />
          )}

        </div>
      </div>
    </div>
  );
}
