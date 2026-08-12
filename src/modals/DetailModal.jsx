// 详情弹层：按 kind 分发 课程 / 活动 / 黑客松 / 招聘
// 路由驱动：当 route.detailId 存在时挂载；关闭时回退到列表页 hash
import React from 'react';
import { useStore, useToast } from '../state/store';
import { courses, events, hackathons, jobs } from '../data/index.js';
import { COVERS, DOGS, dogUrl, stateOf, ST } from '../utils/constants';
import { money, badgeClass, badgeText, esc, platformOf } from '../utils/format';

function CoverPills({ pills }) {
  return (
    <div style={{ display:'flex', gap:7 }}>
      {pills.map((p, i) => <span key={i} className={p.cls || 'tagpill'}>{p.text}</span>)}
    </div>
  );
}

function CourseDetail({ c, onSignup, onPay, onToast }) {
  const s = stateOf(c.start_at, c.end_at);
  const isExt = c.content_source === 'external_link';
  const priceEl = c.price.type === 'free'
    ? <span className="free">免费</span>
    : `¥${money(c.price.amount)}`;

  const cta = isExt
    ? <button className="btn btn-pop btn-lg" style={{ width:'100%' }} onClick={() => onToast(`跳转外链：${c.external_url}`)}>去 {platformOf(c.external_url)} 观看原始内容 ↗</button>
    : (c.price.type === 'free'
        ? <button className="btn btn-primary btn-lg" style={{ width:'100%' }} onClick={() => onSignup('course', c.id)}>免费报名，获取直播链接</button>
        : <button className="btn btn-primary btn-lg" style={{ width:'100%' }} onClick={() => onPay(c.id)}>
            立即报名 · ¥{money(c.price.amount)}{c.price.deposit ? `（可先付定金 ¥${c.price.deposit}）` : ''}
          </button>);

  return (
    <React.Fragment>
      <h2 style={{ fontSize:23 }}>{c.title}</h2>
      <div className="mmeta">
        <span>{c.difficulty}</span>
        <span>{c.form}</span>
        <span>{c.start_at} 开课</span>
        <span>讲师：{c.teacher}</span>
        <span>{isExt ? '内容托管在站外' : '站内自建'}</span>
      </div>
      <p className="sec-desc" style={{ maxWidth:'none' }}>{c.desc}</p>
      {c.outline.length ? (
        <React.Fragment>
          <h4 style={{ margin:'20px 0 4px' }}>课程大纲</h4>
          <ul className="outline-list">
            {c.outline.map(([k, v], i) => (
              <li key={i}><b>{k}</b><span>{v}</span></li>
            ))}
          </ul>
        </React.Fragment>
      ) : (
        <div className="spec">历史内容按需求文档 7.6 第一步处理：卡片 + 外链跳转，不搬运内容。</div>
      )}
      <div style={{ display:'flex', alignItems:'center', gap:14, margin:'22px 0 0' }}>
        <div><div className="note">价格</div><div className="price">{priceEl}</div></div>
        <div style={{ flex:1 }}>{cta}</div>
      </div>
    </React.Fragment>
  );
}

function EventDetail({ e, onSignup, onToast }) {
  const s = stateOf(e.start_at, e.end_at);
  const isExt = e.content_source === 'external_link';

  const cta = isExt
    ? <button className="btn btn-pop btn-lg" style={{ width:'100%' }} onClick={() => onToast(`跳转外链：${e.external_url}`)}>去 Luma 查看原始记录 ↗</button>
    : (s === 'past'
        ? <button className="btn btn-outline btn-lg" style={{ width:'100%' }} disabled>活动已结束</button>
        : <button className="btn btn-primary btn-lg" style={{ width:'100%' }} onClick={() => onSignup('event', e.id)}>立即报名</button>);

  return (
    <React.Fragment>
      <h2 style={{ fontSize:23 }}>{e.title}</h2>
      <div className="mmeta">
        <span>{e.type}</span>
        <span>📍 {e.city}</span>
        <span>{e.start_at}{e.end_at !== e.start_at ? ' – ' + e.end_at : ''}</span>
      </div>
      <p className="sec-desc" style={{ maxWidth:'none' }}>{e.desc}</p>
      {e.agenda.length ? (
        <React.Fragment>
          <h4 style={{ margin:'20px 0 4px' }}>日程</h4>
          <ul className="outline-list">
            {e.agenda.map(([k, v], i) => <li key={i}><b>{k}</b><span>{v}</span></li>)}
          </ul>
        </React.Fragment>
      ) : (
        <div className="spec">历史活动按需求文档 7.6 第一步处理：卡片 + 跳转 Luma 原始页面。</div>
      )}
      <div style={{ marginTop:22 }}>{cta}</div>
    </React.Fragment>
  );
}

