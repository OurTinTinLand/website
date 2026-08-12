// 应用工具卡片（点击不触发详情，有独立"咨询"按钮）
import React from 'react';

export function AppCard({ app, onConsult }) {
  return (
    <div className="card" style={{ cursor:'default' }}>
      <div className="cbody" style={{ paddingTop:18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:38, height:38, border:'1.8px solid var(--ink)', borderRadius:11,
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
            {app.ic}
          </div>
          <span className="tagpill">{app.type === 'agency' ? '代理产品' : '社区作品'}</span>
        </div>
        <div className="ctitle" style={{ marginTop:9 }}>{app.name}</div>
        <div className="csub">{app.desc}</div>
        <div className="cfoot">
          <span className="linkout">示例数据</span>
          <button className="btn btn-outline btn-sm" onClick={() => onConsult(app)}>咨询</button>
        </div>
      </div>
    </div>
  );
}