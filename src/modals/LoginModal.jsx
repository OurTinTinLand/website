// 登录弹层：三选一 → 邮箱 OTP / 微信扫码 / 钱包签名
import React, { useState, useEffect, useRef } from 'react';
import { useStore, useToast } from '../state/store';

const ESC = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function LoginModal({ open, afterLogin, onClose }) {
  const { login } = useStore();
  const toast = useToast();
  const [step, setStep] = useState('choose');
  const [email, setEmail] = useState('demo@tintin.land');
  const otpRef = useRef(null);

  useEffect(() => { if (open) setStep('choose'); }, [open]);
  useEffect(() => {
    if (step === 'otp') setTimeout(() => otpRef.current?.querySelector('input')?.focus(), 80);
  }, [step]);

  if (!open) return null;

  const doLogin = (method, em) => {
    login(method, em);
    toast.show(`已用「${method}」登录 · ${em}`);
    onClose();
    if (afterLogin) setTimeout(afterLogin, 320);
  };

  const otpNext = (el, i) => {
    const all = otpRef.current?.querySelectorAll('input') || [];
    if (el.value && i < 5) all[i + 1].focus();
  };

  const submitOtp = () => {
    const inputs = otpRef.current?.querySelectorAll('input') || [];
    const code = [...inputs].map((i) => i.value).join('');
    if (!/^\d{6}$/.test(code)) { toast.show('请输入完整的 6 位验证码'); return; }
    doLogin('邮箱验证码', email);
  };

  return (
    <div className="mask on" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal narrow">
        <button className="x" onClick={onClose} aria-label="关闭">✕</button>
        <div className="mb">

          {step === 'choose' && (
            <>
              <h2 style={{ fontSize:26 }}>进来看看</h2>
              <p className="xs" style={{ margin:'12px 0 28px' }}>三选一，几秒完成。不要手机号、不要实名、不填公司职业。</p>
              <button className="lm" onClick={() => setStep('email')}>
                邮箱验证码<span className="bg">本周主力</span>
              </button>
              <button className="lm" onClick={() => doLogin('微信', 'wx_user@tintin.land')}>
                微信一键登录<span className="bg">UI 就绪</span>
              </button>
              <div className="wl">或 <a onClick={() => doLogin('Web3 钱包', '0x7a3f…9c2b')}>用钱包签名登录</a></div>
              <div className="spec">签名一次即可，不转账、无 gas。职业公司等信息延后到报名场景再收集。</div>
            </>
          )}

          {step === 'email' && (
            <>
              <h2 style={{ fontSize:24 }}>邮箱验证码</h2>
              <p className="xs" style={{ margin:'12px 0 26px' }}>不设密码，收个码就进。</p>
              <div className="fr"><label>邮箱</label><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
              <button className="btn btn-fill btn-lg" style={{ width:'100%', marginTop:10 }} onClick={() => {
                if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast.show('邮箱格式不对'); return; }
                setStep('otp');
              }}>发送验证码</button>
            </>
          )}

          {step === 'otp' && (
            <>
              <h2 style={{ fontSize:24 }}>输入验证码</h2>
              <p className="xs" style={{ margin:'12px 0 4px' }}>已发到 {ESC(email)}（演示：任意 6 位数字）</p>
              <div className="otp" ref={otpRef}>
                {[0,1,2,3,4,5].map((i) => (
                  <input key={i} maxLength="1" inputMode="numeric" onInput={(e) => otpNext(e.target, i)} />
                ))}
              </div>
              <button className="btn btn-fill btn-lg" style={{ width:'100%' }} onClick={submitOtp}>进入</button>
              <p className="xs" style={{ textAlign:'center', marginTop:16 }}>
                没收到？<a style={{ color:'var(--ink)', cursor:'pointer', fontWeight:540 }} onClick={() => toast.show('已重新发送')}>重发</a>
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
