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

    var parts = [];
    try {
        var req = e.request;
        if (req && req.url) {
            var q = req.url.query ? req.url.query() : {};
            if (q.published === "1" || q.published === "true") parts.push("published = true");
            if (q.state && ["upcoming", "ongoing", "past"].indexOf(String(q.state)) !== -1) {
                parts.push("state = '" + String(q.state) + "'");
            }
            if (q.category && name === "courses") {
                parts.push("category = '" + String(q.category) + "'");
            }
            if (q.tag && name === "events") {
                parts.push("tag = '" + String(q.tag) + "'");
            }
            if (q.theme && name === "hackathons") {
                parts.push("theme = '" + String(q.theme) + "'");
            }
            if (q.role && (name === "jobs")) {
                parts.push("role = '" + String(q.role) + "'");
            }
            if (q.type && (name === "apps")) {
                parts.push("type = '" + String(q.type) + "'");
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
