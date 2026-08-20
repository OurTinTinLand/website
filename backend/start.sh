#!/bin/bash
# ============================================================
# 本地 dev 启动脚本：直接跑 PocketBase（同源托管 pb_public）
# ------------------------------------------------------------
# 用法（在仓库根目录）：
#   npm run build           # 一次性构建（产出 backend/pb_public/）
#   npm run watch           # 监听 src/ 改动自动重建
#   bash backend/start.sh   # 起 PB（前台，Ctrl+C 退出）
#
# 或者：
#   ./backend/pocketbase serve --http=127.0.0.1:8090 \
#       --dir=backend/pb_data --publicDir=backend/pb_public \
#       --hooksDir=backend/pb_hooks --migrationsDir=backend/pb_migrations
#
# 浏览器打开 http://127.0.0.1:8090/ 即可看到 React SPA。
# 所有 /api/* + /_/* 走 PB 自己，同源。
#
# Demo admin secret 注入（如需本地测 demo admin）：
#   export PB_ADMIN_DEMO_SECRET=dev-secret-12345678
#   bash backend/start.sh
#   # start.sh 会用 python3 把 secret 注入到 backend/pb_public/index.html
# ============================================================
set -e
cd "$(dirname "$0")/.."

# Railway / Render / Fly.io 都会自动注入 PORT；本地默认 8090。
PORT="${PORT:-8090}"

# Demo admin secret：dev 可选设；不设则占位保留为注释、demo admin 自然 401
PB_ADMIN_DEMO_SECRET="${PB_ADMIN_DEMO_SECRET:-}"

# 注入到 backend/pb_public/index.html（dev 路径）
# 与根 start.sh 的逻辑一致；用 python3 而非 sed，转义更稳。
if [ -n "${PB_ADMIN_DEMO_SECRET}" ] && [ -f "./backend/pb_public/index.html" ]; then
    PB_ADMIN_DEMO_SECRET="${PB_ADMIN_DEMO_SECRET}" python3 - <<'PYEOF'
import html
import os
import pathlib

secret = os.environ.get("PB_ADMIN_DEMO_SECRET", "")
idx = pathlib.Path("backend/pb_public/index.html")
content = idx.read_text(encoding="utf-8")
placeholder = "<!--INJECT:PB_ADMIN_DEMO_SECRET-->"
script = (
    '<script>window.PB_ADMIN_DEMO_SECRET="'
    + html.escape(secret, quote=True)
    + '";</script>'
)
new_content = content.replace(placeholder, script)
if new_content == content:
    print("[backend/start.sh] WARN: placeholder not found in backend/pb_public/index.html", flush=True)
else:
    idx.write_text(new_content, encoding="utf-8")
    print("[backend/start.sh] injected PB_ADMIN_DEMO_SECRET into backend/pb_public/index.html", flush=True)
PYEOF
elif [ -z "${PB_ADMIN_DEMO_SECRET}" ]; then
    echo "[backend/start.sh] PB_ADMIN_DEMO_SECRET not set; demo admin disabled (placeholder preserved in index.html)"
fi

# 必须绑 0.0.0.0，否则平台反代连不上。
# CORS 来源：dev 默认 *；生产用 PB_ORIGINS 显式列出。
ORIGINS="${PB_ORIGINS:-*}"

exec ./backend/pocketbase serve \
    --http="0.0.0.0:${PORT}" \
    --dir=backend/pb_data \
    --publicDir=backend/pb_public \
    --hooksDir=backend/pb_hooks \
    --migrationsDir=backend/pb_migrations \
    --origins="${ORIGINS}"
