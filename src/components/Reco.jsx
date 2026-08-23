// For You：按"即将开始 > 进行中 > 已结束"排序，每类取前 3 条 native
// 匹配 claude.html 的 .reco / .reco-h / .grid 三段结构
import React from 'react';
import { useRoute } from '../utils/router';
import { courses, events, hackathons } from '../data/index.js';
import { Card } from './Card';

const ST_RANK = { upcoming: 0, ongoing: 1, past: 2 };

function stateOf(s, e) {
  const a = new Date(s), b = new Date(e || s);
  const now = new Date();
  if (now < a) return 'upcoming';
  if (now > b) return 'past';
  return 'ongoing';
}

function sortByState(list) {
  return [...list].sort((a, b) => {
    const sa = ST_RANK[stateOf(a.start_at, a.end_at)];
    const sb = ST_RANK[stateOf(b.start_at, b.end_at)];
    if (sa !== sb) return sa - sb;
    return sa === 2 ? new Date(b.start_at) - new Date(a.start_at) : new Date(a.start_at) - new Date(b.start_at);
  });
}

export function Reco({ onOpen }) {
  const { go } = useRoute();
  const nativeCourses    = sortByState(courses.filter((x) => x.content_source === 'native')).slice(0, 3);
  const nativeEvents     = sortByState(events.filter((x)  => x.content_source === 'native')).slice(0, 3);
  const nativeHackathons = sortByState(hackathons.filter((x) => x.content_source === 'native')).slice(0, 3);

  return (
    <div className="recoWrap" id="recoWrap">
      <Section
        title="课程"
        count={`共 ${courses.length} 门`}
        moreLabel="全部课程"
        moreTo={() => go('courses')}
        items={nativeCourses}
        kind="courses"
        onOpen={onOpen}
      />
      <Section
        title="活动"
        count={`共 ${events.length} 场`}
        moreLabel="全部活动"
        moreTo={() => go('events')}
        items={nativeEvents}
        kind="events"
        onOpen={onOpen}
      />
      <Section
        title="黑客松"
        count={`共 ${hackathons.length} 场`}
        moreLabel="全部黑客松"
        moreTo={() => go('hackathons')}
        items={nativeHackathons}
        kind="hackathons"
        onOpen={onOpen}
      />
    </div>
  );
}

function Section({ title, count, moreLabel, moreTo, items, kind, onOpen }) {
  return (
    <div className="reco" data-k={kind}>
      <div className="reco-h">
        <h3>{title} <span className="c">{count}</span></h3>
        <button className="lnk" onClick={moreTo}>{moreLabel} <span className="arw">→</span></button>
      </div>
      <div className="grid">
        {items.map((it) => <Card key={it.id} item={it} kind={kind} onOpen={(id) => onOpen(kind, id)} />)}
      </div>
    </div>
  );
}
