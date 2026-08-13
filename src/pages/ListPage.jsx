// 通用列表页：课程 / 活动 / 黑客松 / 招聘 / 应用工具 5 种 kind 共用
import React, { useState, useMemo } from 'react';
import { courses, events, hackathons } from '../data/index.js';
import { jobs } from '../data/jobs.js';
import { apps } from '../data/apps.js';
import { stateOf, dogUrl } from '../utils/constants';
import { ListFilters } from '../components/ListFilters';
import { Card } from '../components/Card';
import { JobCard } from '../components/JobCard';
import { AppCard } from '../components/AppCard';
import { useToast } from '../state/store';

const META = {
  courses:    { eyebrow:'Courses · /courses',     title:'课程',     desc:'AI 应用 / AI Agent / FDE / AI 短剧 / Web3 技术，覆盖直播、录播与训练营。状态按时间自动判断，运营不需要手工维护。' },
  events:     { eyebrow:'Events · /events',       title:'活动',     desc:'Meetup / AMA / Workshop / 中国行与全球行。内容型运营，与竞赛型的黑客松分开管理，避免筛选器混乱。' },
  hackathons: { eyebrow:'Hackathons · /hackathons', title:'黑客松',  desc:'独立板块：奖金池、赛道、评审标准、团队报名，与活动完全不同的字段结构。卡片把奖金池做成第一视觉。' },
  jobs:       { eyebrow:'Careers · /jobs',        title:'招聘',     desc:'TinTinLand 自有岗位 + 生态伙伴岗位。运营手动录入，数量不追求多，真实在招即可。' },
  apps:       { eyebrow:'Apps · /apps',           title:'应用工具', desc:'代理产品（云厂商代理，主推）+ 社区作品（社区自研，曝光用）。本周先做统一卡片列表与「申请上架」表单。',
                extraBanner: '本周目标为占位页：卡片结构与上架表单完整，真实产品数据由运营上线后持续补充，不阻塞主线开发。',
                extraAction: ['申请上架', 'app'] },
};

const DATA = { courses, events, hackathons, jobs, apps };

export function ListPage({ kind, onOpen, onApply, onConsult }) {
  const meta = META[kind];
  const all  = DATA[kind];
  const toast = useToast();

  const [filter, setFilter] = useState(
    kind === 'jobs' || kind === 'apps'
      ? { cat:'all' }
      : { st:'all', cat:'all', src:'all' }
  );

  const cats = useMemo(() => {
    if (kind === 'apps') return ['代理产品','社区作品'];
    const key = kind === 'courses' ? 'category' : (kind === 'events' ? 'tag' : (kind === 'hackathons' ? 'theme' : 'role'));
    return [...new Set(all.map((x) => x[key]))];
  }, [kind, all]);

  const items = useMemo(() => {
    return all.filter((x) => {
      if (filter.st && filter.st !== 'all') {
        const s = stateOf(x.start_at, x.end_at);
        if (s !== filter.st) return false;
      }
      if (filter.cat && filter.cat !== 'all') {
        const k = kind === 'courses' ? 'category' : (kind === 'events' ? 'tag' : (kind === 'hackathons' ? 'theme' : (kind === 'jobs' ? 'role' : 'type')));
        if (kind === 'apps') {
          if (filter.cat === '代理产品' && x.type !== 'agency') return false;
          if (filter.cat === '社区作品' && x.type !== 'community') return false;
        } else if (x[k] !== filter.cat) return false;
      }
      if (filter.src && filter.src !== 'all' && x.content_source !== filter.src) return false;
      return true;
    });
  }, [all, filter, kind]);

  return (
    <div className="container page-section">
      <div className="sec-head">
        <div><span className="eyebrow">{meta.eyebrow}</span><h2>{meta.title}</h2></div>
        <div className="sec-desc">{meta.desc}</div>
        {meta.extraAction && (
          <button className="btn btn-pop btn-sm" onClick={() => onApply(meta.extraAction[1])}>{meta.extraAction[0]}</button>
        )}
      </div>

      {meta.extraBanner && (
        <div className="banner"><span>ℹ</span><div>{meta.extraBanner}</div></div>
      )}

      <ListFilters
        kind={kind}
        filter={filter}
        setFilter={setFilter}
        categories={cats}
      />

      <div style={{ display:'flex', alignItems:'center', marginBottom: 16 }}>
        <div className="count" style={{ marginLeft:'auto' }}>{items.length} 条结果</div>
      </div>

      {items.length === 0
        ? (
          <div className="empty" style={{ gridColumn:'1/-1' }}>
            <img src={dogUrl('dog-sleep')} alt="" />
            这个筛选条件下暂时没有内容，换个条件试试
          </div>
        )
        : (
          <div className="grid">
            {kind === 'jobs'
              ? items.map((j) => <JobCard key={j.id} job={j} onOpen={onOpen} onApply={() => onApply('job', j.id, j.title)} />)
              : kind === 'apps'
                ? items.map((a) => <AppCard key={a.id} app={a} onConsult={() => onConsult('app-contact')} />)
                : items.map((it) => (
                    <Card key={it.id} item={it} kind={kind} onOpen={onOpen} onApply={() => onApply(kind === 'courses' ? 'course' : (kind === 'events' ? 'event' : (kind === 'hackathons' ? 'hackathon' : 'app')), it.id, it.title)} />
                  ))
            }
          </div>
        )}
    </div>
  );
}
