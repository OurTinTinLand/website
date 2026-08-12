// 通用卡片：按 kind 渲染 课程 / 活动 / 黑客松 三种
import React, { Fragment } from 'react';
import { COVERS, DOGS, dogUrl, stateOf, ST } from '../utils/constants';
import { money, badgeClass, badgeText } from '../utils/format';

function CourseCard({ c, onOpen }) {
  const s = stateOf(c.start_at, c.end_at);
  const priceEl = c.price.type === 'free' ? (
    <span className="free">免费</span>
  ) : (
    <Fragment>¥{money(c.price.amount)}{c.price.origin ? (
      <s style={{ color:'#B7AFC9', fontWeight:400, fontSize:13 }}> ¥{money(c.price.origin)}</s>
    ) : null}</Fragment>
  );
  return (
    <div className="card" onClick={() => onOpen(c.id)}>
      <div className={`cover ${COVERS[c.cover]}`}>
        <span className="tagpill">{c.category}</span>
        <span className={badgeClass(s)}>{badgeText(ST, s)}</span>
        <img className="cw" src={dogUrl(DOGS[c.dog])} alt="" />
      </div>
      <div className="cbody">
        <div className="ctitle">{c.title}</div>
        <div className="csub">{c.difficulty} · {c.form} · {c.start_at}</div>
        <div className="cfoot">
          <span className="price">{priceEl}</span>
          <span className="linkout">{c.content_source === 'external_link' ? '外链内容 ↗' : '站内详情 →'}</span>
        </div>
      </div>
    </div>
  );
}

function EventCard({ e, onOpen }) {
  const s = stateOf(e.start_at, e.end_at);
  return (
    <div className="card" onClick={() => onOpen(e.id)}>
      <div className={`cover ${COVERS[e.cover]}`}>
        <span className="tagpill">📍 {e.city}</span>
        <span className={badgeClass(s)}>{badgeText(ST, s)}</span>
        <img className="cw" src={dogUrl(DOGS[e.dog])} alt="" />
      </div>
      <div className="cbody">
        <div className="ctitle">{e.title}</div>
        <div className="csub">{e.tag} · {e.type} · {e.start_at}</div>
        <div className="cfoot">
          <span className="linkout">{e.content_source === 'external_link' ? '历史内容 · 外链' : '官网报名'}</span>
          <span className="linkout" style={{ color:'var(--violet-800)' }}>详情 →</span>
        </div>
      </div>
    </div>
  );
}

function HackCard({ h, onOpen }) {
  const s = stateOf(h.start_at, h.end_at);
  return (
    <div className="card" onClick={() => onOpen(h.id)}>
      <div className={`cover ${COVERS[h.cover]}`}>
        <span className="tagpill">{h.theme} · {h.tracks.length} 赛道</span>
        <span className={badgeClass(s)}>{badgeText(ST, s)}</span>
        <img className="cw" src={dogUrl(DOGS[h.dog])} alt="" />
      </div>
      <div className="cbody">
        <div className="csub" style={{ flex:'none' }}>奖金池</div>
        <div className="prize">${money(h.prize_pool_usd)}</div>
        <div className="ctitle" style={{ marginTop:4 }}>{h.title}</div>
        <div className="csub">{h.tracks.map((t) => t.name).join(' · ')}</div>
        <div className="cfoot">
          <span className="linkout">报名截止 {h.deadline}</span>
          <span className="linkout" style={{ color:'var(--violet-800)' }}>
            {h.content_source === 'external_link' ? '外链 ↗' : '详情 →'}
          </span>
        </div>
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