// 详情弹层：按 kind 分发 课程 / 活动 / 黑客松 / 招聘（无插图，纯排版）
// spec v1.1 调整：
// - 课程详情：展示 subcategory + tags；表单字段必选/可选由 signup_fields_config 控制（CTA 文案）
// - 黑客松详情：spec §15.4 「参赛团队列表仅展示团队名与成员昵称，不展示手机号/邮箱」
//   （前端 ListPage / DetailModal 都不渲染联系方式，由后端 API 抹除双重保险）
// - 招聘详情：按 §15.1 contact 字段不展示
import React from 'react';
import { courses, events, hackathons, jobs } from '../data/index.js';
import { stateOf, ST } from '../utils/constants';
import { money, platformOf, dateOnly } from '../utils/format';

function MetaRow({ items }) {
  return <div className="meta">{items.map((t, i) => <span key={i}>{t}</span>)}</div>;
}

function CourseDetail({ c, onSignup, onPay, onToast }) {
  const s = stateOf(c.start_at, c.end_at);
  const isExt = c.content_source === 'external_link';
  const priceEl = c.price.type === 'free'
    ? <span className="free">免费</span>
    : <span className="pr">¥{money(c.price.amount)}</span>;

  const catLabel = c.category === 'Web3 技术' && c.subcategory
    ? `${c.category} · ${c.subcategory}`
    : c.category;

  const cta = isExt
    ? <button className="btn btn-line btn-lg" style={{ width:'100%' }} onClick={() => onToast(`跳转外链：${c.external_url}`)}>去 {platformOf(c.external_url)} 看原始内容 ↗</button>
    : c.price.type === 'free'
      ? <button className="btn btn-fill btn-lg" style={{ width:'100%' }} onClick={() => onSignup('course', c.id)}>免费报名，拿直播链接</button>
      : <button className="btn btn-fill btn-lg" style={{ width:'100%' }} onClick={() => onPay(c.id)}>报名 · ¥{money(c.price.amount)}{c.price.deposit ? `（可先付定金 ¥${c.price.deposit}）` : ''}</button>;

  const requiredCount = c.signup_fields_config
    ? Object.values(c.signup_fields_config).filter((v) => v === 'required').length
    : 0;

  return (
    <>
      <div className="mtop">
        <span className="c-cat">{catLabel}</span>
        <span className={'st ' + s}>{ST[s]}</span>
      </div>
      <h2>{c.title}</h2>
      <MetaRow items={[c.difficulty, c.form, `${dateOnly(c.start_at)} 开课`, `讲师 ${c.teacher}`]} />

      {c.tags && c.tags.length > 0 && (
        <div className="c-tags" style={{ margin:'12px 0 6px' }}>
          {c.tags.map((t, i) => <span key={i} className="tag">#{t}</span>)}
        </div>
      )}

      <p className="sm">{c.desc}</p>
      {c.outline.length ? (
        <>
          <div className="kick" style={{ margin:'30px 0 6px' }}>Syllabus</div>
          <ul className="olist">
            {c.outline.map(([a, b], i) => <li key={i}><b>{a}</b><span>{b}</span></li>)}
          </ul>
        </>
      ) : (
        <div className="spec">历史内容按需求 7.6 第一步处理：卡片 + 外链跳转，不搬运内容。</div>
      )}

      {!isExt && (
        <div className="spec" style={{ marginTop:16 }}>
          本课程报名{c.signup_review_required ? '需要审核' : '无需审核（公开）'} ·
          表单共 {requiredCount || '—'} 个必填字段（由运营在后台可调）
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', gap:22, marginTop:24 }}>
        <div>
          <div className="xs">价格</div>
          <div className="pr" style={{ fontSize:22 }}>{priceEl}</div>
        </div>
        <div style={{ flex:1 }}>{cta}</div>
      </div>
    </>
  );
}

function EventDetail({ e, onSignup, onToast }) {
  const s = stateOf(e.start_at, e.end_at);
  const isExt = e.content_source === 'external_link';
  const cta = isExt
    ? <button className="btn btn-line btn-lg" style={{ width:'100%' }} onClick={() => onToast(`跳转外链：${e.external_url}`)}>去 Luma 看原始记录 ↗</button>
    : s === 'past'
      ? <button className="btn btn-line btn-lg" style={{ width:'100%' }} disabled>活动已结束</button>
      : <button className="btn btn-fill btn-lg" style={{ width:'100%' }} onClick={() => onSignup('event', e.id)}>立即报名</button>;

  return (
    <>
      <div className="mtop">
        <span className="c-cat">{e.tag}</span>
        <span className={'st ' + s}>{ST[s]}</span>
      </div>
      <h2>{e.title}</h2>
      <MetaRow items={[e.type, e.city, dateOnly(e.start_at) + (e.end_at !== e.start_at ? ` – ${dateOnly(e.end_at)}` : '')]} />
      <p className="sm">{e.desc}</p>
      {e.agenda.length ? (
        <>
          <div className="kick" style={{ margin:'30px 0 6px' }}>Agenda</div>
          <ul className="olist">{e.agenda.map(([a, b], i) => <li key={i}><b>{a}</b><span>{b}</span></li>)}</ul>
        </>
      ) : (
        <div className="spec">历史活动按需求 7.6 第一步处理：卡片 + 跳转 Luma 原始页。</div>
      )}
      {!isExt && (
        <div className="spec" style={{ marginTop:16 }}>
          本活动报名{e.signup_review_required ? '需要审核' : '无需审核'}
        </div>
      )}
      <div style={{ marginTop:24 }}>{cta}</div>
    </>
  );
}

function HackDetail({ h, onSignup, onToast }) {
  const s = stateOf(h.start_at, h.end_at);
  const isExt = h.content_source === 'external_link';
  const cta = isExt
    ? <button className="btn btn-line btn-lg" style={{ width:'100%' }} onClick={() => onToast(`跳转外链：${h.external_url}`)}>去 DoraHacks 看原始赛事 ↗</button>
    : s === 'past'
      ? <button className="btn btn-line btn-lg" style={{ width:'100%' }} disabled>报名已截止</button>
      : <button className="btn btn-fill btn-lg" style={{ width:'100%' }} onClick={() => onSignup('hackathon', h.id)}>组队报名</button>;

  return (
    <>
      <div className="mtop">
        <span className="c-cat">{h.theme}</span>
        <span className={'st ' + s}>{ST[s]}</span>
      </div>
      <div className="xs">总奖金池</div>
      <div className="pool" style={{ fontSize:'clamp(38px,6vw,60px)' }}>${money(h.prize_pool_usd)}</div>
      <h2 style={{ marginTop:14 }}>{h.title}</h2>
      <MetaRow items={[`${dateOnly(h.start_at)} – ${dateOnly(h.end_at)}`, `报名截止 ${dateOnly(h.deadline)}`, `${h.tracks.length} 条赛道`]} />
      <p className="sm">{h.desc}</p>
      <div className="kick" style={{ margin:'30px 0 6px' }}>Tracks</div>
      {h.tracks.map((t, i) => <div key={i} className="trk"><span>{t.name}</span><b>${money(t.prize)}</b></div>)}
      {h.judging.length ? (
        <>
          <div className="kick" style={{ margin:'30px 0 6px' }}>Judging</div>
          {h.judging.map(([a, b], i) => <div key={i} className="trk"><span>{a}</span><b>{b}</b></div>)}
        </>
      ) : (
        <div className="spec">历史赛事按 7.6 第一步处理：卡片 + 外链跳转。</div>
      )}

      {!isExt && (
        <div className="spec" style={{ marginTop:16 }}>
          本赛事报名{h.signup_review_required ? '需要审核' : '无需审核'} ·
          公开团队列表仅展示团队名与成员昵称，不展示手机号/邮箱（spec §15.4 隐私原则）
        </div>
      )}

      <div style={{ marginTop:24 }}>{cta}</div>
    </>
  );
}

// spec §15.1 企业招聘信息：contact 仅运营可见，前台不展示
function JobDetail({ j, onSignup }) {
  return (
    <>
      <div className="mtop">
        <span className="c-cat">{j.role}</span>
        {j.remote ? <span className="lo">支持远程</span> : null}
        <span className="lo">{j.job_type || 'full_time'}</span>
      </div>
      <h2>{j.title}</h2>
      <MetaRow items={[j.company, j.city, j.salary_range].filter(Boolean)} />
      <p className="sm">{j.desc}</p>
      <div className="kick" style={{ margin:'30px 0 6px' }}>Requirements</div>
      <ul className="olist">{j.reqs.map((r, i) => <li key={i}><b>{`0${i+1}`}</b><span>{r}</span></li>)}</ul>
      <div className="spec" style={{ marginTop:16 }}>
        联系方式由平台代为触达（spec §15.1），企业联系后由运营转接，不会直接展示在前台。
      </div>
      <div style={{ marginTop:24 }}>
        <button className="btn btn-fill btn-lg" style={{ width:'100%' }} onClick={() => onSignup('job', j.id)}>投递简历</button>
      </div>
    </>
  );
}

export function DetailModal({ kind, id, onClose, onSignup, onPay, onToast }) {
  if (!kind || !id) return null;
  let body = null;
  if (kind === 'courses') {
    const c = courses.find((x) => x.id === id);
    if (!c) return null;
    body = <CourseDetail c={c} onSignup={onSignup} onPay={onPay} onToast={onToast} />;
  } else if (kind === 'events') {
    const e = events.find((x) => x.id === id);
    if (!e) return null;
    body = <EventDetail e={e} onSignup={onSignup} onToast={onToast} />;
  } else if (kind === 'hackathons') {
    const h = hackathons.find((x) => x.id === id);
    if (!h) return null;
    body = <HackDetail h={h} onSignup={onSignup} onToast={onToast} />;
  } else if (kind === 'jobs') {
    const j = jobs.find((x) => x.id === id);
    if (!j) return null;
    body = <JobDetail j={j} onSignup={onSignup} />;
  } else {
    return null;
  }
  return (
    <div className="mask on" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <button className="x" onClick={onClose} aria-label="关闭">✕</button>
        <div className="mb">{body}</div>
      </div>
    </div>
  );
}
