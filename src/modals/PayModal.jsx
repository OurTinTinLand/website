// 支付弹层：全款/定金 → 收款码 → 标记已支付 → 显示 pending_review
// spec v1.1 §8.3：顾问联系码改为「用户下单后立即自动发放」（前置到此环节）
// V1.1 真实接入：
//   - addOrder → 调 PB /api/collections/orders/records
//   - addSignup → 调 PB /api/collections/signups/records
//   失败时本地状态保留（演示 + 容灾），UI 给 toast 提示
import React, { useState } from 'react';
import { useStore, useToast } from '../state/store';
import { money } from '../utils/format';

export function PayModal({ course, onClose, onAdminJump }) {
  const { session, addOrder, addSignup, orderSeq } = useStore();
  const toast = useToast();
  const [useDeposit, setUseDeposit] = useState(false);
  const [done, setDone] = useState(null);
  const [pending, setPending] = useState(false);

  if (!course) return null;
  const hasDep = !!course.price.deposit;

  const markPaid = async () => {
    const amt = (useDeposit && course.price.deposit) ? course.price.deposit : course.price.amount;
    const tmpId = 'o-local-' + Date.now();
    setPending(true);
    try {
      const [orderRes] = await Promise.all([
        addOrder({
          id: tmpId,
          user_id: session.user_id || '',
          user_email: session.email || '',
          item_type: 'course',
          item_id: course.id,
          item_title: course.title,
          amount: amt,
          is_deposit: !!useDeposit,
          channel: 'icbc_qr',
          status: 'pending_review',
          created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        }),
        addSignup({
          user_id: session.user_id || '',
          kind: 'course',
          item_id: course.id,
          title: course.title,
          time: new Date().toISOString().slice(0, 19).replace('T', ' '),
          status: '待核实',
        }),
      ]);
      setDone({ oid: orderRes.id || tmpId, amt, synced: !!orderRes.ok });
      if (orderRes.ok && orderRes.keptLocal) {
        toast.show('订单已写入本地 · 后端同步失败（不影响 UI）');
      } else if (orderRes.ok) {
        toast.show('订单已创建到后端 · 顾问微信码已自动发放');
      }
    } catch (err) {
      toast.show('创建失败：' + (err.message || 'unknown'));
    } finally {
      setPending(false);
    }
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
                {!done.synced && <span className="lo" style={{ marginLeft:8 }}>（未同步到后端）</span>}
              </p>
              <div className="advisor-box">
                <div className="xs">课程顾问微信 · 报订单号即可快速核对到账</div>
                <img className="advisor-qr" src="assets-claude/advisor-wechat-qr.png" alt="课程顾问微信二维码"
                     onError={(e) => { e.currentTarget.style.display='none'; }} />
                <div className="spec">课程顾问微信 · 长按识别二维码</div>
              </div>
              <div className="bdg b-pending" style={{ display:'inline-block', margin:'4px 0 18px' }}>运营核对到账中</div>
              <button className="btn btn-fill btn-lg" style={{ width:'100%' }} onClick={() => { onClose(); location.hash = '#/member'; }}>看我的订单</button>
              <button className="btn btn-line btn-lg" style={{ width:'100%', marginTop:10 }} onClick={() => { onClose(); if (onAdminJump) onAdminJump(); }}>以运营身份核销</button>
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
              <button className="btn btn-fill btn-lg" style={{ width:'100%', marginTop:20 }} disabled={pending} onClick={markPaid}>
                {pending ? '处理中…' : '我已完成支付'}
              </button>
              <div className="spec">点「我已完成支付」后，顾问微信码会立即发给你，主动加好友可缩短感知等待；运营核对到账后会更新订单状态。</div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
