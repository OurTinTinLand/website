// 招聘卡片：与课程 / 活动卡片同结构（纯排版）
import React from 'react';

export function JobCard({ job, onOpen }) {
  return (
    <div className="card" onClick={() => onOpen(job.id)}>
      <div className="c-top">
        <span className="c-cat">{job.role}</span>
        {job.remote ? <span className="lo">支持远程</span> : null}
      </div>
      <div className="c-t">{job.title}</div>
      <p className="c-d">{job.desc.length > 50 ? job.desc.slice(0, 50) + '…' : job.desc}</p>
      <div className="c-f">
        <span className="lo">{job.company} · {job.city}</span>
        <span className="lo">JD →</span>
      </div>
    </div>
  );
}
