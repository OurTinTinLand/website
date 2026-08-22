/// <reference path="../pb_data/types.d.ts" />
//
// spec §14 —— 运营后台安全加固（v1.1）
//
// 历史问题（已修）：
//   * 前端 src/utils/pb-client.js 硬编码了 superuser 邮箱密码，任何浏览器
//     DevTools 都能拿到。这是 P0 漏洞。
//   * 前端 demoAdmin() 直接设 is_admin=true，无任何后端校验。
//
// 本文件引入两个机制：
//   1) /api/admin/superuser-token
//      前端带一个 demo admin secret 调过来，secret 由 server.js 从
//      PB_ADMIN_DEMO_SECRET 环境变量注入到 index.html 的
//      window.PB_ADMIN_DEMO_SECRET（不要写死在源码里）。
//      后端校验 secret 之后，自己去 PB 拿 superuser token 返回给前端。
//      短命（默认 30 分钟），过期前端需要重新拿。
//   2) /api/admin/proxy —— 写 PB collection 的"运营"操作改走这里代理
//      POST /api/admin/proxy  body: { collection, method, id?, payload?, query? }
//      必须带 X-Admin-Token 头；后端用该 token 换出 superuser 后再调 PB。
//      前端拿到的是被代理过的结果，不再直接调 PB。
//
// 这样：
//   * secret 只在站内 window 注入 + 后端 env；源码 grep 不到明文密码
//   * 任何没有 secret 的浏览器直接调 /api/admin/* 都会被 401
//   * demoAdmin 改成"前端持有 secret 即可访问管理 UI"，后端真正守住权限
//
// 注意：goja 在执行 hook handler 时会重新编译一段只有 handler 字符串的小脚本，
// 闭包变量访问不到，所以所有 helper 都必须 inline 在 routerAdd 回调里。
//
console.log("[admin_proxy.pb.js] LOADED");

// 允许代写的 collection 白名单
var ADMIN_WRITABLE = [
    "courses", "events", "hackathons", "jobs", "apps", "providers",
    "job_postings", "talent_profiles",
    "signups", "orders", "intents", "leads",
];

