// 运营后台：orders / intents / content + 鉴权闸门
import React, { useState } from 'react';
import { useStore, useToast } from '../state/store';
import { money } from '../utils/format';
import { dogUrl } from '../utils/constants';

const TABS = [['orders','订单核销'], ['intents','Token Hub 意向单'], ['content','内容录入']];

export function AdminPage() {
  const { session, demoAdmin, orders, intents, verifyOrder, contactIntent, closeIntent } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState('orders');

  const isOps = session.logged && session.is_admin;

  return (
    <section className="page page-section">
      <div className="wrap">
        <div className="sec-h">
          <div><span className="kick">Admin</span><h2 className="t2">运营后台</h2></div>
          <p className="lead">本周只做两件事：支付人工核销、意向单跟进。内容审核与数据看板放 V1.1。</p>
        </div>

        <div className="subs">
          {TABS.map(([k, label]) => (
            <button key={k} className={'sub' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>

        {tab === 'orders'  && (isOps ? <OrdersPanel  orders={orders}    verifyOrder={verifyOrder}   toast={toast} /> : <Gate onDemo={() => { demoAdmin(); toast.show('已切换为运营身份（仅原型演示）'); }} />)}
        {tab === 'intents' && (isOps ? <IntentsPanel intents={intents} contactIntent={contactIntent} closeIntent={closeIntent} toast={toast} /> : <Gate onDemo={() => { demoAdmin(); toast.show('已切换为运营身份（仅原型演示）'); }} />)}
        {tab === 'content' && (isOps ? <ContentPanel toast={toast} /> : <Gate onDemo={() => { demoAdmin(); toast.show('已切换为运营身份（仅原型演示）'); }} />)}
      </div>
    </section>
  );
}

function Gate({ onDemo }) {
  return (
    <div className="empty">
      <img src={dogUrl('dog-harness')} alt="" />
      运营后台需要管理员权限。<br />
      生产环境按 Supabase RLS + role 字段鉴权，前端路由同时拦截。
      <br /><br />
      <button className="btn btn-fill" onClick={onDemo}>（演示）以运营身份进入</button>
    </div>
  );
}

function OrdersPanel({ orders, verifyOrder, toast }) {
  return (
    <>
      <div className="spec" style={{ marginBottom:24 }}>
        对照工商银行商户流水核对到账，点「已核实」后系统自动向用户发放课程顾问微信码。
      </div>
      <div className="tbl-scroll">
        <table className="t">
          <tbody>
            <tr><th>订单号</th><th>用户</th><th>项目</th><th>金额</th><th>时间</th><th>状态</th><th>操作</th></tr>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="mono">{o.id}</td>
                <td>{o.user_email}</td>
                <td>{o.item_title}</td>
                <td>¥{money(o.amount)}{o.is_deposit ? <span className="lo" style={{ marginLeft:6 }}>定金</span> : null}</td>
                <td className="mono" style={{ fontSize:11.5, color:'var(--ink-3)' }}>{o.created_at}</td>
                <td><span className={'bdg ' + (o.status === 'verified' ? 'b-verified' : o.status === 'failed' ? 'b-failed' : 'b-pending')}>{o.status}</span></td>
                <td>
                  {o.status === 'pending_review'
                    ? <button className="btn btn-fill btn-sm" onClick={() => { verifyOrder(o.id); toast.show(`${o.id} 已核实 · 顾问微信码已自动发给 ${o.user_email}`); }}>标记已核实</button>
                    : <span className="xs">{o.advisor_code_sent ? '顾问码已发' : '—'}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function IntentsPanel({ intents, contactIntent, closeIntent, toast }) {
  return (
    <div className="tbl-scroll">
      <table className="t">
        <tbody>
          <tr><th>单号</th><th>用户</th><th>渠道</th><th>用量</th><th>联系方式</th><th>状态</th><th>操作</th></tr>
          {intents.map((i) => (
            <tr key={i.id}>
              <td className="mono">{i.id}</td>
              <td>{i.user_email}</td>
              <td>{i.provider}</td>
              <td>{i.expected_volume}</td>
              <td>{i.contact}</td>
              <td><span className={'bdg ' + (i.status === 'pending' ? 'b-pending' : i.status === 'contacted' ? 'b-verified' : 'b-failed')}>{i.status}</span></td>
              <td>
                {i.status === 'pending'
                  ? <button className="btn btn-fill btn-sm" onClick={() => { contactIntent(i.id); toast.show(`${i.id} 已标记为已联系`); }}>标记已联系</button>
                  : i.status === 'contacted'
                    ? <button className="btn btn-line btn-sm" onClick={() => { closeIntent(i.id); toast.show(`${i.id} 已关单`); }}>关单</button>
                    : <span className="xs">已关闭</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContentPanel({ toast }) {
  return (
    <>
      <div className="spec" style={{ marginBottom:24 }}>
        本周内容录入走「运营整理表格 → 批量导入」，不做完整 CMS。V1.1 接 B站/YouTube/Luma 开放接口自动同步。
      </div>
      <div className="steps">
        <div className="stp"><div className="n">Step 01</div><h4>整理表格</h4><p>标题、封面、时间、一句话简介、原始外链，五个字段就够。</p></div>
        <div className="stp"><div className="n">Step 02</div><h4>批量导入</h4><p>CSV 上传后生成外链卡片，课程/活动/黑客松共用同一组件。</p></div>
        <div className="stp"><div className="n">Step 03</div><h4>校对上线</h4><p>本周目标 20-30 条，剩下的上线后逐步补，不阻塞主线。</p></div>
      </div>
      <button className="btn btn-fill" style={{ marginTop:22 }} onClick={() => toast.show('原型演示：CSV 批量导入')}>上传 CSV</button>
    </>
  );
}
