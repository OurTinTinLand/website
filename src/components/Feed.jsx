// 首页动态时间线：活动 / 黑客松 / 课程 三类内容统一只取站内条目，按日期倒序取 8 条
import React from 'react';
import { courses, events, hackathons } from '../data/index.js';
import { money, badgeText, badgeClass } from '../utils/format';
import { stateOf, ST } from '../utils/constants';
import { useRoute } from '../utils/router';

function buildRows() {
  const native = (x) => x.content_source === 'native';
  const all = [
    ...events.filter(native).map((e) => ({
      d: e.start_at, k: 'event', kl: '活动', t: e.title,
      s: stateOf(e.start_at, e.end_at), meta: e.city,
      fn: `events/${e.id}`,
    })),
    ...hackathons.filter(native).map((h) => ({
      d: h.start_at, k: 'hack', kl: '黑客松', t: h.title,
      s: stateOf(h.start_at, h.end_at), meta: '$' + money(h.prize_pool_usd),
      fn: `hackathons/${h.id}`,
    })),
    ...courses.filter(native).map((c) => ({
      d: c.start_at, k: 'course', kl: '课程', t: c.title,
      s: stateOf(c.start_at, c.end_at),
      meta: c.price.type === 'free' ? '免费' : '¥' + money(c.price.amount),
      fn: `courses/${c.id}`,
    })),
  ];
  return all.sort((a, b) => new Date(b.d) - new Date(a.d)).slice(0, 8);
}

export function Feed() {
  const { go } = useRoute();
  const rows = buildRows();
  return (
    <div className="feed">
      {rows.map((x, i) => (
        <div key={i} className="feed-row" onClick={() => go(x.fn)}>
          <span className="feed-date">{x.d}</span>
          <span className={`feed-kind k-${x.k}`}>{x.kl}</span>
          <span className="feed-title">{x.t}</span>
          <span style={{ display:'flex', gap:8, alignItems:'center' }}>
            <span className="note">{x.meta}</span>
            <span className={badgeClass(x.s)}>{badgeText(ST, x.s)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}