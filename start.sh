#!/bin/sh
# ============================================================
# 统一镜像启动脚本 · 前端 + PocketBase 共容器
# ------------------------------------------------------------
# 1) 解析数据目录（priority: RAILWAY_VOLUME_MOUNT_PATH > PB_DATA > /pb_data）
# 2) Bootstrap 超管账号（PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD 环境变量）
#    用 `pocketbase superuser upsert` 直接落库，不依赖 web UI
# 3) 启动 PocketBase（内部端口 PB_PORT，不暴露公网）
# 4) 等 PB /api/health 通
# 5) exec Node（监听外部 PORT，对 /api/* 与 /_/* 反向代理到 PB）
# ============================================================
set -e

PB_PORT="${PB_PORT:-8090}"
PORT="${PORT:-3000}"

# CORS 来源列表：逗号分隔。
#   - 未设 PB_ORIGINS 时：默认 * 允许所有（开发/Stageing 方便）
#   - Railway 生产推荐显式写：PB_ORIGINS="https://tintin.land,https://www.tintin.land"
# 注意：PocketBase 的 --origins 只对浏览器 fetch 的 CORS 生效，
# 不会影响 /api/* 由 server.js 反代（同源代理不算跨域）。
PB_ORIGINS="${PB_ORIGINS:-*}"

# 超管账号：默认值与 src/utils/pb-client.js 里的硬编码常量一致。
# 任何改了 PB_ADMIN_PASSWORD 的部署，pb-client.js 会通过 window.PB_ADMIN_PASSWORD
# 拿到新值（见 index.html 注入逻辑），保持前后端同步。
PB_ADMIN_EMAIL="${PB_ADMIN_EMAIL:-admin@tintin.land}"
PB_ADMIN_PASSWORD="${PB_ADMIN_PASSWORD:-tintinland2026}"

# 数据目录解析：
#   - 显式设 RAILWAY_VOLUME_MOUNT_PATH（Railway 注入的 volume 挂载点）：
#     用它作为 PB 的 --dir（数据写到这里 = 持久化生效）
#   - 否则用 PB_DATA
#   - 否则回落到 /pb_data
# Railway Volume 必须在 railway.toml 的 [[deploy.volumes]] 配 mountPath 与 PB_DATA
# 一致（或设 RAILWAY_VOLUME_MOUNT_PATH），否则容器重启会丢数据。
PB_DATA_DIR="${RAILWAY_VOLUME_MOUNT_PATH:-${PB_DATA:-/pb_data}}"
mkdir -p "${PB_DATA_DIR}"

# 1) Bootstrap 超管账号 —— 用 upsert 保证幂等：
#    - 已存在（从旧 volume 恢复）：更新密码
#    - 不存在（首次启动 / 新 volume）：创建
# 这一步必须在 serve 之前；serve 启动后数据库上锁就 upsert 不进去了。
# 注意：--hooksDir 也要带上，否则 hooks 会报 LOADED 失败（v0.27+ 强校验）
echo "[start.sh] bootstrapping superuser ${PB_ADMIN_EMAIL} (dir=${PB_DATA_DIR})"
/pb/pocketbase superuser upsert "${PB_ADMIN_EMAIL}" "${PB_ADMIN_PASSWORD}" \
  --dir="${PB_DATA_DIR}" \
  --hooksDir=/pb/hooks \
  --migrationsDir=/pb/migrations

# 2) 起 PB
echo "[start.sh] starting PocketBase on :${PB_PORT} (origins=${PB_ORIGINS})"
/pb/pocketbase serve \
  --http=0.0.0.0:${PB_PORT} \
  --dir="${PB_DATA_DIR}" \
  --hooksDir=/pb/hooks \
  --migrationsDir=/pb/migrations \
  --hooksWatch=false \
  --origins="${PB_ORIGINS}" &
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
# 把超管账号透传给前端（注入到 index.html 渲染时的 window.PB_ADMIN_EMAIL/PASSWORD）
# 这样运营后台的 demoAdmin / admin CRUD 会用最新的超管密码，不会因 pb-client.js 硬编码
# 与 PB 服务端不同步而 401。
export PB_ADMIN_EMAIL
export PB_ADMIN_PASSWORD
exec node server.js
