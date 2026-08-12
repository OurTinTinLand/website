// 关于页时间线
import React from 'react';
import { timelineData } from '../data/timeline.js';

export function Timeline() {
  return (
    <div className="timeline">
      {timelineData.map(([y, t], i) => (
        <div key={i} className="tl-item">
          <div className="tl-y">{y}</div>
          <div className="tl-t">{t}</div>
        </div>
      ))}
    </div>
  );
}