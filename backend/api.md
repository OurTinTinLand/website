# TinTinLand Backend — API Reference (v1.1)

> PocketBase v0.39.11 + JS hooks · base URL `http://127.0.0.1:8090`
>
> 后端 100% 用 JS Hooks + JS Migrations 实现，未改 pocketbase 源码。
> 目录类集合（catalog）允许匿名读写，业务写入类（orders/intents/signups/leads）
> 在 Auth 未上线前允许匿名提交，update/delete 仍只 superuser。
>
> v1.1 更新：新增 `user_profiles` / `job_postings` / `talent_profiles` 三张表；
> 改造 `orders` 业务规则为"下单即发顾问联系码"（前置发码）；
> 新增 `/api/auth/email-code*` + `/api/auth/wallet/*` 登录端点；
> 新增 `/api/orders/{id}/resend-advisor-code` 手动补发接口。

---

## 0. 启动 / 停止

```bash
cd backend

# 启动（前台）
./pocketbase serve --http=127.0.0.1:8090

# 启动（后台，nohup）
( nohup ./pocketbase serve --http=127.0.0.1:8090 > pb.log 2>&1 & )

# 健康检查
curl http://127.0.0.1:8090/api/health

# Admin UI（浏览器）
open http://127.0.0.1:8090/_/
```

默认 superuser（开发环境，**生产前必改**）：

| 字段    | 值                    |
| ------- | --------------------- |
| email   | `admin@tintin.land`   |
| password| `tintinland2026`      |

---

## 1. Collections 概览（v1.1）

| name             | type | listRule                          | createRule | 说明                                          |
| ---------------- | ---- | --------------------------------- | ---------- | --------------------------------------------- |
| users            | auth | `id = @request.auth.id`           | `null`     | 系统用户（PocketBase 内置）                   |
| user_profiles    | auth | `id = @request.auth.id`           | `id = @request.auth.id` | 用户档案（spec §9.5）         |
| courses          | base | `""`                              | `null`     | 课程目录                                     |
| events           | base | `""`                              | `null`     | 活动目录                                     |
| hackathons       | base | `""`                              | `null`     | 黑客松目录                                   |
| jobs             | base | `""`                              | `null`     | 招聘岗位（v1.0 旧版，V1.1 兼容保留）         |
| job_postings     | base | `review_status = 'approved' && published = true` | `null` | 企业招聘信息（spec §9.7/§15.1，contact 脱敏） |
| talent_profiles  | base | `status = 'looking' && review_status = 'approved'` | `null` | 人才信息（spec §9.7/§15.2，contact 不返回） |
| apps             | base | `""`                              | `null`     | 应用工具                                     |
| providers        | base | `""`                              | `null`     | Token Hub 渠道                               |
| orders           | base | `null`                            | `""`       | 支付订单（spec §9.4，下单即发码）            |
| intents          | base | `null`                            | `""`       | Token Hub 意向单（spec §9.6）                 |
| signups          | base | `null`                            | `""`       | 免费报名（含 review_status，spec §14.4）     |
| leads            | base | `null`                            | `""`       | 联系/咨询表单（spec §7.7/§7.8）               |

> `null` = superuser only；`""` = 任何人。

---

## 2. Catalog 公共读

所有 6 个 catalog collection + `job_postings` + `talent_profiles` 支持 PocketBase
标准 CRUD + 过滤 + 排序 + 分页。

```http
GET /api/collections/courses/records?page=1&perPage=20
GET /api/collections/courses/records?filter=category='AI Agent' && state='upcoming'
GET /api/collections/job_postings/records?sort=-created
GET /api/collections/talent_profiles/records?filter=skill_tags~'%EVM%'
```

### 通用 query params（前端常用）

| 参数      | 含义                                              |
| --------- | ------------------------------------------------- |
| `filter`  | PocketBase filter 表达式                          |
| `sort`    | `-created` / `order` / `-start_at` 等            |
| `page`    | 页码（1-based）                                   |
| `perPage` | 每页条数（默认 30，最大 500）                    |
| `fields`  | 投影：`id,title,slug,cover,price_amount`         |
| `expand`  | 展开外键                                          |

### 状态/分类 query 辅助（由 `guards.pb.js` 注入）

| param        | 作用 collection | 注入的 filter                   |
| ------------ | --------------- | ------------------------------- |
| `state`      | courses/events/hackathons | `state = '{upcoming\|ongoing\|past}'` |
| `published=1`| 所有 catalog     | `published = true`              |
| `category`   | courses         | `category = '{...}'`            |
| `tag`        | events          | `tag = '{AMA\|Workshop\|...}'` |
| `theme`      | hackathons      | `theme = '{Web3\|AI\|...}'`     |
| `role`       | jobs            | `role = '{...}'`               |
| `type`       | apps            | `type = '{...}'`               |

`job_postings` / `talent_profiles` 的 listRule 已写死 `review_status = 'approved'`，无需额外 query。

