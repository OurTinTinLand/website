// 首页板块速览 9 卡
import React from 'react';
import { NAVCARDS } from '../data/navcards.js';
import { useRoute } from '../utils/router';

export function NavCards() {
  const { go } = useRoute();
  return (
    <div className="grid g4">
      {NAVCARDS.map(([p, ic, t, d, bg]) => (
        <button key={p} className="navcard" onClick={() => go(p)}>
          <div className="ic" style={{ background: bg }}>{ic}</div>
          <h4>{t}</h4><p>{d}</p>
        </button>
      ))}
    </div>
  );
}