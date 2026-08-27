/// <reference path="../pb_data/types.d.ts" />
//
// v1.1.2 —— 补插两门付费课程（spec §8.3 支付第一层必须有真实 paid 课程可下单）
// 背景：1755000010 seed_catalog 里 ai-agent-bootcamp-2026 / fde-bootcamp-2026
// 未落库（历史静默失败），导致前端课程详情无「报名 · ¥2599」入口，
// 订单流程与 spec-verify 的 orders 用例全部空转。
// 本 migration 带 save 错误检查，任何字段问题都会直接报错而不是静默吞掉。
migrate(function(app) {
    function seedCourse(slug, data) {
        var col = app.findCollectionByNameOrId("courses");
        var rec = null;
        try { rec = app.findFirstRecordByFilter("courses", "slug = {:s}", { s: slug }); } catch (_) {}
        if (!rec) rec = new Record(col);
        var keys = Object.keys(data);
        for (var i = 0; i < keys.length; i++) rec.set(keys[i], data[keys[i]]);
        rec.set("slug", slug);
        var err = app.save(rec);
        if (err) throw new Error("seed course " + slug + " failed: " + (err.message || String(err)));
        console.log("[seed] course " + slug + " saved");
    }

    seedCourse("ai-agent-bootcamp-2026", {
        title: "TinTin AI Agent 实战训练营",
        category: "AI Agent·FDE", difficulty: "入门", form: "训练营",
        price_type: "paid", price_amount: 2599, price_origin: 3599, price_deposit: 199,
        cover: "cv1", dog: "dog-sit",
        start_at: "2026-08-15", end_at: "2026-10-25",
        state: "upcoming", content_source: "native",
        teacher: "TinTinLand 教研组 · 前大厂 Agent 方向工程师",
        desc: "10 周直播实训，从 Prompt 工程、RAG 知识库到 Agent 自动化工作流，带你亲手做出一个可演示、可复盘、可写进作品集的 AI 应用。零基础可学，50 人小班。",
        outline: [["W1-2","大模型与 Prompt 工程基础，搭第一个可用的对话应用"],["W3-4","RAG 知识库：文档切分、向量检索、召回评估"],["W5-7","Agent 框架与工具调用，做出能自主完成任务的智能体"],["W8-9","工作流自动化与多 Agent 协作，接入真实业务系统"],["W10","结业项目路演与作品集包装"]],
        signup_fields: ["name","email","phone","bg"],
        tags: ["Prompt", "LangChain", "RAG"],
        signup_fields_config: {"name":"必","email":"必","phone":"选","city":"选","bg":"选"},
        signup_review_required: false, published: true, order: 1,
    });

    seedCourse("fde-bootcamp-2026", {
        title: "FDE 企业效能顾问训练营",
        category: "AI Agent·FDE", difficulty: "进阶", form: "训练营",
        price_type: "paid", price_amount: 3999, price_origin: 0, price_deposit: 399,
        cover: "cv2", dog: "dog-harness",
        start_at: "2026-09-01", end_at: "2026-11-01",
        state: "upcoming", content_source: "native",
        teacher: "企业 AI 转型交付团队",
        desc: "面向想转型做企业 AI 落地顾问的学员：怎么做转型诊断、怎么设计陪跑方案、怎么把交付结果量化成企业能验收的指标。",
        outline: [["M1","企业 AI 成熟度诊断方法论"],["M2","场景筛选与 ROI 测算"],["M3","陪跑方案设计与交付验收"],["M4","真实客户案例复盘"]],
        signup_fields: ["name","email","phone","city"],
        tags: ["陪跑", "ROI", "B2B"],
        signup_fields_config: {"name":"必","email":"必","phone":"选","city":"选","bg":"选"},
        signup_review_required: false, published: true, order: 2,
    });
},
function(app) {
    // DOWN：no-op（保留数据）
});
