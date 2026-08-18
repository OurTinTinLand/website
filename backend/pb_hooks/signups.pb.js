/// <reference path="../pb_data/types.d.ts" />
//
// spec §7 / §9 / §14.2 / §14.4 —— 免费报名 + 审核字段 + 招聘 contact 脱敏
//   * signups：课程 / 活动 / 黑客松 / 招聘 的免费报名
//   * leads：申请上架 / 联系代理产品 / 企业服务咨询 / 关于我们留言
//
// v1.1 调整：
//   * signups 加 review_status（spec §14.4 报名审核中心）
//   * 默认 review_status = submitted
//   * payload 字段建议结构：{ "name":"...", "phone":"...", "city":"...", "team_name":"...", "github":"..." }
//   * jobs / job_postings / talent_profiles 的 contact 字段对非 superuser 脱敏（spec §15）
//
onRecordCreateRequest(function(e) {
    var r = e.record;
    if (!r.getString("user_email")) throw new BadRequestError("user_email 必填");
    if (!r.getString("kind"))        throw new BadRequestError("kind 必填");
    if (!r.getString("item_id"))     throw new BadRequestError("item_id 必填");

    // 强制默认值
    r.set("status", r.getString("status") || "submitted");
    r.set("review_status", r.getString("review_status") || "submitted");

    // 校验关联项目存在
    var kind = r.getString("kind");
    var collMap = { course: "courses", event: "events", hackathon: "hackathons", job: "jobs" };
    var collName = collMap[kind];
    if (collName) {
        try {
            $app.findRecordById(collName, r.getString("item_id"));
        } catch (err) {
            throw new BadRequestError("关联项目不存在: " + kind + "#" + r.getString("item_id"));
        }
    }

    // 自动判断是否需要审核：关联内容如果 signup_review_required=false，直接 approved
    try {
        if (collName) {
            var item = $app.findRecordById(collName, r.getString("item_id"));
            var reqReview = false;
            try { reqReview = !!item.getBool("signup_review_required"); } catch (_) {}
            if (!reqReview) {
                r.set("review_status", "approved");
                r.set("reviewed_at", new Date().toISOString());
            }
        }
    } catch (_) {}
    e.next();
}, "signups");

// 报名审核：仅 superuser 可改 review_status
onRecordUpdateRequest(function(e) {
    var info = null;
    try { info = e.requestInfo(); } catch (_) {}
    var isSuper = info && info.auth && info.auth.collection().name === "_superusers";

    var oldRev = "";
    var newRev = "";
    try { oldRev = e.record.original().getString("review_status"); } catch (_) {}
    try { newRev = e.record.getString("review_status"); } catch (_) {}

    if (oldRev !== newRev && newRev && !isSuper) {
        throw new ForbiddenError("只有 superuser 可以修改 review_status");
    }
    if (newRev && newRev !== "submitted" && isSuper) {
        e.record.set("reviewed_by", info.auth.id);
        e.record.set("reviewed_at", new Date().toISOString());
    }
    e.next();
}, "signups");

// leads 保持原样
onRecordCreateRequest(function(e) {
    var r = e.record;
    if (!r.getString("user_email")) throw new BadRequestError("user_email 必填");
    if (!r.getString("kind"))        throw new BadRequestError("kind 必填");
    var allowed = ["app", "app-contact", "enterprise-ai", "enterprise-eco", "contact"];
    if (allowed.indexOf(r.getString("kind")) === -1) {
        throw new BadRequestError("leads.kind 必须是 " + allowed.join("/") + " 之一");
    }
    r.set("status", r.getString("status") || "pending");
    e.next();
}, "leads");

// ─────────────────────────────────────────────────────────────────────
// 前台脱敏：jobs / job_postings / talent_profiles 的 contact 字段
//   非 superuser 拿到记录时，把 contact 抹掉
//   onRecordEnrich 在 list / view / 各 enrich 阶段都触发
// ─────────────────────────────────────────────────────────────────────
onRecordEnrich(function(e) {
    try {
        var name = "";
        try { name = e.record.collection().name; } catch (_) {}
        if (name !== "jobs" && name !== "job_postings" && name !== "talent_profiles") {
            e.next(); return;
        }
        var info = null;
        try { info = e.requestInfo; } catch (_) {}
        var isSuper = info && info.auth && info.auth.collection().name === "_superusers";
        if (!isSuper) {
            try { e.record.set("contact", ""); } catch (_) {}
        }
    } catch (_) {}
    e.next();
}, "jobs", "job_postings", "talent_profiles");
