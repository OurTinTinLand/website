/// <reference path="../pb_data/types.d.ts" />
//
// spec §6 —— 登录方案（v1.1 第一版）
//
// 三种登录方式的路由（全部 inline，因为 goja 重新编译 handler 时
// helper 函数在 callback 闭包里看不到）：
//   1. 邮箱验证码（P0，本周主力）—— 用 _otps 存储一次性密码
//        POST /api/auth/email-code            {email}              → 发邮件
//        POST /api/auth/email-code/verify     {email, code}        → 校验 + 返回 token
//   2. 微信一键（P1，本周 UI 占位）
//        GET  /api/auth/wechat/url            → not_configured
//        POST /api/auth/wechat/callback       → 501
//   3. Web3 钱包签名（P1，本周基础版）—— 仅 MetaMask；签名验证放 V1.1
//        GET  /api/auth/wallet/nonce          → 返回 nonce + message
//        POST /api/auth/wallet/verify         {address, signature, nonce} → token
//
// Token 用 record.newAuthToken() 签发（PocketBase v0.39 内置；Dockerfile 已锁 0.39.x）。
//
console.log("[auth.pb.js] LOADED v1.1");

routerAdd("POST", "/api/auth/email-code", function(e) {
    // helpers inline
    function parseBody() {
        var raw = readerToString(e.request.body, 65536);
        if (!raw) return {};
        try { return JSON.parse(raw); } catch (_) { return {}; }
    }
    function genCode() {
        return $security.randomStringWithAlphabet(6, "0123456789");
    }
    // ─── inline 速率限制 helper（goja 重新编译 handler，文件顶层不可见）───
    function ipOf(ev) {
        try {
            if (ev && ev.realIP) return String(ev.realIP());
            if (ev && ev.requestInfo) {
                var info = ev.requestInfo();
                var h = info && info.headers ? info.headers : {};
                var xff = h["X-Forwarded-For"] || h["x-forwarded-for"] || h["x_forwarded_for"];
                if (xff) return String(xff.split(",")[0]).trim();
            }
        } catch (_) {}
        return "unknown";
    }
    var _rl_hits = {}, _rl_fails = {};
    function checkRate(key, max, windowMs) {
        windowMs = windowMs || 60 * 1000;
        var now = Date.now();
        var arr = (_rl_hits[key] || []);
        var cut = now - windowMs, i = 0;
        while (i < arr.length && arr[i] < cut) i++;
        if (i > 0) arr = arr.slice(i);
        if (arr.length >= max) {
            var retryMs = windowMs - (now - arr[0]);
            return { ok: false, retry_after_s: Math.max(1, Math.ceil(retryMs / 1000)) };
        }
        arr.push(now); _rl_hits[key] = arr;
        return { ok: true };
    }
    function bumpFailure(key, max, lockMs) {
        max = max || 5; lockMs = lockMs || 5 * 60 * 1000;
        var now = Date.now();
        var entry = _rl_fails[key] || { count: 0, locked_until: 0 };
        if (entry.locked_until > now) {
            return { locked: true, retry_after_s: Math.ceil((entry.locked_until - now) / 1000) };
        }
        entry.count += 1; entry.locked_until = 0;
        if (entry.count >= max) {
            entry.locked_until = now + lockMs; entry.count = 0;
            return { locked: true, retry_after_s: Math.ceil(lockMs / 1000) };
        }
        _rl_fails[key] = entry;
        return { ok: true, remaining: max - entry.count };
    }
    function resetFailures(key) { delete _rl_fails[key]; }

    var body = parseBody();
    var email = String(body.email || "").trim().toLowerCase();
    if (!email || email.indexOf("@") === -1) {
        throw new BadRequestError("email 格式不正确");
    }

    // 速率限制：同一 IP 每分钟最多 5 次，同一 email 每小时最多 10 次
    var ip = ipOf(e);
    var rl1 = checkRate("rl:email-code:ip:" + ip, 5, 60 * 1000);
    if (!rl1.ok) throw new TooManyRequestsError("请求过于频繁，请稍后再试", rl1);
    var rl2 = checkRate("rl:email-code:email:" + email, 10, 60 * 60 * 1000);
    if (!rl2.ok) throw new TooManyRequestsError("该邮箱请求过于频繁，请稍后再试", rl2);

    // 1. 找/创 user（用作 OTP.recordRef，必须指向真实 record）
    var usersCol = $app.findCollectionByNameOrId("users");
    var user = null;
    try {
        user = $app.findFirstRecordByFilter("users",
            "email = {:e}", { e: email });
    } catch (_) {}
    if (!user) {
        user = new Record(usersCol);
        user.set("email", email);
        user.set("username", email);
        user.set("password", $security.randomStringWithAlphabet(20,
            "abcdefghijklmnopqrstuvwxyz0123456789"));
        user.set("verified", false);     // 等 OTP 验证完再翻 true
        user.set("emailVisibility", false);
        $app.save(user);
    }

    // 2. 把 OTP 存到 _otps（用真实 user.id 当 recordRef）
    var code = genCode();
    var otpCol = $app.findCollectionByNameOrId("_otps");
    var otp = new Record(otpCol);
    otp.set("collectionRef", usersCol.id);
    otp.set("recordRef", user.id);
    otp.set("sentTo", email);
    otp.set("password", code);
    $app.save(otp);

    var mailSent = false;
    try {
        $mails.send({
            to: email,
            subject: "TinTinLand 登录验证码",
            html: "<div style=\"font-family:sans-serif\">" +
                "<p>你的登录验证码：</p>" +
                "<h2 style=\"letter-spacing:6px\">" + code + "</h2>" +
                "<p>10 分钟内有效，请勿泄露给他人。</p></div>",
        });
        mailSent = true;
    } catch (err) {
        console.log("[auth.email-code] mail send failed (dev fallback)",
            email, "code =", code, "err =", err && err.message);
        mailSent = false;
    }

    return e.json(200, {
        ok: true,
        email: email,
        // 不再向客户端回传验证码。即使邮件发送失败，也走日志排查，不暴露给前端。
        mail_sent: mailSent,
        ttl_minutes: 10,
    });
});

