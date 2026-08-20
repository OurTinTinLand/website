// =============================================================================
// scripts/pb-cli.mjs —— [pocketbase-cli](https://github.com/Ericsunsk/Pocketbase-CLI) 的 Node 包装
// =============================================================================
//
// 目的：
//   - 让我们的脚本可以"用 pocketbase-cli 的方式"访问 PB，而不是直接 fetch。
//   - 把 CLI 的稳定 JSON 信封 (`{ ok, schema_version, command, action, message,
//     meta, data, http, pagination, error? }`) 转成普通的对象/异常。
//   - 加几个 spec 友好的便捷方法（with auth / per-page / filter 等）。
//
// 设计：
//   - 默认调用 `scripts/vendor/pocketbase-cli/dist/bin.js`（vendored snapshot）。
//   - 找不到就退到全局 `pocketbase-cli`（需要先 `bash scripts/install-pbcli.sh`）。
//   - 不修改 env、不写 ~/.cache；通过 --base-url / --no-save 等 flag 完全本地。
//
// 为什么不直接用 src/lib/pb-sdk.mjs：
//   - 这两个工具面向的场景不一样：
//     - pb-sdk：高频调用 + 类型安全 + 自动恢复 token（前端 + 单元测试）
//     - pbcli：低频管理命令 + shell 友好 + 可手工 paste 到终端排障
//   - 双轨制能验证"同一个 PB 行为是否一致"——两边的输出能对得上就是好的回归。
//
// 用法：
//   import { createPbCli } from './pb-cli.mjs';
//   const pb = createPbCli({ baseUrl: 'http://127.0.0.1:8090' });
//   const r = await pb.collections.list();
//   const me = await pb.auth.login('admin@tintin.land', 'secret');
//   await pb.raw('GET', '/api/health');
//
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- 0. 错误类型 ----
export class PbCliError extends Error {
    constructor({ code, message, type, retryable, hint, missing_prerequisite, http_status, command, action, data, http }) {
        super(message || 'pocketbase-cli error');
        this.name = 'PbCliError';
        this.code = code ?? 1;
        this.type = type;
        this.retryable = !!retryable;
        this.hint = hint;
        this.missingPrerequisite = missing_prerequisite;
        this.httpStatus = http_status;
        this.command = command;
        this.action = action;
        this.data = data;
        this.http = http;
    }
}

// ---- 1. 找 binary ----
function resolveBinary(explicit) {
    if (explicit) return explicit;
    // 1) vendored snapshot
    const vendored = path.join(__dirname, 'vendor', 'pocketbase-cli', 'dist', 'bin.js');
    if (existsSync(vendored)) return vendored;
    // 2) ~/.local/share/pocketbase-cli/dist/bin.js (官方 install-global.sh 默认路径)
    const home = process.env.HOME || '';
    const userInstall = path.join(home, '.local', 'share', 'pocketbase-cli', 'dist', 'bin.js');
    if (existsSync(userInstall)) return userInstall;
    // 3) PATH 上的 pocketbase-cli（最后兜底：shell which）
    return 'pocketbase-cli';
}

