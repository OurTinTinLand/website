#!/bin/sh
# ============================================================
# pb_public 单进程启动脚本
# ------------------------------------------------------------
# 单容器、单 PORT 部署：
#   - PocketBase 自己 serve 静态文件（/pb_public）+ API（/api/* + /_/*）
#   - 不再有 Node 反代层，所有 API 浏览器同源调用
#   - start.sh 在 PB 启动前用 python3 替换 index.html 占位符注入 window.PB_ADMIN_DEMO_SECRET
#     + window.PRIVY_APP_ID / window.PRIVY_CLIENT_ID / window.PRIVY_LOGIN_METHODS
#
# Railway 部署：
#   1. New Service → Dockerfile（默认指向 ./Dockerfile）
#   2. Volume → /pb_data（持久化 PB 数据；pb_public 走镜像里的构建产物）
#   3. 自动注入 PORT，无需额外配置
#
# 本地构建/运行：
#   npm run build                                 # 产物落到 backend/pb_public/
#   ./backend/pocketbase serve \
#       --http=127.0.0.1:8090 \
#       --dir=backend/pb_data \
#       --publicDir=backend/pb_public \
#       --hooksDir=backend/pb_hooks \
#       --migrationsDir=backend/pb_migrations
#   curl http://127.0.0.1:8090/
#   curl http://127.0.0.1:8090/api/health
#
# 超管账号（PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD）：
#   - 本脚本用 `pocketbase superuser upsert` 把超管账号写到 /pb_data，
#     幂等（首次创建、后续覆盖密码）。
#
# Privy 登录（可选）：
#   - PRIVY_APP_ID 是必填；从 https://dashboard.privy.io → App settings → App ID 拿到
#   - PRIVY_CLIENT_ID 是 Public Client ID（同一页面），用于 OAuth 客户端配置
#   - PRIVY_LOGIN_METHODS 控制登录方式白名单，逗号分隔；常用值见 https://docs.privy.io/guide/react/authentication
#   - PRIVY_APP_SECRET 是后端验签用（本脚本不注入；只在 backend/pb_hooks/auth.pb.js 用 env 读取）
#   - 未设置 PRIVY_APP_ID 时占位保留为注释 → 前端自动走"无 SDK 兜底"（OAuth 直连）
#     在无 SDK 的开发/沙盒环境也能演示登录 UI，但后端依然需要
#     PRIVY_APP_SECRET 才能验签 JWT（详见 backend/pb_hooks/auth.pb.js）
# ============================================================
set -e

PORT="${PORT:-3000}"

# CORS 来源列表：逗号分隔。
#   - 未设 PB_ORIGINS 时：默认 * 允许所有（dev/Stageing 方便）
#   - Railway 生产推荐显式写：PB_ORIGINS="https://tintin.land,https://www.tintin.land"
#   - pb_public 同源托管下基本不需要 CORS（前后端同 origin），但保留兼容旧用法
PB_ORIGINS="${PB_ORIGINS:-*}"

# 超管账号：默认值与历史代码一致。
PB_ADMIN_EMAIL="${PB_ADMIN_EMAIL:-admin@tintin.land}"
PB_ADMIN_PASSWORD="${PB_ADMIN_PASSWORD:-tintinland2026}"

# Demo admin 入口 secret：替换历史方案中"前端硬编码 superuser 密码"的漏洞。
# - 生产环境必须显式设置 PB_ADMIN_DEMO_SECRET；不设则 demo admin 直接 401。
# - 由 start.sh 在 PB 启动前注入到 /pb_public/index.html（PB 直接 serve 已注入的 HTML）。
# - 仅用于"运营后台 demo 模式" —— 真实生产请关闭 demo admin。
PB_ADMIN_DEMO_SECRET="${PB_ADMIN_DEMO_SECRET:-}"

