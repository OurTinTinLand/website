// 招聘卡片
import React from 'react';

export function JobCard({ job, onOpen }) {
  return (
    <div className="card" onClick={() => onOpen(job.id)}>
      <div className="cbody" style={{ paddingTop:18 }}>
        <div style={{ display:'flex', gap:6 }}>
          <span className="tagpill">{job.role}</span>
          {job.remote ? <span className="tagpill" style={{ background:'#BFF3DE' }}>支持远程</span> : null}
        </div>
        <div className="ctitle" style={{ marginTop:8 }}>{job.title}</div>
        <div className="csub">{job.company} · {job.city}</div>
        <div className="cfoot">
          <span className="linkout">{job.reqs.length} 项要求</span>
          <span className="linkout" style={{ color:'var(--violet-800)' }}>查看 JD →</span>
        </div>
      </div>
    </div>
  );
}