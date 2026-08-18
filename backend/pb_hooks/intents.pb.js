/// <reference path="../pb_data/types.d.ts" />
//
// spec §9.6 / §7.5 —— Token Hub 意向单
//   * 创建时强制 status=pending（防前端漏设）
//   * 状态机 pending → contacted → closed（终态），不允许跳级或回退
//
onRecordCreateRequest(function(e) {
    var r = e.record;
    if (!r.getString("provider"))    throw new BadRequestError("provider 必填");
    if (!r.getString("contact"))     throw new BadRequestError("contact 必填");
    r.set("status", "pending");
    e.next();
}, "intents");

onRecordUpdateRequest(function(e) {
    var r       = e.record;
    var oldStat = e.record.original().getString("status");
    var newStat = r.getString("status");
    if (oldStat === newStat) { e.next(); return; }
    var allowed = {
        "pending":   ["contacted"],
        "contacted": ["closed", "pending"],
        "closed":    [],
    };
    if (allowed[oldStat].indexOf(newStat) === -1) {
        throw new BadRequestError("意向单状态不允许从 " + oldStat + " 变更为 " + newStat);
    }
    e.next();
}, "intents");