# Privy 配置（必填；Privy Dashboard → App settings）：
#   - PRIVY_APP_ID：必填 —— 没设的话前端登录按钮点不动（PrivyProvider 不挂载）
#   - PRIVY_CLIENT_ID：Public client ID，OAuth 客户端配置用（同页面）
#   - PRIVY_LOGIN_METHODS：逗号分隔，常见值 email,google,x,github,discord,wallet,apple,sms
#   - PRIVY_APP_SECRET：只用于后端验签（backend/pb_hooks/auth.pb.js），不在前端暴露
PRIVY_APP_ID="${PRIVY_APP_ID:-}"
PRIVY_CLIENT_ID="${PRIVY_CLIENT_ID:-}"
PRIVY_LOGIN_METHODS="${PRIVY_LOGIN_METHODS:-email,google,x,github,discord,wallet}"
PRIVY_APP_SECRET="${PRIVY_APP_SECRET:-}"

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
# --hooksDir / --migrationsDir 带上，否则 v0.27+ 强校验会失败。
echo "[start.sh] bootstrapping superuser ${PB_ADMIN_EMAIL} (dir=${PB_DATA_DIR})"
/pb/pocketbase superuser upsert "${PB_ADMIN_EMAIL}" "${PB_ADMIN_PASSWORD}" \
    --dir="${PB_DATA_DIR}" \
    --hooksDir=/pb/hooks \
    --migrationsDir=/pb/migrations

# 1.5) 注入 demo admin secret 到 pb_public/index.html
#   - PB v0.39 没有"post-process 响应"钩子；routerAdd "/" + e.next() / routerUse
#     middleware 都会破坏静态资源响应链（其它资源返回 0 字节）。
#   - 替代方案：start.sh 在 PB 启动前用 python3 替换占位符，让 PB 直接 serve 已注入的 HTML。
#   - 占位是 index.html 里的 <!--INJECT:PB_ADMIN_DEMO_SECRET-->，替换为：
#         <script>window.PB_ADMIN_DEMO_SECRET="...";</script>
#   - 没设 PB_ADMIN_DEMO_SECRET 时占位保留为注释（demo admin 自然 401）。
#   - 只在容器内原地改 /pb_public/index.html（pb_public 是镜像里的构建产物）。
#   - 选 python3 而非 sed：secret 里有 \\ " & < > 等字符时 sed 转义太脆；
#     python3 alpine 包 ~10MB，正确性 + 可读性都更好。
if [ -n "${PB_ADMIN_DEMO_SECRET}" ] && [ -f "/pb_public/index.html" ]; then
    PB_ADMIN_DEMO_SECRET="${PB_ADMIN_DEMO_SECRET}" python3 - <<'PYEOF'
import html
import os
import pathlib

secret = os.environ.get("PB_ADMIN_DEMO_SECRET", "")
idx = pathlib.Path("/pb_public/index.html")
content = idx.read_text(encoding="utf-8")
placeholder = "<!--INJECT:PB_ADMIN_DEMO_SECRET-->"
script = (
    '<script>window.PB_ADMIN_DEMO_SECRET="'
    + html.escape(secret, quote=True)
    + '";</script>'
)
new_content = content.replace(placeholder, script)
if new_content == content:
    print("[start.sh] WARN: placeholder not found in /pb_public/index.html", flush=True)
else:
    idx.write_text(new_content, encoding="utf-8")
    print("[start.sh] injected PB_ADMIN_DEMO_SECRET into /pb_public/index.html", flush=True)
PYEOF
elif [ -z "${PB_ADMIN_DEMO_SECRET}" ]; then
    echo "[start.sh] PB_ADMIN_DEMO_SECRET not set; demo admin will be disabled"
fi

# 1.6) 注入 Privy 配置到 pb_public/index.html（同样用 python3 替换，理由同上）
#   - 没设 PRIVY_APP_ID 时占位保留为注释 → 前端自动走"无 SDK 兜底"。
#   - 只暴露公开 ID / login-method 白名单（这些是公开值，参考 Privy 官方文档）；
#     PRIVY_APP_SECRET 仅用于后端验签，由 pb_hooks/auth.pb.js 直接读 env，永不进 HTML。
if [ -f "/pb_public/index.html" ]; then
    PRIVY_APP_ID="${PRIVY_APP_ID}" \
    PRIVY_CLIENT_ID="${PRIVY_CLIENT_ID}" \
    PRIVY_LOGIN_METHODS="${PRIVY_LOGIN_METHODS}" \
    python3 - <<'PYEOF'
