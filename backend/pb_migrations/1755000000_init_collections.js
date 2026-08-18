/// <reference path="../pb_data/types.d.ts" />
//
// TinTinLand 新官网 v1.0 —— 后端 schema 初始化
//
// 设计原则：
//   1. 目录类（courses / events / hackathons / jobs / apps / providers）公开读，
//      仅 superuser 可写。
//   2. 业务写入类（orders / intents / signups / leads）现在允许匿名提交（Auth
//      还未上线，先用表单自带 email 标识用户），update/delete 仅 superuser。
//   3. users collection 默认存在，spec §9 里的 UserProfile 概念目前直接落在
//      signups / orders / intents 的 user_email / payload_json 字段上，等 Auth
//      接通后再合并为 users + profiles 两表 + 一条 view 查询。
//   4. 所有 enum 字段以 PocketBase select 实现，索引覆盖常用过滤维度。
//
// 此 migration 是幂等的（只在 collection 不存在时创建），可在 pb_data 已有数据
// 的情况下重复执行。
//
migrate((app) => {
  // helper: 用 schema 字符串创建 collection，已存在则跳过
  const ensure = (schema) => {
    try {
      app.findCollectionByNameOrId(schema.name);
      return null;
    } catch (_) {
      return new Collection(schema);
    }
  };

  // —— 1. courses ——
  const courses = ensure({
    name: "courses",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "title",           type: "text",   required: true, max: 200 },
      { name: "slug",            type: "text",   required: true, max: 200 },
      { name: "category",        type: "select", required: true, maxSelect: 1,
        values: ["AI 应用", "AI Agent", "FDE", "AI 短剧", "Web3 技术"] },
      { name: "difficulty",      type: "select", required: true, maxSelect: 1,
        values: ["入门", "中级", "进阶"] },
      { name: "form",            type: "select", required: true, maxSelect: 1,
        values: ["直播", "录播", "训练营"] },
      { name: "price_type",      type: "select", required: true, maxSelect: 1,
        values: ["free", "paid"] },
      { name: "price_amount",    type: "number", onlyInt: true },
      { name: "price_origin",    type: "number", onlyInt: true },
      { name: "price_deposit",   type: "number", onlyInt: true },
      { name: "cover",           type: "text",   max: 200 },
      { name: "dog",             type: "text",   max: 50 },
      { name: "start_at",        type: "date" },
      { name: "end_at",          type: "date" },
      { name: "state",           type: "select", maxSelect: 1,
        values: ["upcoming", "ongoing", "past"] },
      { name: "content_source",  type: "select", required: true, maxSelect: 1,
        values: ["native", "external_link"] },
      { name: "external_url",    type: "url",    max: 500 },
      { name: "teacher",         type: "text",   max: 200 },
      { name: "desc",            type: "text",   max: 4000 },
      { name: "outline",         type: "json" },
      { name: "signup_fields",   type: "json" },
      { name: "order",           type: "number", onlyInt: true },
      { name: "published",       type: "bool" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_courses_slug ON courses (slug)",
      "CREATE INDEX idx_courses_category ON courses (category)",
      "CREATE INDEX idx_courses_state ON courses (state)",
      "CREATE INDEX idx_courses_start_at ON courses (start_at)",
    ],
  });
  if (courses) app.save(courses);

  // —— 2. events ——
  const events = ensure({
    name: "events",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "title",           type: "text",   required: true, max: 200 },
      { name: "slug",            type: "text",   required: true, max: 200 },
      { name: "type",            type: "select", required: true, maxSelect: 1,
        values: ["线上", "线下", "混合"] },
      { name: "city",            type: "text",   max: 80 },
      { name: "tag",             type: "select", maxSelect: 1,
        values: ["AMA", "Workshop", "Meetup", "Party", "Tour", "Conference"] },
      { name: "cover",           type: "text",   max: 200 },
      { name: "dog",             type: "text",   max: 50 },
      { name: "start_at",        type: "date" },
      { name: "end_at",          type: "date" },
      { name: "state",           type: "select", maxSelect: 1,
        values: ["upcoming", "ongoing", "past"] },
      { name: "content_source",  type: "select", required: true, maxSelect: 1,
        values: ["native", "external_link"] },
      { name: "external_url",    type: "url",    max: 500 },
      { name: "desc",            type: "text",   max: 4000 },
      { name: "agenda",          type: "json" },
      { name: "signup_fields",   type: "json" },
      { name: "order",           type: "number", onlyInt: true },
      { name: "published",       type: "bool" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_events_slug ON events (slug)",
      "CREATE INDEX idx_events_type ON events (type)",
      "CREATE INDEX idx_events_state ON events (state)",
      "CREATE INDEX idx_events_start_at ON events (start_at)",
    ],
  });
  if (events) app.save(events);

  // —— 3. hackathons ——
  const hackathons = ensure({
    name: "hackathons",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "title",            type: "text",   required: true, max: 200 },
      { name: "slug",             type: "text",   required: true, max: 200 },
      { name: "theme",            type: "select", required: true, maxSelect: 1,
        values: ["Web3", "AI", "AI×Web3"] },
      { name: "prize_pool_usd",   type: "number", onlyInt: true },
      { name: "cover",            type: "text",   max: 200 },
      { name: "dog",              type: "text",   max: 50 },
      { name: "start_at",         type: "date" },
      { name: "end_at",           type: "date" },
      { name: "deadline",         type: "date" },
      { name: "state",            type: "select", maxSelect: 1,
        values: ["upcoming", "ongoing", "past"] },
      { name: "content_source",   type: "select", required: true, maxSelect: 1,
        values: ["native", "external_link"] },
      { name: "external_url",     type: "url",    max: 500 },
      { name: "tracks",           type: "json" },
      { name: "judging",          type: "json" },
      { name: "desc",             type: "text",   max: 4000 },
      { name: "signup_fields",    type: "json" },
      { name: "order",            type: "number", onlyInt: true },
      { name: "published",        type: "bool" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_hackathons_slug ON hackathons (slug)",
      "CREATE INDEX idx_hackathons_theme ON hackathons (theme)",
      "CREATE INDEX idx_hackathons_state ON hackathons (state)",
      "CREATE INDEX idx_hackathons_deadline ON hackathons (deadline)",
    ],
  });
  if (hackathons) app.save(hackathons);

  // —— 4. jobs ——
  const jobs = ensure({
    name: "jobs",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "title",     type: "text",   required: true, max: 200 },
      { name: "slug",      type: "text",   required: true, max: 200 },
      { name: "role",      type: "select", required: true, maxSelect: 1,
        values: ["工程", "运营", "BD", "设计", "AI"] },
      { name: "company",   type: "text",   required: true, max: 120 },
      { name: "city",      type: "text",   max: 80 },
      { name: "remote",    type: "bool" },
      { name: "desc",      type: "text",   max: 4000 },
      { name: "reqs",      type: "json" },
      { name: "order",     type: "number", onlyInt: true },
      { name: "published", type: "bool" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_jobs_slug ON jobs (slug)",
      "CREATE INDEX idx_jobs_role ON jobs (role)",
    ],
  });
  if (jobs) app.save(jobs);

  // —— 5. apps ——
  const apps = ensure({
    name: "apps",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "name",      type: "text",   required: true, max: 120 },
      { name: "slug",      type: "text",   required: true, max: 120 },
      { name: "type",      type: "select", required: true, maxSelect: 1,
        values: ["agency", "community"] },
      { name: "ic",        type: "text",   max: 10 },
      { name: "desc",      type: "text",   max: 2000 },
      { name: "link",      type: "url",    max: 500 },
      { name: "order",     type: "number", onlyInt: true },
      { name: "published", type: "bool" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_apps_slug ON apps (slug)",
      "CREATE INDEX idx_apps_type ON apps (type)",
    ],
  });
  if (apps) app.save(apps);

  // —— 6. providers —— (Token Hub 渠道介绍)
  const providers = ensure({
    name: "providers",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "name",          type: "text",   required: true, max: 120 },
      { name: "slug",          type: "text",   required: true, max: 120 },
      { name: "tagline",       type: "text",   max: 200 },
      { name: "models",        type: "text",   max: 200 },
      { name: "price",         type: "text",   max: 120 },
      { name: "settle",        type: "text",   max: 120 },
      { name: "latency",       type: "text",   max: 40 },
      { name: "monthly",       type: "json" },
      { name: "models_detail", type: "json" },
      { name: "todo",          type: "bool" },
      { name: "order",         type: "number", onlyInt: true },
      { name: "published",     type: "bool" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_providers_slug ON providers (slug)",
    ],
  });
  if (providers) app.save(providers);

  // —— 7. orders —— (支付订单，spec §9.4 / §8 第一层)
  //   createRule 开放（Auth 尚未上线，user_email 由表单自带）。
  //   update / delete 仅 superuser。
  const orders = ensure({
    name: "orders",
    type: "base",
    listRule: null,
    viewRule: null,
    createRule: "",
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "user_id",           type: "text", max: 80 },
      { name: "user_email",        type: "email", required: true },
      { name: "item_type",         type: "select", required: true, maxSelect: 1,
        values: ["course", "event", "hackathon", "job", "other"] },
      { name: "item_id",           type: "text",   required: true, max: 80 },
      { name: "item_title",        type: "text",   max: 200 },
      { name: "amount",            type: "number", required: true, onlyInt: true, min: 0 },
      { name: "is_deposit",        type: "bool" },
      { name: "channel",           type: "select", maxSelect: 1,
        values: ["icbc_qr", "wechat_pay", "alipay", "stripe", "stablecoin", "other"] },
      { name: "status",            type: "select", required: true, maxSelect: 1,
        values: ["pending_review", "verified", "failed"] },
      { name: "advisor_code_sent", type: "bool" },
      { name: "notes",             type: "text",   max: 1000 },
    ],
    indexes: [
      "CREATE INDEX idx_orders_user_email ON orders (user_email)",
      "CREATE INDEX idx_orders_status ON orders (status)",
      "CREATE INDEX idx_orders_item ON orders (item_type, item_id)",
    ],
  });
  if (orders) app.save(orders);

  // —— 8. intents —— (Token Hub 意向单，spec §9.6)
  const intents = ensure({
    name: "intents",
    type: "base",
    listRule: null,
    viewRule: null,
    createRule: "",
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "user_id",         type: "text",  max: 80 },
      { name: "user_email",      type: "email", required: true },
      { name: "provider",        type: "text",  required: true, max: 200 },
      { name: "expected_volume", type: "text",  max: 200 },
      { name: "contact",         type: "text",  required: true, max: 200 },
      { name: "scene",           type: "text",  max: 4000 },
      { name: "status",          type: "select", required: true, maxSelect: 1,
        values: ["pending", "contacted", "closed"] },
    ],
    indexes: [
      "CREATE INDEX idx_intents_user_email ON intents (user_email)",
      "CREATE INDEX idx_intents_status ON intents (status)",
    ],
  });
  if (intents) app.save(intents);

  // —— 9. signups —— (免费课程 / 活动 / 黑客松 / 招聘报名，spec §9.5 中
  //     "UserProfile.extensions" 的场景化字段落在 payload_json 里)
  const signups = ensure({
    name: "signups",
    type: "base",
    listRule: null,
    viewRule: null,
    createRule: "",
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "user_id",     type: "text", max: 80 },
      { name: "user_email",  type: "email", required: true },
      { name: "kind",        type: "select", required: true, maxSelect: 1,
        values: ["course", "event", "hackathon", "job"] },
      { name: "item_id",     type: "text", required: true, max: 80 },
      { name: "item_title",  type: "text", max: 200 },
      { name: "payload",     type: "json" },
      { name: "status",      type: "select", maxSelect: 1,
        values: ["submitted", "confirmed", "cancelled"] },
    ],
    indexes: [
      "CREATE INDEX idx_signups_user_email ON signups (user_email)",
      "CREATE INDEX idx_signups_kind_item ON signups (kind, item_id)",
    ],
  });
  if (signups) app.save(signups);

  // —— 10. leads —— (企业服务 / 申请上架 / 联系表单，spec §7.7 / §7.8)
  const leads = ensure({
    name: "leads",
    type: "base",
    listRule: null,
    viewRule: null,
    createRule: "",
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "kind",        type: "select", required: true, maxSelect: 1,
        values: ["app", "app-contact", "enterprise-ai", "enterprise-eco", "contact"] },
      { name: "user_email",  type: "email", required: true },
      { name: "contact",     type: "text",  max: 200 },
      { name: "name",        type: "text",  max: 120 },
      { name: "company",     type: "text",  max: 200 },
      { name: "payload",     type: "json" },
      { name: "status",      type: "select", maxSelect: 1,
        values: ["pending", "contacted", "closed"] },
    ],
    indexes: [
      "CREATE INDEX idx_leads_kind ON leads (kind)",
      "CREATE INDEX idx_leads_user_email ON leads (user_email)",
    ],
  });
  if (leads) app.save(leads);
}, (app) => {
  // DOWN：按依赖顺序反向删除
  const names = ["leads", "signups", "intents", "orders", "providers", "apps",
                 "jobs", "hackathons", "events", "courses"];
  for (const n of names) {
    try {
      const c = app.findCollectionByNameOrId(n);
      app.delete(c);
    } catch (_) {}
  }
});
