// 登录弹层：三选一（邮箱 OTP / 微信扫码 / 钱包签名）+ 演示登录
import React, { useState, useEffect, useRef } from 'react';
import { useStore, useToast } from '../state/store';
import { dogUrl } from '../utils/constants';

export function LoginModal({ open, afterLogin, onClose }) {
  const { login } = useStore();
  const toast = useToast();
  const [step, setStep] = useState('choose');   // choose → email → otp
  const [email, setEmail] = useState('demo@tintinland.com');
  const otpRef = useRef(null);

  useEffect(() => {
    if (open) setStep('choose');
  }, [open]);

  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpRef.current?.querySelector('input')?.focus(), 80);
    }
  }, [step]);

  if (!open) return null;

  const doLogin = (method, em) => {
    login(method, em);
    toast.show(`已通过「${method}」登录 · ${em}`);
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
    if (!/^\d{6}$/.test(code)) {
      toast.show('请输入完整的 6 位验证码');
      return;
    }
    doLogin('邮箱验证码', email);
  };

  return (
    <div className="mask on" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal narrow">
        <button className="mclose" onClick={onClose}>✕</button>
        <div className="mbody">

          {step === 'choose' && (
            <React.Fragment>
              <div style={{ textAlign:'center' }}>
                <img src={dogUrl('dog-sit')} style={{ width:100, margin:'0 auto 8px' }} alt="" />
              </div>
              <h3 style={{ textAlign:'center', marginBottom:5 }}>登录 / 注册</h3>
              <p className="note" style={{ textAlign:'center', margin:'0 0 20px' }}>三选一，几秒完成。不要手机号、不要实名、不填职业公司。</p>
              <button className="lmethod" onClick={() => setStep('email')}>
                <span className="ic">✉️</span> 邮箱验证码登录<span className="badge">本周主力</span>
              </button>
              <button className="lmethod" onClick={() => doLogin('微信', 'wx_user@tintinland.com')}>
                <span className="ic">💬</span> 微信一键登录<span className="badge">UI 已就绪</span>
              </button>
              <div className="wallet-link">或 <a onClick={() => doLogin('Web3 钱包', '0x7a3f…9c2b')}>用 Web3 钱包签名登录（MetaMask）</a></div>
              <div className="spec">签名一次即可，无需转账、无 gas。职业/公司等信息延后到报名场景再收集，一次填写写入档案。</div>
            </React.Fragment>
          )}

          {step === 'email' && (
            <React.Fragment>
              <h3 style={{ marginBottom:5 }}>邮箱验证码登录</h3>
              <p className="note" style={{ margin:'0 0 16px' }}>不设密码。输入邮箱收 6 位验证码即可。</p>
              <div className="frow">
                <label>邮箱</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <button className="btn btn-primary" style={{ width:'100%' }} onClick={() => {
                if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
                  toast.show('请填写正确的邮箱地址');
                  return;
                }
                setStep('otp');
              }}>发送验证码</button>
              <p className="note" style={{ textAlign:'center', marginTop:12, cursor:'pointer' }} onClick={() => setStep('choose')}>← 返回</p>
            </React.Fragment>
          )}

          {step === 'otp' && (
            <React.Fragment>
              <h3 style={{ marginBottom:5 }}>输入验证码</h3>
              <p className="note" style={{ margin:'0 0 6px' }}>已发送至 {email}（原型演示：任意 6 位数字即可）</p>
              <div className="otp" ref={otpRef}>
                {[0,1,2,3,4,5].map((i) => (
                  <input key={i} maxLength="1" inputMode="numeric" onInput={(e) => otpNext(e.target, i)} />
                ))}
              </div>
              <button className="btn btn-primary" style={{ width:'100%' }} onClick={submitOtp}>登录</button>
              <p className="note" style={{ textAlign:'center', marginTop:12 }}>
                没收到？<a style={{ color:'var(--violet-600)', cursor:'pointer' }} onClick={() => toast.show('已重新发送')}>重新发送</a>
              </p>
            </React.Fragment>
          )}

        </div>
      </div>
    </div>
  );
}
