// 应用工具卡片：代理产品 / 社区作品
import React from 'react';

export function AppCard({ app, onConsult }) {
  return (
    <div className="card no-card">
      <div className="c-top">
        <span className="c-cat">{app.type === 'agency' ? '代理产品' : '社区作品'}</span>
      </div>
      <div className="c-t">{app.name}</div>
      <p className="c-d">{app.desc}</p>
      <div className="c-f">
        <span className="lo">示例数据</span>
        <button className="lnk" onClick={() => onConsult(app)}>咨询 <span className="arw">→</span></button>
      </div>
    </div>
  );
}
