# Privy 登录集成（spec §6.4 · v1.2）

> 一句话：**没装 SDK 时走离线 OAuth 兜底，装了 + 配了 `PRIVY_APP_ID` 自动切到官方 SDK。** 两条路径共用同一后端 `/api/auth/privy-bridge` + 同一前端 store 写入逻辑。

---

## 1. 总览

```
┌────────────────────────────── Browser ──────────────────────────────┐
│  LoginModal.jsx ("Privy 一键登录" 按钮)                              │
│    └─ <PrivyLoginEntry onLogin onCancel />                          │
│         ├─ status.enabled + status.sdkReady === true               │
│         │   → <SdkLoginEntry> → <PrivyProvider> (动态导入)            │
│         │       ├─ usePrivy().login()   弹 Privy 自带 modal           │
│         │       └─ 用户完成 → { token, record, login_method, ... }    │
│         └─ status.enabled === false                                 │
│             → <PrivyStandaloneLogin>                                 │
│                 ├─ 走各 provider authorize URL (Google/GitHub/X/...) │
│                 └─ 钱包走 window.ethereum personal_sign             │
│                                                                       │
│        (上述两种 onLogin 都已含 PB /api/auth/privy-bridge 的返回)   │
└──────────────────────────────┬────────────────────────────────────────┘
                               │
                               ▼ POST /api/auth/privy-bridge
┌────────────────────────── PocketBase ─────────────────────────────────┐
│  backend/pb_hooks/auth.pb.js   routerAdd("POST", "/api/auth/privy-bridge"…)
│   ├─ 速率限制（同 IP 每分钟 5 次，与 email-OTP 一致）                  │
│   ├─ 找到/创建 users 集合里以 email 为 key 的 record                   │
│   ├─ 同步 user_profiles.login_method（comma-separated）              │
│   ├─ 发 PB auth JWT 返前端                                            │
│   └─ 当 PRIVY_APP_SECRET 已设置 → response.strict = true             │
│        （v1.2 路线：前端拿 JWT 后端用 ES256 验签；本期默认 trust 同级） │
└────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼ store.updateSession
                  React UI 立即反映已登录态
```

---

## 2. 安装步骤

### 2.1 在能联网的开发机（或 CI 镜像）安装 SDK

```bash
cd /Users/gear/Documents/GitHub/tintindog

# --no-save 不写 package.json（避免污染版本锁定）
# --ignore-scripts 跳过 postinstall（沙盒里 native 依赖会 trap）
# --no-audit --no-fund 加速
npm install @privy-io/react-auth@latest --no-save --ignore-scripts --no-audit --no-fund

# 验证
npm run verify:privy     # 应输出 "OK @privy-io/react-auth located"
```

> 没装也不要紧 —— `PrivyProviderRoot` 检测不到包就降级到 `PrivyStandaloneLogin`，登录面板照常可用。

### 2.2 设置环境变量

`start.sh` 在容器启动前把变量注入到 `window.PRIVY_*`。

| 变量 | 含义 | 必填 |
| --- | --- | --- |
| `PRIVY_APP_ID` | 必填；Privy Dashboard → App settings → App ID | ✓ |
| `PRIVY_CLIENT_ID` | Public Client ID（同页面），用于 OAuth 客户端配置 | 可选 |
| `PRIVY_LOGIN_METHODS` | 登录方式白名单，逗号分隔（默认 `email,google,x,github,discord,wallet`） | 可选 |
| `PRIVY_APP_SECRET` | 后端严格模式验签 JWT 用（不在前端暴露） | 可选 |

> **Railway / Docker 部署**：在 Railway dashboard 添加 `PRIVY_APP_ID=...` 等环境变量即可。
> **本地开发**：`export PRIVY_APP_ID="<your-app-id>"` 然后 `./backend/start.sh`。

---

## 3. Privy Dashboard 配置（启用前必做）

打开 https://dashboard.privy.io → 你的 App → Settings：

