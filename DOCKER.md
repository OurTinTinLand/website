# Docker / Railway 部署说明

> 本文档配套 v2 单进程架构（pocketbase + pb_public 同源托管）。如果你在 v1
> 双容器 / Node 反代时代部署过，请看"老架构迁移"小节。

## 1. 文件清单

| 文件 | 用途 |
|---|---|
| `Dockerfile` | 单进程镜像构建（pocketbase + pb_public） |
| `start.sh` | 容器启动脚本（superuser upsert + `pocketbase serve`） |
| `railway.toml` | Railway 单 Service 配置（默认指向 `Dockerfile`） |
| `backend/pb_hooks/` | PocketBase 钩子（含 `inject_secrets.pb.js` 注入 `window.PB_ADMIN_DEMO_SECRET` + `auth.pb.js` 实现 `/api/auth/{email-code,email-code/verify,wallet/nonce,wallet/verify,privy-bridge,wechat/url,wechat/callback}`） |
| `src/components/Auth/` | Privy 登录面板（spec §6.4）：`<PrivyProviderRoot>` 自适应 SDK / 离线 fallback，详见 [PRIVY.md](PRIVY.md) |
| `backend/pb_migrations/` | PocketBase schema 迁移（spec v1.1） |
| `backend/pb_public/` | 静态前端（构建产物：`index.html` + `dist/` + `src/styles/` + `assets-claude/`） |
| `build.js` | esbuild 打包到 `backend/pb_public/` |
| `.dockerignore` | 排除 `pb_data`、`pb_public`（运行时重新生成）等 |

## 2. 架构

```
浏览器 ──► Railway PORT (3000)
              │
              ▼
        ┌────────────────────────────────┐
        │  Docker container (alpine)     │
        │  ┌─────────────────────────┐   │
        │  │ pocketbase :3000        │   │   ←── /api/* + /_* + 静态文件
        │  │  ├─ API routes          │   │       单 PORT 单进程
        │  │  ├─ Admin UI /_/        │   │       无 Node 反代层
        │  │  └─ --publicDir=/pb_public ─►│  ← index.html / dist/ / src/styles/
        │  │     + onServe hook 注入 │   │
        │  └─────────────────────────┘   │
        │       │                        │
        │       ▼                        │
        │  /pb_data  ──► Railway Volume  │   ← 持久化 PB 数据
        └────────────────────────────────┘
```

关键点：

- **单 PORT 单进程**：pocketbase 同时 serve 静态文件、API、`/_/` admin UI。
- **浏览器同源**：所有 `/api/*` 调用都是相对路径，天然免 CORS / host 头 / cookie domain 问题。
- **钩子注入 secret**：`window.PB_ADMIN_DEMO_SECRET` 由 `backend/pb_hooks/inject_secrets.pb.js` 的 `onServe` 钩子在 HTML 响应阶段注入，不进 git 不进镜像。
- **数据持久化**：`/pb_data` 挂 Railway Volume（`[[deploy.volumes]]` 在 `railway.toml` 声明）。

## 3. Railway 部署

### 3.1 一键（最简）

1. Railway → New Project → Deploy from GitHub → 选这个仓库
2. Railway 自动检测 `railway.toml` + `Dockerfile`，开始构建
3. Railway Service → Settings → Volumes → 添加 Volume：
   - Mount Path: `/pb_data`
   - Name: `pb-data`（必须与 `railway.toml` 一致）
4. Railway Service → Variables → 添加：
   - `PB_ADMIN_DEMO_SECRET` = 一个长随机串（运营后台 secret）
   - 可选：`PB_ORIGINS` = `https://your-domain.example.com`
5. 等待构建完成 → Railway 给你一个 `*.up.railway.app` 域名

### 3.2 自定义域名

Railway Service → Settings → Domains → 添加 `tintin.land`（按 Railway 提示配 DNS）。

### 3.3 环境变量

| 变量 | 必需 | 默认 | 说明 |
|---|---|---|---|
| `PORT` | 自动注入 | `3000` | Railway 自动注入；本地默认 3000 |
| `PB_ADMIN_EMAIL` | 否 | `admin@tintin.land` | 超管邮箱 |
| `PB_ADMIN_PASSWORD` | **生产必改** | `tintinland2026` | 超管密码（首次启动 upsert 到 PB） |
| `PB_ADMIN_DEMO_SECRET` | **生产必设** | `""` | 运营后台 demo 入口 secret；不设则 demo admin 401 |
| `PRIVY_APP_ID` | 否 | `""` | Privy App ID；不设时前端自动走离线 OAuth 兜底登录（详见 [PRIVY.md](PRIVY.md)）。登录集成 v1.2 |
| `PRIVY_CLIENT_ID` | 否 | `""` | Privy Public Client ID；OAuth 客户端配置用（仅设了 SDK 才需要） |
| `PRIVY_LOGIN_METHODS` | 否 | `email,google,x,github,discord,wallet` | 逗号分隔白名单；空值退回默认 |
| `PRIVY_APP_SECRET` | 否 | `""` | 仅用于后端严格模式 JWT 验签（v1.2 路线）；本期默认 trust 模式与 email-OTP 同级 |
| `PB_ORIGINS` | 否 | `*` | 逗号分隔的 CORS allowlist |
| `RAILWAY_VOLUME_MOUNT_PATH` | 自动注入 | — | Railway 注入的 Volume 挂载点；start.sh 自动跟随 |

