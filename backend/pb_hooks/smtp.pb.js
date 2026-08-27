/// <reference path="../pb_data/types.d.ts" />
//
// SMTP 配置注入（spec §6.1 邮箱验证码登录 · 生产前置条件）
//
// 部署时只要设置环境变量（.env.example 已有模板），启动时自动写入
// PocketBase settings 的 SMTP 配置，验证码邮件即可发出：
//   PB_SMTP_HOST / PB_SMTP_PORT / PB_SMTP_USERNAME / PB_SMTP_PASSWORD /
//   PB_SMTP_TLS（可选，默认 true）/ PB_SMTP_SENDER（可选，默认 no-reply@tintin.land）
//
// 幂等：settings 里已是同一 host 且 enabled 时跳过，不重复写盘。
// 未设置 PB_SMTP_HOST → no-op（本地开发继续走 mail_sent=false 的调试路径）。
//
console.log("[smtp.pb.js] LOADED");
onBootstrap(function(e) {
    try {
        var host = $os.getenv("PB_SMTP_HOST");
        if (!host) { e.next(); return; }

        var s = $app.settings();
        var cur = s.smtp || {};
        if (cur.enabled && cur.host === host) { e.next(); return; }

        var port = parseInt($os.getenv("PB_SMTP_PORT") || "587", 10);
        var username = $os.getenv("PB_SMTP_USERNAME") || "";
        var password = $os.getenv("PB_SMTP_PASSWORD") || "";
        var tls = ($os.getenv("PB_SMTP_TLS") || "true") !== "false";
        var sender = $os.getenv("PB_SMTP_SENDER") || "no-reply@tintin.land";

        s.smtp.enabled = true;
        s.smtp.host = host;
        s.smtp.port = port;
        s.smtp.username = username;
        s.smtp.password = password;
        s.smtp.tls = tls;
        s.smtp.senderAddress = sender;
        s.smtp.senderName = "TinTinLand";

        $app.save(s);
        console.log("[smtp.pb.js] SMTP configured: " + host + ":" + port + " (sender " + sender + ")");
    } catch (err) {
        console.warn("[smtp.pb.js] SMTP setup skipped: " + (err && err.message ? err.message : String(err)));
    }
    e.next();
});
