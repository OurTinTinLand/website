// Hero：标题 + stats + 吉祥物舞台（标准 React 版）
import React from 'react';
import { dogUrl } from '../utils/constants';

export function Hero() {
  return (
    <div className="hero-grid">
      <div>
        <div className="hero-badge">
          <span className="pulse"></span>
          2018 年至今 · 华语最大 Web3 开发者社区 · 2026 全面拓展 AI
        </div>
        <h1>Hi，我是 TinTin，<span className="grad">来帮你找路。</span></h1>
        <p className="lead">想学 AI、想打黑客松、想找生态工作、想买大模型 token——直接告诉我，我把你带到那一页，而不是丢一堆导航让你自己猜。</p>
        <div className="hero-stats">
          <div><span className="hs-n">30万+</span><span className="hs-l">开发者与用户</span></div>
          <div><span className="hs-n">$370万+</span><span className="hs-l">累计发放奖励</span></div>
          <div><span className="hs-n">800+</span><span className="hs-l">孵化项目原型</span></div>
        </div>
      </div>
      <div className="dog-stage">
        <div className="halo"></div>
        <div className="sticker s1">KEEP CALM</div>
        <div className="sticker s2">LET'S GO!</div>
        <div className="sticker s3">HELLO!</div>
        <img className="dog-hero" src={dogUrl('dog-sit')} alt="TinTin 吉祥物" />
        <div className="speech">汪！问我点什么</div>
      </div>
    </div>
  );
}