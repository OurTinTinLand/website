#!/bin/bash
set -e
cd "$(dirname "$0")"

# Railway / Render / Fly.io 都会自动注入 PORT；本地默认 8090。
PORT="${PORT:-8090}"

# 必须绑 0.0.0.0，不能 127.0.0.1 —— 否则平台的反向代理连不上。
# CORS 来源用逗号分隔的环境变量，前端域名逐项列出。
ORIGINS="${PB_ORIGINS:-*}"

exec ./pocketbase serve \
    --http="0.0.0.0:${PORT}" \
    --origins="${ORIGINS}" \
    --hooksDir=pb_hooks \
    --migrationsDir=pb_migrations \
    --publicDir=pb_public
