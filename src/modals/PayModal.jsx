// 支付弹层：全款/定金 → 收款码 → 标记已支付 → 显示 pending_review
import React, { useState } from 'react';
import { useStore, useToast } from '../state/store';
import { money, esc } from '../utils/format';
import { dogUrl } from '../utils/constants';

export function PayModal({ course, onClose, onAdminJump }) {
  const { session, addOrder, addSignup, orderSeq } = useStore();
  const toast = useToast();
  const [useDeposit, setUseDeposit] = useState(false);
  const [done, setDone] = useState(null);   // null | { oid, amt }

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
        <button className="mclose" onClick={onClose}>✕</button>
        <div className="mbody">
          {done ? (
            <React.Fragment>
              <div style={{ textAlign:'center' }}>
                <img src={dogUrl('dog-skate')} style={{ width:130, margin:'0 auto 10px' }} alt="" />
              </div>
              <h3 style={{ textAlign:'center' }}>已收到，等待核实</h3>
              <p className="note" style={{ textAlign:'center', margin:'6px 0 18px' }}>
                订单 {done.oid} · 实付 ¥{money(done.amt)}{useDeposit ? '（定金）' : ''}<br />
                状态：<span className="badge b-pending">pending_review</span><br />
                运营核对到账后会自动把课程顾问微信码发给你，通常 30 分钟内。
              </p>
              <button className="btn btn-ink" style={{ width:'100%' }} onClick={() => { onClose(); /* navigate to member */ }}>去个人中心查看订单</button>
              <button className="btn btn-outline" style={{ width:'100%', marginTop:9 }} onClick={() => { onClose(); if (onAdminJump) onAdminJump(); }}>（演示）以运营身份去后台核销</button>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <h3 style={{ marginBottom:5 }}>扫码支付</h3>
              <p className="note" style={{ margin:'0 0 12px' }}>{course.title}</p>
              {hasDep && (
                <div className="fsel" style={{ marginBottom:12 }}>
                  <button id="pay-full" className={!useDeposit ? 'on' : ''} onClick={() => setUseDeposit(false)}>
                    全款 ¥{money(course.price.amount)}
                  </button>
                  <button id="pay-dep" className={useDeposit ? 'on' : ''} onClick={() => setUseDeposit(true)}>
                    先付定金 ¥{money(course.price.deposit)}
                  </button>
                </div>
              )}
              <div className="qrbox">
                <img src="assets-claude/工商银行收款聚合码.jpg" alt="工商银行聚合收款码" />
                <div className="paychips">
                  <span>微信</span><span>支付宝</span><span>银联</span><span>数字人民币</span>
                </div>
                <div style={{ marginTop:10, fontSize:13 }}>
                  应付 <b style={{ fontSize:17 }}>
                    ¥{money((useDeposit && course.price.deposit) ? course.price.deposit : course.price.amount)}
                  </b>
                </div>
              </div>
              <button className="btn btn-primary" style={{ width:'100%', marginTop:16 }} onClick={markPaid}>
                我已完成支付
              </button>
              <div className="spec">第一层方案：用户点「已支付」后订单进入 pending_review，运营对照工行商户流水人工核销，核销后系统自动发放课程顾问微信码。第二层（微信/支付宝自动核销）留 V1.1。</div>
            </React.Fragment>
          )}
        </div>
      </div>
    </div>
  );
}