// ---- 2. 工厂 ----
export function createPbCli(opts = {}) {
    const bin = resolveBinary(opts.binary);
    const defaultBaseUrl = opts.baseUrl || process.env.PB_URL || 'http://127.0.0.1:8090';

    // 收集 --json 模式的 stdout，给调用方直接拿 parsed payload
    async function run(args, ioOpts = {}) {
        // 拼上 --json（pocketbase-cli 唯一的 global option），方便外部拿 parsed envelope
        const fullArgs = [...args];
        if (ioOpts.json !== false && !fullArgs.includes('--json')) {
            fullArgs.unshift('--json');
        }

        // pocketbase-cli 没有 global --base-url，base URL 走 POCKETBASE_CLI_BASE_URL env var。
        // 这是 0.1.7 唯一的官方非持久化方式（避免动 ~/.cache）。
        const env = Object.assign({}, process.env);
        if (ioOpts.baseUrl && !env.POCKETBASE_CLI_BASE_URL) {
            env.POCKETBASE_CLI_BASE_URL = ioOpts.baseUrl;
        }

        return new Promise((resolve, reject) => {
            const child = spawn(process.execPath, [bin, ...fullArgs], {
                stdio: ['ignore', 'pipe', 'pipe'],
                env,
                cwd: ioOpts.cwd || process.cwd(),
            });

            const outChunks = [];
            const errChunks = [];
            child.stdout.on('data', (d) => outChunks.push(d));
            child.stderr.on('data', (d) => errChunks.push(d));

            child.on('error', (err) => {
                reject(new PbCliError({ code: 127, type: 'spawn_error', message: 'spawn failed: ' + err.message }));
            });

            child.on('close', (code) => {
                const stdout = Buffer.concat(outChunks).toString('utf8');
                const stderr = Buffer.concat(errChunks).toString('utf8');
                // pbcli 把 envelope 打到 stdout。 --no-json 时打到 stderr / 人类可读输出
                if (ioOpts.json === false) {
                    if (code !== 0) {
                        return reject(new PbCliError({ code, message: stderr.trim() || ('exit ' + code) }));
                    }
                    return resolve({ stdout, stderr, code });
                }

                // pbcli 有时把 envelope 打到 stdout，有时到 stderr（取决于哪条 codepath 失败）。
                // 两边都试一次，第一个能解析成 envelope 的就用它。
                let envelope = null;
                const candidates = [stdout, stderr];
                for (const blob of candidates) {
                    const text = (blob || '').trim();
                    if (!text) continue;
                    if (!text.startsWith('{')) continue;     // 人类可读错误信息忽略
                    try {
                        const j = JSON.parse(text);
                        if (j && typeof j === 'object' && 'schema_version' in j) {
                            envelope = j;
                            break;
                        }
                    } catch (_) {}
                }
                if (!envelope) {
                    return reject(new PbCliError({
                        code: code || 1,
                        message: 'pbcli 输出不是 envelope JSON：' + (stdout + stderr).slice(0, 200),
                        data: { stdout, stderr },
                    }));
                }
                if (!envelope || envelope.ok !== true) {
                    return reject(new PbCliError({
                        code: envelope && envelope.code != null ? envelope.code : (code || 1),
                        type: envelope && envelope.error && envelope.error.type,
                        retryable: envelope && envelope.error && envelope.error.retryable,
                        message: envelope && envelope.message,
                        hint: envelope && envelope.error && envelope.error.hint,
                        missing_prerequisite: envelope && envelope.error && envelope.error.missing_prerequisite,
                        http_status: envelope && envelope.error && envelope.error.http_status,
                        command: envelope && envelope.command,
                        action: envelope && envelope.action,
                        data: envelope && envelope.data,
                        http: envelope && envelope.http,
                    }));
                }
                resolve(envelope);
            });
        });
    }

    // ---- 3. 业务方法（spec-friendly） ----

    // 高层：登录 → 拿到 envelope，自动把 token 续上后续调用
    function auth() {
        const session = { identity: null, password: null, collection: '_superusers', token: null, record: null };
        return {
            /** 用密码登 PB（superuser 或 auth collection 都行） */
            async loginWithPassword(identity, password, opts = {}) {
                // 默认不写盘 —— 我们的脚本场景下不希望污染 ~/.cache/pocketbase-cli
                // 调用方明确传 noSave:false 才允许保存
                const shouldSave = opts.noSave === false;
                const args = ['records', 'auth-password',
                    opts.collection || session.collection, identity, password];
                if (!shouldSave) args.push('--no-save');
                if (opts.identityField) args.push('--identity-field', opts.identityField);
                if (opts.fields) args.push('--fields', opts.fields);
                const env = await run(args, { baseUrl: defaultBaseUrl });
                session.identity = identity;
                session.password = password;
                session.token = env.data && env.data.data && env.data.data.token;
                session.record = env.data && env.data.data && env.data.data.record;
                return env;
            },
            whoami: () => run(['auth', 'status'], { baseUrl: defaultBaseUrl }),
            logout: () => run(['auth', 'logout'], { baseUrl: defaultBaseUrl }),
            refresh: () => run(['auth', 'refresh'], { baseUrl: defaultBaseUrl }),
        };
    }

    // collections.* —— 顶层 group
    const collections = {
        list: (q = {}) => {
            const args = ['collections', 'list'];
            if (q.page) args.push('--page', String(q.page));
            if (q.perPage) args.push('--per-page', String(q.perPage));
            if (q.filter) args.push('--filter', q.filter);
            if (q.sort) args.push('--sort', q.sort);
            if (q.all) args.push('--all');
            return run(args, { baseUrl: defaultBaseUrl });
        },
        get: (nameOrId) => run(['collections', 'get', nameOrId], { baseUrl: defaultBaseUrl }),
        schemas: () => run(['collections', 'scaffolds'], { baseUrl: defaultBaseUrl }),
    };

    // records.* —— 顶层 group（auth collection 也走这个）
    const records = {
        list: (collection, q = {}) => {
            const args = ['records', 'list', collection];
            if (q.page) args.push('--page', String(q.page));
            if (q.perPage) args.push('--per-page', String(q.perPage));
            if (q.filter) args.push('--filter', q.filter);
            if (q.sort) args.push('--sort', q.sort);
            if (q.fields) args.push('--fields', q.fields);
            if (q.expand) args.push('--expand', q.expand);
            if (q.all) args.push('--all');
            return run(args, { baseUrl: defaultBaseUrl });
        },
        get: (collection, id) => run(['records', 'get', collection, id], { baseUrl: defaultBaseUrl }),
        create: (collection, payload, q = {}) => {
            const args = ['records', 'create', collection, '--data', JSON.stringify(payload)];
            if (q.fields) args.push('--fields', q.fields);
            return run(args, { baseUrl: defaultBaseUrl });
        },
        update: (collection, id, payload, q = {}) => {
            const args = ['records', 'update', collection, id, '--data', JSON.stringify(payload)];
            if (q.fields) args.push('--fields', q.fields);
            return run(args, { baseUrl: defaultBaseUrl });
        },
        delete: (collection, id, opts = {}) => {
            const args = ['records', 'delete', collection, id];
            if (opts.yes) args.push('--yes');
            return run(args, { baseUrl: defaultBaseUrl });
        },
        find: (collection, filter, q = {}) => {
            const args = ['records', 'find', collection, '--filter', filter];
            if (q.fields) args.push('--fields', q.fields);
            return run(args, { baseUrl: defaultBaseUrl });
        },
        upsert: (collection, payload, q = {}) => {
            const args = ['records', 'upsert', collection, '--data', JSON.stringify(payload)];
            if (q.fields) args.push('--fields', q.fields);
            if (q.matchField) args.push('--match-field', q.matchField);
            return run(args, { baseUrl: defaultBaseUrl });
        },
    };

    // raw HTTP —— 任意 PB 端点
    // pocketbase-cli 0.1.7 的 raw 不支持 --query；query 直接拼到 path 上即可。
    function raw(method, path, opts = {}) {
        let urlPath = path;
        if (opts.query && Object.keys(opts.query).length > 0) {
            const parts = [];
            for (const [k, v] of Object.entries(opts.query)) {
                if (v === undefined || v === null) continue;
                parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
            }
            if (parts.length) {
                urlPath += (urlPath.includes('?') ? '&' : '?') + parts.join('&');
            }
        }
        const args = ['raw', method, urlPath];
        if (opts.withAuth) args.push('--with-auth');
        if (opts.data !== undefined) args.push('--data', JSON.stringify(opts.data));
        return run(args, { baseUrl: opts.baseUrl || defaultBaseUrl });
    }

    // config.* —— 持久化设置（注意：我们 prefer 不写盘，全用 --base-url 临时覆盖）
    const config = {
        show: () => run(['config', 'show'], { baseUrl: defaultBaseUrl }),
        setBaseUrl: (url) => run(['config', 'set', 'base_url', url], { baseUrl: defaultBaseUrl }),
        clear: () => run(['config', 'clear'], { baseUrl: defaultBaseUrl }),
    };

    // info / preflight / schema
    const util = {
        info: () => run(['info'], { baseUrl: defaultBaseUrl }),
        preflight: (opts = {}) => {
            const args = ['preflight'];
            if (opts.requireAuth) args.push('--require-auth');
            return run(args, { baseUrl: defaultBaseUrl });
        },
        schema: (path) => path ? run(['schema', ...path.split(' ')], { baseUrl: defaultBaseUrl })
                                 : run(['schema'], { baseUrl: defaultBaseUrl }),
    };

    return {
        // meta
        binary: bin,
        baseUrl: defaultBaseUrl,
        // groups
        auth: auth(),
        collections,
        records,
        config,
        util,
        // low-level
        raw,
        run,
    };
}

export default createPbCli;
