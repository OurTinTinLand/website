/// <reference path="../pb_data/types.d.ts" />
//
// v1.1.1 —— 招聘板块接线（spec §15 落地）
//   * job_postings：把旧 jobs 集合的 4 条岗位迁移进来（§15.1 字段）
//   * talent_profiles：填充 3 条人才示例（§15.2 字段，contact 仅运营可见）
//   * talent_profiles.createRule 放开为登录用户可创建（社区用户发布人才信息）
//
// 注意：goja ES5 无块级作用域，循环变量不能进闭包 —— 数据一律以参数传进
// seedOne()，不用回调捕获循环变量。
migrate(function(app) {
    function seedOne(collName, slug, fields) {
        var col = app.findCollectionByNameOrId(collName);
        var rec = null;
        try { rec = app.findFirstRecordByFilter(collName, "slug = {:s}", { s: slug }); } catch (_) {}
        if (!rec) rec = new Record(col);
        var keys = Object.keys(fields);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            rec.set(key, fields[key]);
        }
        var saveErr = app.save(rec);
        if (saveErr) throw new Error("seed " + collName + "#" + slug + " failed: " + saveErr.message);
    }

    // ── §15.1 企业招聘信息（迁移自旧 jobs 集合）──
    seedOne("job_postings", "ai-solution-engineer", {
        slug: "ai-solution-engineer",
        title: "AI 解决方案工程师（FDE）",
        company_name: "TinTinLand", location: "上海", remote: true, job_type: "full_time",
        description: "负责企业客户 AI 转型方案的落地交付，需要有真实项目交付经验，能独立面对客户。",
        requirements: "3 年以上工程或咨询经验\n熟悉主流大模型 API 与 RAG 工程实践\n能独立完成客户沟通与方案演示\n有企业内训或咨询经验优先",
        salary_range: "25K-45K · 14 薪", tags: ["AI","FDE","交付"],
        contact: "hr@tintin.land", review_status: "approved", published: true, order: 1,
    });
    seedOne("job_postings", "eco-partner-bd", {
        slug: "eco-partner-bd",
        title: "生态合作 BD",
        company_name: "生态伙伴", location: "新加坡", remote: false, job_type: "full_time",
        description: "对接公链与项目方，推动生态活动与黑客松合作落地。",
        requirements: "2 年以上 Web3 或 AI 行业 BD 经验\n英文可作为工作语言\n有公链或投资机构资源优先",
        salary_range: "面议", tags: ["BD","生态","出海"],
        contact: "bd@eco-partner.io", review_status: "approved", published: true, order: 2,
    });
    seedOne("job_postings", "community-ops-manager", {
        slug: "community-ops-manager",
        title: "社区运营经理",
        company_name: "TinTinLand", location: "远程", remote: true, job_type: "full_time",
        description: "负责社区内容运营与活动组织，把 30 万开发者的存量盘活。",
        requirements: "有技术社区运营经验\n中英双语\n熟悉 Discord / Telegram / 微信生态",
        salary_range: "18K-30K · 14 薪", tags: ["运营","社区","双语"],
        contact: "hr@tintin.land", review_status: "approved", published: true, order: 3,
    });
    seedOne("job_postings", "brand-designer", {
        slug: "brand-designer",
        title: "品牌设计师（含吉祥物延展）",
        company_name: "TinTinLand", location: "上海", remote: true, job_type: "full_time",
        description: "负责官网、活动物料与 TinTin 吉祥物的视觉延展。",
        requirements: "熟悉 Figma 与设计系统搭建\n有 IP 形象延展经验优先\n能与开发协同交付 Design Token",
        salary_range: "20K-35K · 14 薪", tags: ["设计","品牌","吉祥物"],
        contact: "hr@tintin.land", review_status: "approved", published: true, order: 4,
    });

    // ── §15.2 社区人才信息（contact 仅运营可见）──
    seedOne("talent_profiles", "talent-adan", {
        nickname: "阿岛", expected_role: "前端工程师",
        work_experience: "3 年大厂前端，1 年 Web3 DApp",
        skill_tags: ["React","TypeScript","Solidity","ethers.js"],
        contact: "adan@example.com", resume_url: "",
        bio: "想做链上与 AI 结合的开发者工具，找远程团队。",
        expected_salary: "30K-45K", expected_city: "远程优先 / 杭州可考虑",
        status: "looking", review_status: "approved", published: true, order: 1,
    });
    seedOne("talent_profiles", "talent-marvin", {
        nickname: "Marvin", expected_role: "AI Agent 工程师",
        work_experience: "前大厂 NLP，做过 RAG 与工具调用 Agent",
        skill_tags: ["Python","LangChain","Agent","RAG","Prompt"],
        contact: "marvin@example.com", resume_url: "https://marvin.dev/cv",
        bio: "对 AI 应用层与 Agent 工程化感兴趣，希望加入创业团队。",
        expected_salary: "40K-60K", expected_city: "北京 / 远程",
        status: "looking", review_status: "approved", published: true, order: 2,
    });
    seedOne("talent_profiles", "talent-xiaojiu", {
        nickname: "小九", expected_role: "社区运营",
        work_experience: "3 年技术社区运营经验",
        skill_tags: ["社区运营","内容","活动","双语"],
        contact: "xiaojiu@example.com", resume_url: "",
        bio: "想把开发者社区盘活，希望找 Web3 或 AI 方向。",
        expected_salary: "15K-25K", expected_city: "上海",
        status: "looking", review_status: "approved", published: true, order: 3,
    });

    // ── 放开 talent_profiles 创建权限：登录用户可发布人才信息（§15.2）──
    var tc = app.findCollectionByNameOrId("talent_profiles");
    tc.createRule = "@request.auth.id != ''";
    app.save(tc);
},
function(app) {
    // DOWN：no-op（保留数据）
});
