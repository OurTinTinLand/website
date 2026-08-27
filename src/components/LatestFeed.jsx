// 首页「最新动态」：活动 + 黑客松 + 课程合并一条时间线（spec §7.2）
// 只取站内 native 条目，按开始时间倒序，最多 8 条；点击跳对应详情
import React from 'react';
import { stateOf, ST } from '../utils/constants';
import { dateOnly, money } from '../utils/format';

const KIND_META = {
  course:   { label:'课程',   cls:'k-course' },
  event:    { label:'活动',   cls:'k-event' },
  hackathon:{ label:'黑客松', cls:'k-hack' },
};

export function LatestFeed({ courses, events, hackathons, onOpen }) {
  const rows = [
    ...(events || []).filter((x) => x.content_source === 'native').map((e) => ({
      d: e.start_at, k: 'event', t: e.title, s: stateOf(e.start_at, e.end_at),
      meta: e.city || '', id: e.id,
    })),
    ...(hackathons || []).filter((x) => x.content_source === 'native').map((h) => ({
      d: h.start_at, k: 'hackathon', t: h.title, s: stateOf(h.start_at, h.end_at),
      meta: `$${money(h.prize_pool_usd)}`, id: h.id,
    })),
    ...(courses || []).filter((x) => x.content_source === 'native').map((c) => ({
      d: c.start_at, k: 'course', t: c.title, s: stateOf(c.start_at, c.end_at),
      meta: c.price.type === 'free' ? '免费' : `¥${money(c.price.amount)}`, id: c.id,
    })),
  ]
    .sort((a, b) => new Date(b.d) - new Date(a.d))
    .slice(0, 8);

  return (
    <div className="sec">
      <div className="wrap">
        <div className="sec-h">
          <div>
            <span className="kick">Live Feed</span>
            <h2 className="t2">最新动态</h2>
          </div>
          <p className="lead">活动与黑客松是独立板块，这里共用一条时间线，兼顾浏览习惯。</p>
        </div>
        {rows.length === 0 ? (
          <div className="empty" style={{ padding:'30px 0' }}>
            站内内容准备中，先去板块逛逛吧
          </div>
        ) : (
          <div className="feed">
            {rows.map((x, i) => {
              const km = KIND_META[x.k];
              return (
                <div key={i} className="feed-row" onClick={() => onOpen(x.k, x.id)}>
                  <span className="feed-date">{dateOnly(x.d)}</span>
                  <span className={'feed-kind ' + km.cls}>{km.label}</span>
                  <span className="feed-title">{x.t}</span>
                  <span style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span className="note">{x.meta}</span>
                    <span className={'st ' + x.s}>{ST[x.s]}</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
