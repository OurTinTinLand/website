/// <reference path="../pb_data/types.d.ts" />
//
// TinTinLand 新官网 v1.1 —— 运营后台写库补齐
//
// 这一版相对 v1.1 补的项：
//
//   * [加]  courses.subcategory          —— spec §7.1.1 Web3 技术 二级子类
//   * [加]  events.city / events.tag 已存在（来自 init），无新增
//   * [加]  jobs.location / jobs.contact / jobs.salary_range / jobs.job_type 已存在（align v1.1）
//   * [加]  apps.name / apps.ic / apps.link —— apps 缺 link 字段，补一下
//   * [加]  apps.slug —— apps init 时已有，复用
//
// 不做的（保持现状）：：
//   - signup_review_required / review_status 已经在 align v1.1 加过
//   - signup_fields_config / tags 已经在 align v1.1 remaining 加过
//   - audit_logs 集合（V1.1 可缓）
//
migrate(function(app) {
    function addField(coll, fieldData) {
        var fields = coll.fields;
        for (var i = 0; i < fields.length; i++) {
            if (fields[i].name === fieldData.name) return;
        }
        coll.fields.add(new Field(fieldData));
    }

    // A. courses: 加 subcategory（spec §7.1.1 Web3 技术下的 6 个二级子类）
    try {
        var c = app.findCollectionByNameOrId("courses");
        if (c) {
            addField(c, { name: "subcategory", type: "text", max: 80 });
            app.save(c);
        }
    } catch (e) { console.log("[admin-wire] courses.subcategory failed:", e && e.message); }

    // B. apps: 加 link（运营上架应用工具时的产品链接）
    try {
        var a = app.findCollectionByNameOrId("apps");
        if (a) {
            // init 里其实已经有 'link' 字段；但防御性补一次
            addField(a, { name: "link", type: "url", max: 500 });
            app.save(a);
        }
    } catch (e) { console.log("[admin-wire] apps.link failed:", e && e.message); }

    // C. providers: 加 contact（运营上线后填联系方式）
    try {
        var p = app.findCollectionByNameOrId("providers");
        if (p) {
            addField(p, { name: "contact", type: "text", max: 200 });
            app.save(p);
        }
    } catch (e) { console.log("[admin-wire] providers.contact failed:", e && e.message); }

    // 让 PB 重新加载 collection 缓存
    try { app.reloadCachedCollections(); } catch (e) { console.log("[admin-wire] reload cache failed:", e && e.message); }
},
function(app) {
    // DOWN：字段不回滚（保留数据）
});