import html
import os
import pathlib

app_id     = os.environ.get("PRIVY_APP_ID", "")
client_id  = os.environ.get("PRIVY_CLIENT_ID", "")
methods    = os.environ.get("PRIVY_LOGIN_METHODS", "email,google,x,github,discord,wallet")

idx = pathlib.Path("/pb_public/index.html")
content = idx.read_text(encoding="utf-8")
placeholder = "<!--INJECT:PRIVY_CONFIG-->"

if not app_id:
    # 没配置 PRIVY_APP_ID → 占位保持注释；PrivyProviderRoot 不挂载 PrivyProvider，
    # 登录按钮 dispatch 的 'app:openPrivyNative' 事件没人监听 —— 这是环境配置错误，
    # 操作员必须设置 PRIVY_APP_ID 才能让前端登录生效。
    print("[start.sh] PRIVY_APP_ID not set; frontend login will be SILENT (no Privy provider)", flush=True)
else:
    # 多行 <script> 注入（公开值，且需要让 frontend 一次拿到 methods 列表）
    parts = []
    parts.append('<script>window.PRIVY_APP_ID="' + html.escape(app_id, quote=True) + '";</script>')
    if client_id:
        parts.append('<script>window.PRIVY_CLIENT_ID="' + html.escape(client_id, quote=True) + '";</script>')
    parts.append(
        '<script>window.PRIVY_LOGIN_METHODS="' + html.escape(methods, quote=True) + '";</script>'
    )
    new_content = content.replace(placeholder, "\n    ".join(parts))
    if new_content == content:
        print("[start.sh] WARN: PRIVY_CONFIG placeholder not found in /pb_public/index.html", flush=True)
    else:
        idx.write_text(new_content, encoding="utf-8")
        print(
            "[start.sh] injected PRIVY_CONFIG (app_id=%s..., methods=%s) into /pb_public/index.html"
            % (app_id[:6], methods),
            flush=True,
        )
PYEOF
fi

# 2) 起 PB（直接 serve 静态 + API，单 PORT 单进程）
#   --publicDir=/pb_public      静态文件（index.html / dist/ / src/styles/ / assets-claude/）
#                                  注：window.PB_ADMIN_DEMO_SECRET 已在第 1.5 步注入到 index.html
#                                  注：window.PRIVY_* 已在第 1.6 步注入到 index.html
#   --hooksDir=/pb/hooks        业务钩子（auth/admin_proxy/ai_route/...），不再负责 secret 注入
#   --migrationsDir=/pb/migrations  spec v1.1 schema
# 1.7) 暴露给 hook 的回环地址 —— superuser-token / admin_proxy 这两个 handler
#      会用 $http.send 回调 PB 自己拿 superuser token / 代发 collection CRUD。
#      必须在 PB 启动前 export，否则 hook handler 读不到。允许用户用
#      PB_ADMIN_AUTH_URL 显式覆盖（反代 / 非 localhost 场景）。
if [ -z "${PB_ADMIN_AUTH_URL:-}" ]; then
    export PB_ADMIN_AUTH_URL="http://127.0.0.1:${PORT}"
fi

echo "[start.sh] starting PocketBase on :${PORT} (origins=${PB_ORIGINS}, admin auth url=${PB_ADMIN_AUTH_URL})"
exec /pb/pocketbase serve \
    --http=0.0.0.0:${PORT} \
    --dir="${PB_DATA_DIR}" \
    --publicDir=/pb_public \
    --hooksDir=/pb/hooks \
    --migrationsDir=/pb/migrations \
    --hooksWatch=false \
    --origins="${PB_ORIGINS}"
