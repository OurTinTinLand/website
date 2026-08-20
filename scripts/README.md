# scripts/ —— PocketBase 测试 / 模拟 / 维护套件

> 这一目录用 [pocketbase/js-sdk](https://github.com/pocketbase/js-sdk) 的
> 官方 SDK 和 [pocketbase-cli](https://github.com/Ericsunsk/Pocketbase-CLI)
> 两个工具，把 spec v1.1 的每一项验收条款都跑一遍。
>
> **目标**：后端 hook / schema 改坏一处，CLI 立刻报警；前端 / Node 用同一份 SDK，
> 不需要重复实现 fetch wrapper / token 持久化 / normalizer。

---

## 文件结构

```
src/lib/pb-sdk.mjs                      ← 共享 SDK（src/lib + scripts/* 都引用）
scripts/
├── README.md                           ← 你正在看的
├── lib/
│   └── cli-utils.mjs                   ← CLI 工具（pass/fail/waitForOtpFromLog/createClient…）
├── pb-cli.mjs                          ← pocketbase-cli 的 Node wrapper（spawn + envelope 解析）
├── pbcli.mjs                           ← pocketbase-cli 的快捷 shim（直接 exec vendored binary）
├── check-pb.mjs                        ← 30 项：连通 + superuser + 集合清单（用 SDK）
├── test-spec-conformance.mjs           ← 35 项：§17 验收清单（用 SDK）
├── spec-verify.mjs                     ← 33 项：§17 验收清单（用 pocketbase-cli，独立验证）
├── simulate-auth.mjs                   ←  9 项：§6 登录方案模拟（用 SDK）
├── admin-crud.mjs                      ← 22 项：§14 运营后台 CRUD（用 SDK）
├── install-pbcli.sh                    ← 从 upstream 重新构建并更新 vendored pocketbase-cli
└── vendor/
    └── pocketbase-cli/                 ← vendored pocketbase-cli@0.1.7（dist/bin.js + package.json）
src/utils/pb-client.js                  ← 前端薄 shim（re-export pb-sdk.mjs 全部方法）
```

---

## 双轨制：为什么有 SDK 和 pocketbase-cli 两个工具

| 维度 | `src/lib/pb-sdk.mjs`（官方 pocketbase npm SDK） | `pocketbase-cli`（vendored binary） |
|---|---|---|
| 调用方式 | in-process（`import` + 调方法） | spawn 子进程（`spawn node dist/bin.js …`） |
| Token 管理 | SDK authStore + 自动 localStorage 同步 | 全局 `~/.cache/pocketbase-cli` 加密文件 |
| 输出 | 直接返回 JS 对象 | 结构化 JSON envelope `{ ok, schema_version, command, data, http, pagination }` |
| 类型安全 | IDE 友好（API 命名稳定） | shell 友好（人肉也能跑） |
| 适用场景 | 高频调用 + 前端 | 偶发管理 + 自动化 |
| spec 验证 | `test-spec-conformance.mjs` / `simulate-auth.mjs` / `admin-crud.mjs` | `spec-verify.mjs` |

**双源交叉验证**：两个工具都对同一组 spec 验收项做断言，结果应一致。
不一致说明某边有 bug（hook 在某条路径上行为不同 / SDK 端编码错误 / CLI wrapper envelope 解析错）。

---

## 怎么跑

### 0. 启动 PocketBase

```bash
cd backend
./pocketbase serve --http=127.0.0.1:8090 \
    --dir=pb_data \
    --hooksDir=pb_hooks \
    --migrationsDir=pb_migrations
```

> 邮箱验证码脚本依赖"无 SMTP 走 dev fallback"：发码失败时 PB 会把
> 6 位验证码打到 stdout，CLI 脚本从那里反查。如果 PB 配了 SMTP，
> CLI 跑 `simulate-auth email` 会卡在"等 OTP"——这时只能手动查邮箱。

### 1. SDK 套件

```bash
node scripts/check-pb.mjs                                       # 30 项 ✓
PB_LOG=/tmp/pb.log node scripts/test-spec-conformance.mjs       # 35 项 ✓
PB_LOG=/tmp/pb.log node scripts/simulate-auth.mjs all           #  9 项 ✓
node scripts/admin-crud.mjs                                    # 22 项 ✓
```

### 2. pocketbase-cli 套件

```bash
node scripts/spec-verify.mjs                                    # 33 项 ✓
node scripts/spec-verify.mjs preflight                         # 单跑 CLI preflight + info
node scripts/spec-verify.mjs ai                                 # §5 AI 路由
node scripts/spec-verify.mjs catalog                            # §7 catalog + filter
node scripts/spec-verify.mjs hiring                            # §7.4 / §15 招聘脱敏
node scripts/spec-verify.mjs auth                               # §6 登录
node scripts/spec-verify.mjs writes                             # §14 业务写入
```

### 3. vendored pocketbase-cli 直接用

```bash
# 通过 shim 跑（自动用 vendored binary）
node scripts/pbcli.mjs --json preflight
node scripts/pbcli.mjs records list courses --per-page 5
node scripts/pbcli.mjs collections get courses

# 或者直接用 vendored binary
node scripts/vendor/pocketbase-cli/dist/bin.js --help
node scripts/vendor/pocketbase-cli/dist/bin.js --json schema
```

---

## pocketbase-cli 维护合约

* **版本**：vendored 的是 [Ericsunsk/Pocketbase-CLI@v0.1.7](https://github.com/Ericsunsk/Pocketbase-CLI/releases)
* **更新**：`bash scripts/install-pbcli.sh` —— 重新 clone + 重新 build + 重新 vendor
* **自定义配置**：在 `npm run build` 阶段加了 `noExternal: [/.*/]`，把 `dotenv` 等 runtime 依赖打进去，
  这样 vendored binary 不需要任何 node_modules 就能跑
* **何时升级**：
  * 上游发新版本 → `bash scripts/install-pbcli.sh` → 重跑 `scripts/spec-verify.mjs` 比对结果
  * 如果 spec-verify 在新版本上挂 → 多半是 envelope 字段改了 → 同步更新 `scripts/pb-cli.mjs` 的字段映射

---

## scripts/pb-cli.mjs —— Node wrapper 设计要点

* **二进制解析**：
  1. `scripts/vendor/pocketbase-cli/dist/bin.js`（默认）
  2. `~/.local/share/pocketbase-cli/dist/bin.js`（官方 install-global.sh 安装位置）
  3. PATH 上的 `pocketbase-cli`
* **base URL**：通过 `POCKETBASE_CLI_BASE_URL` 环境变量传入（pocketbase-cli 0.1.7 唯一非持久化方式）
* **envelope 解析**：stdout 和 stderr 都扫，因为 pbcli 在某些失败路径下把 envelope 打到 stderr
* **错误类型**：`PbCliError` 含 `code / httpStatus / type / retryable / hint / missingPrerequisite / command / action / data / http`
* **登录默认 no-save**：CLI 工具里调 `pb.auth.loginWithPassword(...)` 默认不污染 `~/.cache/`；
  要保存（让后续 records.* 自动带 auth）显式传 `noSave: false`

---

## SDK 设计要点（src/lib/pb-sdk.mjs）

* **同一份代码，两端用**：`src/lib/pb-sdk.mjs` 在浏览器侧被 esbuild 打进 `dist/bundle.js`，
  在 Node 侧被 `scripts/*.mjs` 直接 dynamic import
* **base URL 三种来源**：
  1. `createPbClient({ baseUrl })` 显式传
  2. 环境变量 `PB_URL`
  3. 浏览器 fallback：当前 origin（PocketBase `--publicDir` 同源托管）
* **三种 token**：
  * user token（邮箱 / 钱包登录后）→ SDK authStore + 浏览器 localStorage
  * demo admin（`/api/admin/superuser-token`，带 `PB_ADMIN_DEMO_SECRET`）
  * superuser（CLI 直接 `pb.admins.authWithPassword`）
* **catalog 写操作**：
  * CLI：直接 `pb.collection(name).create/update/delete`
  * 浏览器：走 `/api/admin/proxy`（避免把 superuser 凭据漏到前端）
  * SDK 内部根据 `config.admin.email/password` 是否存在自动选择路径
* **normalize**：与旧 `src/utils/pb-client.js` 字段命名 1:1 对齐

---

## 历史

| 版本       | 时间       | 说明                                                                    |
| ---------- | ---------- | ----------------------------------------------------------------------- |
| pre-v1.1   | 2026-08-?? | `src/utils/pb-client.js` 自实现 fetch wrapper（475 行），无 npm 依赖    |
| v1.1       | 2026-08-21 | 引入官方 [pocketbase/js-sdk@0.28](https://github.com/pocketbase/js-sdk)，共享 SDK 收敛到 `src/lib/pb-sdk.mjs`，原 `src/utils/pb-client.js` 缩成 107 行 re-export shim |
| v1.1 +pbcli | 2026-08-21 | 引入 [Ericsunsk/Pocketbase-CLI@0.1.7](https://github.com/Ericsunsk/Pocketbase-CLI) 作为独立验证源；`scripts/spec-verify.mjs` 跟 SDK 套件对同一 spec 跑两遍做交叉验证 |

---

## 已知 / 顺手发现的问题

* `backend/pb_hooks/guards.pb.js` 用 `e.request.url.query()`（错误的 API）注入 filter，
  正确做法是 `e.requestInfo().query`（PB 0.22+ 改 API 了）。后果是 `?state=upcoming`
  这种 query 参数不会自动转成 server-side filter；只能走 `?filter=state="upcoming"` 显式形式。
  * 影响范围：依赖 guards hook 自动注入的客户端代码
  * 修复 PR：把 guards.pb.js 改成 `e.requestInfo().query`
* `backend/pb_hooks/inject_secrets.pb.js` 用 `onServe`（PB JSVM 没暴露这个 hook），加载时报
  `ReferenceError: onServe is not defined`，但 PB 仍然启动（其它 hook 正常）。功能上
  这个 hook 是 no-op（README 里也写了 "(no-op; start.sh handles substitution)"）
  所以问题只是日志噪音；要修就用 `onSettingsReload` 或别的 hook 实现。
