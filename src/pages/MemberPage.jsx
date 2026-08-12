// 个人中心：3 subtab（订单 / 档案 / Token Hub 意向）+ 未登录引导
import React, { useState, useEffect } from 'react';
import { useStore, useToast } from '../state/store';
import { money } from '../utils/format';
import { useRoute } from '../utils/router';
import { dogUrl } from '../utils/constants';

const TABS = [['orders','我的报名 / 订单'], ['profile','我的档案'], ['intents','我的 Token Hub 意向']];

export function MemberPage({ openLogin }) {
  const { session, orders, intents, mySignups, saveProfile, logout } = useStore();
  const toast = useToast();
  const { go } = useRoute();
  const [tab, setTab] = useState('orders');

  // 未登录时强制显示 orders tab（避免空白）
  useEffect(() => {
    if (!session.logged) setTab('orders');
  }, [session.logged]);

  const mine      = orders.filter((o) => o.user_email === session.email);
  const mySignup  = mySignups.filter((s) => !s.user_id || s.user_id === session.user_id);
  const myIntents = intents.filter((i) => i.user_email === session.email);

  return (
    <div className="container" style={{ padding:'44px 28px 60px' }}>
      <div className="sec-head">
        <div><span className="eyebrow">Member · /member</span><h2>个人中心</h2></div>
        <div className="sec-desc">登录后可见。报名信息一次填写写入档案，下次自动带出。</div>
      </div>

      {!session.logged
        ? (
          <div className="empty">
            <img src={dogUrl('dog-sleep')} alt="" />
            还没登录，登录后才能看到你的报名与订单
            <br /><br />
            <button className="btn btn-primary" onClick={() => openLogin(() => go('member'))}>去登录</button>
          </div>
        )
        : (
          <React.Fragment>
            <div className="subtabs">
              {TABS.map(([k, label], i) => (
                <button key={k}
                        className={'subtab' + (tab === k ? ' active' : '')}
                        onClick={() => setTab(k)}>{label}</button>
              ))}
            </div>

            {tab === 'orders' && (
              <OrdersTab mine={mine} signups={mySignup} />
            )}

            {tab === 'profile' && (
              <ProfileTab profile={session.profile} method={session.method} email={session.email}
                          saveProfile={saveProfile} logout={logout} toast={toast}
                          onAfterLogout={() => go('home')} />
            )}

            {tab === 'intents' && (
              <IntentsTab intents={myIntents} go={go} />
            )}
          </React.Fragment>
        )}
    </div>
  );
}

function OrdersTab({ mine, signups }) {
  const openAdvisor = () => alert('（演示）顾问微信二维码占位');
  if ((!mine.length) && (!signups.length)) {
    return (
      <div className="empty">
        <img src={dogUrl('dog-sleep')} alt="" />
        还没有报名记录，去看看课程和黑客松吧
        <br /><br />
        <button className="btn btn-primary" onClick={() => location.hash = '#/courses'}>浏览课程</button>
      </div>
    );
  }
  const STATUS_LABEL = { course:'课程', event:'活动', hackathon:'黑客松', job:'投递' };
  return (
    <React.Fragment>
      {mine.length > 0 && (
        <React.Fragment>
          <h4 style={{ marginBottom: 10 }}>付费订单</h4>
          <table className="tbl">
            <tbody>
              <tr><th>订单号</th><th>项目</th><th>金额</th><th>状态</th><th>顾问码</th></tr>
              {mine.map((o) => (
                <tr key={o.id}>
                  <td className="mono">{o.id}</td>
                  <td>{o.item_title}</td>
                  <td>¥{money(o.amount)}{o.is_deposit ? <span className="note">（定金）</span> : null}</td>
                  <td><span className={`badge b-${o.status === 'pending_review' ? 'pending' : o.status === 'verified' ? 'verified' : 'failed'}`}>{o.status}</span></td>
                  <td>{o.advisor_code_sent ? <button className="btn btn-outline btn-sm" onClick={openAdvisor}>查看顾问码</button> : <span className="note">核销后自动发放</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </React.Fragment>
      )}
      {signups.length > 0 && (
        <React.Fragment>
          <h4 style={{ margin:'22px 0 10px' }}>我的报名</h4>
          <table className="tbl">
            <tbody>
              <tr><th>类型</th><th>名称</th><th>时间</th><th>状态</th></tr>
              {signups.map((s, i) => (
                <tr key={i}>
                  <td>{STATUS_LABEL[s.kind]}</td>
                  <td>{s.title}</td>
                  <td className="mono">{s.time}</td>
                  <td><span className="badge b-verified">{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </React.Fragment>
      )}
    </React.Fragment>
  );
}

function ProfileTab({ profile, method, email, saveProfile, logout, toast, onAfterLogout }) {
  return (
    <div className="formcard" style={{ maxWidth: 480 }}>
      <div className="frow"><label>登录方式</label><input value={method} disabled /></div>
      <div className="frow"><label>邮箱</label><input value={email} disabled /></div>
      <div className="frow"><label>姓名</label>
        <input id="pf-name" defaultValue={profile.name} placeholder="报名时会自动带出" />
      </div>
      <div className="frow"><label>手机号</label>
        <input id="pf-phone" defaultValue={profile.phone} placeholder="仅活动通知用" />
      </div>
      <div className="frow"><label>所在城市</label>
        <input id="pf-city" defaultValue={profile.city} placeholder="线下活动报名时自动带出" />
      </div>
      <div className="frow"><label>GitHub</label>
        <input id="pf-github" defaultValue={profile.github} placeholder="黑客松与投递时自动带出" />
      </div>
      <button className="btn btn-primary" style={{ width:'100%' }} onClick={() => {
        saveProfile({
          name:   document.getElementById('pf-name').value,
          phone:  document.getElementById('pf-phone').value,
          city:   document.getElementById('pf-city').value,
          github: document.getElementById('pf-github').value,
        });
        toast.show('档案已保存，下次报名自动带出');
      }}>保存档案</button>
      <button className="btn btn-outline" style={{ width:'100%', marginTop: 9 }} onClick={() => {
        logout();
        toast.show('已退出登录');
        onAfterLogout();
      }}>退出登录</button>
      <div className="spec">UserProfile.extensions：event_intake / hackathon_intake 等场景字段，报名时按需扩展，不在注册环节收集。</div>
    </div>
  );
}

function IntentsTab({ intents, go }) {
  if (!intents.length) {
    return (
      <div className="empty">
        <img src={dogUrl('dog-sleep')} alt="" />
        还没有提交过 Token Hub 意向单
        <br /><br />
        <button className="btn btn-primary" onClick={() => go('tokenhub')}>去看看渠道</button>
      </div>
    );
  }
  return (
    <table className="tbl">
      <tbody>
        <tr><th>单号</th><th>渠道</th><th>预计用量</th><th>状态</th></tr>
        {intents.map((i) => (
          <tr key={i.id}>
            <td className="mono">{i.id}</td>
            <td>{i.provider}</td>
            <td>{i.expected_volume}</td>
            <td><span className={`badge b-${i.status === 'pending' ? 'pending' : 'verified'}`}>{i.status}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
