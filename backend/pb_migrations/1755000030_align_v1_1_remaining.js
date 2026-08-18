/// <reference path="../pb_data/types.d.ts" />
//
// TinTinLand 新官网 v1.1 —— 后端补齐（spec 梳理清单逐项核对）
//
// 这一版相对 1755000020_align_v1_1.js 补的项：
//
//   * courses 加 tags（自定义标签数组） + signup_fields_config（json）
//     —— spec §7.1.1 三层分类体系 / §7.1.2 报名表单字段必选/可选配置
//   * events 加 signup_fields_config（json）
//     —— spec §7.2.1 活动报名表单字段规范
//   * orders 加 advisor_code_sent_at（date）
//     —— spec §9.4 / §8.3 顾问联系码前置发放的时间戳
//   * 枚举值清理：
//       courses.category：合并 "AI Agent" + "FDE" → "AI Agent·FDE"
//                        删除 "AI Agent" / "FDE" 单独值
//       events.tag：删除 "Party"
//       jobs.role：删除 "AI"（现有数据里没有 "AI"，安全删除）
//   * 数据迁移：把所有现存记录的旧 enum 值改成新值
//
// 不做的（thread 标注为 V1.1 可缓或本周不强求）：
//   - audit_logs 集合
//   - 4 套权限角色（spec §14.6）—— 继续用 _superusers
//   - Excel 批量导入（spec §14.2 建议项）
//   - 历史 orders.advisor_code_sent 回填 —— 新订单默认 true，老订单不强制改
//
migrate(function(app) {
    function addField(coll, fieldData) {
        var fields = coll.fields;
        for (var i = 0; i < fields.length; i++) {
            if (fields[i].name === fieldData.name) return;
        }
        coll.fields.add(new Field(fieldData));
    }

    function replaceSelectValues(coll, name, newValues) {
        var fields = coll.fields;
        for (var i = 0; i < fields.length; i++) {
            var f = fields[i];
            if (f.name === name && f.type === "select") {
                f.values = newValues;
                return true;
            }
        }
        return false;
    }

    // ─────────────────────────────────────────────────────────────────────
    // A. 枚举值迁移 + 清理（必须先做，否则下面 addField 的索引/约束会冲突）
    // ─────────────────────────────────────────────────────────────────────

    // A.1 courses: category 合并 "AI Agent" + "FDE" → "AI Agent·FDE"
    try {
        // 1. 把现存记录的旧值 → 新值
        app.db().newQuery("UPDATE courses SET category = 'AI Agent·FDE' WHERE category IN ('AI Agent', 'FDE')").execute();
        // 2. 直接改 _collections.fields JSON 数组里 name='category' 的元素
        //    fields 是 JSON 数组，每个元素是 {name:..., values:[...]}，需逐个 json_set
        app.db().newQuery(
            "UPDATE _collections SET fields = (" +
            "  SELECT json_group_array(" +
            "    CASE WHEN json_extract(value, '$.name') = 'category' " +
            "         THEN json_set(value, '$.values', json_array('AI 应用','AI Agent·FDE','AI 短剧','Web3 技术')) " +
            "         ELSE value END" +
            "  ) FROM json_each(_collections.fields)" +
            ") WHERE name = 'courses'"
        ).execute();
    } catch (e) { console.log("[align] courses.category migration failed:", e && e.message); }

    // A.2 events: tag 删 "Party"
    try {
        app.db().newQuery(
            "UPDATE _collections SET fields = (" +
            "  SELECT json_group_array(" +
            "    CASE WHEN json_extract(value, '$.name') = 'tag' " +
            "         THEN json_set(value, '$.values', json_array('AMA','Workshop','Meetup','Tour','Conference')) " +
            "         ELSE value END" +
            "  ) FROM json_each(_collections.fields)" +
            ") WHERE name = 'events'"
        ).execute();
    } catch (e) { console.log("[align] events.tag migration failed:", e && e.message); }

    // A.3 jobs: role 删 "AI"
    try {
        app.db().newQuery(
            "UPDATE _collections SET fields = (" +
            "  SELECT json_group_array(" +
            "    CASE WHEN json_extract(value, '$.name') = 'role' " +
            "         THEN json_set(value, '$.values', json_array('工程','运营','BD','设计')) " +
            "         ELSE value END" +
            "  ) FROM json_each(_collections.fields)" +
            ") WHERE name = 'jobs'"
        ).execute();
    } catch (e) { console.log("[align] jobs.role migration failed:", e && e.message); }

    // ─────────────────────────────────────────────────────────────────────
    // B. 加缺的字段
    // ─────────────────────────────────────────────────────────────────────

    // B.1 courses 加 tags（json array）+ signup_fields_config（json）
    var c1 = null;
    try { c1 = app.findCollectionByNameOrId("courses"); } catch (_) {}
    if (c1) {
        addField(c1, { name: "tags", type: "json" });
        addField(c1, { name: "signup_fields_config", type: "json" });
        app.save(c1);
    }

    // B.2 events 加 signup_fields_config（json）
    var e1 = null;
    try { e1 = app.findCollectionByNameOrId("events"); } catch (_) {}
    if (e1) {
        addField(e1, { name: "signup_fields_config", type: "json" });
        app.save(e1);
    }

    // B.3 orders 加 advisor_code_sent_at（date）
    //   注意：PocketBase 的 autodate 字段（created/updated）不存储在主表里，
    //   所以无法用 SQL 直接回填"用 created 时间"。这里只加字段，历史数据 sent_at 留空；
    //   新订单由 orders.pb.js 钩子在 create 时即时写入。
    var ordersCol = null;
    try { ordersCol = app.findCollectionByNameOrId("orders"); } catch (_) {}
    if (ordersCol) {
        addField(ordersCol, { name: "advisor_code_sent_at", type: "date" });
        app.save(ordersCol);
    }

    // 让 PocketBase 重新加载 collection 缓存，否则 enum 改动对 API 不可见
    try { app.reloadCachedCollections(); } catch (e) { console.log("[align] reload cache failed:", e && e.message); }
},
function(app) {
    // DOWN：字段不回滚（V1.1 已上线数据，保留字段避免回退丢数据）
    // 枚举值回滚仅在全新环境有意义；这里 no-op
});
