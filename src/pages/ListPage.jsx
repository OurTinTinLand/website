// 列表页：课程 / 活动 / 黑客松 / 招聘 / 应用工具
// spec §7.1.1 课程支持二级子类筛选；tags 不作为筛选入口（spec §7.1.1）
import React, { useState, useMemo, useEffect } from 'react';
import { courses, events, hackathons, JOB_ROLES, EVENT_TAGS, COURSE_CATEGORIES } from '../data/index.js';
import { jobs } from '../data/jobs.js';
import { apps } from '../data/apps.js';
import { stateOf, dogUrl } from '../utils/constants';
import { ListFilters } from '../components/ListFilters';
import { Card } from '../components/Card';
import { JobCard } from '../components/JobCard';
import { AppCard } from '../components/AppCard';

const META = {
  courses:    { kick:'Courses',    title:'课程',     desc:'AI 应用 / AI Agent·FDE / AI 短剧 / Web3 技术（Web3 展开 6 子类）。状态按时间自动判断。' },
  events:     { kick:'Events',     title:'活动',     desc:'Meetup / AMA / Workshop / 中国行与全球行。内容型运营，与竞赛型的黑客松分开管理。' },
  hackathons: { kick:'Hackathons', title:'黑客松',   desc:'奖金池、赛道、评审标准、组队报名。字段结构与活动完全不同，所以独立成板块。' },
  jobs:       { kick:'Careers',    title:'招聘',     desc:'自有岗位 + 生态伙伴岗位 + 社区人才信息。数量不追求多，挂出来的都在真招。' },
  apps:       { kick:'Apps',       title:'应用工具', desc:'代理产品（云厂商代理，主推）+ 社区作品（社区自研，曝光用）。',
                extraBanner: '本周目标是占位页：卡片结构与上架表单完整，真实产品数据由运营上线后补，不阻塞主线。',
                extraAction: ['申请上架', 'app'] },
};

const DATA = { courses, events, hackathons, jobs, apps };

export function ListPage({ kind, onOpen, onApply, onConsult }) {
  const meta = META[kind];
  const all = DATA[kind];

  const [filter, setFilter] = useState(
    kind === 'jobs' || kind === 'apps'
      ? { cat:'all', sub:'all' }
      : { st:'all', cat:'all', sub:'all', src:'all' }
  );

  // 分类筛选候选：每个 kind 用 spec §7 中定义的枚举
  const cats = useMemo(() => {
    if (kind === 'apps')     return ['代理产品','社区作品'];
    if (kind === 'courses')  return COURSE_CATEGORIES;
    if (kind === 'events')   return EVENT_TAGS;
    if (kind === 'jobs')     return JOB_ROLES;
    if (kind === 'hackathons') {
      return [...new Set(all.map((x) => x.theme))];
    }
    return [];
  }, [kind, all]);

  const items = useMemo(() => {
    return all.filter((x) => {
      // 状态
      if (filter.st && filter.st !== 'all') {
        if (stateOf(x.start_at, x.end_at) !== filter.st) return false;
      }
      // 一级分类
      if (filter.cat && filter.cat !== 'all') {
        if (kind === 'apps') {
          if (filter.cat === '代理产品' && x.type !== 'agency') return false;
          if (filter.cat === '社区作品' && x.type !== 'community') return false;
        } else if (kind === 'jobs') {
          if (x.role !== filter.cat) return false;
        } else if (kind === 'courses') {
          if (x.category !== filter.cat) return false;
        } else if (kind === 'events') {
          if (x.tag !== filter.cat) return false;
        } else if (kind === 'hackathons') {
          if (x.theme !== filter.cat) return false;
        }
      }
      // 二级子类（仅课程 + 仅 Web3 技术）
      if (kind === 'courses' && filter.sub && filter.sub !== 'all' && x.category === 'Web3 技术') {
        if (x.subcategory !== filter.sub) return false;
      }
      // 来源
      if (filter.src && filter.src !== 'all' && x.content_source !== filter.src) return false;
      return true;
    });
  }, [all, filter, kind]);

  // 写 count
  useEffect(() => {
    const el = document.getElementById('n-' + kind);
    if (el) el.textContent = `${items.length} 条`;
  }, [items, kind]);

  return (
    <section className="page page-section">
      <div className="wrap">
        <div className="sec-h">
          <div>
            <span className="kick">{meta.kick}</span>
            <h2 className="t2">{meta.title}</h2>
          </div>
          <p className="lead">{meta.desc}</p>
          {meta.extraAction && (
            <button className="btn btn-line" onClick={() => onApply(meta.extraAction[1])}>{meta.extraAction[0]}</button>
          )}
        </div>

        {meta.extraBanner && (
          <div className="banner"><span>ℹ</span><div>{meta.extraBanner}</div></div>
        )}

        <ListFilters kind={kind} filter={filter} setFilter={setFilter} categories={cats} />

        {items.length === 0 ? (
          <div className="empty">
            <img src={dogUrl('dog-sleep')} alt="" />
            这个筛选条件下暂时没有内容，换个条件试试
          </div>
        ) : (
          <div className="grid">
            {kind === 'jobs'
              ? items.map((j) => <JobCard key={j.id} job={j} onOpen={onOpen} />)
              : kind === 'apps'
                ? items.map((a) => <AppCard key={a.id || a.name} app={a} onConsult={() => onConsult('app-contact')} />)
                : items.map((it) => (
                    <Card key={it.id} item={it} kind={kind} onOpen={onOpen} />
                  ))
            }
          </div>
        )}
      </div>
    </section>
  );
}