function HackDetail({ h, onSignup, onToast }) {
  const s = stateOf(h.start_at, h.end_at);
  const isExt = h.content_source === 'external_link';

  const cta = isExt
    ? <button className="btn btn-pop btn-lg" style={{ width:'100%' }} onClick={() => onToast(`跳转外链：${h.external_url}`)}>去 DoraHacks 查看原始赛事 ↗</button>
    : (s === 'past'
        ? <button className="btn btn-outline btn-lg" style={{ width:'100%' }} disabled>报名已截止</button>
        : <button className="btn btn-primary btn-lg" style={{ width:'100%' }} onClick={() => onSignup('hackathon', h.id)}>组队报名</button>);

  return (
    <React.Fragment>
      <div className="note">总奖金池</div>
      <div className="prize" style={{ fontSize:40 }}>${money(h.prize_pool_usd)}</div>
      <h2 style={{ fontSize:23, marginTop:6 }}>{h.title}</h2>
      <div className="mmeta">
        <span>{h.start_at} – {h.end_at}</span>
        <span>报名截止 {h.deadline}</span>
        <span>{h.tracks.length} 条赛道</span>
      </div>
      <p className="sec-desc" style={{ maxWidth:'none' }}>{h.desc}</p>
      <h4 style={{ margin:'20px 0 10px' }}>赛道与奖金</h4>
      {h.tracks.map((t, i) => (
        <div key={i} className="trackbox">
          <span>{t.name}</span><b>${money(t.prize)}</b>
        </div>
      ))}
      {h.judging.length ? (
        <React.Fragment>
          <h4 style={{ margin:'20px 0 10px' }}>评审标准</h4>
          {h.judging.map(([k, v], i) => (
            <div key={i} className="trackbox"><span>{k}</span><b>{v}</b></div>
          ))}
        </React.Fragment>
      ) : (
        <div className="spec">历史黑客松按 7.6 第一步处理：卡片 + 外链跳转 DoraHacks。</div>
      )}
      <div style={{ marginTop:22 }}>{cta}</div>
    </React.Fragment>
  );
}

function JobDetail({ j, onSignup }) {
  return (
    <React.Fragment>
      <h2 style={{ fontSize:23 }}>{j.title}</h2>
      <div className="mmeta">
        <span>{j.company}</span>
        <span>📍 {j.city}</span>
      </div>
      <p className="sec-desc" style={{ maxWidth:'none' }}>{j.desc}</p>
      <h4 style={{ margin:'20px 0 4px' }}>岗位要求</h4>
      <ul className="outline-list">
        {j.reqs.map((r, i) => (
          <li key={i}><b>0{i + 1}</b><span>{r}</span></li>
        ))}
      </ul>
      <div style={{ marginTop:22 }}>
        <button className="btn btn-primary btn-lg" style={{ width:'100%' }} onClick={() => onSignup('job', j.id)}>投递简历</button>
      </div>
    </React.Fragment>
  );
}

// props:
//   kind: 'courses' | 'events' | 'hackathons' | 'jobs'
//   id: 详情 id
//   onClose: () => void         关闭详情，调用方负责回退 hash
//   onSignup: (kind, id) => void  报名（未登录会触发登录回填）
//   onPay: (courseId) => void
//   onToast: (msg) => void
export function DetailModal({ kind, id, onClose, onSignup, onPay, onToast }) {
  if (!kind || !id) return null;

  let item = null;
  let body = null;
  let coverCls = '';
  let coverInner = null;

  if (kind === 'courses') {
    item = courses.find((x) => x.id === id);
    if (!item) return null;
    const s = stateOf(item.start_at, item.end_at);
    coverCls = COVERS[item.cover];
    coverInner = (
      <React.Fragment>
        <CoverPills pills={[
          { text: item.category },
          { text: ST[s], cls: badgeClass(s) },
        ]} />
        <img className="cw" src={dogUrl(DOGS[item.dog])} alt="" />
      </React.Fragment>
    );
    body = <CourseDetail c={item} onSignup={onSignup} onPay={onPay} onToast={onToast} />;
  } else if (kind === 'events') {
    item = events.find((x) => x.id === id);
    if (!item) return null;
    const s = stateOf(item.start_at, item.end_at);
    coverCls = COVERS[item.cover];
    coverInner = (
      <React.Fragment>
        <CoverPills pills={[
          { text: item.tag },
          { text: ST[s], cls: badgeClass(s) },
        ]} />
        <img className="cw" src={dogUrl(DOGS[item.dog])} alt="" />
      </React.Fragment>
    );
    body = <EventDetail e={item} onSignup={onSignup} onToast={onToast} />;
  } else if (kind === 'hackathons') {
    item = hackathons.find((x) => x.id === id);
    if (!item) return null;
    const s = stateOf(item.start_at, item.end_at);
    coverCls = COVERS[item.cover];
    coverInner = (
      <React.Fragment>
        <CoverPills pills={[
          { text: item.theme },
          { text: ST[s], cls: badgeClass(s) },
        ]} />
        <img className="cw" src={dogUrl(DOGS[item.dog])} alt="" />
      </React.Fragment>
    );
    body = <HackDetail h={item} onSignup={onSignup} onToast={onToast} />;
  } else if (kind === 'jobs') {
    item = jobs.find((x) => x.id === id);
    if (!item) return null;
    coverCls = 'cv3';
    coverInner = (
      <React.Fragment>
        <CoverPills pills={[
          { text: item.role },
          ...(item.remote ? [{ text: '支持远程', cls: 'tagpill', style: { background:'#BFF3DE' } }] : []),
        ]} />
        <img className="cw" src={dogUrl('dog-harness')} alt="" />
      </React.Fragment>
    );
    body = <JobDetail j={item} onSignup={onSignup} />;
  } else {
    return null;
  }

  return (
    <div className="mask on" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <button className="mclose" onClick={onClose}>✕</button>
        <div className={'mcover ' + coverCls}>{coverInner}</div>
        <div className="mbody">{body}</div>
      </div>
    </div>
  );
}
