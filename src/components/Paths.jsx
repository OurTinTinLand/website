// 身份分流 4 卡（与首页 .paths 对齐：编号 + 标题 + 描述 + 右下箭头）
// 渲染在对话区下方
import React from 'react';

export function Paths({ onAsk, wrap = true }) {
  const items = [
    { n:'01', a:'我是开发者', b:'学一门结课有作品的课', q:'我是开发者想学习' },
    { n:'02', a:'我是项目方', b:'在亚洲把生态做起来',   q:'我是项目方想合作办活动' },
    { n:'03', a:'我在找工作', b:'看生态里的真实岗位', q:'我在找工作' },
    { n:'04', a:'我先看看',   b:'了解 TinTin 做什么', q:'随便看看' },
  ];
  const inner = (
    <div className="paths">
      {items.map((it, i) => (
        <button key={i} className="path" onClick={() => onAsk(it.q)}>
          <div className="n">{it.n}</div>
          <div className="a">{it.a}</div>
          <div className="b">{it.b}</div>
          <div className="r">→</div>
        </button>
      ))}
    </div>
  );
  return wrap ? <div className="wrap">{inner}</div> : inner;
}
