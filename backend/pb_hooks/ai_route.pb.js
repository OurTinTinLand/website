/// <reference path="../pb_data/types.d.ts" />
//
// spec §5.2 假 AI 路由规则引擎
//
// POST /api/ai-route  body = { message: string, chips?: string[] }
// 返回 { intent, intent_label, summary, cards: [], cta }
//
// 注意：goja 在执行 hook handler 时会重新编译一段只有 handler 字符串的小脚本，
// 闭包变量访问不到，所以所有 helper 都必须 inline 在 routerAdd 回调里。
//
routerAdd("POST", "/api/ai-route", function(e) {
    // ─── inline 速率限制 helper（goja 重新编译 handler，文件顶层不可见）───
    function ipOf(ev) {
        try {
            if (ev && ev.realIP) return String(ev.realIP());
            if (ev && ev.requestInfo) {
                var info = ev.requestInfo();
                var h = info && info.headers ? info.headers : {};
                var xff = h["X-Forwarded-For"] || h["x-forwarded-for"] || h["x_forwarded_for"];
                if (xff) return String(xff.split(",")[0]).trim();
            }
        } catch (_) {}
        return "unknown";
    }
    var _rl_hits = {}, _rl_fails = {};
    function checkRate(key, max, windowMs) {
        windowMs = windowMs || 60 * 1000;
        var now = Date.now();
        var arr = (_rl_hits[key] || []);
        var cut = now - windowMs, i = 0;
        while (i < arr.length && arr[i] < cut) i++;
        if (i > 0) arr = arr.slice(i);
        if (arr.length >= max) {
            var retryMs = windowMs - (now - arr[0]);
            return { ok: false, retry_after_s: Math.max(1, Math.ceil(retryMs / 1000)) };
        }
        arr.push(now); _rl_hits[key] = arr;
        return { ok: true };
    }
    function bumpFailure(key, max, lockMs) {
        max = max || 5; lockMs = lockMs || 5 * 60 * 1000;
        var now = Date.now();
        var entry = _rl_fails[key] || { count: 0, locked_until: 0 };
        if (entry.locked_until > now) {
            return { locked: true, retry_after_s: Math.ceil((entry.locked_until - now) / 1000) };
        }
        entry.count += 1; entry.locked_until = 0;
        if (entry.count >= max) {
            entry.locked_until = now + lockMs; entry.count = 0;
            return { locked: true, retry_after_s: Math.ceil(lockMs / 1000) };
        }
        _rl_fails[key] = entry;
        return { ok: true, remaining: max - entry.count };
    }
    function resetFailures(key) { delete _rl_fails[key]; }

    // 速率限制：每 IP 每分钟最多 60 次（关键词匹配是廉价的，但防滥用）
    var aIp = ipOf(e);
    var aRl = checkRate("rl:ai-route:ip:" + aIp, 60, 60 * 1000);
    if (!aRl.ok) throw new TooManyRequestsError("请求过于频繁，请稍后再试", aRl);

    // body 限 4KB（远小于之前 64KB，避免拿大 body 灌规则引擎）
    var raw = "";
    try { raw = readerToString(e.request.body, 4096); } catch (err) {
        throw new BadRequestError("body 过大（>4KB）");
    }
    var body = {};
    try {
        if (raw && raw.length > 0) body = JSON.parse(raw);
    } catch (err) {
        console.log("[ai_route] body parse failed:", err);
    }

    // message 限 256 字符；chips 限 8 个 × 64 字符
    var rawMessage = body.message == null ? "" : String(body.message);
    if (rawMessage.length > 256) {
        throw new BadRequestError("message 过长（>256）");
    }
    var rawChips = Array.isArray(body.chips) ? body.chips : [];
    var chips = [];
    for (var ci = 0; ci < rawChips.length && ci < 8; ci++) {
        var cv = String(rawChips[ci] || "");
        if (cv.length > 64) cv = cv.slice(0, 64);
        chips.push(cv);
    }

    var message = rawMessage.toLowerCase();
    var blob    = message + " " + chips.join(" ").toLowerCase();

    // intent 匹配规则表 —— 命中顺序即优先级
    var RULES = [
        ["course",    "课程",
         ["课", "学习", "教程", "训练营", "实战", "agent", "ai应用", "fde", "短剧"],
         "我看你想找门课——下面是当前最热的两门，你直接挑：",
         "course"],
        ["hackathon", "黑客松",
         ["黑客松", "比赛", "赛事", "hackathon", "奖金", "bounty"],
         "最近在报名的黑客松，奖金池都在这：",
         "hackathon"],
        ["event",     "活动",
         ["活动", "meetup", "ama", "workshop", "线下", "中国行", "新加坡", "tour"],
         "最近的线下/线上活动，挑一场你想去的：",
         "event"],
        ["job",       "招聘",
         ["工作", "招聘", "岗位", "求职", "投简历", "jd"],
         "我们和生态伙伴在招的岗位，可以直接投递：",
         "job"],
        ["tokenhub",  "Token Hub",
         ["token", "大模型", "api", "充值", "gpt", "claude", "deepseek", "渠道"],
         "Token Hub 渠道对接——挑一家你感兴趣的，下面是简介：",
         "tokenhub"]
    ];

    var matched = null;
    for (var i = 0; i < RULES.length; i++) {
        var rule = RULES[i];
        var keys = rule[2];
        for (var k = 0; k < keys.length; k++) {
            if (blob.indexOf(keys[k]) !== -1) { matched = rule; break; }
        }
        if (matched) break;
    }

    // helpers (all inlined)
    function cardForRoute(route, label, blurb) {
        return {
            kind: "route",
            route: route,
            title: label,
            blurb: blurb,
            cta_label: "去看 " + label,
            href: "#/" + route
        };
    }

    function labelForKind(k) {
        if (k === "course")    return "课程";
        if (k === "hackathon") return "黑客松";
        if (k === "event")     return "活动";
        if (k === "job")       return "岗位";
        if (k === "tokenhub")  return "渠道";
        return k;
    }

    function ctaForKind(k) {
        if (k === "course")    return { type: "route", label: "浏览全部课程",   href: "#/courses" };
        if (k === "hackathon") return { type: "route", label: "浏览全部黑客松", href: "#/hackathons" };
        if (k === "event")     return { type: "route", label: "浏览全部活动",   href: "#/events" };
        if (k === "job")       return { type: "route", label: "浏览全部岗位",   href: "#/jobs" };
        if (k === "tokenhub")  return { type: "route", label: "去 Token Hub",   href: "#/tokenhub" };
        return { type: "route", label: "回首页", href: "#/" };
    }

    function pluralForKind(k) {
        if (k === "course")    return "courses";
        if (k === "hackathon") return "hackathons";
        if (k === "event")     return "events";
        if (k === "job")       return "jobs";
        if (k === "tokenhub")  return "providers";
        return k;
    }

    function pluralToRoute(plural) {
        if (plural === "courses")    return "courses";
        if (plural === "hackathons") return "hackathons";
        if (plural === "events")     return "events";
        if (plural === "jobs")       return "jobs";
        if (plural === "providers")  return "tokenhub";
        return plural;
    }

    function priceLabel(rec) {
        if (rec.getString("price_type") === "free") return "免费";
        var amt = rec.getInt("price_amount");
        var hasDep = rec.getInt("price_deposit") > 0;
        return "¥" + amt + (hasDep ? "（可定金）" : "");
    }

    function recordToCard(kind, rec) {
        if (kind === "course") {
            return {
                kind: "course",
                id: rec.id,
                slug: rec.getString("slug"),
                title: rec.getString("title"),
                blurb: rec.getString("desc").slice(0, 80),
                price_label: priceLabel(rec),
                cta_label: rec.getString("price_type") === "paid" ? "报名这门课" : "免费学习",
                href: "#/courses/" + rec.id
            };
        }
        if (kind === "hackathon") {
            var prize = rec.getInt("prize_pool_usd");
            return {
                kind: "hackathon",
                id: rec.id,
                slug: rec.getString("slug"),
                title: rec.getString("title"),
                blurb: rec.getString("desc").slice(0, 80),
                prize_label: prize > 0 ? "$" + String(prize).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " 奖金池" : "奖金待定",
                cta_label: "查看黑客松",
                href: "#/hackathons/" + rec.id
            };
        }
        if (kind === "event") {
            return {
                kind: "event",
                id: rec.id,
                slug: rec.getString("slug"),
                title: rec.getString("title"),
                blurb: rec.getString("desc").slice(0, 80),
                when: rec.getString("start_at"),
                cta_label: "报名这场活动",
                href: "#/events/" + rec.id
            };
        }
        if (kind === "job") {
            return {
                kind: "job",
                id: rec.id,
                slug: rec.getString("slug"),
                title: rec.getString("title"),
                blurb: rec.getString("desc").slice(0, 80),
                company: rec.getString("company"),
                cta_label: "投递这个岗位",
                href: "#/jobs/" + rec.id
            };
        }
        if (kind === "tokenhub") {
            return {
                kind: "provider",
                id: rec.id,
                slug: rec.getString("slug"),
                title: rec.getString("name"),
                blurb: rec.getString("tagline"),
                price_label: rec.getString("price"),
                cta_label: "对接这个渠道",
                href: "#/tokenhub"
            };
        }
        return cardForRoute("/", "返回首页", "");
    }

    function pickCards(kind, limit) {
        try {
            var collection = $app.findCollectionByNameOrId(pluralForKind(kind));
            var filter = "published = true";
            if (kind === "course" || kind === "hackathon" || kind === "event") {
                filter += " && state != 'past'";
            }
            var sort = (kind === "job" || kind === "tokenhub") ? "order" : "-start_at";
            var records = $app.findRecordsByFilter(collection.name, filter, sort, limit, 0);
            var out = [];
            for (var i = 0; i < records.length; i++) {
                out.push(recordToCard(kind, records[i]));
            }
            if (out.length === 0) {
                out.push(cardForRoute(
                    pluralToRoute(pluralForKind(kind)),
                    labelForKind(kind),
                    "目前没有正在进行的" + labelForKind(kind) + "，先看看往期或报名提醒"
                ));
            }
            return out;
        } catch (err) {
            // pickCards error: silently swallowed for production safety
            return [cardForRoute(pluralToRoute(pluralForKind(kind)),
                labelForKind(kind), "数据暂不可用，稍后再试")];
        }
    }

    if (!matched) {
        return e.json(200, {
            intent: "fallback",
            intent_label: "没太懂",
            summary: "我还没学会——你可以直接看下面这几个板块，或者留言让我们的团队联系你。",
            cards: [
                cardForRoute("courses",   "课程",     "AI 应用 / Agent / FDE / 短剧 / Web3"),
                cardForRoute("events",    "活动",     "Meetup / AMA / 中国行与全球行"),
                cardForRoute("hackathons","黑客松",   "奖金池、赛道、评审、组队报名"),
                cardForRoute("jobs",      "招聘",     "生态岗位与自有岗位"),
                cardForRoute("tokenhub",  "Token Hub","大模型 token 渠道对接")
            ],
            cta: { type: "contact", label: "联系团队", href: "#/about" }
        });
    }

    var intent      = matched[0];
    var intentLabel = matched[1];
    var summary     = matched[3];
    var cardKind    = matched[4];

    return e.json(200, {
        intent: intent,
        intent_label: intentLabel,
        summary: summary,
        cards: pickCards(cardKind, 2),
        cta: ctaForKind(cardKind),
        echoed: { message: rawMessage.slice(0, 256), chips: chips }
    });
});
