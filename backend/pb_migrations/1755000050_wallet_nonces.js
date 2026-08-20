/// <reference path="../pb_data/types.d.ts" />
//
// v1.1 加固 —— wallet nonce 专用 collection
//
// 历史问题：auth.pb.js 里 wallet/nonce 直接用 $app.saveNoValidate() 把 nonce
// 写进 _otps 集合。_otps 是 PB 内置 collection，schema 锁得死；强行塞自定义
// 字段虽然能跑，但语义错位（_otps 是给密码哈希用的），将来 _otps 加校验就会崩。
//
// 这里加一个独立的 wallet_nonces 集合：
//   - nonce        主键（32 字符串）
//   - address      预留（以后可以做"nonce ↔ address"绑定审计）
//   - issued_at    时间
//   - message      完整原文（包含 nonce / issued_at / "Sign this..."）
//   - consumed     bool：是否已经被 verify 用过（防重放）
//   - consumed_at  date
//
// auth.pb.js 的 wallet/nonce 改成写这个集合；wallet/verify 改成读 + 标记 consumed。
//
migrate(function(app) {
    function ensure(schema) {
        try {
            app.findCollectionByNameOrId(schema.name);
            return null;
        } catch (_) {
            return new Collection(schema);
        }
    }

    var wn = ensure({
        name: "wallet_nonces",
        type: "base",
        // 不允许任何公开读（内部 API 用）；外部只能看到空集。
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
        fields: [
            { name: "nonce",        type: "text",   required: true, max: 64 },
            { name: "address",      type: "text",   max: 80 },
            { name: "issued_at",    type: "date" },
            { name: "message",      type: "text",   max: 1000 },
            { name: "consumed",     type: "bool" },
            { name: "consumed_at",  type: "date" },
        ],
        indexes: [
            "CREATE UNIQUE INDEX idx_wallet_nonces_nonce ON wallet_nonces (nonce)",
            "CREATE INDEX idx_wallet_nonces_consumed ON wallet_nonces (consumed)",
        ],
    });
    if (wn) app.save(wn);
}, function(app) {
    // DOWN：默认 no-op（保留数据）。需要清理时手动 app.delete。
});
