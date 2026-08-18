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
// Token 用 record.newAuthToken() 签发（PocketBase v0.39 内置）。
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

    var body = parseBody();
    var email = String(body.email || "").trim().toLowerCase();
    if (!email || email.indexOf("@") === -1) {
        throw new BadRequestError("email 格式不正确");
    }

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
        dev_code: mailSent ? null : code,    // 生产环境部署邮件后必须删除
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
        throw new BadRequestError("验证码错误或已过期");
    }
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
// 钱包：nonce + verify（V1.1 接真实签名校验）
// ─────────────────────────────────────────────────────────────────────
routerAdd("GET", "/api/auth/wallet/nonce", function(e) {
    function genNonce() {
        return $security.randomStringWithAlphabet(32,
            "abcdefghijklmnopqrstuvwxyz0123456789");
    }
    var nonce = genNonce();
    var issued = new Date().toISOString();
    var msg = [
        "TinTinLand Wallet Login",
        "Nonce: " + nonce,
        "Issued: " + issued,
        "Sign this message to prove you own this wallet.",
    ].join("\n");

    try {
        var otpCol = $app.findCollectionByNameOrId("_otps");
        var usersColId = $app.findCollectionByNameOrId("users").id;
        var otp = new Record(otpCol);
        otp.set("collectionRef", usersColId);
        // recordRef 必须指向真实 user，但 wallet 登录时 user 还不存在。
        // 用 SaveNoValidate 跳过 _otps 的 collectionRef/recordRef 校验。
        otp.set("recordRef", "wallet-nonce:" + nonce);
        otp.set("sentTo", "wallet:" + nonce);
        otp.set("password", "nonce-issued");
        $app.saveNoValidate(otp);
    } catch (werr) {
        console.log("[wallet/nonce] otp save failed:", werr && werr.message);
    }

    return e.json(200, {
        ok: true,
        nonce: nonce,
        issued_at: issued,
        message: msg,
        ttl_minutes: 10,
    });
});

routerAdd("POST", "/api/auth/wallet/verify", function(e) {
    function parseBody() {
        var raw = readerToString(e.request.body, 65536);
        if (!raw) return {};
        try { return JSON.parse(raw); } catch (_) { return {}; }
    }
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
            profile.set("login_method", loginMethod || "wallet");
            $app.save(profile);
        }
        return rec;
    }

    var body = parseBody();
    var address   = String(body.address   || "").toLowerCase();
    var nonce     = String(body.nonce     || "");
    if (!address || !nonce) {
        throw new BadRequestError("缺少 address 或 nonce");
    }

    // wallet nonce 不用密码校验，只检查 sentTo 存在 + 未过期
    var records = $app.findRecordsByFilter("_otps",
        "sentTo = {:s}", "-created", 5, 0,
        { s: "wallet:" + nonce });
    if (!records || records.length === 0) {
        throw new BadRequestError("nonce 不存在或已过期");
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
        otp = r;
        break;
    }
    if (!otp) {
        throw new BadRequestError("nonce 已过期");
    }
    try { $app.delete(otp); } catch (_) {}

    var pseudoEmail = address + "@wallet.local";
    // 找/创用户（wallet 走简化 filter）
    var user = null;
    try {
        user = $app.findFirstRecordByFilter("users",
            "email = {:e}", { e: pseudoEmail });
    } catch (_) {}
    if (!user) {
        var usersCol = $app.findCollectionByNameOrId("users");
        user = new Record(usersCol);
        user.set("email", pseudoEmail);
        user.set("username", pseudoEmail);
        user.set("password", $security.randomStringWithAlphabet(20,
            "abcdefghijklmnopqrstuvwxyz0123456789"));
        user.set("verified", true);
        user.set("emailVisibility", false);
        $app.save(user);
    }
    // 同步 user_profiles（含 wallet_address）
    var profile = null;
    try {
        profile = $app.findFirstRecordByFilter("user_profiles",
            "user_id = {:uid}", { uid: user.id });
    } catch (_) {}
    if (!profile) {
        var profCol = $app.findCollectionByNameOrId("user_profiles");
        profile = new Record(profCol);
    }
    profile.set("user_id", user.id);
    profile.set("email", pseudoEmail);
    profile.set("wallet_address", address);
    profile.set("login_method", "wallet");
    $app.save(profile);

    var jwt = user.newAuthToken();

    return e.json(200, {
        ok: true,
        token: jwt,
        record: {
            id: user.id,
            email: user.getString("email"),
            username: user.getString("username"),
        },
        login_method: "wallet",
        wallet_address: address,
        signature_verified: false,   // 本周为占位
    });
});
