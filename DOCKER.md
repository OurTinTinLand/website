# TinTinLand · Docker 部署说明

## 文件清单

| 文件 | 用途 |
|---|---|
| `Dockerfile` | **统一镜像** · 前端 + PocketBase 共容器、单 PORT（推荐） |
| `Dockerfile.frontend` | 仅前端 Web 服务（分离部署时用） |
| `Dockerfile.backend` | 仅 PocketBase 后端服务（分离部署时用） |
| `start.sh` | 统一镜像的启动脚本（先起 PB，再 exec Node）|
| `.dockerignore` | 统一构建时排除项（设计源 / spec / 后端数据） |
| `railway.toml` | Railway 默认配置（统一镜像） |
| `railway.backend.toml` | Railway 备选配置（仅分离部署时用） |

## 三种部署形态

### A. 统一镜像（推荐 · 单 Service）

```bash
docker build -t tintinland-all .
docker run --rm -p 3000:3000 \
  -e PORT=3000 \
  -v $PWD/backend/pb_data:/pb_data \
  tintinland-all
```

**架构**：

```
┌─── container ──────────────────────────┐
│                                        │
│   tini (PID 1)                         │
│     └─ /start.sh                        │
│          ├─ /pb/pocketbase :8090 (内部) │
│          └─ node server.js   :3000 ─────┼─► Railway PORT
│                └─ proxy /api/* /_/* ───►│  PB :8090 (loopback)
│                                        │
└────────────────────────────────────────┘
```

- **优点**：1 个 service = 1 个最小实例，省钱；零网络配置
- **缺点**：不能独立扩容前后端

### B. 分离部署（两个 Service）

```bash
# 前端
docker build -f Dockerfile.frontend -t tintinland-web .
docker run --rm -p 3000:3000 -e PORT=3000 tintinland-web

# 后端
docker build -f Dockerfile.backend -t tintinland-pb .
docker run --rm -p 8090:8090 \
  -e PORT=8090 \
  -v $PWD/backend/pb_data:/pb_data \
  tintinland-pb
```

**架构**：

```
frontend (Railway Service #1)     backend (Railway Service #2)
┌────────────────────┐            ┌────────────────────┐
│ node server.js     │   ──────►  │ pocketbase :8090   │
│  :3000 (公网)       │  内部 DNS │                    │
│                    │            │                    │
└────────────────────┘            └────────────────────┘
```

- **优点**：前后端独立扩容、独立重启
- **缺点**：需要给前端配置 PB 内部 DNS（如 `pb.railway.internal`）

### C. 本地开发（无需 Docker）

```bash
# 1. 起后端
cd backend && ./pocketbase serve --http=127.0.0.1:8090

# 2. 起前端（不带 PB_URL，纯静态）
PORT=8123 node server.js
```

或起前端 + 启用代理指向本地 PB：

```bash
PORT=8123 PB_URL=http://127.0.0.1:8090 node server.js
# → http://localhost:8123/api/* 会被 server.js 反向代理到 PB
```

## 反向代理规则

`server.js` 在设置了 `PB_URL` 环境变量时启用反向代理：

| 请求前缀 | 处理方式 |
|---|---|
| `/api/*` | 代理到 PB（REST API） |
| `/_/*`  | 代理到 PB（管理后台 UI） |
| 其他    | 由 server.js 静态服务 |

代理支持 WebSocket upgrade（PB 实时订阅用得到）。

## Railway 部署（统一镜像）

1. **创建项目** → New Project → Deploy from GitHub repo
2. **自动检测** `Dockerfile`（默认就是 `Dockerfile` = 统一镜像）
3. **添加 Volume** → 挂 `/pb_data` 到一个 Volume（生产数据持久化）
4. **自动注入** `PORT`，无需额外配置
5. **验证**：
   - `https://<your-app>.up.railway.app/` → 看到官网首页
   - `https://<your-app>.up.railway.app/api/health` → `{"message":"API is healthy."}`
   - `https://<your-app>.up.railway.app/api/collections/courses/records` → 课程数据
   - `https://<your-app>.up.railway.app/_/` → PB 管理后台

## 镜像大小

| 镜像 | 大小 | 说明 |
|---|---|---|
| `tintinland-all`（统一） | ~180 MB | alpine + nodejs + PocketBase 单二进制 + 前端产物 |
| `tintinland-web`（仅前端） | ~136 MB | multi-stage node:20-alpine |
| `tintinland-pb`（仅后端） | ~41 MB | alpine:3.20 + PocketBase 单二进制 |

## 切到分离部署

如果未来需要独立扩容，把 `railway.toml` 改成：

```toml
[build]
dockerfilePath = "Dockerfile.frontend"
```

然后 Railway Dashboard 再 New Service → `Dockerfile.backend` + `railway.backend.toml`。

## V1.1 可缓

- 统一镜像里前端目前是纯静态 mock，未实际调用 PB API；接入需要新增 fetch 层
- WebSocket 代理已实现但未在生产验证（PB 实时订阅场景）
- `/_/*` 反向代理会泄露 PB 管理后台；生产环境需要：
  1. PB 用 `pocketbase superuser upsert EMAIL PASS` 创建 superuser
  2. 加 Cloudflare Access 或类似零信任网关保护 `/_/*`
  3. 或者改用分离部署，PB service 不开公网
