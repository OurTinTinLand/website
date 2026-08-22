/// <reference path="../pb_data/types.d.ts" />
//
// Migration: 1755000070_add_privy_subject
// =============================================================================
// 在 users auth collection 上新增 privy_subject 字段（可选 text），用于把
// Privy 的 subject（did:privy:...）稳定地存到 PB 用户记录上，做 1:1 映射。
//
// 背景：原本想用 Privy subject 直接做 PB users.id，但 PB auth collection 的 id
// 字段硬约束 pattern=^[a-z0-9]+$、min=max=15（参见 _collections 表），不接受
// 含冒号/大写/超长的 Privy subject，且早期尝试自定义 id 被 PB 静默吞掉导致
// 记录未入库。改方案：id 仍 PB 自动生成，subject 存到这个字段，带索引可反查。
//
// 影响范围：
//   - /api/auth/privy-bridge hook 现在会优先按 privy_subject 找用户，再按 email
//   - user_profiles.user_id 关系不变（FK 到 users.id，仍 PB 生成）
//
// 运行：PB 启动时自动跑（migrationsDir）；首次启动后此字段已存在。
//
migrate(function(app) {
    var usersCol;
    try {
        usersCol = app.findCollectionByNameOrId("users");
    } catch (_) {
        console.log("[1755000070] users collection 不存在，跳过");
        return;
    }
    // 检查字段是否已存在（idempotent）
    var hasField = false;
    try {
        hasField = !!usersCol.fields.getByName("privy_subject");
    } catch (_) {}
    if (hasField) {
        console.log("[1755000070] users.privy_subject 已存在，跳过");
        return;
    }
    usersCol.fields.addAt(usersCol.fields.length, new Field({
        type: "text",
        options: { max: 200, pattern: "", min: 0, required: false },
        name: "privy_subject",
        presentable: false,
        system: false,
    }));
    // 索引（让 findUserByPrivySubject 快，且保证 1:1）
    try {
        usersCol.indexes.push("CREATE UNIQUE INDEX idx_privy_subject ON users (privy_subject) WHERE privy_subject != ''");
    } catch (_) {}
    app.save(usersCol);
    console.log("[1755000070] users.privy_subject 已新增 + UNIQUE 索引");
});
