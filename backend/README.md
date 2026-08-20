# TinTinLand 后端 — PocketBase v0.39.11

> 这是 `spec/README.md` v1.1 整套后端实现的物理位置。React SPA 仍住在仓库根的 `src/`，
> 数据由这个 PocketBase 通过 REST API 提供。**100% 用 JS Hooks + JS Migrations
> 实现，未修改 pocketbase 源码**。

## 目录结构

```
backend/
├── pocketbase              ← v0.39.11 二进制
├── .env                    ← PB_URL + 超级管理员账号
├── README.md               ← 本文件
├── api.md                  ← 给前端看的 REST API 速查
├── pb-client.js            ← 浏览器端 fetch 封装，可被 src/*.jsx 直接 import
├── pb_data/                ← PocketBase 数据目录（含 SQLite + types.d.ts）
├── pb_migrations/          ← JS 迁移文件
│   ├── 1755000000_init_collections.js     ← v1.0：10 个 collection 的 schema
│   ├── 1755000010_seed_catalog.js         ← v1.0：从 src/data/* 复制出来的种子数据
│   └── 1755000020_align_v1_1.js           ← v1.1：user_profiles / job_postings / talent_profiles
│                                                       + jobs/courses/events/hackathons 加 review_status
│                                                       + signups 加 review_status
│                                                       + orders 加 resend_count / last_resend_at
└── pb_hooks/               ← JS 业务钩子（自动热加载）
    ├── ai_route.pb.js      ← POST /api/ai-route      spec §5.2 假 AI 规则引擎
    ├── auth.pb.js          ← /api/auth/*             spec §6  邮箱/微信/钱包登录
    ├── orders.pb.js        ← orders 状态机 + /api/orders/{id}/resend-advisor-code   spec §8.3 / §14.5
    ├── intents.pb.js       ← intents 状态流转        spec §9.6
    ├── signups.pb.js       ← signups 审核 + 招聘 contact 脱敏  spec §14.4 / §15
    └── guards.pb.js        ← catalog 列表 ?filter / ?state 注入
```

## 1. 一键启动

```bash
cd backend
./pocketbase serve --http=127.0.0.1:8090        # 前台
# 或后台
( nohup ./pocketbase serve --http=127.0.0.1:8090 > pb.log 2>&1 & )

# 验证
curl http://127.0.0.1:8090/api/health
```

默认超级管理员（**上线前必改**）：

| 字段    | 值                  |
| ------- | ------------------- |
| email   | `admin@tintin.land` |
| password| `tintinland2026`    |

> V1.1 部署：通过 `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD` 环境变量覆盖默认值。
> `Dockerfile` + `start.sh` 启动时会跑 `pocketbase superuser upsert`（幂等），自动落库。
> `server.js` 同时把这两个值注入到 `index.html` 的 `window.PB_ADMIN_EMAIL/PASSWORD`，
> 前端 `src/utils/pb-client.js` 会优先读运行时注入，避免硬编码密码过期导致 401。

### 1.1 数据目录与持久化 Volume

PB 的数据目录（`--dir`）解析顺序，**优先级从高到低**：

1. `RAILWAY_VOLUME_MOUNT_PATH` —— Railway 注入的 Volume 挂载点（Railway 单 Volume）
2. `PB_DATA` —— 自定义环境变量
3. `/pb_data` —— 默认值

`start.sh` 启动时会 `mkdir -p` 这个目录。如果想用别的路径（如 `/data`），

- Railway 部署：改 `railway.toml` 的 `mountPath = "/data"`，Railway 会自动
  注入 `RAILWAY_VOLUME_MOUNT_PATH=/data`，start.sh 自动跟随。`PB_DATA` 不用动。
- 独立 Docker：`docker run -e PB_DATA=/data -v $PWD/data:/data ...`

**坑**：如果 `mountPath` 改了但没改 `--dir`，PB 会写到容器内临时路径，
重启数据全丢。改 mountPath 之前确认 `start.sh` 的解析顺序能跟随到。

## 2. 数据迁移

PocketBase v0.23+ 用 JS 写迁移。所有迁移在启动时自动按文件名升序 apply 到
`pb_data/data.db`，并把已 apply 的文件写入 `_migrations` 表。

```bash
# 启动一次后，看 pb_data/types.d.ts 就有最新的 Go 类型映射
head -50 pb_data/types.d.ts

# 看已 apply 的迁移
sqlite3 pb_data/data.db "SELECT file, applied FROM _migrations ORDER BY applied"
```

