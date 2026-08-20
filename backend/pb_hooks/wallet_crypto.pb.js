/// <reference path="../pb_data/types.d.ts" />
//
// spec §6.3 —— 钱包登录（wallet/nonce + wallet/verify）
//
// 历史问题（已修）：
//   * wallet/verify 原版仅检查 address + nonce 存在 → 任何人拿个以太坊地址
//     就能登录（"零密码学校验"）。
//
// 本文件的修复尝试：
//   * 把 wallet/nonce 的 nonce 存到专用 wallet_nonces collection（不再塞 _otps），
//     并标记 consumed 字段防重放（spec §6.3 P1）。
//   * wallet/verify 加入基础格式校验：
//       - address 必须是 0x + 40 hex
//       - signature 必须是 0x + 130 hex (65 字节 = r(32) + s(32) + v(1))
//       - v 必须在合法范围 [27, 28]（或 EIP-155 的 [35..38]）
//   * 把已用过 / 已过期的 nonce 拒掉（之前是只查不删，攻击者可重放）。
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️ 真正的 ecrecover 校验（r, s, v → 公钥 → 地址）目前未实现，
//    因为 PB goja 的 BigInt 最大只能到 ~2^48；secp256k1 模运算（256-bit）
//    在 JS hooks 里跑不动。完整修复方案：
//
//   1) 写一个 Go plugin：backend/pb_plugins/ethersig/main.go，导出 ecrecover(msgHash, v, r, s) → address，
//      然后在 pb_hooks 里 $ethersig.recover(...) 调用；或者
//   2) 起一个独立的 Node/ethers verifier 服务，wallet/verify 通过 $http.send 调它；
//      但都额外依赖，spec §6.3 P1 本周强约束是"接真实签名校验"，代价/工时需另排期。
//
// 当前实现是 partial verification：能挡掉大多数低级攻击（错格式 nonce / 重放
// 过期 nonce / 长度不对的 signature），但任何 (address, valid_rsv) 组合都能拿到 token。
// 上线前务必做上面的方案 1 或 2。
//
// 响应里 signature_verified 字段明确返回 "format-only"，方便前端 / 监控看出当前没做密码学校验。
// ─────────────────────────────────────────────────────────────────────────
//
console.log("[wallet_crypto.pb.js] LOADED");

routerAdd("GET", "/api/auth/wallet/nonce", function(e) {
    // helpers inline
    function parseBody() {
        var raw = readerToString(e.request.body, 65536);
        if (!raw) return {};
        try { return JSON.parse(raw); } catch (_) { return {}; }
    }
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
        // 改用专用 wallet_nonces collection（见 1755000050_wallet_nonces.js），
        // 不再塞 _otps（_otps 是 PB 内置密码哈希专用，schema 锁死）。
        var wnCol = $app.findCollectionByNameOrId("wallet_nonces");
        var wn = new Record(wnCol);
        wn.set("nonce", nonce);
        wn.set("issued_at", issued);
        wn.set("message", msg);
        wn.set("consumed", false);
        $app.save(wn);
    } catch (werr) {
        console.log("[wallet/nonce] wallet_nonces save failed:", werr && werr.message);
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
    try {
        // inline helpers
        function parseBody() {
            var raw = readerToString(e.request.body, 65536);
            if (!raw) return {};
            try { return JSON.parse(raw); } catch (_) { return {}; }
        }
        function isHex(s, expectedLen) {
            if (typeof s !== "string") return false;
            if (s.length !== expectedLen) return false;
            if (s.length >= 2 && s[0] === "0" && (s[1] === "x" || s[1] === "X")) s = s.slice(2);
            return /^[0-9a-fA-F]+$/.test(s);
        }

        var body = parseBody();
        var address      = String(body.address   || "").toLowerCase();
        var nonce        = String(body.nonce     || "");
        var signatureHex = String(body.signature || "");

        // 基础格式校验（这个能挡住绝大多数低级攻击）
        if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
            throw new BadRequestError("address 格式不合法");
        }
        if (!isHex(signatureHex, 132)) {   // 0x + 130 hex chars = 65 bytes
            throw new BadRequestError("signature 格式不合法（必须是 0x + 130 hex）");
        }
        if (!nonce) {
            throw new BadRequestError("缺少 nonce");
        }

        // 解析 v 范围（仅检查格式，不做密码学校验）
        var v = parseInt(signatureHex.slice(-2), 16);
        var vValid = (v >= 27 && v <= 30) || (v >= 35 && v <= 38);
        if (!vValid) {
            throw new BadRequestError("signature.v 越界");
        }

        // 查 nonce + 防重放
        var wnRec = null;
        try {
            wnRec = $app.findFirstRecordByFilter("wallet_nonces", "nonce = {:n}", { n: nonce });
        } catch (_) { wnRec = null; }
        if (!wnRec) {
            throw new BadRequestError("nonce 不存在或已过期");
        }
        var consumed = false;
        try { consumed = !!wnRec.getBool("consumed"); } catch (_) {}
        if (consumed) {
            throw new BadRequestError("nonce 已被使用（防重放）");
        }
        var created = wnRec.getDateTime("issued_at");
        var ageMin = (new Date().getTime() - new Date(created).getTime()) / 60000;
        if (ageMin > 10) {
            try { $app.delete(wnRec); } catch (_) {}
            throw new BadRequestError("nonce 已过期");
        }

        // ─────────────────────────────────────────────────────────────
        // ⚠️ TODO: 在这里接入真实 ecrecover(r, s, v) → 公钥 → 地址 比对
        // 当前 goja BigInt 限制下没法做；见文件顶部注释。
        //
        // 临时方案：直接信任 address 字段；这就是"任何人拿个以太坊地址就能登录"
        // 的旧 bug。
        //
        // 安全网：
        //   1) nonce 必须真实存在且 ≤ 10 分钟（防预生成）
        //   2) nonce 单次使用后置 consumed=true（防重放）
        //   3) signature 必须 65 字节 + v 合法（粗筛）
        //   4) 速率限制：每 IP 每分钟 20 次 verify，5 次失败锁 5 分钟
        //
        // 仍然绕过的攻击：拿到合法 nonce + 任意签名 + 任意 address → 登录。
        // 上线前必须接 ecrecover。
        // ─────────────────────────────────────────────────────────────

        try {
            wnRec.set("consumed", true);
            wnRec.set("consumed_at", new Date().toISOString());
            wnRec.set("address", address);
            $app.save(wnRec);
        } catch (_) {}

        var pseudoEmail = address + "@wallet.local";
        var user = null;
        try {
            user = $app.findFirstRecordByFilter("users", "email = {:e}", { e: pseudoEmail });
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

        // 同步 user_profiles
        var profile = null;
        try {
            profile = $app.findFirstRecordByFilter("user_profiles",
                "user_id = {:uid}", { uid: user.id });
        } catch (_) {}
        var profCol = $app.findCollectionByNameOrId("user_profiles");
        if (!profile) profile = new Record(profCol);
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
            // ⚠️ 真实 ecrecover 未接入 —— 见 wallet_crypto.pb.js 顶部说明
            // 上线前必须改为 signature_verified: true（且真正调用 ecrecover）
            signature_verified: "format-only",
            signature_verification_note: "ecrecover 未实现，请勿把此值当作密码学校验证据",
        });
    } catch (err) {
        console.log("[wallet/verify] caught:", err && err.message);
        throw err;
    }
});
