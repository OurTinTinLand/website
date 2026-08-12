// 关于我们：split + Timeline + 联系表单 + 关注我们按钮
import React from 'react';
import { Timeline } from '../components/Timeline';
import { dogUrl } from '../utils/constants';
import { useToast } from '../state/store';

const SOCIALS = ['X','Telegram','Bilibili','Medium','YouTube','Discord'];

export function AboutPage() {
  const toast = useToast();
  return (
    <div className="container" style={{ padding:'44px 28px 60px' }}>
      <div className="sec-head">
        <div><span className="eyebrow">About · /about</span><h2>关于我们</h2></div>
      </div>
      <div className="split" style={{ gap: 44, alignItems: 'start', gridTemplateColumns: '1.4fr 1fr' }}>
        <div>
          <p className="sec-desc" style={{ fontSize: 14.5, marginBottom: 26 }}>
            TinTinLand 创立于 2018 年，是华语最大的 Web3 开发者社区。八年行业深耕，积累 30 万+ 开发者与用户、220+ 高校渠道、50+ 公链官方合作，是全球顶级协议落地亚太市场的首选入口。2026 年起，我们把课程、活动与社区的能力延伸到 AI 方向，提供课程培训、企业 AI 转型服务、Token Hub 与代理云产品分销。
          </p>
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>发展历程</h3>
          <Timeline />
          <h3 style={{ fontSize: 16, margin: '24px 0 12px' }}>关注我们</h3>
          <div className="fsel">
            {SOCIALS.map((s) => (
              <button key={s} onClick={() => toast.show(`外链占位：${s}`)}>{s}</button>
            ))}
          </div>
        </div>
        <div>
          <ContactForm />
          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <img src={dogUrl('dog-guitar')} style={{ width: 190, margin: '0 auto' }} alt="" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactForm() {
  const toast = useToast();
  return (
    <div className="formcard">
      <h3 style={{ fontSize: 17, marginBottom: 14 }}>联系我们</h3>
      <div className="frow"><label>姓名</label><input placeholder="你的名字" /></div>
      <div className="frow"><label>邮箱</label><input placeholder="you@example.com" /></div>
      <div className="frow">
        <label>来意</label>
        <select>
          <option>生态合作</option>
          <option>企业服务咨询</option>
          <option>Token Hub 对接</option>
          <option>媒体 / 投资</option>
          <option>其他</option>
        </select>
      </div>
      <div className="frow">
        <label>想聊点什么</label>
        <textarea rows="3" placeholder="一两句话说清背景和诉求，我们回得更快"></textarea>
      </div>
      <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => toast.show('已提交（原型演示）：联系表单写入后台线索列表')}>提交</button>
    </div>
  );
}