### 字段映射（spec §9 → collection schema）

| spec 字段                    | collection 字段                         |
| ---------------------------- | --------------------------------------- |
| `price.amount / origin / deposit` | `price_amount` / `price_origin` / `price_deposit`（3 个独立 number） |
| `price.type`                 | `price_type`（`free` / `paid`）          |
| `outline` / `agenda` / `tracks` / `judging` / `reqs` | 各自 json 字段 |
| `external_url`               | `external_url`（URL 字段）              |
| `signup_fields_config`       | `signup_fields` (json)                  |
| `signup_review_required`     | `signup_review_required` (bool)         |

---

## 3. 登录（spec §6）

### 3.1 邮箱验证码（**P0，本周主力**）

```http
POST /api/auth/email-code
{ "email": "user@example.com" }
```

返回：

```json
{
  "ok": true,
  "email": "user@example.com",
  "dev_code": "123456",      // 邮件服务未配置时返回，生产环境删除
  "mail_sent": false,
  "ttl_minutes": 10
}
```

```http
POST /api/auth/email-code/verify
{ "email": "user@example.com", "code": "123456" }
```

返回：

```json
{
  "ok": true,
  "token": "<jwt>",
  "record": { "id": "...", "email": "user@example.com", "verified": true },
  "login_method": "email"
}
```

调用后浏览器 SDK（`pb-client.js`）会把 token 存到 `_userToken`，后续 list/profile 接口
直接带 Authorization 头。

### 3.2 微信一键（**P1，本周 UI 占位**）

```http
GET /api/auth/wechat/url       → { ok:false, status:"not_configured", ... }
POST /api/auth/wechat/callback → 501 not_implemented
```

资质审核通过后接入 OAuth2.0：用户扫码 → 微信回调 → 后端 code 换 access_token → 写 users。

### 3.3 Web3 钱包签名（**P1，本周 MetaMask 基础版**）

```http
GET  /api/auth/wallet/nonce    → { nonce, message, ttl_minutes }
POST /api/auth/wallet/verify
{ "address": "0x...", "signature": "0x...", "nonce": "..." }
→ { token, record, signature_verified: false }
```

⚠️ 本周签名验证为占位（nonce 一致即通过）；真实签名校验（viem/ethers）放 V1.1。

### 3.4 客户端 SDK 用法

```js
import { requestEmailCode, verifyEmailCode,
         getWalletNonce, verifyWallet, logout } from "../backend/pb-client.js";

// 邮箱
await requestEmailCode("user@example.com");
const { token, record } = await verifyEmailCode("user@example.com", "123456");
// 后续 getUserProfile(record.id) 自动带 token

// 钱包
const { nonce, message } = await getWalletNonce();
// 让 MetaMask 签 message
const sig = await signer.signMessage(message);
await verifyWallet(address, sig, nonce);

logout();
```

---

## 4. 业务写入

### 4.1 `orders` — 支付订单（spec §9.4 + §8.3）

```http
POST /api/collections/orders/records
{
  "user_email": "buyer@example.com",
  "item_type": "course",
  "item_id": "abc123",
  "amount": 2599,
  "channel": "icbc_qr"
}
```

服务端会：

1. 校验 `amount > 0`
2. 校验 `item_id` 在 `courses/events/hackathons/jobs` 里存在
3. **强制设置 `status = pending_review`、`advisor_code_sent = true`**（v1.1 调整：前置发码）

```http
PATCH /api/collections/orders/records/{id}
Authorization: <superuser token>
{ "status": "verified" }
```

状态机（v1.1）：

```
pending_review ──> verified    （advisor_code_sent 保持 true，不重复触发）
pending_review ──> failed
failed         ──> pending_review / verified
verified       ──> (终态)
```

⚠️ `verified` 状态下修改 `advisor_code_sent` **不会**触发再次发送；如需补发走专用接口：

```http
POST /api/orders/{id}/resend-advisor-code
Authorization: <superuser token>
```

返回 `{ ok, advisor_code_sent: true, resend_count, user_email }`。

### 4.2 `intents` — Token Hub 意向单

```http
POST /api/collections/intents/records
{ "user_email":"...", "provider":"...", "expected_volume":"...", "contact":"...",
  "scene":"...", "status":"pending" }
```

状态机：`pending → contacted → closed`（受 hook 校验）。

### 4.3 `signups` — 免费报名（spec §14.4 加审核字段）

```http
POST /api/collections/signups/records
{ "user_email":"...", "kind":"event", "item_id":"...", "item_title":"...",
  "payload": { "name":"...", "phone":"...", "city":"..." } }
```

- `signup_review_required` 为 true 的内容：默认 `review_status = submitted`
- 否则默认 `review_status = approved`

运营审核（仅 superuser）：

```http
PATCH /api/collections/signups/records/{id}
Authorization: <superuser token>
{ "review_status": "approved", "review_notes": "ok" }
```

### 4.4 `leads` — 联系/咨询表单

