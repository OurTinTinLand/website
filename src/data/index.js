// 数据聚合：导入基础数据 + LEGACY 历史表，模块顶层执行 IIFE 展开
import { courses as _courses } from './courses.js';
import { events  as _events  } from './events.js';
import { hackathons as _hackathons } from './hackathons.js';
import { jobs as _jobs } from './jobs.js';
import { apps as _apps } from './apps.js';
import { LEGACY } from './timeline.js';

// 字段对齐 spec v1.1：LEGACY 历史内容统一标记外链、不可审核、不可支付
// tags / subcategory / signup_review_required / signup_fields_config
// 在历史内容上统一取安全默认值，前台只展示，不在前端构造表单
(function expandLegacy(){
  let ci=_courses.length, ei=_events.length, hi=_hackathons.length;
  LEGACY.forEach((row, idx)=>{
    const [kind, title, cat, start, end, url, desc, prize] = row;
    const cover = idx % 4, dog = idx % 5;
    if(kind === 'course'){
      _courses.push({
        id:'lc'+(++ci), title,
        category:cat, subcategory:null,
        tags:[],
        difficulty:'入门', form:'录播',
        price:{type:'free'}, cover, dog, start_at:start, end_at:end,
        content_source:'external_link', external_url:url,
        signup_review_required:false, signup_fields_config:{},
        teacher:'社区讲师', desc, outline:[]
      });
    } else if(kind === 'event'){
      _events.push({
        id:'le'+(++ei), title, type:(cat==='AMA'?'线上':'线下'),
        city:'—', tag:cat, cover, dog,
        start_at:start, end_at:end,
        content_source:'external_link', external_url:url,
        signup_review_required:false, signup_fields_config:{},
        desc, agenda:[]
      });
    } else {
      _hackathons.push({
        id:'lh'+(++hi), title, theme:cat, prize_pool_usd:prize,
        cover, dog,
        start_at:start, end_at:end, deadline:start,
        content_source:'external_link', external_url:url,
        signup_review_required:false,
        tracks:[{name:'详见原始赛事页', prize}], judging:[], desc
      });
    }
  });
})();

export const courses    = _courses;
export const events     = _events;
export const hackathons = _hackathons;
export const jobs       = _jobs;
export const apps       = _apps;

// 同步导出分类与字段配置常量
export {
  COURSE_CATEGORIES,
  COURSE_SUBCATEGORIES,
  COURSE_SIGNUP_FIELDS,
} from './courses.js';

export {
  EVENT_TAGS,
  EVENT_SIGNUP_FIELDS,
} from './events.js';

export {
  HACKATHON_SIGNUP_FIELDS,
} from './hackathons.js';

export {
  JOB_ROLES,
  talentProfiles,
  JOB_APPLY_FIELDS,
} from './jobs.js';
