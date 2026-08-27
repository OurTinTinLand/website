// 统一目录加载：优先从 PB API 拉；失败时降级到 src/data/index.js 的 seed
// 业务方：<App /> boot 时调用一次 loadAllCatalog()；
//        任意组件 useCatalog() 拿当前快照
import { useEffect, useState, useCallback } from 'react';
import * as PB from '../utils/pb-client.js';
import {
  courses as seedCourses, events as seedEvents,
  hackathons as seedHackathons, jobs as seedJobs,
  apps as seedApps,
} from '../data/index.js';
import { jobPostings as seedJobPostings, talentProfiles as seedTalents } from '../data/jobs.js';
import { providers as seedProviders } from '../data/providers.js';

const SEED = {
  courses: seedCourses, events: seedEvents,
  hackathons: seedHackathons, jobs: seedJobs,
  jobPostings: seedJobPostings, talents: seedTalents,
  apps: seedApps, providers: seedProviders,
  homeOps: { logoWall: null, hero: null, notifyTemplates: null, feedPin: [], raw: [] },
};

let _catalog = null;       // 全局缓存
let _loadingPromise = null; // 单飞：避免重复请求

export async function loadAllCatalog() {
  if (_catalog) return _catalog;
  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = (async () => {
    const result = { ...SEED, _source: 'fallback', _loadedAt: Date.now() };
    try {
      const [c, e, h, j, a, p, jp, tl, ho] = await Promise.all([
        PB.listCoursesNormalized({ perPage: 100 }),
        PB.listEventsNormalized({ perPage: 100 }),
        PB.listHackathonsNormalized({ perPage: 100 }),
        PB.listJobsNormalized({ perPage: 100 }),
        PB.listAppsNormalized({ perPage: 100 }),
        PB.listProvidersNormalized({ perPage: 100 }),
        PB.listJobPostingsNormalized({ perPage: 100 }),
        PB.listTalentProfilesNormalized({ perPage: 100 }),
        PB.listHomeOpsNormalized({ perPage: 20 }),
      ]);
      result.courses = c.length ? c : seedCourses;
      result.events = e.length ? e : seedEvents;
      result.hackathons = h.length ? h : seedHackathons;
      result.jobs = j.length ? j : seedJobs;
      result.apps = a.length ? a : seedApps;
      result.providers = p.length ? p : seedProviders;
      result.jobPostings = jp.length ? jp : seedJobPostings;
      result.talents = tl.length ? tl : seedTalents;
      result.homeOps = (ho && ho.raw && ho.raw.length) ? ho : SEED.homeOps;
      result._source = 'api';
    } catch (err) {
      console.warn('[catalog] PB unreachable, using seed:', err.message);
    } finally {
      _loadingPromise = null;
    }
    _catalog = result;
    return result;
  })();
  return _loadingPromise;
}

// React hook：返回 catalog 快照 + reload
export function useCatalog() {
  const [cat, setCat] = useState(_catalog);
  useEffect(() => {
    if (_catalog) { setCat(_catalog); return; }
    let cancelled = false;
    loadAllCatalog().then((c) => { if (!cancelled) setCat(c); });
    return () => { cancelled = true; };
  }, []);
  const reload = useCallback(async () => {
    _catalog = null;
    const fresh = await loadAllCatalog();
    setCat(fresh);
    return fresh;
  }, []);
  return [cat, reload];
}

// 用于 ListPage 等需要直接 await 的地方
export function getCatalog() {
  return _catalog || SEED;
}
