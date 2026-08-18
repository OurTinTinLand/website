// 支付弹层：全款/定金 → 收款码 → 标记已支付 → 显示 pending_review
// spec v1.1 §8.3：顾问联系码改为「用户下单后立即自动发放」（前置到此环节）
// 运营在后台人工核对到账后只更新订单状态为 verified，不再重复触发发码动作。
import React, { useState } from 'react';
import { useStore, useToast } from '../state/store';
import { money } from '../utils/format';

export function PayModal({ course, onClose, onAdminJump }) {
  const { session, addOrder, addSignup, orderSeq } = useStore();
  const toast = useToast();
  const [useDeposit, setUseDeposit] = useState(false);
  const [done, setDone] = useState(null);

  if (!course) return null;
  const hasDep = !!course.price.deposit;

  const markPaid = () => {
    const amt = (useDeposit && course.price.deposit) ? course.price.deposit : course.price.amount;
    const oid = 'o-' + (orderSeq + 1);
    addOrder({
      id: oid, user_id: session.user_id, user_email: session.email,
      item_type:'course', item_id: course.id, item_title: course.title,
      amount: amt, is_deposit: !!useDeposit, channel:'icbc_qr',
      status:'pending_review',
      // §8.3：下单即发码，运营只更新状态
      advisor_code_sent: true, advisor_code_sent_at:'2026-08-12 10:32:08',
      resend_count:0,
      created_at:'2026-08-12 10:32',
    });
    addSignup({
      order_id: oid, user_id: session.user_id, kind:'course', item_id: course.id,
      title: course.title, time:'2026-08-12 10:32', status:'待核实',
    });
    setDone({ oid, amt });
    toast.show('订单已创建 · 顾问微信码已自动发放 · 加好友后报订单号核对到账');
  };

  return (
    <div className="mask on" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal narrow">
        <button className="x" onClick={onClose} aria-label="关闭">✕</button>
        <div className="mb" id="payBody">

          {done ? (
            <>
              <h2 style={{ fontSize:24 }}>收到了，顾问码已发</h2>
              <p className="xs" style={{ margin:'14px 0 20px' }}>
                订单 <span className="mono">{done.oid}</span> · 实付 ¥{money(done.amt)}{useDeposit ? '（定金）' : ''}
              </p>
              <div className="advisor-box">
                <div className="xs">课程顾问微信 · 报订单号即可快速核对到账</div>
                <img className="advisor-qr" src="assets-claude/advisor-wechat-qr.png" alt="课程顾问微信二维码"
                     onError={(e) => { e.currentTarget.style.display='none'; }} />
                <div className="spec">（演示二维码 · 生产环境由运营配置真实顾问码）</div>
              </div>
              <div className="bdg b-pending" style={{ display:'inline-block', margin:'4px 0 18px' }}>pending_review · 运营核对到账中</div>
              <button className="btn btn-fill btn-lg" style={{ width:'100%' }} onClick={() => { onClose(); location.hash = '#/member'; }}>看我的订单</button>
              <button className="btn btn-line btn-lg" style={{ width:'100%', marginTop:10 }} onClick={() => { onClose(); if (onAdminJump) onAdminJump(); }}>（演示）以运营身份核销</button>
            </>
          ) : (
            <>
              <h2 style={{ fontSize:24 }}>扫码支付</h2>
              <p className="xs" style={{ margin:'12px 0 20px' }}>{course.title}</p>
              {hasDep && (
                <div className="pills" style={{ marginBottom:18, justifyContent:'flex-start' }}>
                  <button id="pay-full" className={!useDeposit ? 'on' : ''} onClick={() => setUseDeposit(false)}>
                    全款 ¥{money(course.price.amount)}
                  </button>
                  <button id="pay-dep" className={useDeposit ? 'on' : ''} onClick={() => setUseDeposit(true)}>
                    定金 ¥{money(course.price.deposit)}
                  </button>
                </div>
              )}
              <div className="qr">
                <img src="assets-claude/工商银行收款聚合码.jpg" alt="工商银行聚合收款码" />
                <div className="pays">
                  <span>微信</span><span>支付宝</span><span>银联</span><span>数字人民币</span>
                </div>
                <div style={{ marginTop:14, fontSize:13, color:'var(--ink-2)' }}>
                  应付 <b id="pay-amt" style={{ fontSize:19, color:'var(--ink)' }}>¥{money((useDeposit && course.price.deposit) ? course.price.deposit : course.price.amount)}</b>
                </div>
              </div>
              <button className="btn btn-fill btn-lg" style={{ width:'100%', marginTop:20 }} onClick={markPaid}>我已完成支付</button>
              <div className="spec">spec §8.3：点「已支付」后系统立即把课程顾问微信码发给你，主动加好友可缩短感知等待；运营核对到账后只更新订单状态为 verified。</div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
