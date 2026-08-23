// 关于我们：双栏 + 平行时间线 + 联系表单 + 关注列表
import React from 'react';
import { useRoute } from '../utils/router';
import { Timeline } from '../components/Timeline';
import { useToast } from '../state/store';

const SOCIALS = ['X','Telegram','Bilibili','Medium','YouTube','Discord'];

export function AboutPage() {
  const { go } = useRoute();
  const toast = useToast();
  return (
    <section className="page page-section">
      <div className="wrap">
        <div className="sec-h">
          <div><span className="kick">About</span><h2 className="t2">关于 TinTin</h2></div>
        </div>
        <div className="two" style={{ gap:'clamp(36px,5vw,72px)', alignItems:'start' }}>
          <div>
            <p className="lead" style={{ fontSize:17, marginBottom:'clamp(32px,4vw,52px)' }}>
              2018 年，我们从一个华语开发者社群做起。八年下来，攒了 30 万开发者、220 所高校渠道、50 多条公链的官方合作，成了全球顶级协议进入亚太市场的第一站。
              2026 年起，我们把这套能力整个搬到 AI 方向——课程、企业服务、Token Hub、云产品代理，四条线同时推。
            </p>
            <span className="kick" style={{ marginBottom:20 }}>Timeline</span>
            <Timeline />
          </div>
          <div>
            <div className="fcard">
              <h3 className="t3" style={{ marginBottom:22 }}>说点什么</h3>
              <div className="fr"><label>姓名</label><input placeholder="你的名字" /></div>
              <div className="fr"><label>邮箱</label><input placeholder="you@example.com" /></div>
              <div className="fr"><label>来意</label>
                <select>
                  <option>生态合作</option>
                  <option>企业服务咨询</option>
                  <option>Token Hub 对接</option>
                  <option>媒体 / 投资</option>
                  <option>其他</option>
                </select>
              </div>
              <div className="fr"><label>想聊什么</label><textarea rows="3" placeholder="一两句话说清背景和诉求，我们回得更快"></textarea></div>
              <button className="btn btn-fill btn-lg" style={{ width:'100%', marginTop:10 }} onClick={() => toast.show('已提交 · 我们会在 1 个工作日内回复你')}>提交</button>
            </div>
            <div style={{ marginTop:26 }}>
              <span className="kick" style={{ marginBottom:14 }}>Follow</span>
              <div className="pills">
                {SOCIALS.map((s) => (
                  <button key={s} onClick={() => toast.show(`${s} 即将上线`)}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
