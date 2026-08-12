// 身份分流 4 卡（点击触发 onAsk 假 AI）
import React from 'react';

export function PersonaRow({ onAsk }) {
  const items = [
    { pe:'🧑‍💻', pt:'我是开发者', ps:'找课程 / 打黑客松',  q:'我是开发者想学习' },
    { pe:'🤝',  pt:'我是项目方', ps:'生态合作 / 办活动',   q:'我是项目方想合作办活动' },
    { pe:'🎯',  pt:'我是求职者', ps:'看生态岗位',           q:'我在找工作' },
    { pe:'👀',  pt:'随便看看',   ps:'了解 TinTinLand',       q:'随便看看' },
  ];
  return (
    <div className="persona-row">
      {items.map((it, i) => (
        <button key={i} className="persona" onClick={() => onAsk(it.q)}>
          <div className="pe">{it.pe}</div>
          <div className="pt">{it.pt}</div>
          <div className="ps">{it.ps}</div>
        </button>
      ))}
    </div>
  );
}