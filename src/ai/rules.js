// 假 AI 规则引擎（原 RULES + FALLBACK + matchRule 等价物）
// CTA 改成闭包数组（每条消息独立），helpers 由调用方注入（navigate/openForm/openLogin/openDetail）
import { courses, hackathons, events, jobs } from '../data/index.js';

const $n = (helpers, page)            => () => helpers.navigate(page);
const $d = (helpers, kind, id)        => () => { helpers.navigate(`${kind}/${id}`); helpers.closeAll(); };
const $t = (helpers, n)               => () => { helpers.navigate('tokenhub'); setTimeout(() => helpers.setThTab(n), 50); };
const $o = (helpers, kind)            => () => { helpers.openForm(kind); };
const $l = (helpers, kind, id)        => () => helpers.openDetail(kind, id);

export const RULES = [
  {
    intent:'enterprise',
    kw:['办活动','项目方','企业','公司','转型','咨询','tob','商务','bd','生态合作','找kol','全案','市场宣传'],
    reply:'企业和项目方这边有三条线：AI 转型咨询、生态合作全案、云与 Token 代理。想聊哪一块？',
    recs: () => [],
    ctas: (h) => [
      ['看企业服务',   $n(h, 'enterprise')],
      ['直接联系顾问', $o(h, 'enterprise-ai'), 'sec'],
    ],
  },
  {
    intent:'tokenhub',
    kw:['token','充值','大模型','api key','额度','算力','gpt','claude','采购','分销','token hub'],
    reply:'Token Hub 是我们帮大模型厂商做的分销对接。本周走「提交意向 → 人工对接开通」，不接自动扣费——资金和额度风控一周做不扎实，先用人工方式跑通。',
    recs: () => [],
    ctas: (h) => [
      ['看渠道介绍',   $n(h, 'tokenhub')],
      ['直接提交意向单',$t(h, 3), 'sec'],
    ],
  },
  {
    intent:'hackathon',
    kw:['黑客松','hackathon','比赛','奖金','打场','组队','赛道'],
    reply:'最近有两场在报名，奖金池和赛道都定了：',
    recs: () => [hackathons[0], hackathons[1]],
    ctas: (h) => [
      ['看全部黑客松',     $n(h, 'hackathons')],
      ['看最近这场详情',   $l(h, 'hackathons', 'h1'), 'sec'],
    ],
  },
  {
    intent:'event',
    kw:['工作坊','workshop','活动','meetup','ama','线下','聚会','沙龙','大会','峰会'],
    reply:'近期活动有这些，线上线下都有：',
    recs: () => [events[0], events[2]],
    ctas: (h) => [
      ['看全部活动',     $n(h, 'events')],
      ['报名上海 Meetup',$l(h, 'events', 'e1'), 'sec'],
    ],
  },
  {
    intent:'job',
    kw:['工作','招聘','岗位','job','求职','简历','面试','招人','内推'],
    reply:'目前在招这几个，都可以直接投：',
    recs: () => [jobs[0], jobs[2]],
    ctas: (h) => [
      ['看全部岗位',     $n(h, 'jobs')],
      ['投递 FDE 岗位', $l(h, 'jobs', 'j1'), 'sec'],
    ],
  },
  {
    intent:'course',
    kw:['课','学','learn','培训','训练营','入门','小白','agent','ai应用'],
    reply:'想学东西的话，我按「有人带 + 能做出东西」这个标准给你挑了两个：',
    recs: () => [courses[0], courses[2]],
    ctas: (h) => [
      ['去课程板块看全部', $n(h, 'courses')],
      ['直接报名训练营',   $l(h, 'courses', 'c1'), 'sec'],
    ],
  },
  {
    intent:'about',
    kw:['随便','看看','你们是谁','介绍','关于','团队','tintinland','实力','数据'],
    reply:'一句话：2018 年做到现在的华语最大 Web3 开发者社区，30 万+ 开发者、$370 万+ 累计奖励、800+ 孵化项目，2026 年起把这套能力延伸到 AI 方向。',
    recs: () => [],
    ctas: (h) => [
      ['看关于我们',   $n(h, 'about')],
      ['看最新动态',   () => { h.navigate('home'); setTimeout(() => h.scrollTo(760), 150); }, 'sec'],
    ],
  },
];

export const FALLBACK = {
  intent:'fallback',
  reply:'这个我还没学会。你可以先看看这几个板块，或留言让团队来找你：',
  recs: () => [],
  ctas: (h) => [
    ['课程',         $n(h, 'courses'),      ],
    ['活动',         $n(h, 'events'),       'sec'],
    ['黑客松',       $n(h, 'hackathons'),   'sec'],
    ['招聘',         $n(h, 'jobs'),         'sec'],
    ['留言联系团队', $o(h, 'enterprise-ai'),'sec'],
  ],
};

export function matchRule(text) {
  const t = String(text || '').toLowerCase();
  for (const r of RULES) {
    if (r.kw.some((k) => t.includes(k))) return r;
  }
  return FALLBACK;
}