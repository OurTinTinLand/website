// 通用排版卡片：按 kind 渲染 课程 / 活动 / 黑客松 三种
// 与 claude.html 同：无插图，靠字号、间距、颜色梯度线作为视觉差
import React, { Fragment } from 'react';
import { stateOf, ST } from '../utils/constants';
import { money } from '../utils/format';

function CourseCard({ c, onOpen }) {
  const s = stateOf(c.start_at, c.end_at);
  const p = c.price.type === 'free'
    ? <span className="free">免费</span>
    : <Fragment>¥{money(c.price.amount)}</Fragment>;
  return (
    <div className="card" onClick={() => onOpen(c.id)}>
      <div className="c-top">
        <span className="c-cat">{c.category}</span>
        <span className={'st ' + s}>{ST[s]}</span>
      </div>
      <div className="c-t">{c.title}</div>
      <p className="c-d">{c.desc.length > 52 ? c.desc.slice(0, 52) + '…' : c.desc}</p>
      <div className="c-f">
        <span className="pr">{p}</span>
        <span className="lo">{c.difficulty} · {c.form}</span>
      </div>
    </div>
  );
}

function EventCard({ e, onOpen }) {
  const s = stateOf(e.start_at, e.end_at);
  const mmdd = (e.start_at || '').slice(5).replace('-', '.');
  const yr = (e.start_at || '').slice(0, 4);
  return (
    <div className="card" onClick={() => onOpen(e.id)}>
      <div className="c-top">
        <span className="c-cat">{e.tag}</span>
        <span className={'st ' + s}>{ST[s]}</span>
      </div>
      <div className="dd"><span className="d1">{mmdd}</span><span className="d2">{yr}</span></div>
      <div className="c-t" style={{ marginTop:8 }}>{e.title}</div>
      <p className="c-d">{e.desc.length > 46 ? e.desc.slice(0, 46) + '…' : e.desc}</p>
      <div className="c-f">
        <span className="lo">{e.city} · {e.type}</span>
        <span className="lo">{e.content_source === 'external_link' ? '外链 ↗' : '详情 →'}</span>
      </div>
    </div>
  );
}

function HackCard({ h, onOpen }) {
  const s = stateOf(h.start_at, h.end_at);
  return (
    <div className="card" onClick={() => onOpen(h.id)}>
      <div className="c-top">
        <span className="c-cat">{h.theme} · {h.tracks.length} 赛道</span>
        <span className={'st ' + s}>{ST[s]}</span>
      </div>
      <div className="pool">${money(h.prize_pool_usd)}</div>
      <div className="c-t" style={{ marginTop:10 }}>{h.title}</div>
      <p className="c-d">{h.tracks.map((t) => t.name).join(' · ')}</p>
      <div className="c-f">
        <span className="lo">截止 {h.deadline}</span>
        <span className="lo">{h.content_source === 'external_link' ? '外链 ↗' : '详情 →'}</span>
      </div>
    </div>
  );
}

export function Card({ item, kind, onOpen }) {
  if (kind === 'courses')    return <CourseCard c={item} onOpen={onOpen} />;
  if (kind === 'events')     return <EventCard  e={item} onOpen={onOpen} />;
  if (kind === 'hackathons') return <HackCard   h={item} onOpen={onOpen} />;
  return null;
}
