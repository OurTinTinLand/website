// Token Hub：4 个 view（① 渠道介绍 ② 对接流程 ③ 提交意向单 ④ API / 用量）
import React, { useState, useEffect } from 'react';
import { providers, USAGE_TIERS, API_SNIPPET } from '../data/providers.js';
import { useStore, useToast } from '../state/store';

export function TokenHubPage() {
  const { session, addIntent, thTabReq, setThTabReq } = useStore();
  const toast = useToast();
  const [thTab, setThTab] = useState(1);

  // 接收来自规则引擎的 setThTab 指令
  useEffect(() => {
    if (thTabReq) {
      setThTab(thTabReq);
      setThTabReq(null);
    }
  }, [thTabReq]);

  const pickProvider = (name) => {
    setThTab(3);
    document.getElementById('ti-provider').value = name;
    window.scrollTo({ top:260, behavior:'smooth' });
  };

  const submitIntent = () => {
    if (!session.logged) {
      toast.show('请先登录后再提交意向单');
      return;
    }
    const provider = document.getElementById('ti-provider').value;
    const volume   = document.getElementById('ti-volume').value;
    const contact  = (document.getElementById('ti-contact').value.trim()) || session.email;
    const scene    = document.getElementById('ti-scene').value;
    addIntent({
      id: 't-' + (2001 + Math.floor(Math.random() * 10000)),
      user_id: session.user_id,
      user_email: session.email,
      provider, expected_volume: volume, contact, scene,
      status: 'pending',
      created_at: '2026-08-12 10:35',
    });
    toast.show('意向单已提交 · 运营 1 个工作日内联系你');
    document.getElementById('ti-scene').value = '';
    document.getElementById('ti-contact').value = '';
  };

  return (
    <div className="container" style={{ padding:'44px 28px 60px' }}>
      <div className="sec-head">
        <div><span className="eyebrow">Token Hub · /tokenhub</span><h2>Token Hub</h2></div>
        <div className="sec-desc">AI 大模型 token 的代理与分销对接。注意：这里说的是大模型 API token，不是 Web3 代币发行。</div>
      </div>
      <div className="banner">
        <span>⚠</span>
        <div><b>原型占位数据。</b>渠道商名称、支持模型、起价均需运营用真实合作方信息替换（对应需求文档第 15 章问题 2，本周内提供素材）。</div>
      </div>
      <div className="th-tabs">
        {[1,2,3,4].map((n) => (
          <button key={n} className={'th-tab' + (thTab === n ? ' active' : '')} onClick={() => setThTab(n)}>
            {['① 渠道介绍','② 对接流程','③ 提交意向单','④ API / 用量'][n-1]}
          </button>
        ))}
      </div>

      <div className={'th-view' + (thTab === 1 ? ' active' : '')}>
        <div className="grid">
          {providers.map((p) => (
            <div key={p.id} className="thcard">
              <div className="logo">{p.name.slice(-1)}</div>
              {p.todo && <span className="todo">TODO 待运营核实</span>}
              <h4 style={{ fontSize: 16 }}>{p.name}</h4>
              <p className="sec-desc" style={{ fontSize: 12, margin: '4px 0 8px' }}>{p.tagline}</p>
              <div className="kv"><span>支持模型</span><b>{p.models}</b></div>
              <div className="kv"><span>起价</span><b>{p.price}</b></div>
              <div className="kv" style={{ border:'none' }}><span>结算方式</span><b>{p.settle}</b></div>
              <button className="btn btn-pop btn-sm" style={{ marginTop: 6 }} onClick={() => pickProvider(p.name)}>对接这个渠道</button>
            </div>
          ))}
        </div>
      </div>

      <div className={'th-view' + (thTab === 2 ? ' active' : '')}>
        <div className="steps">
          <div className="step">
            <div className="no">01</div>
            <h4 style={{ margin:'8px 0 6px' }}>选渠道</h4>
            <p className="sec-desc" style={{ fontSize: 13 }}>对照渠道卡片比较支持的模型、单价与结算方式，选定一个或让我们推荐。</p>
          </div>
          <div className="step">
            <div className="no">02</div>
            <h4 style={{ margin:'8px 0 6px' }}>提交意向单</h4>
            <p className="sec-desc" style={{ fontSize: 13 }}>填写预计用量与联系方式。<b>本周不接自动扣费</b>——资金与额度风控一周做不扎实，先用人工对接验证渠道合作是否顺畅。</p>
          </div>
          <div className="step">
            <div className="no">03</div>
            <h4 style={{ margin:'8px 0 6px' }}>人工对接开通</h4>
            <p className="sec-desc" style={{ fontSize: 13 }}>运营 1 个工作日内联系，确认用量后线下结算并开通账号，把 key 与用量看板交付给你。</p>
          </div>
        </div>
        <div className="spec">V1.1 规划：接入渠道商 API 后可做自助下单 + 实时用量看板；本周只交付「意向单 → 人工对接」闭环。</div>
      </div>

      <div className={'th-view' + (thTab === 3 ? ' active' : '')}>
        <div className="split">
          <div className="formcard">
            <h3 style={{ fontSize: 17, marginBottom: 4 }}>提交对接意向</h3>
            <p className="sec-desc" style={{ marginBottom: 16, fontSize: 13 }}>提交后进入运营后台的意向单列表，状态流转：pending → contacted → closed。</p>
            <div className="frow">
              <label>想对接的渠道</label>
              <select id="ti-provider">
                {[
                  ...providers.map((p) => <option key={p.id}>{p.name}</option>),
                  <option key="__rec">还没确定，帮我推荐</option>,
                ]}
              </select>
            </div>
            <div className="frow">
              <label>预计月用量</label>
              <select id="ti-volume">
                <option>100 万 tokens 以内</option>
                <option>100 万 – 1000 万 tokens</option>
                <option>1000 万 – 1 亿 tokens</option>
                <option>1 亿 tokens 以上</option>
                <option>还不确定</option>
              </select>
            </div>
            <div className="frow">
              <label>使用场景</label>
              <textarea id="ti-scene" rows="3" placeholder="比如：10 人团队做客服机器人，需要长上下文与中文能力"></textarea>
            </div>
            <div className="frow">
              <label>联系方式</label>
              <input id="ti-contact" placeholder="邮箱 / 微信号，运营 1 个工作日内联系" />
              <div className="hint">登录后自动带出账号邮箱，无需重复填写。</div>
            </div>
            <button className="btn btn-primary" style={{ width:'100%' }} onClick={submitIntent}>提交意向单</button>
          </div>
          <div>
            <div className="formcard" style={{ background:'var(--lilac-50)' }}>
              <h4 style={{ marginBottom: 10 }}>为什么本周不做自动扣费</h4>
              <p className="sec-desc" style={{ fontSize: 13 }}>自动扣费涉及预充值余额、并发额度控制、渠道商回调对账、退款与超卖兜底四类风控逻辑，任何一处做不扎实都会直接产生资金损失。一周时间不足以覆盖，先用人工对接跑通商业闭环、验证真实需求量，再决定是否值得投入自动化。</p>
              <div className="spec">对应数据结构 TokenHubIntent：{`{ id, user_id, provider, expected_volume, contact, status }`}</div>
            </div>
            <div className="formcard" style={{ marginTop: 14, display:'flex', gap: 14, alignItems:'center' }}>
              <img src="assets-claude/brand/dog-harness.png" style={{ width: 110, flex:'none' }} alt="" />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>不确定选哪个渠道？</div>
                <p className="sec-desc" style={{ fontSize: 13, margin:'4px 0 0' }}>在意向单里选「帮我推荐」，写清场景，运营会按你的用量和模型需求给对比建议。</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={'th-view' + (thTab === 4 ? ' active' : '')}>
        <div className="split">
          <div>
            <div className="formcard">
              <h3 style={{ fontSize: 17, marginBottom: 10 }}>模型与价格档位</h3>
              <p className="sec-desc" style={{ fontSize: 13, marginBottom: 14 }}>按渠道分组，下方数字为参考起价（V1 上线后由运营每周校对一次）。</p>
              {providers.map((p) => (
                <div key={p.id} style={{ marginBottom: 16 }}>
                  <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 6 }}>
                    <b style={{ fontSize: 14 }}>{p.name}</b>
                    <span className="note">首字 {p.latency} · {p.settle}</span>
                  </div>
                  <table className="tbl" style={{ marginBottom: 4 }}>
                    <tbody>
                      <tr><th>模型</th><th>上下文</th><th>输入 / 1K</th><th>输出 / 1K</th></tr>
                      {p.modelsDetail.map((m, i) => (
                        <tr key={i}>
                          <td><b>{m.name}</b></td>
                          <td className="mono">{m.ctx}</td>
                          <td className="mono">{m.in}</td>
                          <td className="mono">{m.out}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
            <div className="formcard" style={{ marginTop: 14 }}>
              <h3 style={{ fontSize: 17, marginBottom: 10 }}>用量档位与 SLA</h3>
              <table className="tbl">
                <tbody>
                  <tr><th>档位</th><th>典型场景</th><th>服务承诺</th></tr>
                  {USAGE_TIERS.map((u, i) => (
                    <tr key={i}>
                      <td><b>{u.tier}</b></td>
                      <td>{u.hint}</td>
                      <td className="note">{u.sla}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="formcard" style={{ background:'var(--lilac-50)' }}>
              <h3 style={{ fontSize: 17, marginBottom: 10 }}>调用样例</h3>
              <p className="sec-desc" style={{ fontSize: 13, marginBottom: 12 }}>所有渠道都走 OpenAI 兼容协议，一把 key 切换不同模型。</p>
              <pre className="codeblock" style={{ background:'#0B0915', color:'#E9E3FF', padding:'14px 16px', borderRadius:12, fontSize:12.5, lineHeight:1.55, overflowX:'auto', fontFamily:'var(--f-mono)' }}>{API_SNIPPET}</pre>
            </div>
            <div className="formcard" style={{ marginTop: 14 }}>
              <h4 style={{ marginBottom: 6 }}>对接后的看板</h4>
              <p className="sec-desc" style={{ fontSize: 13 }}>V1.1 接入渠道商 API 后，会在个人中心 → 我的 Token Hub 意向里显示实时用量、限速与账单。本周提交意向后由运营人工发月度账单。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
