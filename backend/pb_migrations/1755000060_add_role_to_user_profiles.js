/// <reference path="../pb_data/types.d.ts" />
//
// v1.2 · spec §14.6 — user_profiles 加 role 字段
//
// 角色定义（PB _superusers 自动映射到 super_admin，见 auth.pb.js）：
//
//   super_admin         全部权限（运营后台 6 个 Tab 都能看）
//   content_ops         内容管理 + 首页运营位（Tab ① + ②）
//   reviewer            报名/投递审核 + 用户档案查询（Tab ③ + ⑤）
//   customer_support    订单核销 + 用户历史行为（Tab ④ + ⑤）
//   member              注册用户；只能看自己（个人中心 / 我的报名 / 我的订单）
//
// 默认值 member —— 普通登录用户即可获得。
// 运营角色由后台手动设置（spec §14.6 模块五"用户权限"），生产由 admin UI 操作。
// 升级期间幂等：
//   - 字段存在 → 跳过 addField
//   - 现有 user_profiles 没有 role → 手动 UPDATE 默认 'member'
//
// 不做的（V1.3 路线）：
//   - 不集成 _superusers 的 listRule 切换
//     （_superusers 是 PB 内置集合，没法 patch 字段；继续靠前端按 role 隐藏 Tab 是稳妥的）
//
migrate(function(app) {
    function addField(coll, fieldData) {
        var fields = coll.fields;
        for (var i = 0; i < fields.length; i++) {
            if (fields[i].name === fieldData.name) return;
        }
        coll.fields.add(new Field(fieldData));
    }

    var profiles = app.findCollectionByNameOrId("user_profiles");
    if (!profiles) {
        console.log("[v1.2 role] user_profiles not found, skip");
        return;
    }

    addField(profiles, {
        name: "role",
        type: "select",
        maxSelect: 1,
        values: ["member", "content_ops", "reviewer", "customer_support", "super_admin"],
    });

    app.save(profiles);

    // 给现有记录补默认值（PB 不会自动写 default 到现存的 record）
    try {
        app.db().newQuery("UPDATE user_profiles SET role = 'member' WHERE role IS NULL OR role = ''").execute();
    } catch (e) {
        console.log("[v1.2 role] backfill failed (continuing):", e && e.message);
    }

    // 加索引方便后台按角色筛人
    try {
        app.db().newQuery("CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles (role)").execute();
    } catch (e) {
        console.log("[v1.2 role] index failed:", e && e.message);
    }

    console.log("[v1.2 role] user_profiles.role added");
}, function(app) {
    // DOWN：尽量回滚（如果字段存在则删；index 不强制）
    try {
        var profiles = app.findCollectionByNameOrId("user_profiles");
        if (!profiles) return;
        var fields = profiles.fields;
        for (var i = fields.length - 1; i >= 0; i--) {
            if (fields[i].name === "role") {
                fields.splice(i, 1);
                break;
            }
        }
        app.save(profiles);
        console.log("[v1.2 role] down: removed role field");
    } catch (e) {
        console.log("[v1.2 role] down failed:", e && e.message);
    }
});