如果想清空重置（**会删数据**）：

```bash
pkill -9 -f pocketbase
mv pb_data pb_data.bak
./pocketbase serve --http=127.0.0.1:8090    # 重启会自动 init + 跑迁移 + seed
```

## 3. JS Hooks（自动热加载）

`pb_hooks/` 下所有 `*.pb.js` 文件会被 PocketBase 自动注册。**新增 hook 文件
需要重启 pocketbase；改已有文件则热加载**（skill 提示）。

```bash
# 调试期打开 SQL 日志
./pocketbase serve --http=127.0.0.1:8090 --dev
```

### 关键 API 速查

| 用途            | 全局对象/方法                                            |
| --------------- | --------------------------------------------------------- |
| 找 collection   | `$app.findCollectionByNameOrId("courses")`               |
| 找记录          | `$app.findRecordById("courses", id)`                     |
| 过滤记录        | `$app.findRecordsByFilter(coll, filter, sort, limit, off)` |
| 保存/删除       | `$app.save(record)` / `$app.delete(record)`               |
| HTTP 请求       | `$http.send({ url, method, body, headers })`              |
| 定时任务        | `cronAdd("id", "* * * * *", function(){...})`            |
| 发送邮件        | `$mails.send({ to, subject, html })`                      |
| 当前用户        | `$app.requestInfo(e.request).auth`                        |
| 签 auth token   | `record.newAuthToken()`                                  |
| 生成随机串      | `$security.randomStringWithAlphabet(n, alphabet)`         |
| 加路由          | `routerAdd("POST", "/path", function(e){...})`           |

### JS 语法约束（goja ES5）

* 无 `const` / `let`，用 `var`
* 无箭头函数 `(e) => {}`，用 `function(e) {}`
* 无 async/await，所有 API 是同步的
* 无 `import`，用 `require()` + `module.exports`
* **helper 函数必须 inline 进 callback 里**——goja 重新编译 handler 时只
  取字符串，无法解析跨函数闭包。本仓所有 hook 都遵循这点（见
  `ai_route.pb.js`）。

## 4. SPA 接入

直接在 `src/*.jsx` 文件里 import 即可：

```js
import { aiRoute, listCoursesNormalized,
         requestEmailCode, verifyEmailCode,
         createOrder, resendAdvisorCode,
         listJobPostingsNormalized, listTalentProfilesNormalized } from "../../backend/pb-client.js";

// 首页假 AI
const r = await aiRoute("想学 AI Agent");

// 登录
await requestEmailCode("user@example.com");
await verifyEmailCode("user@example.com", "123456");

// 课程
const items = await listCoursesNormalized({ state: "upcoming" });

// 下单（前置发码：advisor_code_sent 自动 true）
await createOrder({
    user_email: "buyer@example.com",
    item_type: "course",
    item_id: courseId,
    amount: 2599,
    channel: "icbc_qr",
});
```

后端 base URL 通过 `window.PB_URL` 覆盖（缺省 `http://127.0.0.1:8090`）。

## 5. 与 spec v1.1 的对齐情况

| spec 章节 | 实现位置 | 状态 |
|---|---|---|
| §5.2 假 AI 路由 | `pb_hooks/ai_route.pb.js` | ✅ |
| §6.1 邮箱验证码登录 | `pb_hooks/auth.pb.js` `email-code*` | ✅ |
| §6.3 微信登录（占位） | `pb_hooks/auth.pb.js` `wechat/*` | 🟡 UI 占位 |
| §6.1 钱包登录（基础版） | `pb_hooks/auth.pb.js` `wallet/*` | 🟡 占位（nonce 校验，签名验证放 V1.1） |
| §7.x 课程/活动/黑客松/招聘/应用/Token Hub 目录 | `pb_migrations/1755000000_init_collections.js` | ✅ |
| §8.3 订单前置发码 | `pb_hooks/orders.pb.js` | ✅ v1.1 改造完成 |
| §8.3 手动补发 | `POST /api/orders/{id}/resend-advisor-code` | ✅ |
| §9.5 UserProfile | `user_profiles` collection + `findOrCreateUser` in `auth.pb.js` | ✅ |
| §9.6 TokenHubIntent | `intents` collection | ✅ |
| §9.7/§15.1 JobPosting | `job_postings` collection（contact 脱敏） | ✅ |
| §9.7/§15.2 TalentProfile | `talent_profiles` collection（contact 不返回） | ✅ |
| §9.7/§15.3 隐私统一原则 | `signups.pb.js` `onRecordAfterFetch` 抹 contact | ✅ |
| §14.2 内容管理中心 | courses/events/hackathons/jobs 加 `review_status` / `signup_review_required` | ✅ |
| §14.4 报名/投递审核 | `signups.review_status` + 默认根据 `signup_review_required` 自动 approved/submitted | ✅ |
| §14.5 订单核销 | `orders.pb.js` + `resend-advisor-code` | ✅ |
| §14.6 用户与权限 | `_superusers`（v1.0）+ 预留 `users.role` | 🟡 V1.1 接通 |

