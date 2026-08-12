// 首页：Hero + AIConsole + PersonaRow + Feed + Stats + NavCards
import React, { useState } from 'react';
import { useRoute } from '../utils/router';
import { useStore } from '../state/store';
import { Hero } from '../components/Hero';
import { AIConsole } from '../components/AIConsole';
import { PersonaRow } from '../components/PersonaRow';
import { Feed } from '../components/Feed';
import { Stats } from '../components/Stats';
import { NavCards } from '../components/NavCards';

export function HomePage() {
  const { go } = useRoute();
  const { setThTabReq } = useStore();
  const [askFn, setAskFn] = useState(null);

  const helpers = {
    navigate: go,
    openDetail: (kind, id) => go(`${kind}/${id}`),
    openForm: undefined,
    closeAll: () => {},
    setThTab: (n) => setThTabReq(n),
    scrollTo: (y) => window.scrollTo({ top: y, behavior: 'smooth' }),
  };

  return (
    <React.Fragment>
      <div className="container hero">
        <Hero />
        <div style={{ marginTop: 8 }}>
          <AIConsole helpers={helpers} onAskReady={setAskFn} />
          <PersonaRow onAsk={(q) => askFn && askFn(q)} />
        </div>
      </div>

      <div className="section">
        <div className="container">
          <div className="sec-head">
            <div>
              <span className="eyebrow">Live Feed</span>
              <h2>最新动态</h2>
            </div>
            <div className="sec-desc">活动与黑客松在后台是两个独立板块（字段与报名流程不同），这里共用一条时间线，兼顾浏览习惯。</div>
          </div>
          <Feed />
        </div>
      </div>

      <div className="section alt">
        <div className="container">
          <div className="sec-head">
            <div><span className="eyebrow">Track Record</span><h2>数据背书</h2></div>
          </div>
          <Stats />
        </div>
      </div>

      <div className="section">
        <div className="container">
          <div className="sec-head">
            <div><span className="eyebrow">Explore</span><h2>板块速览</h2></div>
            <div className="sec-desc">九个板块，一次看完。灰色标记的是本周先做占位页、内容后补的板块。</div>
          </div>
          <NavCards />
        </div>
      </div>
    </React.Fragment>
  );
}
