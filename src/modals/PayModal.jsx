// 支付弹层：全款/定金 → 收款码 → 标记已支付 → 显示 pending_review
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
      status:'pending_review', advisor_code_sent:false,
      created_at:'2026-08-12 10:32',
    });
    addSignup({
      order_id: oid, user_id: session.user_id, kind:'course', item_id: course.id,
      title: course.title, time:'2026-08-12 10:32', status:'待核实',
    });
    setDone({ oid, amt });
  };

  return (
    <div className="mask on" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal narrow">
        <button className="x" onClick={onClose} aria-label="关闭">✕</button>
        <div className="mb" id="payBody">

          {done ? (
            <>
              <h2 style={{ fontSize:24 }}>收到了，等核实</h2>
              <p className="xs" style={{ margin:'14px 0 24px' }}>
                订单 {done.oid} · 实付 ¥{money(done.amt)}{useDeposit ? '（定金）' : ''}
                <br />
                <span className={'bdg ' + (done.amt ? 'b-pending' : '')}>pending_review</span>
                <br />
                运营核对到账后自动把顾问微信码发给你，一般 30 分钟内。
              </p>
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
              <div className="spec">第一层：点「已支付」后订单进 pending_review，运营对照工行流水人工核销，核销后自动发课程顾问微信码。自动核销留 V1.1。</div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