## 6. 上线前 checklist

- [ ] 改 superuser 密码（`./pocketbase superuser upsert <email> <newpass>`）
- [ ] 设置 `encryptionEnv`：`./pocketbase serve --encryptionEnv=...`
- [ ] 配 SMTP：`--smtpHost=... --smtpPort=... --smtpUsername=... --smtpPassword=...`
- [ ] 删 `auth.pb.js` 中 `dev_code` 回显（生产不允许泄露）
- [ ] 启 CORS 白名单：`PB_ORIGINS=https://tintin.land,https://www.tintin.land ./start.sh`
      （未设置时默认 `*`；Dockerfile 统一镜像自动读取 env）
- [ ] 把 `pb_public/` 改成 SPA 编译产物，让 PocketBase 同时托管静态站点
- [ ] 接入微信 OAuth / 钱包签名校验（替换占位）
- [ ] 给 `users` / `user_profiles` 的 listRule/viewRule 在生产环境加 superuser 兜底
- [ ] 把开发种子数据（`1755000010_seed_catalog.js`）改成可重入的 idempotent migration

## 7. 与 `pocketbase-skill` 兼容情况

✅ 已验证 PocketBase v0.39.11 的 JSVM（goja v20260722）与 pocketbase-skill
教学的所有 API 兼容：

- `$app` / `$http` / `$mails` / `$security` / `$os` / `$filesystem` / `$tokens` 全局对象
- `routerAdd` / `routerUse` / `cronAdd` / `cronRemove`
- 所有 `onRecord*` / `onServe` 事件钩子（`onRecordsListRequest`、
  `onRecordCreateRequest` 等）
- `Collection` / `Record` / `Field` 类型化构造器
- `_superusers` 集合（v0.22 → v0.23 改名后的新名）
- 扁平的 field 选项（无 `options` 包装）
- `_otps` 系统集合（`CollectionNameOTPs`）—— 用于邮箱验证码存储
- `record.newAuthToken()` —— 签发 auth JWT

⚠️ 与 skill 文档的细微差异：

1. `$app.requestInfo(e.request)` 是 skill 文档里的写法，实际 v0.39.11 里
   `RequestInfo` 方法挂在 `*RequestEvent` 上，应该是 `e.requestInfo()`。
   本仓的代码避免了这个 API，需要 auth 时建议用 `$app.recordAuthWithPassword`。
2. `e.request.body()`（Express 风格）在 goja 绑定下不存在；读 body 用
   `readerToString(e.request.body, 65536)`（BindCore 提供的全局工具）。
3. `e.collection.name` / `e.collection_query.filter` 等嵌入字段，在 hook
   重新编译的 wrapper 里有几率出现 undefined。本仓的 `guards.pb.js`
   全部用 try/catch 包起来兜底。
4. v0.39 没有公开的 `auth-with-otp` 端点；本仓走 `_otps` 自建
   `/api/auth/email-code` + `/api/auth/email-code/verify`，配合
   `record.newAuthToken()` 签发。

⚠️ goja 在重新编译 handler 字符串时（每次 hook 触发都会走一遍），helper
函数如果在文件顶层声明 + 在 routerAdd/onRecord* 回调里调用，会出现
`ReferenceError: helper is not defined`。**所有 helper 必须 inline 进
callback 内部**（本仓全部遵循）。

## 8. 常用调试命令

```bash
# 实时看日志
tail -f backend/pb.log

# 直接看 SQLite
sqlite3 backend/pb_data/data.db "SELECT id,email FROM _superusers"
sqlite3 backend/pb_data/data.db "SELECT name, type FROM _collections WHERE system=0"
sqlite3 backend/pb_data/data.db "SELECT file, applied FROM _migrations ORDER BY file"

# 重置（清数据 + 重新跑迁移 + seed）
pkill -9 -f pocketbase
mv backend/pb_data backend/pb_data.bak
( cd backend && nohup ./pocketbase serve --http=127.0.0.1:8090 > pb.log 2>&1 & )
```
