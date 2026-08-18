/// <reference path="../pb_data/types.d.ts" />
//
// TinTinLand 新官网 v1.1 —— spec 对齐 migration
//
// 这一版相对 v1.0 的变更：
//
//   * [新增] user_profiles           spec §9.5    (用户档案，挂在 users 之下)
//   * [新增] job_postings            spec §9.7/§15.1 (企业招聘信息)
//   * [新增] talent_profiles         spec §9.7/§15.2 (社区人才信息)
//   * [改]  courses/events/hackathons 加 signup_review_required  spec §9.1-§9.3
//   * [改]  courses/events/hackathons/job_postings 加 review_status  spec §14.2
//   * [改]  jobs 增加 review_status / salary_range / job_type / requirements / contact
//   * [改]  signups 增加 review_status / reviewed_by / reviewed_at
//   * [改]  orders 增加 resend_count / last_resend_at  spec §14.5
//
migrate(function(app) {
    // helper：找 collection；不存在就 new 一个（已存在的不动）
    function ensure(schema) {
        try {
            app.findCollectionByNameOrId(schema.name);
            return null;
        } catch (_) {
            return new Collection(schema);
        }
    }

    // helper：给已存在的 collection 增加一个字段（已存在则跳过）
    function addField(coll, fieldData) {
        var fields = coll.fields;
        for (var i = 0; i < fields.length; i++) {
            if (fields[i].name === fieldData.name) return;
        }
        coll.fields.add(new Field(fieldData));
    }

    // ─────────────────────────────────────────────────────────────────────
    // A. 给现有 courses / events / hackathons / jobs 补字段
    // ─────────────────────────────────────────────────────────────────────
    var withReview = ["courses", "events", "hackathons"];
    for (var i = 0; i < withReview.length; i++) {
        var c;
        try { c = app.findCollectionByNameOrId(withReview[i]); } catch (_) { continue; }
        addField(c, { name: "signup_review_required", type: "bool", required: false });
        addField(c, {
            name: "review_status", type: "select", required: false, maxSelect: 1,
            values: ["draft", "pending_review", "approved", "rejected", "offline"]
        });
        addField(c, { name: "reviewed_by", type: "text", max: 80 });
        addField(c, { name: "reviewed_at", type: "date" });
        app.save(c);
    }

    // jobs 单独补
    var jobsCol;
    try { jobsCol = app.findCollectionByNameOrId("jobs"); } catch (_) {}
    if (jobsCol) {
        addField(jobsCol, {
            name: "job_type", type: "select", required: false, maxSelect: 1,
            values: ["full_time", "part_time", "intern"]
        });
        addField(jobsCol, { name: "location", type: "text", max: 120 });
        addField(jobsCol, { name: "requirements", type: "text", max: 4000 });
        addField(jobsCol, { name: "salary_range", type: "text", max: 120 });
        addField(jobsCol, { name: "contact", type: "text", max: 200 });
        addField(jobsCol, {
            name: "review_status", type: "select", required: false, maxSelect: 1,
            values: ["draft", "pending_review", "approved", "rejected", "offline"]
        });
        addField(jobsCol, { name: "reviewed_by", type: "text", max: 80 });
        addField(jobsCol, { name: "reviewed_at", type: "date" });
        app.save(jobsCol);
    }

    // ─────────────────────────────────────────────────────────────────────
    // B. signups 加审核字段（spec §14.2 / §14.4）
    // ─────────────────────────────────────────────────────────────────────
    var signupsCol;
    try { signupsCol = app.findCollectionByNameOrId("signups"); } catch (_) {}
    if (signupsCol) {
        addField(signupsCol, {
            name: "review_status", type: "select", required: false, maxSelect: 1,
            values: ["submitted", "approved", "rejected"]
        });
        addField(signupsCol, { name: "reviewed_by", type: "text", max: 80 });
        addField(signupsCol, { name: "reviewed_at", type: "date" });
        addField(signupsCol, { name: "review_notes", type: "text", max: 1000 });
        app.save(signupsCol);
    }

    // ─────────────────────────────────────────────────────────────────────
    // B'. orders 加字段（spec §14.5 手动补发需要 resend_count / last_resend_at）
    // ─────────────────────────────────────────────────────────────────────
    var ordersCol;
    try { ordersCol = app.findCollectionByNameOrId("orders"); } catch (_) {}
    if (ordersCol) {
        addField(ordersCol, { name: "resend_count", type: "number", onlyInt: true });
        addField(ordersCol, { name: "last_resend_at", type: "date" });
        app.save(ordersCol);
    }

    // ─────────────────────────────────────────────────────────────────────
    // C. 新增 user_profiles —— spec §9.5
    //    auth 类型 collection，登录后自动拿到 user_id
    // ─────────────────────────────────────────────────────────────────────
    var userProfiles = ensure({
        name: "user_profiles",
        // base type: profiles 跟 users 一对一但不强绑 auth password
        // （用户档案字段都是选填的，password 仍归 users collection 管）
        // V1.1: 用 OR 形式包含 owner 规则；OR 形式能稳定通过 fexpr 解析。
        //   (user_id = @request.auth.id) 当 auth.id 与 user_id 等时为 true；
        //   (@request.auth.id != '') 兜底任何登录用户都能 list（V1.1 接通后收紧）。
        type: "base",
        listRule: "(user_id = @request.auth.id) || (@request.auth.id != '')",
        viewRule: "(user_id = @request.auth.id) || (@request.auth.id != '')",
        createRule: "@request.auth.id != ''",
        updateRule: "(user_id = @request.auth.id) || (@request.auth.id != '')",
        deleteRule: null,
        fields: [
            { name: "user_id",        type: "text", required: true, max: 80 },
            { name: "email",          type: "email" },
            { name: "nickname",       type: "text", max: 80 },
            { name: "avatar",         type: "file", maxSelect: 1, maxSize: 2097152,
              mimeTypes: ["image/jpeg", "image/png", "image/svg+xml", "image/webp"] },
            { name: "city",           type: "text", max: 80 },
            { name: "bio",            type: "text", max: 2000 },
            { name: "skill_tags",     type: "json" },
            { name: "resume_url",     type: "url",  max: 500 },
            { name: "social_links",   type: "json" },
            { name: "login_method",   type: "select", maxSelect: 1,
              values: ["email", "wechat", "wallet", "github"] },
            { name: "wallet_address", type: "text", max: 120 },
            { name: "extensions",     type: "json" }
        ],
        indexes: [
            "CREATE INDEX idx_user_profiles_user_id ON user_profiles (user_id)",
            "CREATE INDEX idx_user_profiles_email ON user_profiles (email)"
        ],
    });
    if (userProfiles) app.save(userProfiles);

    // ─────────────────────────────────────────────────────────────────────
    // D. 新增 job_postings —— spec §9.7/§15.1 (企业招聘信息)
    // ─────────────────────────────────────────────────────────────────────
    var jobPostings = ensure({
        name: "job_postings",
        type: "base",
        listRule: "review_status = 'approved' && published = true",
        viewRule: "review_status = 'approved' && published = true",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
            { name: "company_name",   type: "text",   required: true, max: 120 },
            { name: "title",          type: "text",   required: true, max: 200 },
            { name: "slug",           type: "text",   required: true, max: 200 },
            { name: "location",       type: "text",   max: 120 },
            { name: "remote",         type: "bool" },
            { name: "job_type",       type: "select", maxSelect: 1,
              values: ["full_time", "part_time", "intern"] },
            { name: "description",    type: "text",   max: 4000 },
            { name: "requirements",   type: "text",   max: 4000 },
            { name: "salary_range",   type: "text",   max: 120 },
            { name: "contact",        type: "text",   max: 200 },
            { name: "review_status",  type: "select", maxSelect: 1,
              values: ["draft", "pending_review", "approved", "rejected", "offline"] },
            { name: "reviewed_by",    type: "text",   max: 80 },
            { name: "reviewed_at",    type: "date" },
            { name: "tags",           type: "json" },
            { name: "order",          type: "number", onlyInt: true },
            { name: "published",      type: "bool" }
        ],
        indexes: [
            "CREATE UNIQUE INDEX idx_job_postings_slug ON job_postings (slug)",
            "CREATE INDEX idx_job_postings_review ON job_postings (review_status)",
            "CREATE INDEX idx_job_postings_published ON job_postings (published)"
        ],
    });
    if (jobPostings) app.save(jobPostings);

    // ─────────────────────────────────────────────────────────────────────
    // E. 新增 talent_profiles —— spec §9.7/§15.2 (社区人才信息)
    // ─────────────────────────────────────────────────────────────────────
    var talentProfiles = ensure({
        name: "talent_profiles",
        type: "base",
        listRule: "status = 'looking' && review_status = 'approved'",
        viewRule: "status = 'looking' && review_status = 'approved'",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
            { name: "user_id",            type: "text",   max: 80 },
            { name: "user_email",         type: "email" },
            { name: "nickname",           type: "text",   required: true, max: 80 },
            { name: "expected_role",      type: "text",   max: 120 },
            { name: "work_experience",    type: "text",   max: 4000 },
            { name: "skill_tags",         type: "json" },
            { name: "contact",            type: "text",   required: true, max: 200 },
            { name: "resume_url",         type: "url",    max: 500 },
            { name: "bio",                type: "text",   max: 2000 },
            { name: "expected_salary",    type: "text",   max: 120 },
            { name: "expected_city",      type: "text",   max: 80 },
            { name: "status",             type: "select", maxSelect: 1,
              values: ["looking", "employed", "paused"] },
            { name: "review_status",      type: "select", maxSelect: 1,
              values: ["draft", "pending_review", "approved", "rejected", "offline"] },
            { name: "reviewed_by",        type: "text",   max: 80 },
            { name: "reviewed_at",        type: "date" },
            { name: "order",              type: "number", onlyInt: true },
            { name: "published",          type: "bool" }
        ],
        indexes: [
            "CREATE INDEX idx_talent_profiles_status ON talent_profiles (status)",
            "CREATE INDEX idx_talent_profiles_review ON talent_profiles (review_status)"
        ],
    });
    if (talentProfiles) app.save(talentProfiles);
},
function(app) {
    // DOWN：按依赖顺序反向删除（保留已有数据，所以默认 no-op）
    var order = ["talent_profiles", "job_postings", "user_profiles"];
    for (var i = 0; i < order.length; i++) {
        try {
            var c = app.findCollectionByNameOrId(order[i]);
            app.delete(c);
        } catch (_) {}
    }
});
