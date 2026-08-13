// 企业服务：3 张特殊卡
import React from 'react';
import { useRoute } from '../utils/router';

const CARDS = [
  { cover:'cv1', tag:'最高优先级', title:'AI 转型咨询',
    desc:'从现状诊断、定制内训到落地陪跑。团队有专门做 FDE（企业效能顾问）的人，交付的是可验收的业务指标改善，不是一份 PPT。',
    cta:'联系顾问', ctaKind:'enterprise-ai' },
  { cover:'cv2', tag:'存量优势', title:'生态合作 ToB',
    desc:'活动 / 黑客松 / 路演 / KOL 全案。50+ 公链官方合作与 30 万开发者网络，帮协议方在华语及亚太市场从 0 到 1 建生态。',
    cta:'获取方案', ctaKind:'enterprise-eco' },
  { cover:'cv3', tag:'新业务线', title:'云与 Token 代理',
    desc:'代理云厂商产品分销，以及 AI 大模型 token 代理。用集采价格帮企业降低算力与推理成本。',
    cta:'了解 Token Hub', ctaKind:'tokenhub' },
];

export function EnterprisePage({ onApply, onGoto }) {
  return (
    <div className="container page-section">
      <div className="sec-head">
        <div><span className="eyebrow">Enterprise · /enterprise</span><h2>企业服务</h2></div>
        <div className="sec-desc">三条产品线，每条一句话说清能力边界，统一走联系表单收口。</div>
      </div>
      <div className="grid">
        {CARDS.map((c, i) => (
          <div key={i} className="card" style={{ cursor: 'default' }}>
            <div className={`cover ${c.cover}`}><span className="tagpill">{c.tag}</span></div>
            <div className="cbody">
              <div className="ctitle">{c.title}</div>
              <p className="csub">{c.desc}</p>
              <button className="btn btn-ink btn-sm" onClick={() => {
                if (c.ctaKind === 'tokenhub') onGoto('tokenhub');
                else onApply(c.ctaKind);
              }}>{c.cta}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
