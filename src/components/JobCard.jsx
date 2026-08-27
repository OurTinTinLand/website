// 招聘卡片 ×2（spec §15）：
//   JobPostingCard — §15.1 企业招聘信息（company/location/remote/job_type/salary）
//   TalentCard     — §15.2 社区人才信息（昵称/期望职位/技能标签，contact 永不展示）
import React from 'react';

const JT_LABEL = { full_time:'全职', part_time:'兼职', intern:'实习' };

export function JobPostingCard({ job, onOpen }) {
  return (
    <div className="card" onClick={() => onOpen(job.id)}>
      <div className="c-top">
        <span className="c-cat">{job.company_name}</span>
        {job.remote ? <span className="lo">支持远程</span> : null}
      </div>
      <div className="c-t">{job.title}</div>
      <p className="c-d">
        {job.description.length > 50 ? job.description.slice(0, 50) + '…' : job.description}
      </p>
      <div className="c-f">
        <span className="lo">{job.location || '地点面议'} · {JT_LABEL[job.job_type] || job.job_type || '全职'}{job.salary_range ? ` · ${job.salary_range}` : ''}</span>
        <span className="lo">JD →</span>
      </div>
    </div>
  );
}

export function TalentCard({ talent, onOpen }) {
  return (
    <div className="card" onClick={() => onOpen(talent.id)}>
      <div className="c-top">
        <span className="c-cat">{talent.expected_role || '求职者'}</span>
        <span className="lo">求职中</span>
      </div>
      <div className="c-t">{talent.nickname}</div>
      <p className="c-d">
        {talent.work_experience && talent.work_experience.length > 50
          ? talent.work_experience.slice(0, 50) + '…'
          : talent.work_experience || talent.bio || '—'}
      </p>
      {(talent.skill_tags || []).length > 0 && (
        <div className="c-tags" style={{ margin:'8px 0 4px' }}>
          {talent.skill_tags.slice(0, 4).map((t, i) => <span key={i} className="tag">#{t}</span>)}
        </div>
      )}
      <div className="c-f">
        <span className="lo">{(talent.expected_city || '城市不限')}{talent.expected_salary ? ` · ${talent.expected_salary}` : ''}</span>
        <span className="lo">看主页 →</span>
      </div>
    </div>
  );
}

// 兼容旧接口（旧 jobs 集合卡片）
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
