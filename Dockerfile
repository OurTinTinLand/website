# syntax=docker/dockerfile:1.7
# ============================================================
# TinTinLand 新官网 · 统一镜像（前端 + PocketBase）
# ------------------------------------------------------------
# 单容器、单 PORT 部署：
#   - Node server.js 监听 ${PORT}（Railway 注入），
#     对 /api/* 与 /_/* 反向代理到容器内的 PocketBase
#   - PocketBase 监听内部 ${PB_PORT}（默认 8090，不暴露公网）
#   - tini 当 PID 1，负责信号转发与僵尸进程回收
#
# 与单服务镜像的区别：
#   - Dockerfile.frontend + Dockerfile.backend：两个 Railway Service
#   - 本 Dockerfile：一个 Railway Service，省钱省事
#
# Railway 部署（推荐这个，省一个 Service）：
#   1. New Service → Dockerfile（默认指向本文件）
#   2. Volume → /pb_data
#   3. 自动注入 PORT，无需额外配置
#
# 本地构建/运行：
#   docker build -t tintinland-all .
#   docker run --rm -p 3000:3000 \
#     -e PORT=3000 \
#     -v $PWD/backend/pb_data:/pb_data \
#     tintinland-all
#   curl http://localhost:3000/
#   curl http://localhost:3000/api/health   # 经 Node 代理
#   curl http://localhost:3000/api/collections/courses/records
# ============================================================

# ---- Stage 1: 装 node + 构建前端 + 拉 PocketBase ----
FROM node:20-alpine AS builder
WORKDIR /app

# 先拷贝 manifest，最大化 Docker 层缓存
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# 再拷贝源码
COPY . .

# esbuild 把 src/App.jsx 编译成 dist/bundle.js
# postbuild.js 把 esm.sh 的 React 引用替换为 window.React
RUN npm run build

# ---- Stage 2: 运行时（alpine 单一基础）----
FROM alpine:3.20
ARG PB_VERSION=0.27.2
ARG TARGETARCH=amd64

LABEL org.opencontainers.image.title="tintinland-all" \
      org.opencontainers.image.description="TinTinLand 新官网 · 统一镜像（前端 + PocketBase 单 PORT）" \
      org.opencontainers.image.source="https://github.com/tintinland/tintindog"

# 1) 系统包：nodejs（静态服务器）、npm、tini（PID 1）、wget（健康检查）、ca-certificates
RUN apk add --no-cache nodejs npm tini wget ca-certificates

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

# 3) 前端构建产物（从 builder stage 拷过来）
WORKDIR /app
COPY --from=builder /app/server.js  ./server.js
COPY --from=builder /app/index.html ./index.html
COPY --from=builder /app/dist       ./dist
COPY --from=builder /app/src/styles ./src/styles
COPY --from=builder /app/assets-claude ./assets-claude

# 4) 后端 hooks + migrations
COPY backend/pb_hooks      /pb/hooks
COPY backend/pb_migrations /pb/migrations

# 5) 启动脚本
COPY start.sh /start.sh
RUN chmod +x /start.sh

# 数据持久化（Railway Volume 挂载）
VOLUME ["/pb_data"]

# 端口：外部 PORT（Railway 注入，默认 3000）+ 内部 PB_PORT（不暴露）
ENV PORT=3000
ENV PB_PORT=8090
EXPOSE ${PORT}

# 健康检查：经 Node 代理到 PB /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider "http://127.0.0.1:${PORT}/api/health" || exit 1

# tini 处理信号 + 僵尸进程
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/start.sh"]
