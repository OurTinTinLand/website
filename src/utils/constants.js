// 全局常量：TODAY / 状态判断 / 封面图 / 吉祥物 / 路由映射 / 表单定义
export const TODAY = new Date('2026-08-12');

export const stateOf = (s, e) => {
  const a = new Date(s), b = new Date(e || s);
  if (TODAY < a) return 'upcoming';
  if (TODAY > b) return 'past';
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

// 表单定义：场景化报名表单的元数据
export const FORM_DEF = {
  course:    { title:'课程报名',          fields:[['name','姓名'],['email','邮箱'],['phone','手机号（用于开课通知）'],['bg','技术背景']] },
  event:     { title:'活动报名',          fields:[['name','姓名'],['email','邮箱'],['phone','手机号'],['city','所在城市'],['role','身份（开发者/项目方/其他）'],['src','怎么知道这场活动的']] },
  hackathon: { title:'黑客松组队报名',    fields:[['team','团队名'],['members','成员（逗号分隔）'],['github','GitHub 主页'],['track','想参加的赛道']] },
  job:       { title:'投递简历',          fields:[['name','姓名'],['email','邮箱'],['github','GitHub / 作品集链接'],['resume','简历（原型：填写链接代替上传）']] },
  app:       { title:'申请上架工具',      fields:[['name','工具名称'],['url','产品链接'],['contact','联系方式'],['intro','一句话介绍']] },
  'app-contact':      { title:'咨询代理产品',  fields:[['name','姓名'],['contact','联系方式'],['need','需求描述']] },
  'enterprise-ai':    { title:'AI 转型咨询',   fields:[['company','公司名称'],['name','联系人'],['contact','联系方式'],['need','目前想解决的问题']] },
  'enterprise-eco':   { title:'生态合作方案',  fields:[['company','项目 / 机构名称'],['name','联系人'],['contact','联系方式'],['need','合作诉求']] },
};