1. **App ID & Secret** ：复制 App ID 与 Secret（Secret 仅用于后端）。
2. **Allowed Login Methods** ：勾选 *Email*, *Google*, *X (Twitter)*, *GitHub*, *Discord*, *Apple*, *Wallet* 中你想要的。
3. **Embedded Wallets** ：勾选 *Create on login* > *For users without wallets*（这让新用户自动拿到钱包）。
4. **OAuth Provider Credentials** （受控 OAuth 时要填）：
   - **Google OAuth**：到 https://console.cloud.google.com 创建 OAuth Client，把 Client ID / Secret 填到 Privy Dashboard；redirect URI 加上 `${your-domain}/auth/callback`。
   - **X** / **GitHub** / **Discord** / **Apple** 同理。
5. **JWT 公钥**（严格模式要）：把 Privy 后端生成的 public key URL 抄到 `backend/pb_hooks/auth.pb.js` 顶部常量的 TODO 处（v1.2 路线，本期默认 trust 模式不依赖）。
6. **Allowed Origins / Domains** ：把 `https://tintin.land` 等生产域名加进白名单。

---

## 4. 启动后验证

打开浏览器 → 顶部登录 → 「Privy 一键登录」：

| 场景 | 期望结果 |
| --- | --- |
| 没设 `PRIVY_APP_ID`，没装 SDK | 弹「离线 OAuth 兜底登录」面板，列 email/google/x/github/discord/wallet，每个点一下能产生 fake code、Toast 报错（如需真 OAuth 见 §3.1） |
| 设了 `PRIVY_APP_ID`，没装 SDK | 弹「Privy SDK 正在加载…」半天没动静 —— 提示用户去装 SDK |
| 设了 `PRIVY_APP_ID`，装了 SDK | 弹 Privy 自带 modal（邮箱 / Google / X / GitHub / Discord / MetaMask） → 完成 → toast "已用 Google 登录" → 同时 session 写入 store |
| 进 `LoginModal` 后再点「Privy」 | 静默切到登录面板（不影响其它入口） |

---

## 5. 关键文件索引

```
src/
├── App.jsx                                  ← 用 <PrivyProviderRoot> 包
├── components/Auth/
│   ├── ProviderIcons.jsx                    ← Google/X/GitHub/... icon + label
│   ├── _privy-utils.js                      ← pickEmail/pickSubject/pickMethod
│   ├── PrivyBridge.jsx                      ← SDK 桥（usePrivy → /api/auth/privy-bridge）
│   ├── PrivyStandalone.jsx                  ← 离线 OAuth / 钱包签名 fallback
│   └── PrivyProviderRoot.jsx                ← 顶层 Provider + smart Entry 选择
├── modals/LoginModal.jsx                    ← "Privy 一键登录" 按钮
└── state/store.jsx                          ← loginPrivyBridge action

backend/
└── pb_hooks/auth.pb.js                      ← /api/auth/privy-bridge

PRIVY.md                                     ← 本文件
start.sh                                     ← 注入 window.PRIVY_* 到 index.html
index.html                                   ← 占位符 <!--INJECT:PRIVY_CONFIG-->
```

---

## 6. 故障排查

- **按钮一直显示 "SDK 加载中…"**：浏览器控制台查看是否有 `Failed to fetch dynamically imported module: @privy-io/react-auth`。说明没装 SDK。
- **`/api/auth/privy-bridge 401/429`**：被速率限制（同 IP 每分钟 5 次）。
- **`User rejected the request`**：MetaMask 提示时用户取消。
- **登录后没反应（store 没更新）**：检查 `loginPrivyBridge` 写入的 `setSession` 是否触发 `useEffect` 保存；检查 `PB.requestPrivyBridge` 是否被 `pb-sdk.mjs` 暴露（cmd + `node -e "const m=import('/abs/path/pb-sdk.mjs'); console.log(Object.keys(m))"`）。
- **`PRIVY_APP_SECRET` 已设置但报 `strict: false`** ：后端因没读到 env 自降级 —— 检查 `start.sh` export 的 env 是否传到 PB 进程。

---

## 7. V1.2 路线（严格模式）

本期（v1.1 / "trust 模式"）默认信任前端传来的 email + subject，**与现有 email-OTP / wallet-nonce 同安全等级**（都是"前端声明身份 → 后端签 PB token"）。