```http
POST /api/collections/leads/records
{ "kind":"enterprise-ai", "user_email":"...", "company":"...", "name":"...",
  "contact":"...", "payload": { ... } }
```

`kind` 在 hook 里校验白名单。

---

## 5. 招聘板块（spec §9.7 / §15）

### 5.1 `job_postings` — 企业发布（contact 字段前台一律脱敏）

```http
GET /api/collections/job_postings/records
→ [{ id, company_name, title, location, remote, job_type,
     description, requirements, salary_range, tags, ... } ]
// 注：contact 字段前台返回 ""（hook 脱敏）；仅 superuser 可看
```

### 5.2 `talent_profiles` — 社区人才（contact 完全不返回）

```http
GET /api/collections/talent_profiles/records
→ [{ id, nickname, expected_role, work_experience,
     skill_tags, resume_url, bio, expected_salary, expected_city, status } ]
// contact 字段前台永远不返回（listRule + hook 双重保险）
```

企业发起联系 → 走专门 contact 通道（V1.1 实现，本周为运营人工对接）。

---

## 6. 个人中心（spec §9.5 / §16）

```http
GET /api/collections/user_profiles/records/{id}
Authorization: <user token>
→ { id, email, nickname, avatar, city, bio,
    skill_tags: [...], resume_url, social_links: {...},
    login_method, wallet_address, extensions: {...} }
```

> `listRule` / `viewRule` 限制只能看自己；前端拿 `getUserRecord().id` 当 id 即可。

`extensions` 字段结构示例：

```json
{
  "event_intake":    { "name": "", "phone": "", "city": "" },
  "hackathon_intake":{ "team_name": "", "github": "" }
}
```

报名时由前端把 `payload` 合并到 `extensions[k]`，避免重复填写。

---

## 7. 运营后台（spec §14）

后台读取下列 collection + 业务写入类，按需做 UI 即可：

| 模块 | 数据源 | 接口 |
|------|--------|------|
| 内容管理中心 | courses/events/hackathons/jobs/apps/providers | 增删改 + `signup_review_required` 开关 |
| 报名/投递审核 | signups (review_status) | `PATCH /signups/{id}` |
| 订单核销 | orders | `PATCH /orders/{id}` + `/api/orders/{id}/resend-advisor-code` |
| 意向单 | intents | `PATCH /intents/{id}` |
| 招聘审核 | job_postings/talent_profiles | `review_status` 字段 |

**用户与权限**（§14.6）：本周用 PocketBase 内置 `_superusers`；V1.1 起启用
`users` collection 的 auth + role 字段，给运营一个非 superuser 的角色。

---

## 8. 与 React SPA 的对接

`backend/pb-client.js` 是一个轻量浏览器端 SDK（无需打包），封装 fetch + 错误处理。
完整方法列表见文件末尾 `export default {...}`。

```js
import { aiRoute, listCoursesNormalized, requestEmailCode, verifyEmailCode,
         createOrder, resendAdvisorCode, listJobPostingsNormalized,
         listTalentProfilesNormalized, getUserProfileNormalized } from "../backend/pb-client.js";

// 首页假 AI 路由
const r = await aiRoute("想学 AI Agent");
if (r.intent === "course") renderCards(r.cards);

// 登录
await requestEmailCode("user@example.com");
await verifyEmailCode("user@example.com", "123456");

// 课程列表
const items = await listCoursesNormalized({ state: "upcoming" });

// 报名（自动带 user token）
await createSignup({
    user_email: "alice@example.com",
    kind: "event",
    item_id: eventId,
    item_title: "AI Agent AMA",
    payload: { name: "张三", phone: "13800138000" },
});

// 个人中心
const me = await getUserProfileNormalized(myRecord.id);
```

后端 base URL 通过 `window.PB_URL` 注入，缺省 `http://127.0.0.1:8090`。

---

## 9. Auth 上线时要做的事（备忘）

当前实现：
- 邮箱验证码登录已可用（生产环境需要配 SMTP；缺邮件服务时走 `dev_code`）
- 微信 / 钱包登录为占位，UI 入口可上线

上线后：
1. **删 dev_code** 字段（`auth.pb.js` mailSent=false 分支）
2. 配 SMTP：`./pocketbase serve --smtpHost=smtp.example.com --smtpPort=587 --smtpUsername=... --smtpPassword=...`
3. 上线微信 OAuth：替换 `/api/auth/wechat/*` 两条路由
4. 上线钱包签名校验：调用 ethers.verifyMessage 替换当前 nonce-only 校验
5. `users` / `user_profiles` 的 listRule 已在 schema 上收紧（`id = @request.auth.id`），
   前端记得传 `Authorization: <token>` 头

---

## 10. 参考

- PocketBase 文档：<https://pocketbase.io/docs/>
- PocketBase JSVM 参考：`pb_data/types.d.ts`（启动后自动生成）
- 与本仓配套的 spec：`../spec/README.md`
