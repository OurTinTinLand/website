/// <reference path="../pb_data/types.d.ts" />
//
// v1.1.3 —— 首页运营位 + 通知文案配置（spec §14.3 / §14.7 基础版落地）
// 一张 home_ops 表（key 唯一 + data json）存四类运营配置：
//   * logo_wall         合作项目 Logo 墙（§14.3：增删、排序）
//   * hero              首页 Hero 文案（badge / h1 / lead）
//   * feed_pin          最新动态手动置顶（[{kind,id}, ...]，按顺序优先）
//   * notify_templates  系统通知文案模板（审核通过 / 订单核实 / 活动提醒）
// 读：公开（前台渲染用）；写：仅 superuser（admin 后台走代理）。
migrate(function(app) {
    var col = null;
    try { col = app.findCollectionByNameOrId("home_ops"); } catch (_) {}
    if (!col) {
        col = new Collection({
            name: "home_ops",
            type: "base",
            listRule: "",
            viewRule: "",
            createRule: null,
            updateRule: null,
            deleteRule: null,
            fields: [
                { name: "key",  type: "text", required: true, max: 60 },
                { name: "data", type: "json" },
            ],
            indexes: ["CREATE UNIQUE INDEX idx_home_ops_key ON home_ops (key)"],
        });
        app.save(col);
    }

    function upsert(key, data) {
        var rec = null;
        try { rec = app.findFirstRecordByFilter("home_ops", "key = {:k}", { k: key }); } catch (_) {}
        if (!rec) rec = new Record(col);
        rec.set("key", key);
        rec.set("data", data);
        var err = app.save(rec);
        if (err) throw new Error("seed home_ops " + key + " failed: " + (err.message || String(err)));
        console.log("[home_ops] seed " + key);
    }

    // Logo 墙默认值：与前端 HomePage 硬编码一致（[组名, 颜色, [名称...]]）
    upsert("logo_wall", [
        ["公链与生态", "#5F23F0", ["Polkadot","Aptos","Avalanche","Solana","BNB Chain","Polygon","Arbitrum","TON","Sui","Story Protocol","0G","Movement","NEAR","Flow","Conflux","StarkNet"]],
        ["投资机构", "#A233A8", ["OKX Ventures","HashKey Capital","SevenX Ventures","IOSG","Animoca Ventures","DWF Labs","Gate Ventures","MEXC Ventures","ArkStream Capital","BlockBooster","YBB Foundation","启明创投"]],
        ["行业媒体", "#E64145", ["The Block","CoinDesk","Foresight News","PANews","BlockBeats","ODAILY","金色财经","TechFlow","ChainCatcher"]],
        ["云与基础设施", "#0E9F6E", ["AWS","阿里云","Chainlink","Cosmos","imToken","Arweave","Celer Network","SubQuery"]],
        ["安全审计", "#C2751A", ["CertiK","SlowMist","Secure3","ScaleBit","SharkTeam","MoveBit"]],
    ]);

    // Hero 默认文案（h1 用 \n 分行：第一行 + 第二行 em 强调）
    upsert("hero", {
        badge: "2018 至今 · 30 万开发者 · 2026 全面转向 AI",
        h1: "华语开发者的主场\n现在向 AI 敞开。",
        lead: "八年，30 万开发者、50 多条公链、$370 万奖金池，连成了一张真实运转的网。课程、黑客松、生态合作、算力与 token——从这里开始，不用你自己找路。",
    });

    // 最新动态置顶：默认空
    upsert("feed_pin", []);

    // 通知文案模板（§14.7，{变量} 占位）
    upsert("notify_templates", {
        approved: "你报名的 {item_title} 已通过审核，期待你的参与！",
        order_verified: "订单 {order_id} 已核实到账，正式为你开通课程/活动权限。",
        event_reminder: "{item_title} 将在 {start_at} 开始，记得按时参加。",
    });
},
function(app) {
    // DOWN：no-op（保留数据）
});
