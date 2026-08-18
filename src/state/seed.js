// Store 初始数据：与原 index.html 一致（保留 o-1001/o-1002/t-2001 三条样例）
// spec v1.1 §8.3：顾问码改为下单即发，所以 seedOrder 里 advisor_code_sent=true
// §16.2：profile 扩展为完整字段（bio / resume_url / skill_tags / social_links）
export const seedSession = {
  logged: false,
  is_admin: false,
  method: '',
  user_id: '',
  email: '',
  profile: {
    name: '', phone: '', city: '', github: '',
    bio: '', resume_url: '',
    skill_tags: [],
    social_links: { github:'', x:'', telegram:'', linkedin:'' },
  },
};

export const seedOrders = [
  // spec §8.3：用户下单后立即发码；pending_review 表示运营待核实到账
  { id:'o-1001', user_id:'u-demo', user_email:'demo@tintinland.com',
    item_type:'course', item_id:'c1', item_title:'TinTin AI Agent 实战训练营',
    amount:2599, channel:'icbc_qr', status:'pending_review',
    advisor_code_sent:true, advisor_code_sent_at:'2026-08-11 21:04:12',
    resend_count:0, last_resend_at:'',
    created_at:'2026-08-11 21:04' },
  // 已核销订单：联系码已发过（在下单时即发），运营只更新状态
  { id:'o-1002', user_id:'u-wang', user_email:'wang@example.com',
    item_type:'course', item_id:'c2', item_title:'FDE 企业效能顾问训练营',
    amount:3999, channel:'icbc_qr', status:'verified',
    advisor_code_sent:true, advisor_code_sent_at:'2026-08-10 15:22:08',
    resend_count:0, last_resend_at:'',
    created_at:'2026-08-10 15:22' },
];

export const seedIntents = [
  { id:'t-2001', user_id:'u-li', user_email:'li@example.com',
    provider:'合作渠道 A', expected_volume:'1000 万 – 1 亿 tokens',
    contact:'li@example.com', status:'pending', created_at:'2026-08-11 18:40' },
];

export const seedOrderSeq = 1002;

// spec §14.4 报名/投递审核队列种子（独立维护，便于运营后台演示）
export const seedReviewQueue = [
  // 课程报名 — 需要审核（c1 训练营）
  { id:'r-3001', kind:'course', item_id:'c1', item_title:'TinTin AI Agent 实战训练营',
    applicant:'张三', email:'zhang@example.com', phone:'138****1234',
    fields:{ region:'上海', role:'开发者', tech_bg:'3 年前端 + 1 年 AI 应用', age:28, edu:'本科' },
    review_status:'pending', submitted_at:'2026-08-12 10:14' },
  // 活动报名 — 需要审核（e2 跨境 Tour）
  { id:'r-3002', kind:'event', item_id:'e2', item_title:'新加坡 AI 创业者交流周',
    applicant:'Lina', email:'lina@example.com', phone:'+65****1234',
    fields:{ company:'Acme AI', title:'CTO' },
    review_status:'pending', submitted_at:'2026-08-12 09:42' },
  // 黑客松报名 — 不需要审核（公开）
  { id:'r-3003', kind:'hackathon', item_id:'h1', item_title:'TinTinLand AI Agent 黑客松 2026',
    applicant:'Team Aurora', email:'team@aurora.dev', phone:'—',
    fields:{ team:'Aurora', members:'Aurora, K, Bob', track:'AI Agent 应用' },
    review_status:'auto_approved', submitted_at:'2026-08-11 23:51' },
  // 招聘投递 — 候选人投递企业岗位（需要审核）
  { id:'r-3004', kind:'job', item_id:'j1', item_title:'AI 解决方案工程师（FDE）',
    applicant:'王五', email:'wang5@example.com', phone:'139****5678',
    fields:{ github:'github.com/wang5', resume:'wang5.dev/cv' },
    review_status:'pending', submitted_at:'2026-08-12 11:08' },
  // 企业发布招聘信息 — 需要审核
  { id:'r-3005', kind:'job_posting', item_id:'j-new', item_title:'某生态合作机构 · 商务经理',
    applicant:'生态合作 BD', email:'bd@eco-partner.io', phone:'—',
    fields:{ company:'Eco Partner', location:'香港', job_type:'full_time' },
    review_status:'pending', submitted_at:'2026-08-12 08:30' },
  // 人才信息 — 需要审核
  { id:'r-3006', kind:'talent', item_id:'t-new', item_title:'人才信息 · 前端工程师',
    applicant:'阿岛', email:'(已脱敏)', phone:'(已脱敏)',
    fields:{ expected_role:'前端工程师', work_experience:'3 年大厂前端' },
    review_status:'pending', submitted_at:'2026-08-12 12:01' },
];
