// 首页 = Hero(深色含 stats) + ask 对话区 + paths 身份分流 + 浅色 For You reco + 深色 Track Record
// 严格对齐 claude.html 区块顺序与节奏
import React, { useState } from 'react';
import { useRoute } from '../utils/router';
import { Hero } from '../components/Hero';
import { AIConsole } from '../components/AIConsole';
import { Paths } from '../components/Paths';
import { Reco } from '../components/Reco';
import { Marquee } from '../components/Marquee';

const PARTNERS = [
  ['公链与生态', '#5F23F0', ['Polkadot','Aptos','Avalanche','Solana','BNB Chain','Polygon','Arbitrum','TON','Sui','Story Protocol','0G','Movement','NEAR','Flow','Conflux','StarkNet']],
  ['投资机构', '#A233A8', ['OKX Ventures','HashKey Capital','SevenX Ventures','IOSG','Animoca Ventures','DWF Labs','Gate Ventures','MEXC Ventures','ArkStream Capital','BlockBooster','YBB Foundation','启明创投']],
  ['行业媒体', '#E64145', ['The Block','CoinDesk','Foresight News','PANews','BlockBeats','ODAILY','金色财经','TechFlow','ChainCatcher']],
  ['云与基础设施', '#0E9F6E', ['AWS','阿里云','Chainlink','Cosmos','imToken','Arweave','Celer Network','SubQuery']],
  ['安全审计', '#C2751A', ['CertiK','SlowMist','Secure3','ScaleBit','SharkTeam','MoveBit']],
];

const PARTNER_CELLS = [];
PARTNERS.forEach(([, c, list]) => list.forEach((t) => PARTNER_CELLS.push({ t, c })));

export function HomePage() {
  const [askFn, setAskFn] = useState(null);
  const { go } = useRoute();

  return (
    <>
      <Hero />

      <AIConsole onAskReady={setAskFn} />
      <Paths onAsk={(q) => askFn && askFn(q)} />

      {/* For You */}
      <div className="sec">
        <div className="wrap">
          <div className="sec-h">
            <div>
              <span className="kick">For You</span>
              <h2 className="t2">为你推荐</h2>
            </div>
            <p className="lead">你在对话里说过的方向会被顶到最前。没说的话，默认按「即将开始 &gt; 进行中 &gt; 已结束」排。</p>
          </div>
          <Reco onOpen={(kind, id) => go(`${kind}/${id}`)} />
        </div>
      </div>

      {/* Track Record + Partners */}
      <div className="sec dark">
        <div className="wrap">
          <div className="sec-h">
            <div><span className="kick">Track Record</span><h2 className="t2">八年，可以逐项核对</h2></div>
            <p className="lead">不是愿景，是已经发生过的事。</p>
          </div>
        </div>
        <div className="wrap" style={{ padding:'0 44px' }}>
          <div className="metrics">
            <div><div className="n">30万+</div><div className="l">开发者与用户</div></div>
            <div><div className="n">$370万+</div><div className="l">累计发放奖金</div></div>
            <div><div className="n">500+</div><div className="l">全球线上线下活动</div></div>
            <div><div className="n">800+</div><div className="l">孵化项目原型</div></div>
          </div>
        </div>
        <div className="wrap" style={{ marginTop:'clamp(52px,6.5vw,86px)' }}>
          <span className="kick" style={{ marginBottom:16, color:'var(--d-txt-2)' }}>Partners</span>
          <h3 className="t3" style={{ color:'#fff', marginBottom:12 }}>和我们一起干活的人</h3>
          <p className="lead" style={{ marginBottom:34 }}>50+ 条公链、220+ 生态伙伴、1000+ KOL、主流行业媒体与安全审计机构。</p>
        </div>
        <Marquee items={PARTNER_CELLS} />
        <div className="wrap"><p className="xs" style={{ color:'var(--d-txt-2)', marginTop:20 }}>名单为部分展示，正式对外版本需 BD 确认授权后替换为官方 Logo。</p></div>
      </div>
    </>
  );
}
