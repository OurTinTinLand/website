// 9.3 Hackathon
// 字段对齐 spec v1.1 §9.3 + §7.3
// 公开性质黑客松通常不审核；字段中 contact / email 永不返回给前台（隐私原则 15.4）
export const hackathons = [
  {id:'h1',title:'TinTinLand AI Agent 黑客松 2026',theme:'AI',prize_pool_usd:50000,cover:1,dog:1,
   start_at:'2026-09-05',end_at:'2026-09-07',deadline:'2026-09-01',content_source:'native',
   signup_review_required:false,
   tracks:[{name:'AI Agent 应用',prize:20000},{name:'RAG 与知识引擎',prize:18000},{name:'多模态创意',prize:12000}],
   judging:[['技术完成度','40%'],['创新性','30%'],['商业可行性','20%'],['演示表现','10%']],
   desc:'面向华语开发者的 AI Agent 主题黑客松，三大赛道，评审来自合作公链与投资机构，优胜项目直通孵化通道。'},

  {id:'h2',title:'AI × Web3 融合创新赛',theme:'AI×Web3',prize_pool_usd:80000,cover:2,dog:3,
   start_at:'2026-10-18',end_at:'2026-10-20',deadline:'2026-10-12',content_source:'native',
   signup_review_required:false,
   tracks:[{name:'链上 AI Agent',prize:40000},{name:'去中心化推理',prize:25000},{name:'开放赛道',prize:15000}],
   judging:[['技术完成度','35%'],['生态契合度','30%'],['创新性','25%'],['演示表现','10%']],
   desc:'与多家公链联合举办，探索 AI 与链上基础设施的结合点。'},

  {id:'h3',title:'ETHShanghai 2025 黑客松',theme:'Web3',prize_pool_usd:200000,cover:3,dog:0,
   start_at:'2025-09-20',end_at:'2025-09-22',deadline:'2025-09-15',content_source:'external_link',
   external_url:'https://dorahacks.io',
   signup_review_required:false,
   tracks:[{name:'智能合约开发',prize:80000},{name:'公链底层技术',prize:70000},{name:'基础设施',prize:50000}],
   judging:[],desc:'年度旗舰黑客松，300+ 队伍参赛。历史记录托管在 DoraHacks。'},

  {id:'h4',title:'曼谷波卡黑客松',theme:'Web3',prize_pool_usd:30000,cover:0,dog:4,
   start_at:'2025-11-16',end_at:'2025-11-17',deadline:'2025-11-10',content_source:'external_link',
   external_url:'https://dorahacks.io',
   signup_review_required:false,
   tracks:[{name:'智能合约开发',prize:18000},{name:'跨链与 Layer2',prize:12000}],
   judging:[],desc:'波卡生态专场，历史记录托管在外部平台。'},
];

// 7.3 黑客松组队报名字段（用于 FormModal 渲染）
// 公开字段：team / members / track；隐私字段：phone / email 仅运营可见
export const HACKATHON_SIGNUP_FIELDS = [
  ['team','团队名','required','前台展示'],
  ['members','成员（逗号分隔）','required','前台展示昵称，不展示联系方式'],
  ['github','GitHub 主页','optional','前台展示'],
  ['track','想参加的赛道','required','从 tracks 列表选择'],
];