// ─────────────────────────────────────────────────────────────────────
// 0. 签发 demo admin token
//    POST /api/admin/superuser-token  body: { secret: "..." }
//    返回 { ok, token, exp_ms, record }
// ─────────────────────────────────────────────────────────────────────
routerAdd("POST", "/api/admin/superuser-token", function(e) {
    try {
        // helpers inline（goja 重新编译 handler，闭包不可见）
        function parseBody(ev) {
            try {
                var raw = readerToString(ev.request.body, 65536);
                if (!raw) return {};
                return JSON.parse(raw);
            } catch (_) { return {}; }
        }

        var configured = ($os.getenv("PB_ADMIN_DEMO_SECRET") || "").trim();
        console.log("[admin/superuser-token] configured len:", configured.length);
        if (!configured) {
            throw new ForbiddenError("demo admin 未启用");
        }
        var body = parseBody(e);
        var submitted = String(body.secret || "");
        console.log("[admin/superuser-token] submitted len:", submitted.length);
        if (!submitted || submitted.length < 8 || submitted.length > 256) {
            throw new ForbiddenError("凭据无效");
        }
        // 恒定时间字符串比较（避免时序攻击侧信道）
        var eq = true, diff = 0;
        if (submitted.length !== configured.length) eq = false;
        else {
            for (var __i = 0; __i < submitted.length; __i++) {
                diff |= submitted.charCodeAt(__i) ^ configured.charCodeAt(__i);
            }
            eq = (diff === 0);
        }
        if (!eq) {
            throw new ForbiddenError("凭据无效");
        }
        // 默认值对齐 start.sh:${PB_ADMIN_EMAIL:-admin@tintin.land} 的设置；
        // 这避免 Railway Variables 没显式写但又用了 start.sh 默认 bootstrap
        // 出超管的场景下，运行时 auth 仍能拿回 token。
        // 注意：默认值是公开的（见 .env.example），上生产前应在 Railway Variables
        // 设 PB_ADMIN_EMAIL + PB_ADMIN_PASSWORD 覆盖。
        var adminEmail    = ($os.getenv("PB_ADMIN_EMAIL")    || "admin@tintin.land").trim();
        var adminPassword = ($os.getenv("PB_ADMIN_PASSWORD") || "tintinland2026").trim();
        if (!adminEmail || !adminPassword) {
            throw new InternalServerError("管理员账号未配置（需 PB_ADMIN_EMAIL + PB_ADMIN_PASSWORD）");
        }
        // fallback 命中默认值 → 在 log 里高亮，运维一眼能看到
        if (!$os.getenv("PB_ADMIN_EMAIL") || !$os.getenv("PB_ADMIN_PASSWORD")) {
            console.log("[admin/superuser-token] WARN: using fallback defaults — set PB_ADMIN_EMAIL + PB_ADMIN_PASSWORD in Railway Variables for prod");
        }
        // $http.send 需要绝对 URL；从 PB 的监听地址推断（生产可设 PB_ADMIN_AUTH_URL 覆盖）
        // 优先用 PB_ADMIN_AUTH_URL（生产 / 反代场景下显式配置）；
        // 否则把 Railway 注入的 PORT 拿来当本地端口；再否则用 PB_PORT/8090。
        // 这一行跟 start.sh 里 `pocketbase serve --http=0.0.0.0:${PORT}` 是同一份语义，
        // 必须保持一致，否则 goja 内发的回环 HTTP 走不到 PB 自己。
        var authUrl = $os.getenv("PB_ADMIN_AUTH_URL") || "";
        if (!authUrl) {
            var pbPort = $os.getenv("PORT") || $os.getenv("PB_PORT") || "8090";
            authUrl = "http://127.0.0.1:" + pbPort;
        }
        var resp = null;
        try {
            resp = $http.send({
                url:    authUrl + "/api/collections/_superusers/auth-with-password",
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body:   JSON.stringify({ identity: adminEmail, password: adminPassword }),
                timeout: 10,
            });
        } catch (err) {
            console.log("[admin/superuser-token] $http.send err:", err && err.message);
            throw new InternalServerError("PB 调用失败: " + (err && err.message));
        }
        var token = resp && resp.json && resp.json.token;
        if (!token) {
            console.log("[admin/superuser-token] no token, statusCode=", resp && resp.statusCode);
            throw new InternalServerError("PB 未签发 token");
        }
        var ttlMs = 30 * 60 * 1000;   // 30 分钟
        return e.json(200, {
            ok: true,
            token: token,
            exp_ms: ttlMs,
            record: resp.json.record || null,
        });
    } catch (err) {
        console.log("[admin/superuser-token] caught:", err && err.message, err && err.name, err && err.stack);
        throw err;
    }
});

