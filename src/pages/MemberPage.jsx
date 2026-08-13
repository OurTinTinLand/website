// 个人中心：orders / profile / Token Hub intents
import React, { useState, useEffect } from 'react';
import { useStore, useToast } from '../state/store';
import { money } from '../utils/format';
import { useRoute } from '../utils/router';
import { dogUrl } from '../utils/constants';

const TABS = [['orders','报名与订单'], ['profile','我的档案'], ['intents','Token Hub 意向']];

export function MemberPage({ openLogin }) {
  const { session, orders, intents, mySignups, saveProfile, logout } = useStore();
  const toast = useToast();
  const { go } = useRoute();
  const [tab, setTab] = useState('orders');

  useEffect(() => {
    if (!session.logged) setTab('orders');
  }, [session.logged]);

  const mine      = orders.filter((o) => o.user_email === session.email);
  const mySignup  = mySignups.filter((s) => !s.user_id || s.user_id === session.user_id);
  const myIntents = intents.filter((i) => i.user_email === session.email);

  if (!session.logged) {
    return (
      <section className="page page-section">
        <div className="wrap">
          <div className="sec-h">
            <div><span className="kick">Member</span><h2 className="t2">个人中心</h2></div>
            <p className="lead">登录后可见。报名信息一次填写写入档案，下次自动带出。</p>
          </div>
          <div className="empty">
            <img src={dogUrl('dog-sleep')} alt="" />
            还没登录，登录后才能看到你的报名与订单
            <br /><br />
            <button className="btn btn-fill" onClick={() => openLogin(() => go('member'))}>去登录</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page page-section">
      <div className="wrap">
        <div className="sec-h">
          <div><span className="kick">Member</span><h2 className="t2">个人中心</h2></div>
          <p className="lead">报名信息一次填写写入档案，下次自动带出。</p>
        </div>

        <div className="subs">
          {TABS.map(([k, label]) => (
            <button key={k}
                    className={'sub' + (tab === k ? ' on' : '')}
                    onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>

        {tab === 'orders' && <OrdersTab mine={mine} signups={mySignup} />}
        {tab === 'profile' && (
          <ProfileTab profile={session.profile} method={session.method} email={session.email}
                      saveProfile={saveProfile} logout={logout} toast={toast}
                      onAfterLogout={() => go('home')} />
        )}
        {tab === 'intents' && <IntentsTab intents={myIntents} />}
      </div>
    </section>
  );
}

function OrdersTab({ mine, signups }) {
  const openAdvisor = () => {
    document.getElementById('payBody') || document.getElementById('formBody');
    alert('（演示）顾问微信二维码占位');
  };

  const STATUS_LABEL = { course:'课程', event:'活动', hackathon:'黑客松', job:'投递' };

  if ((!mine.length) && (!signups.length)) {
    return (
      <div className="empty">
        <img src={dogUrl('dog-sleep')} alt="" />
        还没有报名记录，去看看课程和黑客松吧
        <br /><br />
        <button className="btn btn-fill" onClick={() => location.hash = '#/courses'}>浏览课程</button>
      </div>
    );
  }

  return (
    <>
      {mine.length > 0 && (
        <>
          <span className="kick" style={{ marginBottom:14, display:'block' }}>Orders</span>
          <div className="tbl-scroll">
            <table className="t">
              <tbody>
                <tr><th>订单号</th><th>项目</th><th>金额</th><th>状态</th><th>顾问码</th></tr>
                {mine.map((o) => (
                  <tr key={o.id}>
                    <td className="mono">{o.id}</td>
                    <td>{o.item_title}</td>
                    <td>¥{money(o.amount)}{o.is_deposit ? <span className="lo" style={{ marginLeft:6 }}>定金</span> : null}</td>
                    <td>
                      <span className={'bdg ' + (o.status === 'verified' ? 'b-verified' : o.status === 'failed' ? 'b-failed' : 'b-pending')}>{o.status}</span>
                    </td>
                    <td>
                      {o.advisor_code_sent
                        ? <button className="lnk" onClick={openAdvisor}>查看 →</button>
                        : <span className="xs">核销后自动发</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {signups.length > 0 && (
        <>
          <span className="kick" style={{ margin:'34px 0 14px', display:'block' }}>Signups</span>
          <div className="tbl-scroll">
            <table className="t">
              <tbody>
                <tr><th>类型</th><th>名称</th><th>时间</th><th>状态</th></tr>
                {signups.map((s, i) => (
                  <tr key={i}>
                    <td>{STATUS_LABEL[s.kind] || s.kind}</td>
                    <td>{s.title}</td>
                    <td className="mono">{s.time}</td>
                    <td><span className="bdg b-verified">{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function ProfileTab({ profile, method, email, saveProfile, logout, toast, onAfterLogout }) {
  return (
    <div className="fcard" style={{ maxWidth:520 }}>
      <div className="fr"><label>登录方式</label><input value={method} disabled /></div>
      <div className="fr"><label>邮箱</label><input value={email} disabled /></div>
      <div className="fr"><label>姓名</label>
        <input id="pf-name" defaultValue={profile.name} placeholder="报名时自动带出" />
      </div>
      <div className="fr"><label>手机号</label>
        <input id="pf-phone" defaultValue={profile.phone} placeholder="仅活动通知用" />
      </div>
      <div className="fr"><label>所在城市</label>
        <input id="pf-city" defaultValue={profile.city} placeholder="线下活动报名时带出" />
      </div>
      <div className="fr"><label>GitHub</label>
        <input id="pf-github" defaultValue={profile.github} placeholder="黑客松与投递时带出" />
      </div>
      <button className="btn btn-fill btn-lg" style={{ width:'100%', marginTop:10 }} onClick={() => {
        saveProfile({
          name:   document.getElementById('pf-name').value,
          phone:  document.getElementById('pf-phone').value,
          city:   document.getElementById('pf-city').value,
          github: document.getElementById('pf-github').value,
        });
        toast.show('档案已保存，下次报名自动带出');
      }}>保存</button>
      <button className="btn btn-line btn-lg" style={{ width:'100%', marginTop:10 }} onClick={() => {
        logout();
        toast.show('已退出登录');
        onAfterLogout();
      }}>退出登录</button>
      <div className="spec">UserProfile.extensions：event_intake / hackathon_intake 等场景字段按需扩展，不在注册环节收集。</div>
    </div>
  );
}

function IntentsTab({ intents }) {
  if (!intents.length) {
    return (
      <div className="empty">
        <img src={dogUrl('dog-sleep')} alt="" />
        还没提交过 Token Hub 意向单
        <br /><br />
        <button className="btn btn-fill" onClick={() => location.hash = '#/tokenhub'}>去看看渠道</button>
      </div>
    );
  }
  return (
    <div className="tbl-scroll">
      <table className="t">
        <tbody>
          <tr><th>单号</th><th>渠道</th><th>预计用量</th><th>状态</th></tr>
          {intents.map((i) => (
            <tr key={i.id}>
              <td className="mono">{i.id}</td>
              <td>{i.provider}</td>
              <td>{i.expected_volume}</td>
              <td><span className={'bdg ' + (i.status === 'pending' ? 'b-pending' : i.status === 'contacted' ? 'b-verified' : 'b-failed')}>{i.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
