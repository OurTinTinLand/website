// 招聘：spec v1.1 §7.4 + §15
// 角色枚举：工程 / 运营 / BD / 设计（已删除 AI 角色）
// §15.1 企业招聘信息字段 + §15.2 人才信息字段
export const jobs = [
  {id:'j1',title:'AI 解决方案工程师（FDE）',role:'工程',company:'TinTinLand',city:'上海',remote:true,
   job_type:'full_time',
   desc:'负责企业客户 AI 转型方案的落地交付，需要有真实项目交付经验，能独立面对客户。',
   reqs:['3 年以上工程或咨询经验','熟悉主流大模型 API 与 RAG 工程实践','能独立完成客户沟通与方案演示','有企业内训或咨询经验优先'],
   contact:'hr@tintin.land',   // 仅运营可见，§15.1
   salary_range:'25K-45K · 14 薪',
   review_status:'verified',
   content_source:'native'},

  {id:'j2',title:'生态合作 BD',role:'BD',company:'生态伙伴',city:'新加坡',remote:false,
   job_type:'full_time',
   desc:'对接公链与项目方，推动生态活动与黑客松合作落地。',
   reqs:['2 年以上 Web3 或 AI 行业 BD 经验','英文可作为工作语言','有公链或投资机构资源优先'],
   contact:'bd@eco-partner.io',
   salary_range:'面议',
   review_status:'verified',
   content_source:'native'},

  {id:'j3',title:'社区运营经理',role:'运营',company:'TinTinLand',city:'远程',remote:true,
   job_type:'full_time',
   desc:'负责社区内容运营与活动组织，把 30 万开发者的存量盘活。',
   reqs:['有技术社区运营经验','中英双语','熟悉 Discord / Telegram / 微信生态'],
   contact:'hr@tintin.land',
   salary_range:'18K-30K · 14 薪',
   review_status:'verified',
   content_source:'native'},

  {id:'j4',title:'品牌设计师（含吉祥物延展）',role:'设计',company:'TinTinLand',city:'上海',remote:true,
   job_type:'full_time',
   desc:'负责官网、活动物料与 TinTin 吉祥物的视觉延展。',
   reqs:['熟悉 Figma 与设计系统搭建','有 IP 形象延展经验优先','能与开发协同交付 Design Token'],
   contact:'hr@tintin.land',
   salary_range:'20K-35K · 14 薪',
   review_status:'verified',
   content_source:'native'},
];

// 招聘列表角色枚举（spec §7.4 已删 AI）
export const JOB_ROLES = ['工程','运营','BD','设计'];

// §15.2 人才信息 mock（社区用户发布的求职信息）
// contact 字段前台永不返回（§15.3）
export const talentProfiles = [
  {id:'t1',nickname:'阿岛',user_id:'u-t1',
   expected_role:'前端工程师',work_experience:'3 年大厂前端，1 年 Web3 DApp',
   skill_tags:['React','TypeScript','Solidity','ethers.js'],
   bio:'想做链上与 AI 结合的开发者工具，找远程团队。',
   expected_salary:'30K-45K',expected_city:'远程优先 / 杭州可考虑',
   resume_url:'',     // 空 = 用户未上传，前台就不展示简历入口
   status:'looking'},
  {id:'t2',nickname:'Marvin',user_id:'u-t2',
   expected_role:'AI Agent 工程师',work_experience:'前大厂 NLP，做过 RAG 与工具调用 Agent',
   skill_tags:['Python','LangChain','Agent','RAG','Prompt'],
   bio:'对 AI 应用层与 Agent 工程化感兴趣，希望加入创业团队。',
   expected_salary:'40K-60K',expected_city:'北京 / 远程',
   resume_url:'https://marvin.dev/cv',
   status:'looking'},
  {id:'t3',nickname:'小九',user_id:'u-t3',
   expected_role:'社区运营',work_experience:'3 年技术社区运营经验',
   skill_tags:['社区运营','内容','活动','双语'],
   bio:'想把开发者社区盘活，希望找 Web3 或 AI 方向。',
   expected_salary:'15K-25K',expected_city:'上海',
   resume_url:'',
   status:'open_to_chat'},
];

// 招聘投递字段（spec §15.1）
export const JOB_APPLY_FIELDS = [
  ['name','姓名','required'],
  ['email','邮箱','required'],
  ['phone','手机号','required'],
  ['github','GitHub / 作品集','optional'],
  ['resume','简历链接','optional'],
  ['cover','一句话自荐','optional'],
];
