/// <reference path="../pb_data/types.d.ts" />
//
// TinTinLand v1.0 —— 目录种子数据
// 来源：src/data/{courses,events,hackathons,jobs,apps,providers}.js + timeline.js/LEGACY
// goja ES5 写：所有用到 $app/app 的函数都从 migrate 闭包里显式传 app。
//
migrate(function(rootApp) {
    var TODAY = new Date("2026-08-12");

    function stateOf(s, e) {
        var a = new Date(s), b = new Date(e || s);
        if (TODAY < a) return "upcoming";
        if (TODAY > b) return "past";
        return "ongoing";
    }

    function upsertBySlug(app, collName, slug, builder) {
        var col = app.findCollectionByNameOrId(collName);
        var rec = null;
        try { rec = app.findFirstRecordByFilter(collName, "slug = {:s}", { s: slug }); } catch (_) {}
        if (!rec) rec = new Record(col);
        builder(rec);
        rec.set("slug", slug);
        app.save(rec);
    }

    function slugify(s) {
        return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
    }

    var COURSES = [
        { slug: "ai-agent-bootcamp-2026", title: "TinTin AI Agent 实战训练营",
          category: "AI Agent", difficulty: "入门", form: "训练营",
          price_type: "paid", price_amount: 2599, price_origin: 3599, price_deposit: 199,
          cover: "cv1", dog: "dog-sit",
          start_at: "2026-08-15", end_at: "2026-10-25",
          content_source: "native",
          teacher: "TinTinLand 教研组 · 前大厂 Agent 方向工程师",
          desc: "10 周直播实训，从 Prompt 工程、RAG 知识库到 Agent 自动化工作流，带你亲手做出一个可演示、可复盘、可写进作品集的 AI 应用。零基础可学，50 人小班。",
          outline: [["W1-2","大模型与 Prompt 工程基础，搭第一个可用的对话应用"],["W3-4","RAG 知识库：文档切分、向量检索、召回评估"],["W5-7","Agent 框架与工具调用，做出能自主完成任务的智能体"],["W8-9","工作流自动化与多 Agent 协作，接入真实业务系统"],["W10","结业项目路演与作品集包装"]],
          signup_fields: ["name","email","phone","bg"], order: 1, published: true },
        { slug: "fde-bootcamp-2026", title: "FDE 企业效能顾问训练营",
          category: "FDE", difficulty: "进阶", form: "训练营",
          price_type: "paid", price_amount: 3999, price_origin: 0, price_deposit: 399,
          cover: "cv2", dog: "dog-harness",
          start_at: "2026-09-01", end_at: "2026-11-01",
          content_source: "native",
          teacher: "企业 AI 转型交付团队",
          desc: "面向想转型做企业 AI 落地顾问的学员：怎么做转型诊断、怎么设计陪跑方案、怎么把交付结果量化成企业能验收的指标。",
          outline: [["M1","企业 AI 成熟度诊断方法论"],["M2","场景筛选与 ROI 测算"],["M3","陪跑方案设计与交付验收"],["M4","真实客户案例复盘"]],
          signup_fields: ["name","email","phone","city"], order: 2, published: true },
        { slug: "ai-app-weekly-workshop", title: "AI 应用开发工作坊（每周直播）",
          category: "AI 应用", difficulty: "入门", form: "直播",
          price_type: "free", price_amount: 0, price_origin: 0, price_deposit: 0,
          cover: "cv3", dog: "dog-skate",
          start_at: "2026-08-06", end_at: "2026-08-27",
          content_source: "native",
          teacher: "社区讲师轮值",
          desc: "每周三晚免费直播，一次讲透一个 AI 工具的实战用法，当场演示当场答疑。",
          outline: [["第 1 期","Cursor 与 vibe coding 实操"],["第 2 期","用 n8n 做个人自动化工作流"],["第 3 期","低成本部署自己的知识库助手"]],
          signup_fields: ["name","email"], order: 3, published: true },
        { slug: "ai-short-film-course", title: "AI 短剧编导实战课",
          category: "AI 短剧", difficulty: "入门", form: "录播",
          price_type: "free", price_amount: 0, price_origin: 0, price_deposit: 0,
          cover: "cv4", dog: "dog-guitar",
          start_at: "2026-05-10", end_at: "2026-06-20",
          content_source: "external_link",
          external_url: "https://space.bilibili.com/1152852334",
          teacher: "AI 内容创作团队",
          desc: "用 AI 工具从剧本、分镜到成片的完整链路。一期已完结，全部内容托管在 B 站，点击直达原始视频。",
          outline: [], signup_fields: [], order: 4, published: true },
        { slug: "web3-audit-101", title: "Web3 智能合约安全审计入门",
          category: "Web3 技术", difficulty: "中级", form: "录播",
          price_type: "free", price_amount: 0, price_origin: 0, price_deposit: 0,
          cover: "cv1", dog: "dog-sleep",
          start_at: "2026-03-01", end_at: "2026-04-01",
          content_source: "external_link",
          external_url: "https://www.youtube.com/@TinTinLand",
          teacher: "生态安全合作伙伴",
          desc: "往期社区技术课，讲常见合约漏洞与审计流程。内容托管在 YouTube 频道。",
          outline: [], signup_fields: [], order: 5, published: true }
    ];

    for (var i = 0; i < COURSES.length; i++) {
        (function(c){
            var state = stateOf(c.start_at, c.end_at);
            upsertBySlug(rootApp, "courses", c.slug, function(rec) {
                rec.set("title", c.title);
                rec.set("category", c.category);
                rec.set("difficulty", c.difficulty);
                rec.set("form", c.form);
                rec.set("price_type", c.price_type);
                rec.set("price_amount", c.price_amount);
                rec.set("price_origin", c.price_origin);
                rec.set("price_deposit", c.price_deposit);
                rec.set("cover", c.cover);
                rec.set("dog", c.dog);
                rec.set("start_at", c.start_at);
                rec.set("end_at", c.end_at);
                rec.set("state", state);
                rec.set("content_source", c.content_source);
                rec.set("external_url", c.external_url || "");
                rec.set("teacher", c.teacher);
                rec.set("desc", c.desc);
                rec.set("outline", c.outline);
                rec.set("signup_fields", c.signup_fields);
                rec.set("order", c.order);
                rec.set("published", c.published);
            });
        })(COURSES[i]);
    }

    var EVENTS = [
        { slug: "ai-x-web3-shanghai-meetup", title: "上海 AI × Web3 开发者 Meetup",
          type: "线下", city: "上海", tag: "Meetup", cover: "cv1", dog: "dog-skate",
          start_at: "2026-08-20", end_at: "2026-08-20", content_source: "native",
          desc: "聚焦 AI Agent 与 Web3 结合的真实落地案例，4 位讲者 + 自由交流。限 120 人。",
          agenda: [["19:00","签到与自由交流"],["19:30","主题分享 ×4"],["21:00","项目路演 + Networking"]],
          signup_fields: ["name","email","phone","city","role","src"], order: 1, published: true },
        { slug: "sg-ai-founders-week", title: "新加坡 AI 创业者交流周",
          type: "线下", city: "新加坡", tag: "Tour", cover: "cv2", dog: "dog-harness",
          start_at: "2026-08-10", end_at: "2026-08-14", content_source: "native",
          desc: "为期一周的系列交流，覆盖新加坡本地 AI 创业社群、投资机构与华语开发者。",
          agenda: [["D1","开幕 Mixer"],["D3","投资人闭门圆桌"],["D5","Demo Day"]],
          signup_fields: ["name","email","phone"], order: 2, published: true },
        { slug: "ai-agent-ama-demo-to-prod", title: "AI Agent 线上 AMA：从 Demo 到生产",
          type: "线上", city: "线上", tag: "AMA", cover: "cv3", dog: "dog-sit",
          start_at: "2026-09-03", end_at: "2026-09-03", content_source: "native",
          desc: "邀请三位一线工程师聊 Agent 从演示到真实生产环境要踩的坑，全程互动答疑。",
          agenda: [["20:00","嘉宾分享"],["20:40","观众提问"]],
          signup_fields: ["name","email"], order: 3, published: true },
        { slug: "ethshanghai-2025", title: "ETHShanghai 2025",
          type: "线下", city: "上海", tag: "Conference", cover: "cv4", dog: "dog-sleep",
          start_at: "2025-09-20", end_at: "2025-09-22",
          content_source: "external_link", external_url: "https://lu.ma",
          desc: "年度顶级峰会全案服务案例，2000+ 参会者。历史记录托管在 Luma。",
          agenda: [], signup_fields: [], order: 4, published: true },
        { slug: "bangkok-polkadot-ama", title: "曼谷波卡黑客松系列 AMA",
          type: "混合", city: "曼谷", tag: "AMA", cover: "cv1", dog: "dog-guitar",
          start_at: "2025-11-16", end_at: "2025-11-16",
          content_source: "external_link", external_url: "https://lu.ma",
          desc: "11 月 16 日曼谷波卡黑客松的配套线上 AMA，历史记录托管在 Luma。",
          agenda: [], signup_fields: [], order: 5, published: true },
        { slug: "tintinland-china-tour-2025", title: "TinTinLand 中国行 · 高校巡回",
          type: "线下", city: "多城市", tag: "Tour", cover: "cv2", dog: "dog-skate",
          start_at: "2025-04-01", end_at: "2025-06-30",
          content_source: "external_link", external_url: "https://lu.ma",
          desc: "覆盖 12 所高校的技术布道巡回，历史记录托管在 Luma。",
          agenda: [], signup_fields: [], order: 6, published: true }
    ];

    for (var i2 = 0; i2 < EVENTS.length; i2++) {
        (function(e){
            var state = stateOf(e.start_at, e.end_at);
            upsertBySlug(rootApp, "events", e.slug, function(rec) {
                rec.set("title", e.title);
                rec.set("type", e.type);
                rec.set("city", e.city);
                rec.set("tag", e.tag);
                rec.set("cover", e.cover);
                rec.set("dog", e.dog);
                rec.set("start_at", e.start_at);
                rec.set("end_at", e.end_at);
                rec.set("state", state);
                rec.set("content_source", e.content_source);
                rec.set("external_url", e.external_url || "");
                rec.set("desc", e.desc);
                rec.set("agenda", e.agenda);
                rec.set("signup_fields", e.signup_fields);
                rec.set("order", e.order);
                rec.set("published", e.published);
            });
        })(EVENTS[i2]);
    }

    var HACKATHONS = [
        { slug: "ai-agent-hackathon-2026", title: "TinTinLand AI Agent 黑客松 2026",
          theme: "AI", prize_pool_usd: 50000, cover: "cv2", dog: "dog-skate",
          start_at: "2026-09-05", end_at: "2026-09-07", deadline: "2026-09-01",
          content_source: "native",
          tracks: [{ name: "AI Agent 应用", prize: 20000 }, { name: "RAG 与知识引擎", prize: 18000 }, { name: "多模态创意", prize: 12000 }],
          judging: [["技术完成度","40%"],["创新性","30%"],["商业可行性","20%"],["演示表现","10%"]],
          desc: "面向华语开发者的 AI Agent 主题黑客松，三大赛道，评审来自合作公链与投资机构，优胜项目直通孵化通道。",
          signup_fields: ["team","members","github","track"], order: 1, published: true },
        { slug: "ai-x-web3-hackathon-2026", title: "AI × Web3 融合创新赛",
          theme: "AI×Web3", prize_pool_usd: 80000, cover: "cv3", dog: "dog-sleep",
          start_at: "2026-10-18", end_at: "2026-10-20", deadline: "2026-10-12",
          content_source: "native",
          tracks: [{ name: "链上 AI Agent", prize: 40000 }, { name: "去中心化推理", prize: 25000 }, { name: "开放赛道", prize: 15000 }],
          judging: [["技术完成度","35%"],["生态契合度","30%"],["创新性","25%"],["演示表现","10%"]],
          desc: "与多家公链联合举办，探索 AI 与链上基础设施的结合点。",
          signup_fields: ["team","members","github","track"], order: 2, published: true },
        { slug: "ethshanghai-2025-hackathon", title: "ETHShanghai 2025 黑客松",
          theme: "Web3", prize_pool_usd: 200000, cover: "cv4", dog: "dog-sit",
          start_at: "2025-09-20", end_at: "2025-09-22", deadline: "2025-09-15",
          content_source: "external_link", external_url: "https://dorahacks.io",
          tracks: [{ name: "DeFi", prize: 80000 }, { name: "ZK", prize: 70000 }, { name: "基础设施", prize: 50000 }],
          judging: [],
          desc: "年度旗舰黑客松，300+ 队伍参赛。历史记录托管在 DoraHacks。",
          signup_fields: [], order: 3, published: true },
        { slug: "bangkok-polkadot-hackathon", title: "曼谷波卡黑客松",
          theme: "Web3", prize_pool_usd: 30000, cover: "cv1", dog: "dog-harness",
          start_at: "2025-11-16", end_at: "2025-11-17", deadline: "2025-11-10",
          content_source: "external_link", external_url: "https://dorahacks.io",
          tracks: [{ name: "Substrate", prize: 18000 }, { name: "跨链", prize: 12000 }],
          judging: [],
          desc: "波卡生态专场，历史记录托管在外部平台。",
          signup_fields: [], order: 4, published: true }
    ];

    for (var i3 = 0; i3 < HACKATHONS.length; i3++) {
        (function(h){
            var state = stateOf(h.start_at, h.end_at);
            upsertBySlug(rootApp, "hackathons", h.slug, function(rec) {
                rec.set("title", h.title);
                rec.set("theme", h.theme);
                rec.set("prize_pool_usd", h.prize_pool_usd);
                rec.set("cover", h.cover);
                rec.set("dog", h.dog);
                rec.set("start_at", h.start_at);
                rec.set("end_at", h.end_at);
                rec.set("deadline", h.deadline);
                rec.set("state", state);
                rec.set("content_source", h.content_source);
                rec.set("external_url", h.external_url || "");
                rec.set("tracks", h.tracks);
                rec.set("judging", h.judging);
                rec.set("desc", h.desc);
                rec.set("signup_fields", h.signup_fields);
                rec.set("order", h.order);
                rec.set("published", h.published);
            });
        })(HACKATHONS[i3]);
    }

    var JOBS = [
        { slug: "ai-solution-engineer", title: "AI 解决方案工程师（FDE）", role: "工程", company: "TinTinLand",
          city: "上海", remote: true,
          desc: "负责企业客户 AI 转型方案的落地交付，需要有真实项目交付经验，能独立面对客户。",
          reqs: ["3 年以上工程或咨询经验","熟悉主流大模型 API 与 RAG 工程实践","能独立完成客户沟通与方案演示","有企业内训或咨询经验优先"],
          order: 1, published: true },
        { slug: "ecosystem-bd", title: "生态合作 BD", role: "BD", company: "生态伙伴",
          city: "新加坡", remote: false,
          desc: "对接公链与项目方，推动生态活动与黑客松合作落地。",
          reqs: ["2 年以上 Web3 或 AI 行业 BD 经验","英文可作为工作语言","有公链或投资机构资源优先"],
          order: 2, published: true },
        { slug: "community-manager", title: "社区运营经理", role: "运营", company: "TinTinLand",
          city: "远程", remote: true,
          desc: "负责社区内容运营与活动组织，把 30 万开发者的存量盘活。",
          reqs: ["有技术社区运营经验","中英双语","熟悉 Discord / Telegram / 微信生态"],
          order: 3, published: true },
        { slug: "brand-designer", title: "品牌设计师（含吉祥物延展）", role: "设计", company: "TinTinLand",
          city: "上海", remote: true,
          desc: "负责官网、活动物料与 TinTin 吉祥物的视觉延展。",
          reqs: ["熟悉 Figma 与设计系统搭建","有 IP 形象延展经验优先","能与开发协同交付 Design Token"],
          order: 4, published: true }
    ];

    for (var i4 = 0; i4 < JOBS.length; i4++) {
        (function(j){
            upsertBySlug(rootApp, "jobs", j.slug, function(rec) {
                rec.set("title", j.title);
                rec.set("role", j.role);
                rec.set("company", j.company);
                rec.set("city", j.city);
                rec.set("remote", j.remote);
                rec.set("desc", j.desc);
                rec.set("reqs", j.reqs);
                rec.set("order", j.order);
                rec.set("published", j.published);
            });
        })(JOBS[i4]);
    }

    var APPS = [
        { slug: "cloud-gpu-reseller", name: "云厂商 GPU 算力代理", type: "agency", ic: "☁️",
          desc: "集采价格拿到主流云厂商 GPU 实例，按需或包月，比官网直采便宜。", link: "", order: 1, published: true },
        { slug: "rag-knowledge-base", name: "企业级 RAG 知识库工具", type: "agency", ic: "📚",
          desc: "开箱即用的私有知识库，支持权限分级与多格式文档接入。", link: "", order: 2, published: true },
        { slug: "llm-api-gateway", name: "大模型 API 网关", type: "agency", ic: "🔀",
          desc: "一个 key 调多家模型，自动 failover 与用量统计，配合 Token Hub 使用。", link: "", order: 3, published: true },
        { slug: "prompt-manager", name: "社区自研 Prompt 管理器", type: "community", ic: "🧩",
          desc: "社区开发者作品：团队 Prompt 版本管理与 A/B 对比。", link: "", order: 4, published: true },
        { slug: "onchain-dashboard", name: "社区自研链上数据看板", type: "community", ic: "📊",
          desc: "社区开发者作品：多链地址持仓与交互行为可视化。", link: "", order: 5, published: true }
    ];

    for (var i5 = 0; i5 < APPS.length; i5++) {
        (function(a){
            upsertBySlug(rootApp, "apps", a.slug, function(rec) {
                rec.set("name", a.name);
                rec.set("type", a.type);
                rec.set("ic", a.ic);
                rec.set("desc", a.desc);
                rec.set("link", a.link);
                rec.set("order", a.order);
                rec.set("published", a.published);
            });
        })(APPS[i5]);
    }

    var PROVIDERS = [
        { slug: "partner-a", name: "合作渠道 A", tagline: "一线闭源旗舰，OpenAI / Anthropic 体系",
          models: "GPT 系列 / Claude 系列", price: "待运营补充", settle: "月结", todo: true, latency: "~0.6s",
          monthly: ["< 1 亿", "1-10 亿", "10 亿+"],
          models_detail: [
            { name: "GPT-4o",            ctx: "128K", in: "$2.50",  out: "$10.00" },
            { name: "GPT-4o mini",       ctx: "128K", in: "$0.15",  out: "$0.60"  },
            { name: "Claude 3.5 Sonnet", ctx: "200K", in: "$3.00",  out: "$15.00" },
            { name: "Claude 3 Haiku",    ctx: "200K", in: "$0.25",  out: "$1.25"  }
          ],
          order: 1, published: true },
        { slug: "partner-b", name: "合作渠道 B", tagline: "国产主流模型全系，长上下文与中文强",
          models: "国产主流模型全系", price: "待运营补充", settle: "预充值", todo: true, latency: "~0.8s",
          monthly: ["< 5000 万", "5000 万 - 5 亿", "5 亿+"],
          models_detail: [
            { name: "DeepSeek V3", ctx: "64K",  in: "¥1.20",  out: "¥1.20" },
            { name: "Qwen2.5 72B", ctx: "128K", in: "¥0.80",  out: "$2.00" },
            { name: "GLM-4 Plus",  ctx: "128K", in: "¥1.00",  out: "¥1.00" },
            { name: "Doubao Pro",  ctx: "32K",  in: "¥0.80",  out: "$2.00" }
          ],
          order: 2, published: true },
        { slug: "partner-c", name: "合作渠道 C", tagline: "开源模型自托管推理，私有化部署友好",
          models: "开源模型托管推理", price: "待运营补充", settle: "按量后付", todo: true, latency: "~1.1s",
          monthly: ["自托管 GPU 时", "推理调用量", "混合计费"],
          models_detail: [
            { name: "Llama 3.1 70B", ctx: "128K", in: "自托管", out: "自托管" },
            { name: "Qwen2.5 32B",   ctx: "128K", in: "自托管", out: "自托管" },
            { name: "Mixtral 8x22B", ctx: "64K",  in: "自托管", out: "自托管" }
          ],
          order: 3, published: true }
    ];

    for (var i6 = 0; i6 < PROVIDERS.length; i6++) {
        (function(p){
            upsertBySlug(rootApp, "providers", p.slug, function(rec) {
                rec.set("name", p.name);
                rec.set("tagline", p.tagline);
                rec.set("models", p.models);
                rec.set("price", p.price);
                rec.set("settle", p.settle);
                rec.set("latency", p.latency);
                rec.set("monthly", p.monthly);
                rec.set("models_detail", p.models_detail);
                rec.set("todo", p.todo);
                rec.set("order", p.order);
                rec.set("published", p.published);
            });
        })(PROVIDERS[i6]);
    }

    var LEGACY = [
        ["course",    "Solidity 开发者入门 12 讲", "Web3 技术", "2025-10-01", "2025-12-01",
         "https://space.bilibili.com/1152852334", "累计播放 20 万+，社区最受欢迎的入门系列。"],
        ["course",    "ZK 零知识证明原理与实践", "Web3 技术", "2025-08-01", "2025-09-15",
         "https://space.bilibili.com/1152852334", "六讲搞懂 ZK 基本原理与主流方案对比。"],
        ["course",    "Rust 智能合约开发训练营", "Web3 技术", "2025-06-01", "2025-07-20",
         "https://www.youtube.com/@TinTinLand", "面向 Substrate / Solana 生态的 Rust 合约开发。"],
        ["course",    "Web3 前端与钱包集成实战", "Web3 技术", "2025-04-10", "2025-05-20",
         "https://space.bilibili.com/1152852334", "wagmi + viem 的完整钱包接入实践。"],
        ["course",    "DeFi 协议机制拆解", "Web3 技术", "2025-02-01", "2025-03-10",
         "https://www.youtube.com/@TinTinLand", "AMM、借贷、衍生品三类协议的机制剖析。"],
        ["course",    "NFT 与链游开发入门", "Web3 技术", "2024-11-01", "2024-12-15",
         "https://space.bilibili.com/1152852334", "历史录播，含合约与前端完整项目。"],
        ["course",    "公链节点运维实操", "Web3 技术", "2024-09-01", "2024-10-10",
         "https://www.youtube.com/@TinTinLand", "节点部署、监控与故障排查。"],
        ["course",    "Move 语言入门", "Web3 技术", "2024-06-01", "2024-07-15",
         "https://space.bilibili.com/1152852334", "Aptos / Sui 生态开发语言入门。"],

        ["event",     "ETHShanghai 2024 峰会", "Conference", "2024-09-20", "2024-09-22",
         "https://lu.ma", "年度峰会，1500+ 参会者。"],
        ["event",     "TinTinLand × Polkadot 上海站", "Meetup", "2025-03-15", "2025-03-15",
         "https://lu.ma", "波卡生态技术分享与开发者交流。"],
        ["event",     "香港 Web3 嘉年华社区边会", "Meetup", "2025-04-08", "2025-04-08",
         "https://lu.ma", "香港 Web3 Festival 官方社区边会。"],
        ["event",     "东京开发者交流之夜", "Meetup", "2025-05-22", "2025-05-22",
         "https://lu.ma", "日本市场首场华语开发者线下活动。"],
        ["event",     "首尔 Web3 开发者 Meetup", "Meetup", "2025-06-12", "2025-06-12",
         "https://lu.ma", "韩国生态合作方联合举办。"],
        ["event",     "深圳 AI 应用开发工作坊", "Workshop", "2025-07-05", "2025-07-05",
         "https://lu.ma", "首场 AI 方向线下工作坊。"],
        ["event",     "北京高校技术布道专场", "Tour", "2025-03-01", "2025-03-30",
         "https://lu.ma", "覆盖 6 所高校的巡回布道。"],
        ["event",     "杭州开发者 AMA：从 Web2 到 Web3", "AMA", "2024-12-18", "2024-12-18",
         "https://lu.ma", "转型话题线上 AMA，500+ 观看。"],
        ["event",     "成都 Web3 开发者聚会", "Meetup", "2024-10-26", "2024-10-26",
         "https://lu.ma", "西南地区社区专场。"],
        ["event",     "新加坡 Token2049 社区边会", "Conference", "2024-09-18", "2024-09-19",
         "https://lu.ma", "Token2049 期间的华语开发者边会。"],
        ["event",     "广州 AI × Web3 圆桌", "AMA", "2025-08-02", "2025-08-02",
         "https://lu.ma", "两个方向融合话题的线下圆桌。"],

        ["hackathon", "Polkadot Hackathon 2024 中国区", "Web3", "2024-08-01", "2024-09-30",
         "https://dorahacks.io", "波卡官方中国区赛事，$120,000 奖金池。", 120000],
        ["hackathon", "Chainlink 春季黑客松华语专场", "Web3", "2025-03-10", "2025-04-20",
         "https://dorahacks.io", "预言机方向专场，$60,000 奖金池。", 60000],
        ["hackathon", "Filecoin 数据存储创新赛", "Web3", "2024-05-01", "2024-06-15",
         "https://dorahacks.io", "分布式存储应用方向，$45,000 奖金池。", 45000],
        ["hackathon", "Aptos Move 开发者挑战赛", "Web3", "2024-11-01", "2024-12-10",
         "https://dorahacks.io", "Move 生态首场华语赛事，$50,000 奖金池。", 50000],
        ["hackathon", "ZK 赛道专项黑客松", "Web3", "2025-05-08", "2025-06-08",
         "https://dorahacks.io", "零知识证明方向专项，$70,000 奖金池。", 70000],
        ["hackathon", "AI Agent 极速开发挑战赛（48h）", "AI", "2025-07-19", "2025-07-21",
         "https://dorahacks.io", "48 小时极速赛，AI 方向首场，$25,000 奖金池。", 25000]
    ];

    for (var i7 = 0; i7 < LEGACY.length; i7++) {
        (function(row){
            var kind  = row[0];
            var title = row[1];
            var tag   = row[2];
            var start = row[3];
            var end   = row[4];
            var url   = row[5];
            var desc  = row[6];
            var prize = row[7] || 0;
            var slug  = "legacy-" + kind + "-" + slugify(title);
            var state = stateOf(start, end);

            if (kind === "course") {
                upsertBySlug(rootApp, "courses", slug, function(rec) {
                    rec.set("title", title);
                    rec.set("category", tag);
                    rec.set("difficulty", "入门");
                    rec.set("form", "录播");
                    rec.set("price_type", "free");
                    rec.set("price_amount", 0);
                    rec.set("price_origin", 0);
                    rec.set("price_deposit", 0);
                    rec.set("cover", "cv1");
                    rec.set("dog", "dog-sit");
                    rec.set("start_at", start);
                    rec.set("end_at", end);
                    rec.set("state", state);
                    rec.set("content_source", "external_link");
                    rec.set("external_url", url);
                    rec.set("teacher", "TinTinLand 历史内容");
                    rec.set("desc", desc);
                    rec.set("outline", []);
                    rec.set("signup_fields", []);
                    rec.set("order", 100);
                    rec.set("published", true);
                });
            } else if (kind === "event") {
                upsertBySlug(rootApp, "events", slug, function(rec) {
                    rec.set("title", title);
                    rec.set("type", "线下");
                    rec.set("city", "—");
                    rec.set("tag", tag);
                    rec.set("cover", "cv2");
                    rec.set("dog", "dog-skate");
                    rec.set("start_at", start);
                    rec.set("end_at", end);
                    rec.set("state", state);
                    rec.set("content_source", "external_link");
                    rec.set("external_url", url);
                    rec.set("desc", desc);
                    rec.set("agenda", []);
                    rec.set("signup_fields", []);
                    rec.set("order", 100);
                    rec.set("published", true);
                });
            } else if (kind === "hackathon") {
                upsertBySlug(rootApp, "hackathons", slug, function(rec) {
                    rec.set("title", title);
                    rec.set("theme", tag);
                    rec.set("prize_pool_usd", prize);
                    rec.set("cover", "cv3");
                    rec.set("dog", "dog-guitar");
                    rec.set("start_at", start);
                    rec.set("end_at", end);
                    rec.set("deadline", end);
                    rec.set("state", state);
                    rec.set("content_source", "external_link");
                    rec.set("external_url", url);
                    rec.set("tracks", []);
                    rec.set("judging", []);
                    rec.set("desc", desc);
                    rec.set("signup_fields", []);
                    rec.set("order", 100);
                    rec.set("published", true);
                });
            }
        })(LEGACY[i7]);
    }
}, function(app) {
    // DOWN：seed 是幂等的，无需清理
});