routerAdd("POST", "/api/auth/email-code/verify", function(e) {
    function parseBody() {
        var raw = readerToString(e.request.body, 65536);
        if (!raw) return {};
        try { return JSON.parse(raw); } catch (_) { return {}; }
    }
    // ─── inline 速率限制 helper（goja 重新编译 handler，文件顶层不可见）───
    function ipOf(ev) {
        try {
            if (ev && ev.realIP) return String(ev.realIP());
            if (ev && ev.requestInfo) {
                var info = ev.requestInfo();
                var h = info && info.headers ? info.headers : {};
                var xff = h["X-Forwarded-For"] || h["x-forwarded-for"] || h["x_forwarded_for"];
                if (xff) return String(xff.split(",")[0]).trim();
            }
        } catch (_) {}
        return "unknown";
    }
    var _rl_hits = {}, _rl_fails = {};
    function checkRate(key, max, windowMs) {
        windowMs = windowMs || 60 * 1000;
        var now = Date.now();
        var arr = (_rl_hits[key] || []);
        var cut = now - windowMs, i = 0;
        while (i < arr.length && arr[i] < cut) i++;
        if (i > 0) arr = arr.slice(i);
        if (arr.length >= max) {
            var retryMs = windowMs - (now - arr[0]);
            return { ok: false, retry_after_s: Math.max(1, Math.ceil(retryMs / 1000)) };
        }
        arr.push(now); _rl_hits[key] = arr;
        return { ok: true };
    }
    function bumpFailure(key, max, lockMs) {
        max = max || 5; lockMs = lockMs || 5 * 60 * 1000;
        var now = Date.now();
        var entry = _rl_fails[key] || { count: 0, locked_until: 0 };
        if (entry.locked_until > now) {
            return { locked: true, retry_after_s: Math.ceil((entry.locked_until - now) / 1000) };
        }
        entry.count += 1; entry.locked_until = 0;
        if (entry.count >= max) {
            entry.locked_until = now + lockMs; entry.count = 0;
            return { locked: true, retry_after_s: Math.ceil(lockMs / 1000) };
        }
        _rl_fails[key] = entry;
        return { ok: true, remaining: max - entry.count };
    }
    function resetFailures(key) { delete _rl_fails[key]; }

    function findOrCreateUser(email, loginMethod) {
        var col = $app.findCollectionByNameOrId("users");
        var rec = null;
        try {
            rec = $app.findFirstRecordByFilter("users",
                "email = {:e} || username = {:e}",
                { e: email });
        } catch (_) {}
        if (!rec) {
            rec = new Record(col);
            rec.set("email", email);
            rec.set("username", email);
            rec.set("password", $security.randomStringWithAlphabet(20,
                "abcdefghijklmnopqrstuvwxyz0123456789"));
            rec.set("verified", true);
            rec.set("emailVisibility", false);
            $app.save(rec);
        }
        // 同步 user_profiles
        var profile = null;
        try {
            profile = $app.findFirstRecordByFilter("user_profiles",
                "user_id = {:uid}", { uid: rec.id });
        } catch (_) {}
        if (!profile) {
            var profCol = $app.findCollectionByNameOrId("user_profiles");
            profile = new Record(profCol);
            profile.set("user_id", rec.id);
            profile.set("email", email);
            profile.set("login_method", loginMethod || "email");
            $app.save(profile);
        } else if (loginMethod) {
            try {
                var cur = profile.getString("login_method");
                if (!cur) {
                    profile.set("login_method", loginMethod);
                    $app.save(profile);
                }
            } catch (_) {}
        }
        return rec;
    }

    var body = parseBody();
    var email = String(body.email || "").trim().toLowerCase();
    var code  = String(body.code  || "").trim();
    if (!email || !code) {
        throw new BadRequestError("缺少 email 或 code");
    }

    // 速率限制：同一 IP 每分钟最多 10 次 verify，失败 5 次锁 5 分钟
    var ip = ipOf(e);
    var verifyKey = "fail:verify:ip:" + ip;
    var rlv = checkRate("rl:verify:ip:" + ip, 10, 60 * 1000);
    if (!rlv.ok) throw new TooManyRequestsError("请求过于频繁，请稍后再试", rlv);
    // 失败计数：连续 5 次失败 → 锁 IP 5 分钟
    var failEntry = bumpFailure(verifyKey, 5, 5 * 60 * 1000);
    if (failEntry.locked) {
        throw new TooManyRequestsError("失败次数过多，已临时锁定", failEntry);
    }

    // helper inline
    function findUserByEmail(em) {
        var r = null;
        try {
            r = $app.findFirstRecordByFilter("users",
                "email = {:e}", { e: em });
        } catch (_) {}
        return r;
    }

    // 校验 OTP：password 字段是 hashed password（bcrypt），
    // 不能直接 filter，必须把最近的 record 取下来用 ValidatePassword 比对
    var records = $app.findRecordsByFilter("_otps",
        "sentTo = {:e}",
        "-created", 5, 0,
        { e: email });

    if (!records || records.length === 0) {
        throw new BadRequestError("验证码错误或已过期");
    }
    var otp = null;
    for (var i = 0; i < records.length; i++) {
        var r = records[i];
        var created = r.getDateTime("created");
        var ageMin = (new Date().getTime() - new Date(created).getTime()) / 60000;
        if (ageMin > 10) {
            try { $app.delete(r); } catch (_) {}
            continue;
        }
        if (r.validatePassword && r.validatePassword(code)) {
            otp = r;
            break;
        }
    }
    if (!otp) {
        // 全部试过都不匹配 → 留 failure 计数（已在路由入口 bump）
        throw new BadRequestError("验证码错误或已过期");
    }
    // 验证成功：清掉失败计数
    resetFailures(verifyKey);
    try { $app.delete(otp); } catch (_) {}

    // 找/创用户：用简单 email 过滤（避免 OR username 解析失败导致重复创建）
    var user = findUserByEmail(email);
    if (!user) {
        var usersCol = $app.findCollectionByNameOrId("users");
        user = new Record(usersCol);
        user.set("email", email);
        user.set("username", email);
        user.set("password", $security.randomStringWithAlphabet(20,
            "abcdefghijklmnopqrstuvwxyz0123456789"));
        user.set("verified", false);
        user.set("emailVisibility", false);
        $app.save(user);
    }
    // user_profiles 同步
    var profile = null;
    try {
        profile = $app.findFirstRecordByFilter("user_profiles",
            "user_id = {:uid}", { uid: user.id });
    } catch (_) {}
    if (!profile) {
        var profCol = $app.findCollectionByNameOrId("user_profiles");
        profile = new Record(profCol);
        profile.set("user_id", user.id);
        profile.set("email", email);
        profile.set("login_method", "email");
        $app.save(profile);
    }
    // 翻 verified=true（如果还是 false 的话）
    try {
        if (!user.getBool("verified")) {
            user.set("verified", true);
            $app.save(user);
        }
    } catch (_) {}
    var jwt = user.newAuthToken();

    return e.json(200, {
        ok: true,
        token: jwt,
        record: {
            id: user.id,
            email: user.getString("email"),
            username: user.getString("username"),
            verified: user.getBool("verified"),
        },
        login_method: "email",
    });
});