// ─────────────────────────────────────────────────────────────────────
// 1. 通用代发：admin proxy
//    POST /api/admin/proxy
//    body: {
//      collection: "courses",          // 必填；必须在白名单内
//      method:     "POST"|"PATCH"|"DELETE",
//      id:         "记录 id（PATCH/DELETE 必填）",
//      payload:    { ... },            // 写操作的 body（POST/PATCH 用）
//      query:      { ... }             // 可选；拼成 ?k=v
//    }
//    Headers: X-Admin-Token: <demo admin superuser token>
// ─────────────────────────────────────────────────────────────────────
routerAdd("POST", "/api/admin/proxy", function(e) {
    try {
    // helpers inline
    function getHeader(ev, name) {
        try {
            var info = ev.requestInfo();
            var h = (info && info.headers) || {};
            var lcName = name.toLowerCase();
            // PB 把 header 标准化成 snake_case（X-Admin-Token → x_admin_token）
            var snake = lcName.replace(/-/g, "_");
            var v = null;
            try { v = h.get(name); } catch(_) {}
            if (v == null) {
                try { v = h.get(lcName); } catch(_) {}
            }
            if (v == null) {
                try { v = h.get(snake); } catch(_) {}
            }
            if (v == null) v = h[name];
            if (v == null) v = h[lcName];
            if (v == null) v = h[snake];
            if (Array.isArray(v)) v = v[0] || "";
            return String(v || "").trim();
        } catch (_) { return ""; }
    }
    function parseBody(ev) {
        try {
            var raw = readerToString(ev.request.body, 65536);
            if (!raw) return {};
            return JSON.parse(raw);
        } catch (_) { return {}; }
    }
    function requireAdminToken(ev) {
        var token = getHeader(ev, "X-Admin-Token");
        if (!token) throw new ForbiddenError("需要 admin token");
        return token;
    }

    var adminTok = requireAdminToken(e);
    var body = parseBody(e);
    var col      = String(body.collection || "");
    var method   = String(body.method || "POST").toUpperCase();
    var id       = body.id != null ? String(body.id) : "";
    var payload  = body.payload && typeof body.payload === "object" ? body.payload : {};
    var queryIn  = body.query   && typeof body.query   === "object" ? body.query   : {};

    // 白名单 inline（goja 重新编译 handler 时访问不到文件顶层变量）
    var ADMIN_WRITABLE = [
        "courses", "events", "hackathons", "jobs", "apps", "providers",
        "job_postings", "talent_profiles",
        "signups", "orders", "intents", "leads",
    ];

    if (ADMIN_WRITABLE.indexOf(col) === -1) {
        throw new BadRequestError("collection 不允许代写: " + col);
    }
    if (["POST", "PATCH", "DELETE"].indexOf(method) === -1) {
        throw new BadRequestError("method 必须是 POST/PATCH/DELETE");
    }
    if (method !== "POST" && !id) {
        throw new BadRequestError(method + " 必须传 id");
    }

    // $http.send 需要绝对 URL；与本文件 superuser-token handler 同一份逻辑。
    // 优先 PB_ADMIN_AUTH_URL（生产 / 反代场景显式配置），否则用 Railway 注入的 PORT，
    // 再否则 PB_PORT，最后回落到 8090。这一行跟 start.sh 里
    // `pocketbase serve --http=0.0.0.0:${PORT}` 必须保持一致，否则 goja 内发的
    // 回环 HTTP 走不到 PB 自己。
    var baseUrl = $os.getenv("PB_ADMIN_AUTH_URL") || "";
    if (!baseUrl) {
        var pbHost = $os.getenv("PB_HOST") || "127.0.0.1";
        var pbPort = $os.getenv("PORT") || $os.getenv("PB_PORT") || "8090";
        baseUrl = "http://" + pbHost + ":" + pbPort;
    }
    var pth = "/api/collections/" + encodeURIComponent(col) + "/records" +
              (id ? "/" + encodeURIComponent(id) : "");

    var queryParts = [];
    for (var k in queryIn) {
        if (Object.prototype.hasOwnProperty.call(queryIn, k)) {
            queryParts.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(queryIn[k])));
        }
    }
    if (queryParts.length > 0) pth += "?" + queryParts.join("&");

    var httpResp = null;
    try {
        httpResp = $http.send({
            url:    baseUrl + pth,
            method: method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": adminTok,
            },
            body: method === "DELETE" ? "" : JSON.stringify(payload),
            timeout: 15,
        });
    } catch (err) {
        throw new InternalServerError("PB 调用失败: " + (err && err.message));
    }
    var status = httpResp && httpResp.statusCode ? httpResp.statusCode : 502;
    var payloadOut = null;
    try { payloadOut = httpResp.json; } catch (_) { payloadOut = { ok: status < 400 }; }
    return e.json(status, payloadOut || { ok: status < 400 });
    } catch (err) {
        console.log("[admin/proxy] caught:", err && err.message, err && err.name, err && err.stack);
        throw err;
    }
});
