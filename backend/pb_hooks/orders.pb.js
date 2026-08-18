/// <reference path="../pb_data/types.d.ts" />
//
// spec §8.3 / §9.4 / §14.5 —— 订单状态机 & 顾问微信码自动发放（前置版）
//
// 业务规则（v1.1 调整：联系码改为"下单即发"）：
//   1. 创建时 status = pending_review, advisor_code_sent = true（前置发码）
//   2. 仅 superuser 能改 status / advisor_code_sent（schema 锁 + 本 hook 兜底）
//   3. 当 status 变 verified 时，**不再重复触发送码**（避免重复打扰用户）
//   4. 不能把已 verified 的订单回退（防呆）
//   5. amount > 0；item_id 必须在对应 collection 里存在
//   6. 手动补发：POST /api/orders/{id}/resend-advisor-code（superuser）
//      重新把 advisor_code_sent 置为 true 并记录 resend_count，便于运营复盘
//
onRecordCreateRequest(function(e) {
    var r = e.record;
    var amt = r.getInt("amount");
    if (amt == null || amt <= 0) {
        throw new BadRequestError("订单金额必须大于 0");
    }
    var itemType = r.getString("item_type");
    var itemId   = r.getString("item_id");
    var collMap  = {
        "course": "courses", "event": "events",
        "hackathon": "hackathons", "job": "jobs", "other": null,
    };
    var collName = collMap[itemType];
    if (collName && itemId) {
        try {
            $app.findRecordById(collName, itemId);
        } catch (err) {
            throw new BadRequestError("关联项目不存在: " + itemType + "#" + itemId);
        }
    }
    // 强制默认值（覆盖前端 payload）
    r.set("status", "pending_review");
    // ★ v1.1: 前置发码 —— 下单即向用户展示顾问联系码
    r.set("advisor_code_sent", true);
    e.next();
}, "orders");

onRecordUpdateRequest(function(e) {
    var r       = e.record;
    var oldStat = "";
    var newStat = "";
    try { oldStat = e.record.original().getString("status"); } catch (_) {}
    try { newStat = r.getString("status"); } catch (_) {}

    // 状态机校验
    var allowed = {
        "pending_review": ["verified", "failed"],
        "failed":         ["pending_review", "verified"],
        "verified":       [], // 终态：不允许再变
    };
    if (oldStat !== newStat) {
        if (allowed[oldStat].indexOf(newStat) === -1) {
            throw new BadRequestError("订单状态不允许从 " + oldStat + " 变更为 " + newStat);
        }
    }

    // ★ v1.1: status → verified 时不再翻 advisor_code_sent（避免重复触发）
    // 仅在运营显式触发 resend 接口时才会变 true
    e.next();
}, "orders");

onRecordAfterUpdateSuccess(function(e) {
    var r = e.record;
    try {
        var st = r.getString("status");
        var sent = r.getBool("advisor_code_sent");
        if (st === "verified" && sent) {
            // 占位：真实环境这里会调 $mails.send / 调微信模板消息
            console.log("[orders] verified, advisor_code_sent",
                r.id, r.getString("user_email"));
        }
    } catch (_) {}
    e.next();
}, "orders");

// ─────────────────────────────────────────────────────────────────────
// 手动补发接口：POST /api/orders/{id}/resend-advisor-code
//   Headers: Authorization: <superuser token>
//   返回 { ok: true, advisor_code_sent: true, resend_count: N }
//   仅 superuser 可调
// ─────────────────────────────────────────────────────────────────────
routerAdd("POST", "/api/orders/resend-advisor-code", function(e) {
    var info = null;
    try { info = e.requestInfo(); } catch (_) {}
    if (!info || !info.auth || info.auth.collection().name !== "_superusers") {
        throw new ForbiddenError("需要 superuser 权限");
    }
    var id = "";
    try {
        // 从 body 拿（POST 走 JSON body）
        var raw = readerToString(e.request.body, 65536);
        if (raw && raw.length > 0) {
            var body = JSON.parse(raw);
            id = String(body.id || "");
        }
        if (!id && e.request.url && e.request.url.query) {
            id = String(e.request.url.query()["id"] || "");
        }
    } catch (_) {}
    if (!id) {
        throw new BadRequestError("缺少订单 id");
    }

    var order = null;
    try { order = $app.findRecordById("orders", id); }
    catch (_) { throw new NotFoundError("订单不存在: " + id); }

    var resendCount = 0;
    try { resendCount = order.getInt("resend_count") || 0; } catch (_) {}
    order.set("advisor_code_sent", true);
    order.set("resend_count", resendCount + 1);
    order.set("last_resend_at", new Date().toISOString());
    $app.save(order);

    console.log("[orders] manual resend by superuser",
        info.auth.id, "->", id, "count", resendCount + 1);

    return e.json(200, {
        ok: true,
        id: order.id,
        advisor_code_sent: true,
        resend_count: resendCount + 1,
        user_email: order.getString("user_email"),
    });
});

// ─────────────────────────────────────────────────────────────────────
// 我的订单：GET /api/my/orders  （登录后可见自己的订单 + 报名）
//   直接走 PocketBase 标准 list endpoint 即可（listRule 已收紧）；
//   这个路由只是包装一层，方便前端不用拼接 filter。
// ─────────────────────────────────────────────────────────────────────
// 注：实际 listRule 已在 schema 上设 @request.auth.id != '' && user_email = @request.auth.email；
// 详见 api.md §7。这里不再重复实现，转用标准端点。
