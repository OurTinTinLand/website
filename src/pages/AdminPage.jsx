// 运营后台：3 subtab（订单核销 / 意向单跟进 / 内容录入）+ 鉴权闸门
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
    <div className="container page-section">
      <div className="sec-head">
        <div><span className="eyebrow">Admin · /admin</span><h2>运营后台（最简版）</h2></div>
        <div className="sec-desc">本周只做两件事：支付人工核销、意向单跟进。内容审核与数据看板放 V1.1。</div>
      </div>

      <div className="subtabs">
        {TABS.map(([k, label]) => (
          <button key={k}
                  className={'subtab' + (tab === k ? ' active' : '')}
                  onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'orders' && (isOps
        ? <OrdersPanel orders={orders} verifyOrder={verifyOrder} toast={toast} />
        : <Gate onDemo={() => { demoAdmin(); toast.show('已切换为运营身份（仅原型演示）'); }} />
      )}
      {tab === 'intents' && (isOps
        ? <IntentsPanel intents={intents} contactIntent={contactIntent} closeIntent={closeIntent} toast={toast} />
        : <Gate onDemo={() => { demoAdmin(); toast.show('已切换为运营身份（仅原型演示）'); }} />
      )}
      {tab === 'content' && (isOps
        ? <ContentPanel toast={toast} />
        : <Gate onDemo={() => { demoAdmin(); toast.show('已切换为运营身份（仅原型演示）'); }} />
      )}
    </div>
  );
}

function Gate({ onDemo }) {
  return (
    <div className="empty">
      <img src={dogUrl('dog-harness')} alt="" />
      运营后台需要管理员权限。<br />
      生产环境按 Supabase RLS + role 字段鉴权，前端路由同时做拦截。
      <br /><br />
      <button className="btn btn-primary" onClick={onDemo}>（演示）以运营身份进入</button>
    </div>
  );
}

function OrdersPanel({ orders, verifyOrder, toast }) {
  return (
    <React.Fragment>
      <div className="banner">
        <span>💡</span>
        <div>对照工商银行商户流水核对到账，点「标记已核实」后系统自动向用户发放课程顾问微信码。</div>
      </div>
      <div className="tbl-scroll">
        <table className="tbl">
          <tbody>
            <tr><th>订单号</th><th>用户</th><th>项目</th><th>金额</th><th>提交时间</th><th>状态</th><th>操作</th></tr>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="mono">{o.id}</td>
                <td>{o.user_email}</td>
                <td>{o.item_title}</td>
                <td>
                  ¥{money(o.amount)}{o.is_deposit ? <span className="badge b-pending" style={{ fontSize: 10, marginLeft: 4 }}>定金</span> : null}
                </td>
                <td className="mono" style={{ fontSize: 12 }}>{o.created_at}</td>
                <td>
                  <span className={`badge b-${o.status === 'pending_review' ? 'pending' : o.status === 'verified' ? 'verified' : 'failed'}`}>{o.status}</span>
                </td>
                <td>
                  {o.status === 'pending_review'
                    ? <button className="btn btn-pop btn-sm" onClick={() => { verifyOrder(o.id); toast.show(`${o.id} 已核实 · 顾问微信码已自动发放给 ${o.user_email}`); }}>
                        标记已核实
                      </button>
                    : <span className="note">{o.advisor_code_sent ? '✓ 顾问码已发放' : '—'}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </React.Fragment>
  );
}

function IntentsPanel({ intents, contactIntent, closeIntent, toast }) {
  return (
    <div className="tbl-scroll">
      <table className="tbl">
        <tbody>
          <tr><th>单号</th><th>用户</th><th>渠道</th><th>预计用量</th><th>联系方式</th><th>状态</th><th>操作</th></tr>
          {intents.map((i) => (
            <tr key={i.id}>
              <td className="mono">{i.id}</td>
              <td>{i.user_email}</td>
              <td>{i.provider}</td>
              <td>{i.expected_volume}</td>
              <td>{i.contact}</td>
              <td>
                <span className={`badge b-${i.status === 'pending' ? 'pending' : (i.status === 'contacted' ? 'verified' : 'failed')}`}>{i.status}</span>
              </td>
              <td>
                {i.status === 'pending'
                  ? <button className="btn btn-pop btn-sm" onClick={() => { contactIntent(i.id); toast.show(`${i.id} 已标记为已联系`); }}>标记已联系</button>
                  : i.status === 'contacted'
                    ? <button className="btn btn-outline btn-sm" onClick={() => { closeIntent(i.id); toast.show(`${i.id} 已关单`); }}>关单</button>
                    : <span className="note">已关闭</span>}
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
    <React.Fragment>
      <div className="banner">
        <span>ℹ</span>
        <div>本周内容录入走「运营整理表格 → 批量导入」，不做完整 CMS。V1.1 接 B站/YouTube/Luma 开放接口自动同步。</div>
      </div>
      <div className="steps">
        <div className="step">
          <div className="no">01</div>
          <h4 style={{ margin:'8px 0 6px' }}>整理表格</h4>
          <p className="sec-desc" style={{ fontSize: 13 }}>标题、封面、时间、一句话简介、原始外链，5 个字段即可。</p>
        </div>
        <div className="step">
          <div className="no">02</div>
          <h4 style={{ margin:'8px 0 6px' }}>批量导入</h4>
          <p className="sec-desc" style={{ fontSize: 13 }}>CSV 上传后生成外链卡片，课程/活动/黑客松三个板块共用同一个组件。</p>
        </div>
        <div className="step">
          <div className="no">03</div>
          <h4 style={{ margin:'8px 0 6px' }}>校对上线</h4>
          <p className="sec-desc" style={{ fontSize: 13 }}>目标本周 20-30 条，剩余上线后逐步补充，不阻塞主线。</p>
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <button className="btn btn-primary" onClick={() => toast.show('原型演示：CSV 批量导入入口')}>上传 CSV</button>
      </div>
    </React.Fragment>
  );
}
