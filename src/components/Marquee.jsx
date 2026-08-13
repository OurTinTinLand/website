// 合作伙伴滚动 / 覆盖市场滚动（与 claude.html 一致）
import React from 'react';

export function Marquee({ items, light = false }) {
  if (!items || !items.length) return null;
  // 拆为 3 行（不同方向 + 长度）
  const rows = [items.filter((_, i) => i % 3 === 0), items.filter((_, i) => i % 3 === 1), items.filter((_, i) => i % 3 === 2)];
  return (
    <div>
      <div className={'mq' + (light ? ' lt' : '')} style={{ '--dur':'62s' }}>
        <div className="mq-t">{rows[0].map((it, i) => <Cell key={i} {...it} />)}{rows[0].map((it, i) => <Cell key={'d'+i} {...it} />)}</div>
      </div>
      <div className={'mq' + (light ? ' lt' : '')} style={{ '--dur':'78s' }}>
        <div className="mq-t rev">{rows[1].map((it, i) => <Cell key={i} {...it} />)}{rows[1].map((it, i) => <Cell key={'d'+i} {...it} />)}</div>
      </div>
      <div className={'mq' + (light ? ' lt' : '')} style={{ '--dur':'70s' }}>
        <div className="mq-t">{rows[2].map((it, i) => <Cell key={i} {...it} />)}{rows[2].map((it, i) => <Cell key={'d'+i} {...it} />)}</div>
      </div>
    </div>
  );
}

function Cell({ t, c }) {
  return (
    <span className="mq-i">
      {c ? <span className="g" style={{ background: c }} /> : null}
      {t}
    </span>
  );
}
