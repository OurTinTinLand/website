# syntax=docker/dockerfile:1.7
# ============================================================
# TinTinLand 新官网 · 单进程镜像（pocketbase + pb_public）
# ------------------------------------------------------------
# 单容器、单 PORT 部署：
#   - PocketBase 自己 serve 静态文件（pb_public）+ API（/api/* + /_/*）
#   - 不再有 Node 反代层，所有 API 浏览器同源调用
#   - onServe 钩子（inject_secrets.pb.js）注入 window.PB_ADMIN_DEMO_SECRET
#
# 部署架构对比：
#   - 老 Dockerfile：node builder + alpine runtime（含 node + pb 两个进程 + 反代层）
#   - 本 Dockerfile：node builder + alpine runtime（仅含 pb 一个进程）
#
# Railway 部署：
#   1. New Service → Dockerfile（默认指向本文件）
#   2. Volume → /pb_data
#   3. 自动注入 PORT，无需额外配置
#
# 本地构建/运行：
#   docker build -t tintinland-all .
#   docker run --rm -p 3000:3000 \
#     -e PORT=3000 \
#     -e PB_ADMIN_EMAIL=admin@tintin.land \
#     -e PB_ADMIN_PASSWORD=tintinland2026 \
#     -e PB_ADMIN_DEMO_SECRET=tintinland2026 \
#     -e PB_ORIGINS="http://localhost:3000" \
#     -v $PWD/backend/pb_data:/pb_data \
#     tintinland-all
#   curl http://localhost:3000/
#   curl http://localhost:3000/api/health
# ============================================================

# ---- Stage 1: 装 node + esbuild + 构建前端到 backend/pb_public/ ----
FROM node:20-alpine AS builder
WORKDIR /app

# 先拷贝 manifest，最大化 Docker 层缓存
COPY package.json package-lock.json* ./
RUN npm i --no-audit --no-fund

# 再拷贝源码（build.js 会把产物落到 backend/pb_public/）
COPY . .

# build.js 负责：
#   - 把 index.html / src/styles / assets-claude 拷到 backend/pb_public/
#   - esbuild 把 src/App.jsx 编译到 backend/pb_public/dist/bundle.js
#   - postbuild.js 把 esm.sh 的 React 引用替换为 window.React
RUN npm run build

# ---- Stage 2: 运行时（alpine + pocketbase）----
FROM alpine:3.20
# PocketBase 版本对齐：
#   - backend/api.md / pb_hooks 中注释都明确写 "PocketBase v0.39 内置"（newAuthToken 等 API）。
#   - 这里锁到 v0.39.x 跟代码注释、api.md、本地 ./backend/pocketbase 二进制对齐。
#   - 升级前请跑一次 migration 验证（pb_data 跨小版本可恢复；大版本需 dump/restore）。
ARG PB_VERSION=0.39.11
ARG TARGETARCH=amd64

LABEL org.opencontainers.image.title="tintinland-all" \
      org.opencontainers.image.description="TinTinLand 新官网 · 单进程镜像（pocketbase + pb_public）" \
      org.opencontainers.image.source="https://github.com/tintinland/tintindog"

# 1) 系统包：tini（PID 1）、wget（健康检查）、ca-certificates、python3（start.sh 注入 secret 用）
RUN apk add --no-cache tini wget ca-certificates python3

# 2) 拉 PocketBase 二进制（amd64 / arm64 自动）
RUN case "${TARGETARCH}" in \
      amd64) PB_ARCH="amd64" ;; \
      arm64) PB_ARCH="arm64" ;; \
      *) echo "unsupported arch: ${TARGETARCH}"; exit 1 ;; \
    esac \
 && wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${PB_ARCH}.zip" \
   -O /tmp/pb.zip \
 && unzip /tmp/pb.zip -d /pb \
 && rm /tmp/pb.zip \
 && chmod +x /pb/pocketbase

# 3) 前端构建产物（从 builder stage 拷过来；PocketBase --publicDir 直接 serve）
COPY --from=builder /app/backend/pb_public /pb_public

# 4) 后端 hooks（含 inject_secrets.pb.js 注入 window.PB_ADMIN_DEMO_SECRET）
COPY backend/pb_hooks      /pb/hooks

# 5) 后端 migrations（spec v1.1 schema）
COPY backend/pb_migrations /pb/migrations

# 6) 启动脚本
COPY start.sh /start.sh
RUN chmod +x /start.sh

# 数据持久化：Railway 不支持 Dockerfile 里的 VOLUME 指令。
# 部署时在 Railway Dashboard → Service → Settings → Volumes 挂一个 Volume
# 到容器内的 /pb_data。start.sh 会自动读取 RAILWAY_VOLUME_MOUNT_PATH 或 PB_DATA
# 环境变量，把 PB 的 --dir 指向挂载点。
# 本地 docker run 时手动 -v $PWD/backend/pb_data:/pb_data 挂载。

# 数据目录：start.sh 解析顺序为 RAILWAY_VOLUME_MOUNT_PATH > PB_DATA > /pb_data
# 默认 /pb_data；Railway 部署时把 railway.toml 的 mountPath 与此保持一致
# （或设 RAILWAY_VOLUME_MOUNT_PATH 环境变量），否则容器重启会丢数据
ENV PB_DATA=/pb_data

# 端口：Railway 注入（默认 3000）
ENV PORT=3000
EXPOSE ${PORT}

# 健康检查：直接打 PB /api/health（同源）
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider "http://127.0.0.1:${PORT}/api/health" || exit 1

# tini 处理信号 + 僵尸进程
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/start.sh"]
