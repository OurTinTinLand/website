#!/usr/bin/env bash
# scripts/install-pbcli.sh
# =============================================================================
# 从 upstream 重新构建并更新 scripts/vendor/pocketbase-cli
# =============================================================================
#
# 用法：
#   bash scripts/install-pbcli.sh                  # 用默认 upstream + main 分支
#   POCKETBASE_CLI_REPO_URL=... bash scripts/install-pbcli.sh
#   POCKETBASE_CLI_BRANCH=v0.1.7 bash scripts/install-pbcli.sh
#
# 流程：
#   1) clone upstream 到临时目录
#   2) npm install + npm run build（带 --no-external 把 dotenv 也打进去）
#   3) 把 dist/bin.js + bin.js.map 拷到 scripts/vendor/pocketbase-cli/dist/
#   4) 更新 vendor package.json 的 _upstream 元数据
#
# 要求：Node 20+
set -euo pipefail

REPO_URL="${POCKETBASE_CLI_REPO_URL:-https://github.com/Ericsunsk/Pocketbase-CLI.git}"
BRANCH="${POCKETBASE_CLI_BRANCH:-main}"
DEST_DIR="$(cd "$(dirname "$0")" && pwd)/vendor/pocketbase-cli"
TMP_DIR="$(mktemp -d)"

require_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        printf 'Missing required command: %s\n' "$1" >&2
        exit 1
    fi
}

require_command git
require_command node
require_command npm

node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [[ "${node_major}" -lt 20 ]]; then
    printf 'pocketbase-cli requires Node.js 20+. Found %s\n' "$(node -v)" >&2
    exit 1
fi

printf '→ Cloning %s @ %s\n' "$REPO_URL" "$BRANCH"
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$TMP_DIR" >/dev/null

printf '→ npm install\n'
( cd "$TMP_DIR" && npm install >/dev/null )

printf '→ npm run build (with --no-external so dotenv is bundled)\n'
# 改用临时 tsup 配置（项目自带的 tsup.config.ts 不带 noExternal）
cat > "$TMP_DIR/tsup.bundled.config.ts" <<'CFG_EOF'
import { defineConfig } from "tsup";
export default defineConfig({
  entry: ["src/bin.ts"],
  platform: "node",
  target: "node20",
  format: ["cjs"],
  sourcemap: true,
  clean: true,
  noExternal: [/.*/],
});
CFG_EOF
( cd "$TMP_DIR" && npx tsup --config tsup.bundled.config.ts >/dev/null )

VERSION="$(node -p "require('$TMP_DIR/package.json').version")"
printf '→ version detected: %s\n' "$VERSION"

mkdir -p "$DEST_DIR/dist"
cp "$TMP_DIR/dist/bin.js"     "$DEST_DIR/dist/bin.js"
cp "$TMP_DIR/dist/bin.js.map" "$DEST_DIR/dist/bin.js.map"

# 更新 vendor package.json 元数据
node - "$DEST_DIR" "$VERSION" "$(date -u +%Y-%m-%d)" <<'NODE_EOF'
const fs = require('fs');
const path = require('path');
const dest = process.argv[2];
const version = process.argv[3];
const today = process.argv[4];
const pkgPath = path.join(dest, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = version;
pkg._upstream = {
    repo: 'https://github.com/Ericsunsk/Pocketbase-CLI',
    version,
    vendored_at: today,
    update_with: 'bash scripts/install-pbcli.sh',
};
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
NODE_EOF

rm -rf "$TMP_DIR"

printf '\n✓ Done.\n'
printf '  Vendored to:  %s\n' "$DEST_DIR"
printf '  Version:       %s\n' "$VERSION"
printf '  Smoke test:    node %s --version\n' "$DEST_DIR/dist/bin.js"
