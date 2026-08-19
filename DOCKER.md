# TinTinLand · Docker 部署说明

## 文件清单

| 文件 | 用途 |
|---|---|
| `Dockerfile` | **Web 前端** 服务（React + esbuild 静态产物） |
| `Dockerfile.backend` | **PocketBase 后端** 服务（含 v1.1 hooks + migrations） |
| `.dockerignore` | 统一构建时排除项（设计源文件 / spec / data） |
| `railway.toml` | Web 服务的 Railway 配置 |
| `railway.backend.toml` | 后端服务的 Railway 配置（部署时改名/复用） |

## 本地构建 & 运行

### Web 前端

```bash
# 构建
docker build -t tintinland-web .

# 运行（监听 3000）
docker run --rm -p 3000:3000 -e PORT=3000 tintinland-web

# 验证
curl -I http://localhost:3000/
curl -I http://localhost:3000/dist/bundle.js
```

### 后端 PB

```bash
# 构建
docker build -f Dockerfile.backend -t tintinland-pb .

# 运行（监听 8090，挂载本地数据目录）
docker run --rm \
  -p 8090:8090 \
  -e PORT=8090 \
  -v $PWD/backend/pb_data:/pb_data \
  tintinland-pb

# 验证
curl http://localhost:8090/api/health
curl 'http://localhost:8090/api/collections/courses/records?perPage=1'
```

## Railway 部署

Railway 自动注入 `PORT` 环境变量，容器必须监听此端口才会被视为 healthy。

### 步骤

1. **创建项目** → New Project → Deploy from GitHub repo
2. **添加 Web 服务**：
   - 默认用 `Dockerfile`，`railway.toml` 自动生效
   - 自动获得 `PORT` 环境变量
3. **添加 PB 服务**：
   - Settings → Build → Dockerfile Path = `Dockerfile.backend`
   - Settings → Deploy → Start Command（用 `railway.backend.toml` 的值）
   - Variables → 添加 `PB_DATA=/pb_data`
   - Settings → Volumes → 挂载 `/pb_data` 到一个 Volume（生产环境）
4. **跨服务通信**：
   - PB 服务在 Railway 内部 DNS 上暴露 URL，例如 `pb-service.railway.internal:8090`
   - Web 服务环境变量加 `REACT_APP_PB_URL=<PB 内部 URL>`（V1.1 才用得到，目前前端是纯静态 mock）

### 端口说明

| 服务 | 容器监听 | Railway 暴露 | 备注 |
|---|---|---|---|
| Web | `${PORT}`（默认 3000） | ✅ Public | 静态 React 应用 |
| PB | `${PORT}` | ❌ Private | 仅供同项目服务调用 |

> ⚠️ **生产环境 PB 不应公网暴露**：Dashboard → Service → Settings → Networking 把 Public Domain 关掉。

## 镜像大小

| 镜像 | 大小 | 说明 |
|---|---|---|
| `tintinland-web` | ~136 MB | multi-stage：构建期 node:20-alpine + esbuild，运行时只保留 node + 产物 |
| `tintinland-pb` | ~41 MB | alpine:3.20 + PocketBase 单二进制 + 6 个 hooks + 4 个 migrations |

## V1.1 可缓

- PB 健康检查在 data 目录为空时会提示创建 superuser（生产环境用 `pocketbase superuser upsert` 命令注入）
- Web 当前是纯静态 mock，未对接 PB API；接入需要新增 fetch 层
