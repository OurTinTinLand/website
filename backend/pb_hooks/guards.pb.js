/// <reference path="../pb_data/types.d.ts" />
//
// 通用兜底：catalog 列表自动应用 ?filter 与 ?state 等 query 参数
//
// v1.1 扩展：把 job_postings / talent_profiles 也接 query param 注入
// （spec §9.7 + §15 招聘板块）
//
onRecordsListRequest(function(e) {
    var name = "";
    try { name = e.collection.name; } catch (_) {}
    var allowed = ["courses", "events", "hackathons", "jobs",
                   "apps", "providers",
                   "job_postings", "talent_profiles"];
    if (allowed.indexOf(name) === -1) { e.next(); return; }

    // 白名单：每个 (collection, field) → 允许的值集合
    // 比直接拼字符串更安全 —— 攻击者无法注入额外的 filter 表达式。
    // 这里列出的值必须与 schema 同步更新；不同步顶多"过滤失效"，不会越权。
    var WHITELIST = {
        courses: {
            category: ["AI 应用", "AI Agent\u00B7FDE", "AI 短剧", "Web3 技术"],
            state:    ["upcoming", "ongoing", "past"],
        },
        events: {
            tag:   ["AMA", "Workshop", "Meetup", "Tour", "Conference"],
            type:  ["\u7EBF\u4E0A", "\u7EBF\u4E0B", "\u6DF7\u5408"],
            state: ["upcoming", "ongoing", "past"],
        },
        hackathons: {
            theme: ["AI", "DeFi", "NFT", "Infra", "\u8DE8\u94FE"],
            state: ["upcoming", "ongoing", "past"],
        },
        jobs: {
            role:     ["\u5DE5\u7A0B", "\u8FD0\u8425", "BD", "\u8BBE\u8BA1"],
            job_type: ["full_time", "part_time", "intern"],
        },
        apps: {
            type: ["\u804C\u4E1A\u5DE5\u5177", "\u793E\u4EA4", "\u5185\u5BB9", "\u5F00\u53D1"],
        },
        providers: {},
        job_postings: {},
        talent_profiles: {},
    };

    function pickAllowed(col, field) {
        var m = WHITELIST[col];
        if (!m) return null;
        return m[field] || null;
    }

    function safePick(col, field, raw) {
        var v = String(raw == null ? "" : raw).trim();
        if (!v) return null;
        var allowed = pickAllowed(col, field);
        if (!allowed) return null;
        if (allowed.indexOf(v) === -1) return null;
        return v;
    }

    var parts = [];
    try {
        var req = e.request;
        if (req && req.url) {
            var q = req.url.query ? req.url.query() : {};
            if (q.published === "1" || q.published === "true") parts.push("published = true");

            var stateV = safePick(name, "state", q.state);
            if (stateV) parts.push("state = '" + stateV + "'");

            // collection 专属字段
            if (name === "courses") {
                var c = safePick("courses", "category", q.category);
                if (c) parts.push("category = '" + c + "'");
            }
            if (name === "events") {
                var t = safePick("events", "tag", q.tag);
                if (t) parts.push("tag = '" + t + "'");
                var ty = safePick("events", "type", q.type);
                if (ty) parts.push("type = '" + ty + "'");
            }
            if (name === "hackathons") {
                var th = safePick("hackathons", "theme", q.theme);
                if (th) parts.push("theme = '" + th + "'");
            }
            if (name === "jobs") {
                var r = safePick("jobs", "role", q.role);
                if (r) parts.push("role = '" + r + "'");
                var jt = safePick("jobs", "job_type", q.job_type);
                if (jt) parts.push("job_type = '" + jt + "'");
            }
            if (name === "apps") {
                var at = safePick("apps", "type", q.type);
                if (at) parts.push("type = '" + at + "'");
            }
            // job_postings / talent_profiles：filter 已写在 schema listRule 上
            // （review_status = approved），这里不再加额外条件。
        }
    } catch (_) {}

    if (parts.length > 0) {
        var extra = parts.join(" && ");
        var existing = "";
        try { existing = e.collection_query.filter || ""; } catch (_) {}
        e.collection_query.filter = existing ? (existing + " && " + extra) : extra;
    }
    e.next();
});

// 自动补 state 字段：基于 start_at/end_at 与今天的比较
onRecordCreate(function(e) {
    try {
        var name = "";
        try { name = e.collection.name; } catch (_) {}
        if (name !== "courses" && name !== "events" && name !== "hackathons") {
            e.next(); return;
        }
        var s = "";
        var ed = "";
        try { s = e.record.getString("start_at") || ""; } catch (_) {}
        try { ed = e.record.getString("end_at") || s; } catch (_) {}
        if (s) {
            var curState = "";
            try { curState = e.record.getString("state") || ""; } catch (_) {}
            if (!curState) {
                var now = new Date();
                var a = new Date(s);
                var b = new Date(ed || s);
                var computed = (now < a) ? "upcoming" : (now > b) ? "past" : "ongoing";
                e.record.set("state", computed);
            }
        }
    } catch (outerErr) {}
    e.next();
});
