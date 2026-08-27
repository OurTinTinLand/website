// 个人中心：spec v1.1 §7.10 + §16
// - 16.1 拆分为「行动轨迹」+「交易记录」两个子栏目
// - 16.2 档案补 skill_tags / bio / social_links / resume_url（招聘板块展示用）
// - 16.3 技能标签与课程标签复用同一套
import React, { useState, useEffect } from 'react';
import { useStore, useToast } from '../state/store';
import { money } from '../utils/format';
import { useRoute } from '../utils/router';
import { dogUrl } from '../utils/constants';

const TABS = [
  ['trail',  '行动轨迹'],
  ['orders', '交易记录'],
  ['profile','我的档案'],
  ['intents','Token Hub 意向'],
];

export function MemberPage({ openLogin }) {
  const { session, orders, intents, mySignups, saveProfile, logout } = useStore();
  const toast = useToast();
  const { go } = useRoute();
  const [tab, setTab] = useState('trail');

  useEffect(() => {
    if (!session.logged) setTab('trail');
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
          <p className="lead">行动轨迹 + 交易记录 + 我的档案 · 信息一次填写写入档案，下次自动带出。</p>
        </div>

        <div className="subs">
          {TABS.map(([k, label]) => (
            <button key={k}
                    className={'sub' + (tab === k ? ' on' : '')}
                    onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>

        {tab === 'trail'   && <TrailTab signups={mySignup} />}
        {tab === 'orders'  && <OrdersTab mine={mine} toast={toast} />}
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

// spec §16.1 行动轨迹：我报名的课程/活动/黑客松、我投递的岗位、我的收藏
function TrailTab({ signups }) {
  const STATUS_LABEL = { course:'课程', event:'活动', hackathon:'黑客松', job:'投递' };

  if (!signups.length) {
    return (
      <div className="empty">
        <img src={dogUrl('dog-sleep')} alt="" />
        还没有行动记录，去看看课程和黑客松吧
        <br /><br />
        <button className="btn btn-fill" onClick={() => location.hash = '#/courses'}>浏览课程</button>
      </div>
    );
  }

  return (
    <>
      <span className="kick" style={{ marginBottom:14, display:'block' }}>Trail · 按时间倒序</span>
      <div className="tbl-scroll">
        <table className="t">
          <tbody>
            <tr><th>类型</th><th>名称</th><th>时间</th><th>状态</th></tr>
            {signups.map((s, i) => (
              <tr key={i}>
                <td>{STATUS_LABEL[s.kind] || s.kind}</td>
                <td>{s.title}</td>
                <td className="mono">{s.time}</td>
                <td><span className="bdg b-verified">{s.status === 'pending' ? '待审核' : s.status === 'verified' ? '已通过' : s.status === 'failed' ? '已拒绝' : s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// spec §16.1 交易记录：订单号、金额、状态、支付方式、对应课程/活动名称 · 支持导出
function OrdersTab({ mine, toast }) {
  const exportCsv = () => {
    if (!mine.length) return;
    const headers = ['订单号','项目','金额','支付方式','状态','顾问码','创建时间'];
    const rows = mine.map((o) => [
      o.id, o.item_title, o.amount, o.channel,
      o.status, o.advisor_code_sent ? '已发' : '未发', o.created_at,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `transactions-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  if (!mine.length) {
    return (
      <div className="empty">
        <img src={dogUrl('dog-sleep')} alt="" />
        还没有交易记录，付费课程会在支付后出现
      </div>
    );
  }

  return (
    <>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <span className="kick">Transactions · {mine.length} 笔</span>
        <button className="btn btn-line btn-sm" onClick={exportCsv}>导出 CSV</button>
      </div>
      <div className="tbl-scroll">
        <table className="t">
          <tbody>
            <tr>
              <th>订单号</th><th>项目</th><th>金额</th><th>支付方式</th><th>状态</th><th>顾问码</th>
            </tr>
            {mine.map((o) => (
              <tr key={o.id}>
                <td className="mono">{o.id}</td>
                <td>{o.item_title}</td>
                <td>¥{money(o.amount)}{o.is_deposit ? <span className="lo" style={{ marginLeft:6 }}>定金</span> : null}</td>
                <td><span className="xs">工行聚合</span></td>
                <td>
                  <span className={'bdg ' + (o.status === 'verified' ? 'b-verified' : o.status === 'failed' ? 'b-failed' : 'b-pending')}>
                    {o.status === 'verified' ? '已核实' : o.status === 'failed' ? '失败' : '待核实'}
                  </span>
                </td>
                <td>
                  {o.advisor_code_sent
                    ? <button className="lnk" onClick={() => toast.show('顾问微信二维码将在发放后展示')}>查看 →</button>
                    : <span className="xs">未发放</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// spec §16.2 个人信息完善：基础 / 自我介绍 / 简历 / 社交媒体 / 技能标签
function ProfileTab({ profile, method, email, saveProfile, logout, toast, onAfterLogout }) {
  const [skillInput, setSkillInput] = useState('');
  const profile2 = profile || {};
  const tags = Array.isArray(profile2.skill_tags) ? profile2.skill_tags : [];
  const social = profile2.social_links || {};

  const addTag = () => {
    const v = skillInput.trim();
    if (!v) return;
    if (tags.includes(v)) { setSkillInput(''); return; }
    if (tags.length >= 8) { toast.show('最多 8 个标签'); return; }
    saveProfile({ skill_tags: [...tags, v] });
    setSkillInput('');
  };

  const removeTag = (t) => {
    saveProfile({ skill_tags: tags.filter((x) => x !== t) });
  };

  return (
    <div className="fcard" style={{ maxWidth:640 }}>
      <div className="spec">基础信息 · 通用</div>
      <div className="fr"><label>登录方式</label><input value={method || ''} disabled /></div>
      <div className="fr"><label>邮箱</label><input value={email || ''} disabled /></div>
      <div className="fr"><label>姓名</label>
        <input id="pf-name" defaultValue={profile2.name} placeholder="报名时自动带出" />
      </div>
      <div className="fr"><label>手机号</label>
        <input id="pf-phone" defaultValue={profile2.phone} placeholder="仅活动通知用" />
      </div>
      <div className="fr"><label>所在城市</label>
        <input id="pf-city" defaultValue={profile2.city} placeholder="线下活动报名时带出" />
      </div>

      <div className="spec" style={{ marginTop:24 }}>招聘板块展示 · 可选</div>
      <div className="fr"><label>自我介绍</label>
        <textarea id="pf-bio" rows="3" defaultValue={profile2.bio} placeholder="一段话介绍你自己（招聘板块展示）" />
      </div>
      <div className="fr"><label>简历链接</label>
        <input id="pf-resume" defaultValue={profile2.resume_url} placeholder="https://（可选，仅用于求职场景）" />
      </div>
      <div className="fr"><label>GitHub</label>
        <input id="pf-github" defaultValue={social.github} placeholder="github.com/yourname" />
      </div>
      <div className="fr"><label>X (Twitter)</label>
        <input id="pf-x" defaultValue={social.x} placeholder="x.com/yourname" />
      </div>
      <div className="fr"><label>Telegram</label>
        <input id="pf-tg" defaultValue={social.telegram} placeholder="@yourname" />
      </div>
      <div className="fr"><label>LinkedIn</label>
        <input id="pf-li" defaultValue={social.linkedin} placeholder="linkedin.com/in/yourname" />
      </div>

      <div className="spec" style={{ marginTop:24 }}>技能标签 · 最多 8 个 · 与课程标签共用同一套</div>
      <div className="tags-row">
        {tags.map((t) => (
          <span key={t} className="tag with-x">#{t}<button onClick={() => removeTag(t)}>×</button></span>
        ))}
        <input
          id="pf-skill"
          placeholder="如 Solidity / LangChain / 社区运营"
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
          style={{ width:240 }}
        />
        <button className="btn btn-line btn-sm" onClick={addTag}>添加</button>
      </div>

      <button className="btn btn-fill btn-lg" style={{ width:'100%', marginTop:18 }} onClick={() => {
        saveProfile({
          name:     document.getElementById('pf-name').value,
          phone:    document.getElementById('pf-phone').value,
          city:     document.getElementById('pf-city').value,
          bio:      document.getElementById('pf-bio').value,
          resume_url: document.getElementById('pf-resume').value,
          social_links: {
            github:   document.getElementById('pf-github').value,
            x:        document.getElementById('pf-x').value,
            telegram: document.getElementById('pf-tg').value,
            linkedin: document.getElementById('pf-li').value,
          },
        });
        toast.show('档案已保存 · 招聘板块将同步展示公开字段');
      }}>保存</button>
      <button className="btn btn-line btn-lg" style={{ width:'100%', marginTop:10 }} onClick={() => {
        logout();
        toast.show('已退出登录');
        onAfterLogout();
      }}>退出登录</button>

      <div className="spec" style={{ marginTop:14 }}>
        隐私说明：手机号 / 邮箱仅对运营与审核可见；公开档案仅展示你主动填写的字段（招聘人才信息场景）。
      </div>
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
