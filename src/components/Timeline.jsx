// 关于页时间线（与 claude.html 平行版式对齐）
import React from 'react';
import { timelineData } from '../data/timeline.js';

export function Timeline() {
  const last = timelineData.length - 1;
  return (
    <div className="tl">
      {timelineData.map(([y, t], i) => (
        <div key={i} className={'tli' + (i === last ? ' hot' : '')}>
          <div className="tly">{y}</div>
          <div className="tlt">{t}</div>
        </div>
      ))}
    </div>
  );
}
