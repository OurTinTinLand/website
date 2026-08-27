// Hero：深色 band + badge + h1 + lead + 双 CTA + 4 列 stats
// 文案可由运营后台（§14.3 home_ops.hero）覆盖：badge / h1（\n 分行，第二行 em 强调）/ lead
import React from 'react';
import { useRoute } from '../utils/router';

const DEFAULT = {
  badge: '2018 至今 · 30 万开发者 · 2026 全面转向 AI',
  h1: '华语开发者的主场\n现在向 AI 敞开。',
  lead: '八年，30 万开发者、50 多条公链、$370 万奖金池，连成了一张真实运转的网。课程、黑客松、生态合作、算力与 token——从这里开始，不用你自己找路。',
};

export function Hero({ content }) {
  const { go } = useRoute();
  const c = { ...DEFAULT, ...(content || {}) };
  const [h1a, h1b] = String(c.h1 || '').split('\n');
  return (
    <section className="hero">
      <div className="wrap hero-in">
        <div className="hero-badge">
          <span className="d"></span>
          {c.badge}
        </div>
        <h1 className="t1">
          {h1a}<br/>
          <em>{h1b || h1a}</em>
        </h1>
        <p className="lead">{c.lead}</p>
        <div className="hero-cta">
          <button className="btn btn-inv btn-lg" onClick={() => {
            const f = document.querySelector('#chatInput') || document.querySelector('.field input');
            if (f) { f.scrollIntoView({ behavior:'smooth', block:'center' }); setTimeout(() => f.focus(), 420); }
          }}>告诉我们你想做什么 <span className="arw">→</span></button>
          <button className="btn btn-ghost-d btn-lg" onClick={() => go('enterprise')}>我是项目方</button>
        </div>
      </div>
      <div className="wrap" style={{ position:'relative' }}>
        <div className="stats">
          <div><div className="n">30万+</div><div className="l">开发者与用户</div></div>
          <div><div className="n">$370万+</div><div className="l">累计发放奖金</div></div>
          <div><div className="n">800+</div><div className="l">孵化项目原型</div></div>
          <div><div className="n">56</div><div className="l">城市落地执行</div></div>
        </div>
      </div>
    </section>
  );
}
