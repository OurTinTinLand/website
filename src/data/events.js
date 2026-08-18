// 9.2 Event
// 字段对齐 spec v1.1 §9.2 + §7.2.1 活动报名表单
// 标签枚举按 spec：AMA / Workshop / Meetup / Tour / Conference（已删除 Party）
export const events = [
  {id:'e1',title:'上海 AI × Web3 开发者 Meetup',type:'线下',city:'上海',tag:'Meetup',cover:0,dog:1,
   start_at:'2026-08-20',end_at:'2026-08-20',content_source:'native',
   signup_review_required:false,            // 完全开放
   signup_fields_config:{ name:'required', email:'required', phone:'required',
                          company:'optional', title:'optional', notify:'optional' },
   desc:'聚焦 AI Agent 与 Web3 结合的真实落地案例，4 位讲者 + 自由交流。限 120 人。',
   agenda:[['19:00','签到与自由交流'],['19:30','主题分享 ×4'],['21:00','项目路演 + Networking']]},

  {id:'e2',title:'新加坡 AI 创业者交流周',type:'线下',city:'新加坡',tag:'Tour',cover:1,dog:4,
   start_at:'2026-08-10',end_at:'2026-08-14',content_source:'native',
   signup_review_required:true,             // 跨境 Tour，需审核资质
   signup_fields_config:{ name:'required', email:'required', phone:'required',
                          company:'required', title:'required', notify:'optional' },
   desc:'为期一周的系列交流，覆盖新加坡本地 AI 创业社群、投资机构与华语开发者。',
   agenda:[['D1','开幕 Mixer'],['D3','投资人闭门圆桌'],['D5','Demo Day']]},

  {id:'e3',title:'AI Agent 线上 AMA：从 Demo 到生产',type:'线上',city:'线上',tag:'AMA',cover:2,dog:0,
   start_at:'2026-09-03',end_at:'2026-09-03',content_source:'native',
   signup_review_required:false,
   signup_fields_config:{ name:'required', email:'required', phone:'optional',
                          company:'optional', title:'optional', notify:'optional' },
   desc:'邀请三位一线工程师聊 Agent 从演示到真实生产环境要踩的坑，全程互动答疑。',
   agenda:[['20:00','嘉宾分享'],['20:40','观众提问']]},

  {id:'e4',title:'ETHShanghai 2025',type:'线下',city:'上海',tag:'Conference',cover:3,dog:3,
   start_at:'2025-09-20',end_at:'2025-09-22',content_source:'external_link',
   external_url:'https://lu.ma',
   signup_review_required:false,
   signup_fields_config:{},
   desc:'年度顶级峰会全案服务案例，2000+ 参会者。历史记录托管在 Luma。',agenda:[]},

  {id:'e5',title:'曼谷波卡黑客松系列 AMA',type:'混合',city:'曼谷',tag:'AMA',cover:0,dog:2,
   start_at:'2025-11-16',end_at:'2025-11-16',content_source:'external_link',
   external_url:'https://lu.ma',
   signup_review_required:false,
   signup_fields_config:{},
   desc:'11 月 16 日曼谷波卡黑客松的配套线上 AMA，历史记录托管在 Luma。',agenda:[]},

  {id:'e6',title:'TinTinLand 中国行 · 高校巡回',type:'线下',city:'多城市',tag:'Tour',cover:1,dog:1,
   start_at:'2025-04-01',end_at:'2025-06-30',content_source:'external_link',
   external_url:'https://lu.ma',
   signup_review_required:false,
   signup_fields_config:{},
   desc:'覆盖 12 所高校的技术布道巡回，历史记录托管在 Luma。',agenda:[]},

  {id:'e7',title:'AI 创业 Workshop · 一天把 BP 写完',type:'线下',city:'北京',tag:'Workshop',cover:2,dog:3,
   start_at:'2026-09-12',end_at:'2026-09-12',content_source:'native',
   signup_review_required:true,             // 名额限定 30 人
   signup_fields_config:{ name:'required', email:'required', phone:'required',
                          company:'required', title:'required', notify:'optional' },
   desc:'一天高强度 Workshop，覆盖 BP 结构、估值逻辑与融资节奏，30 人小班。',
   agenda:[['09:00','BP 结构拆解'],['13:30','估值与融资实战'],['17:00','一对一路演模拟']]},
];

// 7.2 活动标签枚举（已删 Party）
export const EVENT_TAGS = ['AMA','Workshop','Meetup','Tour','Conference'];

// 7.2.1 活动报名表单字段配置
export const EVENT_SIGNUP_FIELDS = [
  ['name','姓名','required','—'],
  ['email','邮箱','required','—'],
  ['phone','手机号','required','—'],
  ['company','公司','optional','运营可按活动类型在后台改为必选'],
  ['title','职位','optional','运营可按活动类型在后台改为必选'],
  ['notify','接收后续活动通知','optional','默认勾选，可取消'],
];
