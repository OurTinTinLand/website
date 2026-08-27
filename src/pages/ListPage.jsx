// 列表页：课程 / 活动 / 黑客松 / 招聘（§15 双 tab：企业岗位 + 人才广场）/ 应用工具
// spec v1.1 §7.1.1 课程支持二级子类筛选；tags 不作为筛选入口（spec §7.1.1）
// V1.1 真实接入：catalog 从 store 取（PB 优先 → seed fallback）
import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../state/store';
import { stateOf, dogUrl } from '../utils/constants';
import { ListFilters } from '../components/ListFilters';
import { Card } from '../components/Card';
import { JobPostingCard, TalentCard } from '../components/JobCard';
import { AppCard } from '../components/AppCard';

const META = {
  courses:    { kick:'Courses',    title:'课程',     desc:'AI 应用 / AI Agent·FDE / AI 短剧 / Web3 技术。' },
  events:     { kick:'Events',     title:'活动',     desc:'Meetup / AMA / Workshop / 中国行与全球行。' },
  hackathons: { kick:'Hackathons', title:'黑客松',   desc:'奖金池、赛道、评审标准、组队报名。' },
  jobs:       { kick:'Careers',    title:'招聘',     desc:'企业岗位 + 社区人才广场。企业发布在左，人才在右；联系方式一律由平台代为触达。' },
  apps:       { kick:'Apps',       title:'应用工具', desc:'代理产品 + 社区作品。',
                extraAction: ['申请上架', 'app'] },
};

export function ListPage({ kind, onOpen, onApply, onConsult, onPublishTalent }) {
  const meta = META[kind];
  const { catalog } = useStore();
  const [jobsTab, setJobsTab] = useState('postings'); // §15 招聘双 tab

  // 数据源：PB catalog 优先，seed fallback
  const all = useMemo(() => {
    if (kind === 'courses') return catalog?.courses ?? [];
    if (kind === 'events')  return catalog?.events ?? [];
    if (kind === 'hackathons') return catalog?.hackathons ?? [];
    if (kind === 'jobs')    return catalog?.jobPostings ?? [];
    if (kind === 'apps')    return catalog?.apps ?? [];
    return [];
  }, [catalog, kind]);

  const talents = useMemo(() => catalog?.talents ?? [], [catalog]);

  const [filter, setFilter] = useState(
    kind === 'jobs' || kind === 'apps'
      ? { cat:'all', sub:'all' }
      : { st:'all', cat:'all', sub:'all', src:'all' }
  );

  const cats = useMemo(() => {
    if (kind === 'apps')     return ['代理产品','社区作品'];
    if (kind === 'courses')  return ['AI 应用','AI Agent·FDE','AI 短剧','Web3 技术'];
    if (kind === 'events')   return [...new Set(all.map((x) => x.tag).filter(Boolean))];
    if (kind === 'hackathons') return [...new Set(all.map((x) => x.theme).filter(Boolean))];
    if (kind === 'jobs')     return [...new Set(all.map((x) => x.company_name).filter(Boolean))];
    return [];
  }, [kind, all]);

  const talentCats = useMemo(
    () => [...new Set(talents.map((x) => x.expected_role).filter(Boolean))],
    [talents]
  );

  const items = useMemo(() => {
    if (kind === 'jobs' && jobsTab === 'talents') {
      return talents.filter((x) => {
        if (filter.cat && filter.cat !== 'all' && x.expected_role !== filter.cat) return false;
        return true;
      });
    }
    return all.filter((x) => {
      if (filter.st && filter.st !== 'all') {
        if (stateOf(x.start_at, x.end_at) !== filter.st) return false;
      }
      if (filter.cat && filter.cat !== 'all') {
        if (kind === 'apps') {
          if (filter.cat === '代理产品' && x.type !== 'agency') return false;
          if (filter.cat === '社区作品' && x.type !== 'community') return false;
        } else if (kind === 'courses') {
          if (x.category !== filter.cat) return false;
        } else if (kind === 'events') {
          if (x.tag !== filter.cat) return false;
        } else if (kind === 'hackathons') {
          if (x.theme !== filter.cat) return false;
        } else if (kind === 'jobs') {
          if (x.company_name !== filter.cat) return false;
        }
      }
      if (kind === 'courses' && filter.sub && filter.sub !== 'all' && x.category === 'Web3 技术') {
        if (x.subcategory !== filter.sub) return false;
      }
      if (filter.src && filter.src !== 'all' && x.content_source !== filter.src) return false;
      return true;
    });
  }, [all, talents, filter, kind, jobsTab]);

  // 写 count
  useEffect(() => {
    const el = document.getElementById('n-' + kind);
    if (el) el.textContent = `${items.length} 条`;
  }, [items, kind]);

  const showJobsTabs = kind === 'jobs';

  return (
    <section className="page page-section">
      <div className="wrap">
        <div className="sec-h">
          <div>
            <span className="kick">{meta.kick}</span>
            <h2 className="t2">{meta.title}</h2>
          </div>
          <p className="lead">{meta.desc}</p>
        </div>

        {catalog?._source === 'fallback' && (
          <div className="banner"><span>ℹ</span><div>内容可能不是最新版本，请刷新页面重试</div></div>
        )}

        {showJobsTabs && (
          <div className="subs" style={{ marginBottom:16 }}>
            <button className={'sub' + (jobsTab === 'postings' ? ' on' : '')} onClick={() => { setJobsTab('postings'); setFilter({ cat:'all', sub:'all' }); }}>
              ① 企业岗位
            </button>
            <button className={'sub' + (jobsTab === 'talents' ? ' on' : '')} onClick={() => { setJobsTab('talents'); setFilter({ cat:'all', sub:'all' }); }}>
              ② 人才广场
            </button>
          </div>
        )}

        <ListFilters kind={kind} filter={filter} setFilter={setFilter} categories={jobsTab === 'talents' ? talentCats : cats} />

        {(meta.extraAction || (showJobsTabs && jobsTab === 'talents')) && (
          <div style={{ margin: '18px 0 26px' }}>
            {meta.extraAction && (
              <button className="btn btn-line" style={{ marginRight: 10 }} onClick={() => onApply(meta.extraAction[1])}>{meta.extraAction[0]}</button>
            )}
            {showJobsTabs && jobsTab === 'talents' && onPublishTalent && (
              <button className="btn btn-fill" onClick={onPublishTalent}>发布我的信息 · 找工作</button>
            )}
          </div>
        )}

        {items.length === 0 ? (
          <div className="empty">
            <img src={dogUrl('dog-sleep')} alt="" />
            这个筛选条件下暂时没有内容，换个条件试试
          </div>
        ) : (
          <div className="grid">
            {kind === 'jobs' && jobsTab === 'postings'
              ? items.map((j) => <JobPostingCard key={j.id} job={j} onOpen={onOpen} />)
              : kind === 'jobs' && jobsTab === 'talents'
                ? items.map((t) => <TalentCard key={t.id} talent={t} onOpen={onOpen} />)
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