升级到 v1.2 的目标：

```
[Privy SDK] getAccessToken() → JWT (ES256)
                          ↓
[PB /api/auth/privy-bridge] 收 JWT
                          ↓
       (新) goja 子进程调 Node 子进程 / WASM，用 PRIVY_APP_SECRET 对应的公钥验签
                          ↓
       验签通过 → 拿 token.claims.email / .sub → find/create user
                          ↓
       发 PB token
```

实现路径参考：[Privy Server-Side Sessions](https://docs.privy.io/guide/react/server-auth/sessions)。PB v0.39 + goja 无 ES256 native 实现，需在 `pb_hooks/auth.pb.js` 内 fork 一个 Node 子进程调 `jose` 库验签，开销稍大但合理。

---

## v1.2 · role 模型（spec §14.6）

| role | 来源 | 自动识别 | 运营后台 |
| --- | --- | --- | --- |
| `super_admin` | PB `_superusers` 表（email 匹配） | ✓ | 全部 6 个 Tab |
| `content_ops` | `user_profiles.role` 字段 | 由 PB 后台手动设 | ① 内容 + ② 首页运营位 |
| `reviewer` | `user_profiles.role` 字段 | 由 PB 后台手动设 | ③ 审核 + ⑤ 用户权限 |
| `customer_support` | `user_profiles.role` 字段 | 由 PB 后台手动设 | ④ 订单核销 + ⑤ 用户权限 |
| `member` | 默认 | 新注册用户 | 无 |

### 后端解析逻辑（auth.pb.js）

```js
// 在 /api/auth/privy-bridge handler 末尾
function resolveRole(profile, email) {
    // 1. PB _superusers 表里有这个 email → super_admin
    // 2. 否则 user_profiles.role 字段
    // 3. 都没有 → 'member'（默认）
}
```

### 前端使用（src/state/store.jsx）

```js
import { canAccessAdmin, canSeeAdminTab, isOpsRole, ROLES } from 'src/state/store';

// 路由门
if (canAccessAdmin(session))       showAdmin();

canSeeAdminTab('content', session)   // → content_ops / super_admin 看
canSeeAdminTab('review', session)    // → reviewer / super_admin 看
canSeeAdminTab('orders', session)    // → customer_support / super_admin 看
```

### 给运营账号赋 role 的后台操作

PB 后台 → `user_profiles` collection → 找用户 → 改 `role` 字段 → 选下拉值（5 档）

---

## v1.2·ESM · bundle 切 ESM（重要）

v1.2 后期修复：把整包（bundle + react + @privy-io/react-auth 等）切到 ESM。

**为什么**：
- iife 时代的 bundle 用 UMD React，Privy 自己从 esm.sh 拉私有 ESM；两套 React 不共享 dispatcher
- `useContext()` 返回 null → PrivyProvider 挂载时崩

**怎么切的**（4 处文件改动）：

1. `build.js` — `--format=iife` → `--format=esm`，并为每个大包加 `--alias:NAME=https://esm.sh/NAME@VER`
2. `postbuild.js` — no-op stub（之前 iife 时代把 window.React 织入 bundle 内；现在不需要了）
3. `PrivyProviderRoot.jsx` — 静态 `import { PrivyProvider, usePrivy } from '@privy-io/react-auth'`，删动态 Function() loader
4. `index.html` — 删 UMD React scripts 与 `<script type="importmap">`，改 `<script type="module">` 加载 bundle.js

**bundle 体积**：
| 形态 | raw | gzipped |
| --- | --- | --- |
| iife + UMD inline | 1.28 MB | 525 KB |
| esm + CDN alias | 1.25 MB | 326 KB |

**唯一的 React 实例**：
- 应用代码：`import React from "https://esm.sh/react@18"`（alias 重写后）
- Privy 内部模块：`esm.sh/@privy-io/react-auth` 反吐的 shim 走路径绝对（`/react@^18 || ^19/...` 等），不需要 importmap 中转
- 两边都指向同一份 esm.sh React，浏览器视为同一 module 引用，dispatcher / context 共享

