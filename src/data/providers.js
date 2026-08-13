// Token Hub 渠道
// - settle: 结算方式
// - latency: 首字延迟（参考值，运营上线前用真实数据替换）
// - monthly: 月容量档位（用于 API/用量 tab）
// - models[].ctx / models[].price: 各模型上下文窗口与单千 token 价
export const providers = [
  {id:'p1',name:'合作渠道 A',tagline:'一线闭源旗舰，OpenAI / Anthropic 体系',
   models:'GPT 系列 / Claude 系列',price:'待运营补充',settle:'月结',todo:true,
   latency:'~0.6s', monthly:['< 1 亿', '1-10 亿', '10 亿+'],
   modelsDetail:[
     {name:'GPT-4o',           ctx:'128K',  in:'$2.50', out:'$10.00'},
     {name:'GPT-4o mini',      ctx:'128K',  in:'$0.15', out:'$0.60'},
     {name:'Claude 3.5 Sonnet',ctx:'200K',  in:'$3.00', out:'$15.00'},
     {name:'Claude 3 Haiku',   ctx:'200K',  in:'$0.25', out:'$1.25'},
   ]},
  {id:'p2',name:'合作渠道 B',tagline:'国产主流模型全系，长上下文与中文强',
   models:'国产主流模型全系',price:'待运营补充',settle:'预充值',todo:true,
   latency:'~0.8s', monthly:['< 5000 万', '5000 万 - 5 亿', '5 亿+'],
   modelsDetail:[
     {name:'DeepSeek V3',    ctx:'64K',  in:'¥1.20', out:'¥1.20'},
     {name:'Qwen2.5 72B',    ctx:'128K', in:'¥0.80', out:'$2.00'},
     {name:'GLM-4 Plus',     ctx:'128K', in:'¥1.00', out:'¥1.00'},
     {name:'Doubao Pro',     ctx:'32K',  in:'¥0.80', out:'$2.00'},
   ]},
  {id:'p3',name:'合作渠道 C',tagline:'开源模型自托管推理，私有化部署友好',
   models:'开源模型托管推理',price:'待运营补充',settle:'按量后付',todo:true,
   latency:'~1.1s', monthly:['自托管 GPU 时', '推理调用量', '混合计费'],
   modelsDetail:[
     {name:'Llama 3.1 70B',  ctx:'128K', in:'自托管', out:'自托管'},
     {name:'Qwen2.5 32B',    ctx:'128K', in:'自托管', out:'自托管'},
     {name:'Mixtral 8x22B',  ctx:'64K',  in:'自托管', out:'自托管'},
   ]},
];

// 通用用量档位
export const USAGE_TIERS = [
  { tier:'< 100 万 / 月',         hint:'轻量验证 / 个人开发者',           sla:'邮件支持'           },
  { tier:'100 万 – 1000 万 / 月',  hint:'小团队接入、自有产品跑通',         sla:'专属顾问 + 工作时段' },
  { tier:'1000 万 – 1 亿 / 月',    hint:'中型业务、有稳定性与并发要求',     sla:'7×24 群 + 月度复盘' },
  { tier:'1 亿+ / 月',             hint:'大型业务 / 多业务线并行',          sla:'技术经理驻场 + SLA'  },
];

// 接口样例（任何 OpenAI 兼容协议都通用）
export const API_SNIPPET = `# OpenAI 兼容协议 - 任意渠道通用
import requests

resp = requests.post(
    "https://gateway.tintinland.com/v1/chat/completions",
    headers={"Authorization": "Bearer <YOUR_KEY>"},
    json={
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": "你好"}],
    },
    timeout=30,
)
print(resp.json()["choices"][0]["message"]["content"])`;