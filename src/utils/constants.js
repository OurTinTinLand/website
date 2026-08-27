// 全局常量：状态判断 / 封面图 / 吉祥物 / 路由映射 / 表单定义
import {
  COURSE_SIGNUP_FIELDS,
  COURSE_CATEGORIES,
  COURSE_SUBCATEGORIES,
  EVENT_SIGNUP_FIELDS,
  EVENT_TAGS,
  HACKATHON_SIGNUP_FIELDS,
  JOB_ROLES,
  JOB_APPLY_FIELDS,
} from '../data/index.js';

export const stateOf = (s, e) => {
  const a = new Date(s), b = new Date(e || s);
  const now = new Date();
  if (now < a) return 'upcoming';
  if (now > b) return 'past';
  return 'ongoing';
};

export const ST = { past:'已结束', ongoing:'进行中', upcoming:'即将开始' };

export const COVERS = ['cv1','cv2','cv3','cv4'];
export const DOGS   = ['dog-sit','dog-skate','dog-guitar','dog-sleep','dog-harness'];
export const dogUrl = (n) => `assets-claude/brand/${n}.png`;

// 路由映射：原 ROUTE_PATH / PATH_ROUTE 等价物
// - /tokenhub 是当前实现；/token-hub 是 spec §4 的写法，做别名兼容
// - /auth/login / /auth/callback 承接 spec §4 的登录入口
export const ROUTE_PATH = {
  home:'/', courses:'/courses', events:'/events', hackathons:'/hackathons',
  jobs:'/jobs', tokenhub:'/tokenhub', apps:'/apps', enterprise:'/enterprise',
  about:'/about', member:'/member', admin:'/admin',
  authLogin:'/auth/login', authCallback:'/auth/callback',
  notFound:'/__notfound__',
};
export const PATH_ROUTE = Object.fromEntries(
  Object.entries(ROUTE_PATH).map(([k, v]) => [v, k])
);
PATH_ROUTE['/token-hub']     = 'tokenhub';
PATH_ROUTE['/auth/login']    = 'authLogin';
PATH_ROUTE['/auth/callback'] = 'authCallback';

// 课程分类（§7.1.1 宽泛版 4 类 + Web3 二级 6 子类）
export const COURSE_CATS = COURSE_CATEGORIES;
export const COURSE_SUBS = COURSE_SUBCATEGORIES;

// 字段元数据 → 元组 [key, label, required|optional, hint]
// FormModal 用 key+label 渲染，required/optional 决定前端是否校验
// 实际是否必填由具体内容的 signup_fields_config 控制（运营可在后台改）
export const FIELD_META = {
  name:     ['姓名',     'text',  { placeholder:'你的姓名' }],
  email:    ['邮箱',     'email', { placeholder:'you@example.com' }],
  phone:    ['手机号',   'tel',   { placeholder:'仅运营可见，用于通知' }],
  region:   ['地区',     'text',  { placeholder:'城市 / 国家' }],
  role:     ['职业',     'select', { options:['开发者','设计师','产品','运营','学生','项目方','其他'] }],
  tech_bg:  ['技术背景', 'textarea', { placeholder:'相关经验、栈、过往项目' }],
  age:      ['年龄',     'number', { placeholder:'可选' }],
  edu:      ['学历',     'select', { options:['高中','大专','本科','硕士','博士','其他'] }],
  notify:   ['接收后续课程通知', 'checkbox', { default:true }],
  city:     ['所在城市', 'text',  { placeholder:'线下活动报名时带出' }],
  github:   ['GitHub',  'text',  { placeholder:'黑客松与投递时带出' }],
  team:     ['团队名',   'text',  { placeholder:'你的队伍名称' }],
  members:  ['成员',     'text',  { placeholder:'昵称用逗号分隔；前台仅展示昵称' }],
  track:    ['想参加的赛道', 'text', { placeholder:'与黑客松 tracks 对应' }],
  resume:   ['简历',     'url',   { placeholder:'填写链接代替上传' }],
  cover:    ['一句话自荐','textarea', { placeholder:'可选' }],
  contact:  ['联系方式', 'text',  { placeholder:'手机 / 微信 / 邮箱均可' }],
  src:      ['怎么知道这场活动的', 'text', { placeholder:'可选' }],
  company:  ['公司',     'text',  { placeholder:'公司 / 机构名称' }],
  title:    ['职位',     'text',  { placeholder:'—' }],
  url:      ['产品链接', 'url',   { placeholder:'https://' }],
  intro:    ['一句话介绍','textarea', { placeholder:'—' }],
  need:     ['需求描述', 'textarea', { placeholder:'—' }],
};

// 场景化表单标题与字段配置（key 列表）
// 注意：实际是否必填走 signup_fields_config，这里只给默认字段集
export const FORM_DEF = {
  course:    {
    title:'课程报名',
    fields: COURSE_SIGNUP_FIELDS.map(([k, label, required]) => [k, label]),
    source:'course',
  },
  event:     {
    title:'活动报名',
    fields: EVENT_SIGNUP_FIELDS.map(([k, label]) => [k, label]),
    source:'event',
  },
  hackathon: {
    title:'黑客松组队报名',
    fields: HACKATHON_SIGNUP_FIELDS.map(([k, label]) => [k, label]),
    source:'hackathon',
  },
  job:       {
    title:'投递简历',
    fields: JOB_APPLY_FIELDS.map(([k, label]) => [k, label]),
    source:'job',
  },
  'job-posting': {
    title:'投递简历',
    fields: JOB_APPLY_FIELDS.map(([k, label]) => [k, label]),
    source:'job-posting',
  },
  'talent-post': {
    title:'发布人才信息',
    fields: [['nickname','姓名或昵称（允许昵称）'],['expected_role','期望职位方向'],['work_experience','工作经历'],['skill_tags','技能标签 · 英文逗号分隔'],['contact','联系方式（仅运营可见，企业通过平台联系你）'],['resume_url','简历 / 个人主页链接（可选）'],['bio','自我介绍（可选）'],['expected_salary','期望薪资（可选）'],['expected_city','期望工作城市（可选）']],
    source:'talent-post',
  },
  'talent-contact': {
    title:'发起联系',
    fields: [['company','公司 / 机构名称'],['name','联系人'],['contact','你的联系方式'],['need','想聊的方向 / 岗位']],
    source:'talent-contact',
  },
  app:       { title:'申请上架工具', fields:[['name','工具名称'],['url','产品链接'],['contact','联系方式'],['intro','一句话介绍']], source:'app' },
  'app-contact':    { title:'咨询代理产品', fields:[['name','姓名'],['contact','联系方式'],['need','需求描述']], source:'app-contact' },
  'enterprise-ai':  { title:'AI 转型咨询',  fields:[['company','公司名称'],['name','联系人'],['contact','联系方式'],['need','目前想解决的问题']], source:'enterprise-ai' },
  'enterprise-eco': { title:'生态合作方案', fields:[['company','项目 / 机构名称'],['name','联系人'],['contact','联系方式'],['need','合作诉求']], source:'enterprise-eco' },
};

// 招聘 / 活动 / 黑客松的角色 / 标签 / 类型 枚举（spec §7.2 §7.4）
export const ENUMS = {
  job_role: JOB_ROLES,            // ['工程','运营','BD','设计']
  event_tag: EVENT_TAGS,          // ['AMA','Workshop','Meetup','Tour','Conference']
  course_cat: COURSE_CATEGORIES,  // 4 类
  course_sub: COURSE_SUBCATEGORIES, // Web3 二级
};
