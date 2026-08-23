// 企业服务：dark 头 + methodology 4 步 + 服务矩阵 + 案例列表 + light 覆盖市场滚动 + CTA
import React from 'react';
import { Marquee } from '../components/Marquee';

const MARKETS = ['中国（含港澳）','印度','越南','韩国','日本','土耳其','泰国','印尼','巴西','阿根廷','尼日利亚','中东','独联体'].map((t) => ({ t }));

const CASES = [
  ['OpenLedger Asia Tour', 'AI 方向公链亚洲巡回，多城线下与社区激活', [['2,490','报名'],['1,034','到场'],['1,579','社群新增']]],
  ['STORY 线下 Meetup',    '港深沪三城巡回，IP 与 AI 内容方向',         [['2,655','报名'],['987','到场'],['1,592','社群新增']]],
  ['0G China Tour',        'AI Layer1 中国行，开发者深度触达',         [['1,801','报名'],['886','到场'],['1,123','社群新增']]],
  ['Sentient Asia Tour',   'Web3-AI 方向亚洲巡回与校园专场',         [['1,505','报名'],['629','到场'],['798','社群新增']]],
  ['Polkadot Hackathon ×2','新加坡与曼谷双场，44 国参赛',            [['$630K','奖金池'],['611','参赛者'],['191','提交项目']]],
  ['ETHShanghai 黑客松',   '上海旗舰赛事，万向区块链实验室联合主办', [['505','报名'],['89','提交项目'],['57','路演项目']]],
];

const FLOW = [
  ['01 Strategy', '策略设计',  '按项目阶段和目标市场定制进入策略与增长路径，不套模板。'],
  ['02 Recruitment', '精准招募', '多渠道触达、筛选、吸引高质量开发者，用真实构建者替代刷量数据。'],
  ['03 Activation', '深度激活',  '线上线下活动、AMA、工作坊、黑客松，推动社区深度互动。'],
  ['04 Growth',    '品牌增长',   '持续媒体曝光与社区培育，沉淀长期品牌资产而非短期热度。'],
];

export function EnterprisePage({ onApply, onGoto }) {
  return (
    <>
      <section className="page page-section">
        <div className="wrap">
          <div className="ehero">
            <span className="kick" style={{ color:'var(--d-txt-2)', marginBottom:20 }}>Enterprise</span>
            <h3>把亚洲市场，一次做对。</h3>
            <p>从策略设计到落地执行的全周期服务。我们不做一次性投放——用八年沉淀的开发者社区、KOL 矩阵和 56 城本地团队，把曝光真正换成用户增长和生态留存。</p>
            <div className="metrics">
              <div><div className="n">300K+</div><div className="l">开发者社区</div></div>
              <div><div className="n">10M+</div><div className="l">Crypto 用户触达</div></div>
              <div><div className="n">220+</div><div className="l">生态合作伙伴</div></div>
              <div><div className="n">56</div><div className="l">城市本地化布点</div></div>
            </div>
          </div>

          <div className="sec-h" style={{ marginBottom:26 }}>
            <div><span className="kick">Methodology</span><h2 className="t3">我们怎么做</h2></div>
            <p className="lead">四个阶段构成闭环，每个阶段都有清晰的交付物。</p>
          </div>

          <div className="flow" style={{ marginBottom:'clamp(48px,6vw,80px)' }}>
            {FLOW.map(([n, t, p], i) => (
              <div key={i} className="fstep">
                <div className="n">{n}</div>
                <h4>{t}</h4>
                <p>{p}</p>
              </div>
            ))}
          </div>

          <div className="sec-h" style={{ marginBottom:26 }}>
            <div><span className="kick">Services</span><h2 className="t3">服务矩阵</h2></div>
          </div>

          <div className="grid" style={{ marginBottom:'clamp(48px,6vw,80px)' }}>
            <div className="card no-card">
              <div className="c-top"><span className="c-cat">AI 方向</span></div>
              <div className="c-t">AI 转型咨询</div>
              <p className="c-d">现状诊断、场景筛选与 ROI 测算、定制内训、落地陪跑。团队有专职 FDE，交付的是可量化的业务指标改善。</p>
              <div className="c-f"><button className="lnk" onClick={() => onApply('enterprise-ai')}>联系顾问 <span className="arw">→</span></button></div>
            </div>
            <div className="card no-card">
              <div className="c-top"><span className="c-cat">生态合作</span></div>
              <div className="c-t">生态合作全案</div>
              <p className="c-d">社区运营、活动与大会、KOL 对接、战略合作四大模块。含 4A 级视觉体系与跨境执行，覆盖融资期到 TGE 后全周期。</p>
              <div className="c-f"><button className="lnk" onClick={() => onApply('enterprise-eco')}>获取方案 <span className="arw">→</span></button></div>
            </div>
            <div className="card no-card">
              <div className="c-top"><span className="c-cat">新业务线</span></div>
              <div className="c-t">云与 Token 代理</div>
              <p className="c-d">云厂商产品分销与大模型 token 代理，用集采价格压低算力与推理成本，配套用量看板与技术支持。</p>
              <div className="c-f"><button className="lnk" onClick={() => onGoto('tokenhub')}>了解 Token Hub <span className="arw">→</span></button></div>
            </div>
          </div>

          <div className="sec-h" style={{ marginBottom:10 }}>
            <div><span className="kick">Case Studies</span><h2 className="t3">做过的事</h2></div>
            <p className="lead">以下数据取自对外 deck 公开页。</p>
          </div>
          <div id="cases">
            {CASES.map(([n, d, ns], i) => (
              <div key={i} className="case">
                <div className="nm">{n}</div>
                <div className="ds">{d}</div>
                <div className="ns">
                  {ns.map(([v, l], j) => (
                    <div key={j}><div className="n">{v}</div><div className="l">{l}</div></div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="sec-h" style={{ margin:'clamp(48px,6vw,80px) 0 26px' }}>
            <div><span className="kick">Coverage</span><h2 className="t3">覆盖市场</h2></div>
            <p className="lead">扎根亚洲，辐射全球。56 个城市有实地执行能力，配母语社区团队。</p>
          </div>
        </div>
        <Marquee items={MARKETS} light />

        <div className="wrap">
          <div style={{ marginTop:'clamp(48px,6vw,80px)', padding:'clamp(28px,4vw,44px)', border:'1px solid var(--line)', borderRadius:'var(--r-lg)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:28, flexWrap:'wrap' }}>
            <div>
              <h4 className="t3" style={{ marginBottom:8 }}>聊聊具体怎么做？</h4>
              <p className="xs" style={{ margin:0 }}>留下项目背景与目标市场，一个工作日内给初步方案建议与报价区间。</p>
            </div>
            <button className="btn btn-fill btn-lg" onClick={() => onApply('enterprise-eco')}>预约沟通 <span className="arw">→</span></button>
          </div>
        </div>
      </section>
    </>
  );
}