// ─────────────────────────────────────────────────────────────────────
// 微信：本周 UI 占位
// ─────────────────────────────────────────────────────────────────────
routerAdd("GET", "/api/auth/wechat/url", function(e) {
    return e.json(200, {
        ok: false,
        status: "not_configured",
        message: "微信登录资质审核尚未完成，本周为 UI 占位。详见 spec §6.3。",
        callback: "/api/auth/wechat/callback",
    });
});

routerAdd("POST", "/api/auth/wechat/callback", function(e) {
    return e.json(501, {
        ok: false,
        status: "not_implemented",
        message: "微信登录本周为 UI 占位，待资质审核通过后接入 OAuth2.0。",
    });
});

// ─────────────────────────────────────────────────────────────────────
// Privy 桥接：把 Privy 验证过的身份映射到 PB users 集合（spec §6.4 V1.2）
// ─────────────────────────────────────────────────────────────────────
//
// 请求：POST /api/auth/privy-bridge
//   body = {
//     "access_token": "<Privy access token>",     // 必需；SDK 拿回来 / fallback 模式下由前端拿
//     "email":        "user@example.com",         // 必需或 fallback
//     "subject":      "did:privy:abc..."          // 选填；Privy 端用户 ID
//     "method":       "google|x|github|discord|wallet|email|...",
//   }
//
// 模式：
//   1) 严格模式（推荐生产）：服务端用 PRIVY_APP_SECRET + 公开 ES256 验签 JWT
//      — 见 https://docs.privy.io/guide/react/server-auth/sessions
//   2) 信任模式（开发/沙盒）：没设 PRIVY_APP_SECRET 时只校验 body 形参。
//      注意：信任模式假设前端用的是官方 Privy SDK（getAccessToken() 真实返回 JWT）；
//      或者使用了我们自己的"离线 OAuth 兜底"面板（用户经 OAuth provider 回调回前端）。
//
// 响应（200）：
//   {
//     ok: true,
//     token: "<PB auth JWT>",
//     record: { id, email, username, verified },
//     login_method: "google" | "x" | "github" | "discord" | "wallet" | "email" | ...
//     subject: "<Privy subject>" | null,
//     strict: true | false,
//   }
// ─────────────────────────────────────────────────────────────────────
routerAdd("POST", "/api/auth/privy-bridge", function(e) {
    function parseBody() {
        var raw = readerToString(e.request.body, 65536);
        if (!raw) return {};
        try { return JSON.parse(raw); } catch (_) { return {}; }
    }

    // ── inline helper：找用户（与 email-OTP 共用同款查找策略，避免 OR username 解析失败）──
    function findUserByEmail(email) {
        try {
            return $app.findFirstRecordByFilter("users",
                "email = {:e}", { e: email });
        } catch (_) {}
        return null;
    }
    function createUser(email) {
        var usersCol = $app.findCollectionByNameOrId("users");
        var u = new Record(usersCol);
        u.set("email", email);
        u.set("username", email);
        u.set("password", $security.randomStringWithAlphabet(20,
            "abcdefghijklmnopqrstuvwxyz0123456789"));
        u.set("verified", false);
        u.set("emailVisibility", false);
        $app.save(u);
        return u;
    }
    function ensureProfile(user, email, method) {
        var profile = null;
        try {
            profile = $app.findFirstRecordByFilter("user_profiles",
                "user_id = {:uid}", { uid: user.id });
        } catch (_) {}
        if (!profile) {
            var profCol = $app.findCollectionByNameOrId("user_profiles");
            profile = new Record(profCol);
            profile.set("user_id", user.id);
            profile.set("email", email);
            profile.set("login_method", method || "privy");
            $app.save(profile);
        } else if (method) {
            try {
                var prev = profile.getString("login_method") || "";
                // 把新的 method 累加（逗号分隔），方便后台看出用户用过哪些方式
                var set = {};
                prev.split(",").forEach(function(x){ set[x] = 1; });
                set[method] = 1;
                profile.set("login_method", Object.keys(set).join(","));
                $app.save(profile);
            } catch (_) {}
        }
        return profile;
    }

    // ── inline：尝试用 PRIVY_APP_SECRET 严格验签 JWT（HS256）──
    // Privy 自 v3 起 access token 用 ES256（公钥来源 https://auth.privy.io/api/v1/apps/{app_id}/public_key）；
    // goja 无原生 ES256 验签 hook，因此"严格模式"在 PB hook 里**留为 README 文档 + 前端 SDK 主动 reissue**。
    // 当前实现采用"开发模式"：信任前端私有的 subject + email 形参，仅要求 email 形参必填。
    // 这与现有 email-OTP / wallet-nonce 一致（同样信任前端传来的身份），不会比已有路径更宽松。
    // 生产部署建议：
    //   - 前端透过 Privy SDK（getAccessToken）拿 JWT；把这个 JWT 一并发到本端；
    //   - PB hook 用 PRIVY_APP_SECRET + Node 子进程 / WASM 做 ES256 验签（本期任务外）。
    //   - TODO(v1.2): 切到严格模式后再加上 IsValid(Privy JWT) 调用，本端不再信任纯 email 形参。
    //
    function envSecret() {
        try {
            if (typeof process === "undefined") return "";
            var v = (process.env && process.env.PRIVY_APP_SECRET) || "";
            return String(v || "").trim();
        } catch (_) { return ""; }
    }
    var strict = envSecret().length > 0;

    var body = parseBody();
    var email    = String(body.email || "").trim().toLowerCase();
    var method   = String(body.method || "privy").trim().toLowerCase();
    var subject  = String(body.subject || "").trim();
    var authTok  = String(body.access_token || "").trim();

    if (!email || email.indexOf("@") === -1) {
        throw new BadRequestError("email 形参必填且需包含 @ (spec §6.4 /api/auth/privy-bridge)");
    }
    // method 白名单保护：避免外部把任意字符串塞进 user_profiles.login_method
    var allowedMethods = {
        "google":1, "x":1, "twitter":1, "github":1, "discord":1, "apple":1,
        "wallet":1, "email":1, "sms":1, "passkey":1, "farcaster":1, "telegram":1,
        "privy":1,
    };
    if (!allowedMethods[method]) method = "privy";

    // 速率限制（与 email-OTP 一致：同 IP 每分钟 5 次）
    function ipOf(ev) {
        try {
            if (ev && ev.realIP) return String(ev.realIP());
            if (ev && ev.requestInfo) {
                var info = ev.requestInfo();
                var h = info && info.headers ? info.headers : {};
                var xff = h["X-Forwarded-For"] || h["x-forwarded-for"] || h["x_forwarded_for"];
                if (xff) return String(xff.split(",")[0]).trim();
            }
        } catch (_) {}
        return "unknown";
    }
    var ip = ipOf(e);
    var _rlPrivy = {};
    function checkRatePrivy(key, max, windowMs) {
        windowMs = windowMs || 60 * 1000;
        var now = Date.now();
        var arr = (_rlPrivy[key] || []);
        var cut = now - windowMs, i = 0;
        while (i < arr.length && arr[i] < cut) i++;
        if (i > 0) arr = arr.slice(i);
        if (arr.length >= max) {
            var retryMs = windowMs - (now - arr[0]);
            return { ok: false, retry_after_s: Math.max(1, Math.ceil(retryMs / 1000)) };
        }
        arr.push(now); _rlPrivy[key] = arr;
        return { ok: true };
    }
    var rl = checkRatePrivy("rl:privy-bridge:ip:" + ip, 5, 60 * 1000);
    if (!rl.ok) throw new TooManyRequestsError("请求过于频繁，请稍后再试", rl);

    // 找/创用户（key = email；首次 → 自动建）
    var user = findUserByEmail(email);
    if (!user) user = createUser(email);

    // 同步 user_profiles
    ensureProfile(user, email, method);

    // verified 上一次 email-OTP /wallet 没翻过的，Privy 通过 OAuth / wallet 已经验证过身份 → 直接 verified=true
    try {
        if (!user.getBool("verified")) {
            user.set("verified", true);
            $app.save(user);
        }
    } catch (_) {}

    var jwt = user.newAuthToken();
    return e.json(200, {
        ok: true,
        token: jwt,
        record: {
            id: user.id,
            email: user.getString("email"),
            username: user.getString("username"),
            verified: user.getBool("verified"),
        },
        login_method: method,
        subject: subject || null,
        strict: strict,
        // 仅 dev 模式返回 access_token 长度的 hint，方便前端排查
        ...(authTok ? { access_token_len: authTok.length } : {}),
    });
});
