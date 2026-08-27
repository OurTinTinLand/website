// 详情弹层：按 kind 分发 课程 / 活动 / 黑客松 / 招聘（无插图，纯排版）
// spec v1.1 调整：
// - 课程详情：展示 subcategory + tags；表单字段必选/可选由 signup_fields_config 控制（CTA 文案）
// - 黑客松详情：spec §15.4 「参赛团队列表仅展示团队名与成员昵称，不展示手机号/邮箱」
//   （前端 ListPage / DetailModal 都不渲染联系方式，由后端 API 抹除双重保险）
// - 招聘详情：按 §15.1 contact 字段不展示
import React from 'react';
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
      ) : null}

      {!isExt && (
        <div className="spec" style={{ marginTop:16 }}>
          本课程报名{c.signup_review_required ? '需要审核' : '无需审核'} ·
          表单共 {requiredCount || '—'} 个必填字段
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
      ) : null}
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
      ) : null}

      {!isExt && (
        <div className="spec" style={{ marginTop:16 }}>
          本赛事报名{h.signup_review_required ? '需要审核' : '无需审核'} ·
          公开团队列表仅展示团队名与成员昵称，不展示手机号或邮箱
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
        联系方式由平台代为触达，企业联系后由我们转接，不会直接展示在前台。
      </div>
      <div style={{ marginTop:24 }}>
        <button className="btn btn-fill btn-lg" style={{ width:'100%' }} onClick={() => onSignup('job', j.id)}>投递简历</button>
      </div>
    </>
  );
}

// spec §15.1 企业招聘信息（job_postings 表）· contact 已在 API 层抹除（§15.3）
function JobPostingDetail({ j, onSignup, onToast }) {
  const jt = { full_time:'全职', part_time:'兼职', intern:'实习' };
  const reqs = (typeof j.requirements === 'string' && j.requirements)
    ? j.requirements.split('\n').map((s) => s.trim()).filter(Boolean)
    : (Array.isArray(j.requirements) ? j.requirements : []);
  return (
    <>
      <div className="mtop">
        <span className="c-cat">{j.company_name}</span>
        {j.remote ? <span className="lo">支持远程</span> : null}
        <span className="lo">{jt[j.job_type] || j.job_type || '全职'}</span>
      </div>
      <h2>{j.title}</h2>
      <MetaRow items={[j.location || '地点面议', j.salary_range].filter(Boolean)} />
      <p className="sm">{j.description}</p>
      {(j.tags || []).length > 0 && (
        <div className="c-tags" style={{ margin:'12px 0 6px' }}>
          {j.tags.map((t, i) => <span key={i} className="tag">#{t}</span>)}
        </div>
      )}
      {reqs.length > 0 && (
        <>
          <div className="kick" style={{ margin:'30px 0 6px' }}>Requirements</div>
          <ul className="olist">{reqs.map((r, i) => <li key={i}><b>{`0${i+1}`}</b><span>{r}</span></li>)}</ul>
        </>
      )}
      <div className="spec" style={{ marginTop:16 }}>
        简历由平台收集后转发企业，联系方式不会直接展示在前台（spec §15.1 隐私处理）。
      </div>
      <div style={{ marginTop:24 }}>
        <button className="btn btn-fill btn-lg" style={{ width:'100%' }} onClick={() => onSignup('job-posting', j.id)}>投递简历</button>
      </div>
    </>
  );
}

// spec §15.2 / §15.3 人才信息：前台仅展示用户公开填写的字段，
// contact 永不展示 —— 企业通过平台发起联系，系统代为触达
function TalentDetail({ t, onContact, onToast }) {
  return (
    <>
      <div className="mtop">
        <span className="c-cat">{t.expected_role || '求职者'}</span>
        <span className="lo">求职中</span>
      </div>
      <h2>{t.nickname}</h2>
      <MetaRow items={[t.expected_city || '城市不限', t.expected_salary].filter(Boolean)} />
      {t.work_experience && (
        <>
          <div className="kick" style={{ margin:'30px 0 6px' }}>工作经历</div>
          <p className="sm">{t.work_experience}</p>
        </>
      )}
      {(t.skill_tags || []).length > 0 && (
        <div className="c-tags" style={{ margin:'12px 0 6px' }}>
          {t.skill_tags.map((tag, i) => <span key={i} className="tag">#{tag}</span>)}
        </div>
      )}
      {t.bio && (
        <>
          <div className="kick" style={{ margin:'30px 0 6px' }}>自我介绍</div>
          <p className="sm">{t.bio}</p>
        </>
      )}
      {t.resume_url && (
        <div style={{ marginTop:14 }}>
          <a className="lnk" href={t.resume_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>简历 / 个人主页 ↗</a>
        </div>
      )}
      <div className="spec" style={{ marginTop:16 }}>
        联系方式不对外公开。企业发起联系后，由平台代为转达，避免隐私被直接抓取（spec §15.3）。
      </div>
      <div style={{ marginTop:24 }}>
        <button className="btn btn-fill btn-lg" style={{ width:'100%' }} onClick={() => onContact(t.id)}>发起联系</button>
      </div>
    </>
  );
}

export function DetailModal({ kind, id, data, onClose, onSignup, onPay, onToast, onContact }) {
  if (!kind || !id) return null;
  let body = null;
  if (kind === 'courses') {
    const c = data.courses.find((x) => x.id === id);
    if (!c) return null;
    body = <CourseDetail c={c} onSignup={onSignup} onPay={onPay} onToast={onToast} />;
  } else if (kind === 'events') {
    const e = data.events.find((x) => x.id === id);
    if (!e) return null;
    body = <EventDetail e={e} onSignup={onSignup} onToast={onToast} />;
  } else if (kind === 'hackathons') {
    const h = data.hackathons.find((x) => x.id === id);
    if (!h) return null;
    body = <HackDetail h={h} onSignup={onSignup} onToast={onToast} />;
  } else if (kind === 'jobs') {
    // §15 招聘详情三查：job_postings（新表）→ talent_profiles（新表）→ 旧 jobs（兼容）
    const jp = data.jobPostings ? data.jobPostings.find((x) => x.id === id) : null;
    if (jp) {
      body = <JobPostingDetail j={jp} onSignup={onSignup} onToast={onToast} />;
    } else {
      const t = data.talents ? data.talents.find((x) => x.id === id) : null;
      if (t) {
        body = <TalentDetail t={t} onContact={onContact} onToast={onToast} />;
      } else {
        const j = data.jobs.find((x) => x.id === id);
        if (!j) return null;
        body = <JobDetail j={j} onSignup={onSignup} />;
      }
    }
  } else if (kind === 'job-posting') {
    const j = data.jobPostings.find((x) => x.id === id);
    if (!j) return null;
    body = <JobPostingDetail j={j} onSignup={onSignup} onToast={onToast} />;
  } else if (kind === 'talent') {
    const t = data.talents.find((x) => x.id === id);
    if (!t) return null;
    body = <TalentDetail t={t} onContact={onContact} onToast={onToast} />;
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
