#!/bin/sh
# ============================================================
# 统一镜像启动脚本 · 前端 + PocketBase 共容器
# ------------------------------------------------------------
# 1) 启动 PocketBase（内部端口 PB_PORT，不暴露公网）
# 2) 等 PB /api/health 通
# 3) exec Node（监听外部 PORT，对 /api/* 与 /_/* 反向代理到 PB）
# ============================================================
set -e

PB_PORT="${PB_PORT:-8090}"
PORT="${PORT:-3000}"

echo "[start.sh] starting PocketBase on :${PB_PORT}"
/pb/pocketbase serve \
  --http=0.0.0.0:${PB_PORT} \
  --dir=/pb_data \
  --hooksDir=/pb/hooks \
  --migrationsDir=/pb/migrations \
  --hooksWatch=false &
PB_PID=$!

echo "[start.sh] waiting for PocketBase /api/health (max 30s)..."
for i in $(seq 1 30); do
  if wget -q --tries=1 --spider "http://127.0.0.1:${PB_PORT}/api/health" 2>/dev/null; then
    echo "[start.sh] PocketBase is up (after ${i}s)"
    break
  fi
  if [ "$i" = "30" ]; then
    echo "[start.sh] PocketBase failed to become healthy in 30s"
    kill -TERM "${PB_PID}" 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

# 信号转发：SIGTERM/SIGINT 时优雅关闭 PB
trap 'echo "[start.sh] caught signal, terminating PocketBase (pid=${PB_PID})"; kill -TERM "${PB_PID}" 2>/dev/null || true; exit' TERM INT

echo "[start.sh] starting Node on :${PORT} (proxying /api/, /_/ -> http://127.0.0.1:${PB_PORT})"
export PB_URL="http://127.0.0.1:${PB_PORT}"
exec node server.js