## 4. 本地构建/运行

### 4.1 一次性构建 + 跑

```bash
# 1) 构建前端到 backend/pb_public/
npm run build

# 2) 起 PB（前台，Ctrl+C 退出）
bash backend/start.sh
# 或：
npm run serve:pb
```

浏览器打开 `http://127.0.0.1:8090/`。

### 4.2 开发循环（watch + serve）

终端 A：
```bash
npm run watch           # 监听 src/ 改动自动重建到 backend/pb_public/
```

终端 B：
```bash
npm run serve:pb        # 起 PB（前台）
```

### 4.3 Docker 本地构建

```bash
docker build -t tintinland-all .
docker run --rm -p 3000:3000 \
  -e PORT=3000 \
  -e PB_ADMIN_DEMO_SECRET=dev-secret-12345678 \
  -e PB_ORIGINS="http://localhost:3000" \
  -v $PWD/backend/pb_data:/pb_data \
  tintinland-all
curl http://localhost:3000/
curl http://localhost:3000/api/health
```

## 5. 老架构迁移（如果你之前用 Node + 反代）

老架构：
- 两个进程：node `server.js`（静态 + 反代）+ `pocketbase`（API）
- 两个 PORT：内部 `PB_PORT=8090`，外部 `${PORT}`
- 反代层：`/api/*` + `/_/*` 经 node 转发到 PB
- URL 概念：`PB_URL` / `window.PB_URL` / `PUBLIC_PB_URL` 三套

新架构：
- 一个进程：`pocketbase --publicDir=pb_public`
- 一个 PORT：直接 `${PORT}`（不再有内部 PB_PORT）
- 无反代层：所有请求 pocketbase 自己处理
- 无 URL 概念：浏览器全部用相对路径

迁移步骤：

1. 拉新代码
2. 重新构建：`npm run build`（产物落到 `backend/pb_public/`）
3. Railway 重新部署（自动触发）：新镜像只有一个进程 + 一个端口
4. **保留** `pb-data` Volume（PB schema / 数据不动）
5. **保留** `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD` / `PB_ADMIN_DEMO_SECRET` 环境变量
6. **删除** `PB_PORT` 环境变量（不再使用）
7. **删除** `PUBLIC_PB_URL` / `PB_URL` 环境变量（不再使用 —— 这是 v1 的 bug 之一）

## 6. 故障排查

### 6.1 浏览器仍调 127.0.0.1:8090

老的 `dist/bundle.js` 还在被浏览器缓存，或者镜像里的 `pb_public/` 还是老的。

排查：
```bash
curl -sS https://your-app.example.com/ | grep -E "PB_URL|127\.0\.0\.1"
# 期望：没有任何匹配（index.html 不再含 PB_URL 注入块）
```

修法：
1. 强制刷新（Cmd+Shift+R）
2. 确认镜像里的 `pb_public/` 是新的（`docker run --rm tintinland-all ls /pb_public/`）

### 6.2 /api/health 返回 502

PB 还没起来，或者 hooks 加载失败。检查日志：

```bash
docker logs <container-id>
# 期望看到：
# [admin_proxy.pb.js] LOADED
# [auth.pb.js] LOADED v1.1
# [inject_secrets.pb.js] LOADED
# ...
# [start.sh] bootstrapping superuser ...
# Server started at http://0.0.0.0:3000
```

### 6.3 demo admin 一直 401

`PB_ADMIN_DEMO_SECRET` 没设。检查：
1. Railway Variables 里有没有 `PB_ADMIN_DEMO_SECRET`
2. 浏览器 console 里看 `window.PB_ADMIN_DEMO_SECRET` 是不是 undefined（说明 onServe hook 没注入 —— 容器环境变量可能没传进去）
3. 查看响应源码：`curl -sS https://your-app.example.com/ | grep PB_ADMIN_DEMO_SECRET`

### 6.4 Privy 登录不可用

1. 浏览器 console 看 `window.PRIVY_APP_ID` 是不是空字符串
   - 空：没设环境变量 → LoginModal 走「离线 OAuth 兜底」（不报错）
   - 设有：跳到第 2 步
2. console 应该看到 `PrivyProviderRoot` 装载 SDK 时的日志；如看不到说明 `PrivyProviderRoot` 的 `useEffect` 还没跑
3. `npm run verify:privy` 验证 `@privy-io/react-auth` 已装；如失败，`npm install @privy-io/react-auth@latest --no-save --ignore-scripts`
4. 还是不行？看 `/api/auth/privy-bridge` 响应：浏览器 console 里看 `XHR` 面板，确认返回里有 `record.email` / `token`

### 6.5 Privy OAuth provider 报 redirect_uri_mismatch

1. https://dashboard.privy.io → 你 App → User management → Providers → 选中的 provider → Redirect URIs
2. 加上 `${your-domain}/auth/callback?provider=xxx`，例如 `https://tintin.land/auth/callback?provider=google`
3. 同样也要到 OAuth provider 的后台（Google Cloud / GitHub OAuth Apps 等）加 callback URL
