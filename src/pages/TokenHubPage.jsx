// Token Hub：① 渠道介绍 ② 对接流程 ③ 提交意向
import React, { useState, useEffect } from 'react';
import { providers } from '../data/providers.js';
import { useStore, useToast } from '../state/store';

export function TokenHubPage() {
  const { session, addIntent, thTabReq, setThTabReq } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState(1);

  useEffect(() => {
    if (thTabReq) {
      setTab(thTabReq);
      setThTabReq(null);
    }
  }, [thTabReq]);

  const pickProvider = (name) => {
    setTab(3);
    const sel = document.getElementById('ti-provider');
    if (sel) sel.value = name;
  };

  const submitIntent = async () => {
    if (!session.logged) {
      toast.show('请先登录后再提交意向单');
      return;
    }
    const provider = document.getElementById('ti-provider').value;
    const volume   = document.getElementById('ti-volume').value;
    const contact  = (document.getElementById('ti-contact').value.trim()) || session.email;
    const scene    = document.getElementById('ti-scene').value;
    await addIntent({
      id: 't-' + (2001 + Math.floor(Math.random() * 10000)),
      user_id: session.user_id,
      user_email: session.email,
      provider, expected_volume: volume, contact, scene,
      status: 'pending',
      synced: true,
      created_at: '2026-08-12 10:35',
    });
    toast.show('意向单已提交 · 运营 1 个工作日内联系你');
    document.getElementById('ti-scene').value = '';
    document.getElementById('ti-contact').value = '';
  };

  return (
    <section className="page page-section">
      <div className="wrap">
        <div className="sec-h">
          <div>
            <span className="kick">Token Hub</span>
            <h2 className="t2">Token Hub</h2>
          </div>
          <p className="lead">大模型 API token 的渠道代理与对接。</p>
        </div>

        <div className="spec" style={{ marginBottom:30 }}>
          合作渠道与价格持续接入中，最新详情请联系运营。
        </div>

        <div className="thtabs">
          <button className={'thtab' + (tab === 1 ? ' on' : '')} onClick={() => setTab(1)}>渠道</button>
          <button className={'thtab' + (tab === 2 ? ' on' : '')} onClick={() => setTab(2)}>怎么对接</button>
          <button className={'thtab' + (tab === 3 ? ' on' : '')} onClick={() => setTab(3)}>提交意向</button>
        </div>

        {/* 1 · 渠道 */}
        <div className={'thv' + (tab === 1 ? ' on' : '')}>
          <div className="grid g2">
            {providers.map((p) => (
              <div key={p.id} className="prov">
                {p.todo && <span className="todo">待运营核实</span>}
                <div className="ct">{p.name}</div>
                <div className="kv"><span>支持模型</span><b>{p.models}</b></div>
                <div className="kv"><span>起价</span><b>{p.price}</b></div>
                <div className="kv" style={{ border:'none' }}><span>结算</span><b>{p.settle}</b></div>
                <button className="lnk" style={{ marginTop:10, alignSelf:'flex-start' }} onClick={() => pickProvider(p.name)}>
                  对接这个渠道 <span className="arw">→</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 2 · 怎么对接 */}
        <div className={'thv' + (tab === 2 ? ' on' : '')}>
          <div className="steps">
            <div className="stp">
              <div className="n">Step 01</div>
              <h4>选渠道</h4>
              <p>对照渠道卡片比较支持的模型、单价与结算方式。拿不准就选「帮我推荐」，写清场景我们来配。</p>
            </div>
            <div className="stp">
              <div className="n">Step 02</div>
              <h4>提交意向</h4>
              <p>填预计用量与联系方式。本周不接自动扣费——资金与额度风控一周做不扎实，先用人工方式把商业闭环跑通。</p>
            </div>
            <div className="stp">
              <div className="n">Step 03</div>
              <h4>人工开通</h4>
              <p>运营一个工作日内联系，确认用量后线下结算并开通账号，把 key 和用量看板一起交付。</p>
            </div>
          </div>
        </div>

        {/* 3 · 提交意向 */}
        <div className={'thv' + (tab === 3 ? ' on' : '')}>
          <div>
            <h3 className="t3" style={{ marginBottom:26 }}>提交对接意向</h3>
            <div className="fr"><label>想对接的渠道</label>
                <select id="ti-provider">
                  {[...providers.map((p) => <option key={p.id}>{p.name}</option>), <option key="__rec">还没确定，帮我推荐</option>]}
                </select>
              </div>
              <div className="fr"><label>预计月用量</label>
                <select id="ti-volume">
                  <option>100 万 tokens 以内</option>
                  <option>100 万 – 1000 万 tokens</option>
                  <option>1000 万 – 1 亿 tokens</option>
                  <option>1 亿 tokens 以上</option>
                  <option>还不确定</option>
                </select>
              </div>
              <div className="fr"><label>使用场景</label>
                <textarea id="ti-scene" rows="3" placeholder="比如：10 人团队做客服机器人，需要长上下文和中文能力"></textarea>
              </div>
              <div className="fr"><label>联系方式</label>
                <input id="ti-contact" placeholder="邮箱或微信号" />
                <div className="hint">登录后自动带出账号邮箱，不用重复填。</div>
              </div>
              <button className="btn btn-fill btn-lg" style={{ width:'100%', marginTop:10 }} onClick={submitIntent}>提交意向单</button>
          </div>
        </div>
      </div>
    </section>
  );
}
