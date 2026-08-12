// Store 初始数据：与原 index.html 一致（保留 o-1001/o-1002/t-2001 三条样例）
export const seedSession = {
  logged: false,
  is_admin: false,
  method: '',
  user_id: '',
  email: '',
  profile: { name: '', phone: '', city: '', github: '' },
};

export const seedOrders = [
  { id:'o-1001', user_id:'u-demo', user_email:'demo@tintinland.com',
    item_type:'course', item_id:'c1', item_title:'TinTin AI Agent 实战训练营',
    amount:2599, channel:'icbc_qr', status:'pending_review',
    advisor_code_sent:false, created_at:'2026-08-11 21:04' },
  { id:'o-1002', user_id:'u-wang', user_email:'wang@example.com',
    item_type:'course', item_id:'c2', item_title:'FDE 企业效能顾问训练营',
    amount:3999, channel:'icbc_qr', status:'verified',
    advisor_code_sent:true, created_at:'2026-08-10 15:22' },
];

export const seedIntents = [
  { id:'t-2001', user_id:'u-li', user_email:'li@example.com',
    provider:'合作渠道 A', expected_volume:'1000 万 – 1 亿 tokens',
    contact:'li@example.com', status:'pending', created_at:'2026-08-11 18:40' },
];

export const seedOrderSeq = 1002;