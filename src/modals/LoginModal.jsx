// 登录弹层：spec v1.1 §6
// - §6.1 邮箱验证码（主力）：真实调 PB /api/auth/email-code + /verify
// - §6.2 微信一键（P1）：UI 占位，后端返回 501
// - §6.2 GitHub（P1）：本周 UI 占位（OAuth V1.1 接）
// - 钱包签名：真实调 PB /api/auth/wallet/nonce + /verify
import React, { useState, useEffect, useRef } from 'react';
import { useStore, useToast } from '../state/store';
import * as PB from '../utils/pb-client.js';

const ESC = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function LoginModal({ open, afterLogin, onClose }) {
  const { loginEmailOtp, loginGithubMock } = useStore();
  const toast = useToast();
  const [step, setStep] = useState('choose');
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

  const walletLogin = async () => {
    setPending(true);
    try {
      const r = await PB.getWalletNonce();
      // 真签名留给 V1.1（spec §6.2 P1）；当前仅 nonce-only 校验
      // 演示用：传一个假签名，后端记录但不会真正校验
      try {
        await PB.verifyWallet('0xFEED1234', 'demo-sig', r.nonce);
        onLoginOk('Web3 钱包');
      } catch (verifyErr) {
        // 后端会因为签名错误拒绝；演示模式下用 github 占位回退
        loginGithubMock('0xFEED1234@wallet.local', 'wallet_demo');
        toast.show('钱包真实签名校验 V1.1 上线，本周 nonce-only 演示');
        doClose();
        if (afterLogin) setTimeout(afterLogin, 320);
      }
    } catch (err) {
      toast.show('钱包登录失败：' + (err.message || 'unknown'));
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
              <p className="xs" style={{ margin:'12px 0 22px' }}>零填表 · 不收手机号、不实名、不填职业公司。</p>

              <button className="lm" disabled={pending} onClick={() => setStep('email')}>
                邮箱验证码<span className="bg">本周主力</span>
              </button>

              <button className="lm" disabled={pending} onClick={() => {
                toast.show('i18n 留到 V1.1（微信资质审核中）');
              }}>
                微信一键登录<span className="bg">UI 就绪</span>
              </button>

              <button className="lm" disabled={pending} onClick={() => {
                loginGithubMock(email || 'gh@tintin.land', 'gh_demo_user');
                onLoginOk('GitHub');
              }}>
                GitHub 登录<span className="bg">P1 · 招聘复用</span>
              </button>

              <div className="wl">或 <a onClick={walletLogin}>用钱包签名登录</a></div>

              <div className="spec">签名一次即可，不转账、无 gas。职业公司等信息延后到报名场景再收集。</div>
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

        </div>
      </div>
    </div>
  );
}
