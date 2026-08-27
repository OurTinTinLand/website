// =============================================================================
// TinTinLand —— PocketBase SDK 共享层（CLI + 浏览器共用）
// =============================================================================
//
// 基于官方 pocketbase js-sdk（v0.28.x）封装。所有调用方（Node CLI 脚本、
// React 前端、其它 Node 工具）都从这一份代码进出，避免重复造轮子。
//
// 设计原则：
//   1. 同一份代码，CLI 与浏览器通用
//      - 入口是 `createPbClient(config)`，返回一个配置好的 PocketBase 实例
//      - 浏览器侧：esbuild 把 pocketbase 包打进 IIFE bundle
//      - Node 侧：直接 dynamic import('pocketbase')
//
//   2. base URL 三种来源，按优先级：
//        a) 显式传入 config.baseUrl
//        b) 环境变量 PB_URL（CLI 默认；同源 / docker 内部互联）
//        c) 浏览器侧 fallback：当前 origin（PocketBase --publicDir 同源托管）
//      注意：本仓库已经统一改成"前端同源"，不再有 window.PB_URL 注入；
//      但 CLI 仍然需要 PB_URL 直连 127.0.0.1:8090。
//
//   3. 鉴权三种 token：
//        - user token      → 用户邮箱/钱包登录后拿到，存 AuthStore
//        - admin token     → 超管登录，存 AdminStore（CLI 默认缓存）
//        - "demo admin"    → /api/admin/superuser-token（带 PB_ADMIN_DEMO_SECRET）
//      通用层只暴露一个 client，再补一个 withAdminToken 帮主拿 admin token。
//
//   4. 业务封装：所有 PB 集合 CRUD / 自定义路由 / 复杂业务都用一个 thin
//      wrapper 表达。具体 normalize 逻辑与现有 src/utils/pb-client.js
//      保持一致（spec §9 数据结构）。
//
//   5. 错误统一抛 PbError（旧实现也这么做，保持兼容）。
//
// =============================================================================

import PocketBase from 'pocketbase';

// ---- 0. 错误类型 ----
export class PbError extends Error {
    constructor(status, message, data) {
        super(message);
        this.name = 'PbError';
        this.status = status;
        this.data = data;
    }
}

// 把官方 SDK 的 ClientResponseError 归一化成 PbError
export function asPbError(err) {
    if (!err) return new PbError(0, 'unknown error');
    if (err instanceof PbError) return err;
    if (err && typeof err.status === 'number') {
        return new PbError(err.status, err.message || String(err), err.data || err.response || null);
    }
    return new PbError(0, err.message || String(err));
}

// ---- 1. base URL 解析 ----
function detectBaseUrl(config) {
    if (config && config.baseUrl) return String(config.baseUrl).replace(/\/$/, '');
    if (typeof process !== 'undefined' && process.env && process.env.PB_URL) {
        return String(process.env.PB_URL).replace(/\/$/, '');
    }
    // 浏览器侧：不传 baseUrl → 用当前 origin（与现有 src/utils/pb-client.js 一致）
    if (typeof window !== 'undefined' && window.location) {
        return String(window.location.origin).replace(/\/$/, '');
    }
    return 'http://127.0.0.1:8090';
}

// ---- 2. AuthStore（用户 token 缓存） ----
function makeAuthStore(config) {
    const KEY = (config && config.tokenStorageKey) || 'pb_user_token';
    const hasWindow = typeof window !== 'undefined' && window.localStorage;
    return {
        load() {
            if (!hasWindow) return null;
            try {
                const raw = window.localStorage.getItem(KEY);
                if (!raw) return null;
                const j = JSON.parse(raw);
                if (j && j.token && (!j.exp || j.exp > Date.now())) return j;
            } catch (_) {}
            return null;
        },
        save(token, record, expMs) {
            if (!hasWindow) return;
            try {
                window.localStorage.setItem(KEY, JSON.stringify({
                    token,
                    record: record || null,
                    exp: Date.now() + (expMs || 24 * 60 * 60 * 1000),
                }));
            } catch (_) {}
        },
        clear() {
            if (!hasWindow) return;
            try { window.localStorage.removeItem(KEY); } catch (_) {}
        },
    };
}

function readDemoSecret(config) {
    if (config && config.adminDemoSecret) return String(config.adminDemoSecret);
    if (typeof process !== 'undefined' && process.env && process.env.PB_ADMIN_DEMO_SECRET) {
        return String(process.env.PB_ADMIN_DEMO_SECRET);
    }
    if (typeof window !== 'undefined' && window.PB_ADMIN_DEMO_SECRET) {
        return String(window.PB_ADMIN_DEMO_SECRET);
    }
    return '';
}

// ---- 3. Client factory ----
export function createPbClient(config) {
    const baseUrl = detectBaseUrl(config);
    const pb = new PocketBase(baseUrl);

    // 关闭 autoCancellation（CLI 脚本里多个并发请求容易相互取消）
    pb.autoCancellation(false);

    // ---- 用户 token 持久化 ----
    const authStore = makeAuthStore(config);
    const persisted = authStore.load();
    if (persisted && persisted.token) {
        try { pb.authStore.save(persisted.token, persisted.record || null); }
        catch (_) {}
    }
    pb.authStore.onChange(() => {
        const t = pb.authStore.token;
        const r = pb.authStore.record;
        if (t) authStore.save(t, r);
        else authStore.clear();
    }, true);

    // ---- AdminStore（demo admin / superuser token 缓存） ----
    let _adminToken = null;
    let _adminExp = 0;
    let _adminKind = null;       // 'demo' | 'superuser'

    // ---- 1. 健康检查 ----
    async function healthCheck() {
        try { return await pb.send('/api/health', { method: 'GET' }); }
        catch (err) { throw asPbError(err); }
    }

    // ---- 2. Catalog 列表 / 单条 ----
    function listCollection(name, qs) {
        const opts = buildListOpts(qs) || {};
        const page = (qs && qs.page) || 1;
        const perPage = (qs && qs.perPage) || 30;
        return pb.collection(name).getList(page, perPage, opts);
    }
    function getCollection(name, id, qs) {
        return pb.collection(name).getOne(id, buildGetOpts(qs));
    }
    function createRecord(name, body) {
        return pb.collection(name).create(body);
    }
    function updateRecord(name, id, body) {
        return pb.collection(name).update(id, body);
    }
    function deleteRecord(name, id) {
        return pb.collection(name).delete(id);
    }

    function buildListOpts(qs) {
        if (!qs) return undefined;
        const o = {};
        if (qs.page) o.page = qs.page;
        if (qs.perPage) o.perPage = qs.perPage;
        if (qs.sort) o.sort = qs.sort;
        if (qs.filter) o.filter = qs.filter;
        if (qs.fields) o.fields = qs.fields;
        if (qs.expand) o.expand = qs.expand;
        const filterParts = [];
        if (qs.state)     filterParts.push(`state = '${esc(qs.state)}'`);
        if (qs.published) filterParts.push('published = true');
        if (qs.category)  filterParts.push(`category = '${esc(qs.category)}'`);
        if (qs.tag)       filterParts.push(`tag = '${esc(qs.tag)}'`);
        if (qs.theme)     filterParts.push(`theme = '${esc(qs.theme)}'`);
        if (qs.role)      filterParts.push(`role = '${esc(qs.role)}'`);
        if (qs.type)      filterParts.push(`type = '${esc(qs.type)}'`);
        if (filterParts.length) {
            o.filter = o.filter ? `(${o.filter}) && (${filterParts.join(' && ')})` : filterParts.join(' && ');
        }
        return o;
    }
    function buildGetOpts(qs) {
        if (!qs) return undefined;
        const o = {};
        if (qs.fields) o.fields = qs.fields;
        if (qs.expand) o.expand = qs.expand;
        return o;
    }
    function esc(s) { return String(s).replace(/'/g, "\\'"); }

    // ---- 3. AI 路由 ----
    async function aiRoute(message, chips) {
        try {
            const body = { message: message || '' };
            if (Array.isArray(chips)) body.chips = chips;
            return await pb.send('/api/ai-route', { method: 'POST', body });
        } catch (err) { throw asPbError(err); }
    }

    // ---- 4. Auth ----
    async function requestEmailCode(email) {
        try { return await pb.send('/api/auth/email-code', { method: 'POST', body: { email } }); }
        catch (err) { throw asPbError(err); }
    }
    async function verifyEmailCode(email, code) {
        try {
            const data = await pb.send('/api/auth/email-code/verify', {
                method: 'POST', body: { email, code },
            });
            if (data && data.token) pb.authStore.save(data.token, data.record || null);
            return data;
        } catch (err) { throw asPbError(err); }
    }
    function getWechatAuthUrl() {
        // 200 OK with not_configured payload —— 不抛
        return pb.send('/api/auth/wechat/url', { method: 'GET' });
    }
    async function wechatCallbackStub(code) {
        // 后端会 501，SDK 会抛 ClientResponseError；归一化成 PbError 抛出去
        try {
            return await pb.send('/api/auth/wechat/callback', { method: 'POST', body: { code } });
        } catch (err) {
            throw asPbError(err);
        }
    }
    async function getWalletNonce() {
        try { return await pb.send('/api/auth/wallet/nonce', { method: 'GET' }); }
        catch (err) { throw asPbError(err); }
    }
    async function verifyWallet(address, signature, nonce) {
        try {
            const data = await pb.send('/api/auth/wallet/verify', {
                method: 'POST', body: { address, signature, nonce },
            });
            if (data && data.token) pb.authStore.save(data.token, data.record || null);
            return data;
        } catch (err) { throw asPbError(err); }
    }

    // ---- 4.1 Privy 桥接（spec §6.4） ----
    // 把"Privy 已验证过的身份"（email + 可选 subject）桥接到 PB users 集合。
    // - 严格模式：后端看到 PRIVY_APP_SECRET 会回应 { strict: true } —— 配 SDK 时理想；
    // - 信任模式：无 PRIVY_APP_SECRET 时与现有 email-OTP / wallet 一致安全等级。
    // 一旦拿到 token，前端通过 pb.authStore 持久化（详见 pb.authStore.onChange 钩子）。
    async function requestPrivyBridge({ email, method, subject, access_token }) {
        if (!email || typeof email !== 'string') {
            throw new PbError(400, 'email 必填');
        }
        try {
            const data = await pb.send('/api/auth/privy-bridge', {
                method: 'POST',
                body: {
                    email: String(email).trim().toLowerCase(),
                    method: method ? String(method).trim().toLowerCase() : 'privy',
                    subject: subject ? String(subject) : '',
                    access_token: access_token ? String(access_token) : '',
                },
            });
            if (data && data.token) {
                pb.authStore.save(data.token, data.record || null);
                try {
                    if (typeof window !== 'undefined' && window.dispatchEvent) {
                        window.dispatchEvent(new CustomEvent('app:auth:login', {
                            detail: { method: data.login_method || 'privy', subject: data.subject || null },
                        }));
                    }
                } catch (_) {}
            }
            return data;
        } catch (err) { throw asPbError(err); }
    }

    function logout() { pb.authStore.clear(); }

    // ---- 5. Demo admin (PB_ADMIN_DEMO_SECRET) ----
    async function getDemoAdminToken(force) {
        const now = Date.now();
        if (!force && _adminToken && _adminKind === 'demo' && _adminExp > now + 60_000) return _adminToken;
        const secret = readDemoSecret(config);
        if (!secret) throw new PbError(0, 'demo admin 未启用（缺少 adminDemoSecret / PB_ADMIN_DEMO_SECRET）');
        try {
            const data = await pb.send('/api/admin/superuser-token', {
                method: 'POST', body: { secret },
            });
            if (!data || !data.token) throw new PbError(0, '未能签发 admin token');
            _adminToken = data.token;
            _adminExp = now + (data.exp_ms || 30 * 60 * 1000);
            _adminKind = 'demo';
            return _adminToken;
        } catch (err) { throw asPbError(err); }
    }

    // ---- 6. 超管（CLI 调试 / seed 用） ----
    async function getSuperuserToken(email, password, force) {
        const cfg = (config && config.admin) || {};
        email = email || cfg.email;
        password = password || cfg.password;
        const now = Date.now();
        if (!force && _adminToken && _adminKind === 'superuser' && _adminExp > now + 60_000) return _adminToken;
        try {
            const auth = await pb.admins.authWithPassword(email, password);
            _adminToken = auth && auth.token;
            _adminExp = now + 24 * 60 * 60 * 1000;
            _adminKind = 'superuser';
            return _adminToken;
        } catch (err) { throw asPbError(err); }
    }

    function clearAdminToken() {
        _adminToken = null; _adminExp = 0; _adminKind = null;
    }

    // 带 admin token 跑一次 raw request（不污染 user token）
    async function withAdminToken(fn, opts) {
        let tok = null;
        if (opts && opts.useSuperuser) {
            tok = await getSuperuserToken(opts.email, opts.password);
        } else {
            tok = await getDemoAdminToken(opts && opts.force);
        }
        const prev = pb.authStore.token;
        const prevRec = pb.authStore.record;
        pb.authStore.save(tok, null);
        try {
            return await fn();
        } finally {
            if (prev) pb.authStore.save(prev, prevRec);
            else pb.authStore.clear();
        }
    }

    // ---- 7. 业务写入 ----
    async function createOrder(payload) {
        try { return await pb.collection('orders').create(payload); }
        catch (err) { throw asPbError(err); }
    }
    async function verifyOrder(id) {
        return withAdminToken(
            () => pb.collection('orders').update(id, { status: 'verified' }),
            { useSuperuser: true, ...(config && config.admin || {}) },
        );
    }
    async function resendAdvisorCode(orderId) {
        return withAdminToken(
            () => pb.send('/api/orders/resend-advisor-code', {
                method: 'POST', body: { id: orderId },
            }),
            { useSuperuser: true, ...(config && config.admin || {}) },
        );
    }
    async function createIntent(payload) {
        try { return await pb.collection('intents').create(payload); }
        catch (err) { throw asPbError(err); }
    }
    async function contactIntent(id) {
        return withAdminToken(
            () => pb.collection('intents').update(id, { status: 'contacted' }),
            { useSuperuser: true, ...(config && config.admin || {}) },
        );
    }
    async function closeIntent(id) {
        return withAdminToken(
            () => pb.collection('intents').update(id, { status: 'closed' }),
            { useSuperuser: true, ...(config && config.admin || {}) },
        );
    }
    async function createSignup(payload) {
        try { return await pb.collection('signups').create(payload); }
        catch (err) { throw asPbError(err); }
    }
    async function reviewSignup(id, reviewStatus, notes) {
        return withAdminToken(
            () => pb.collection('signups').update(id, {
                review_status: reviewStatus,
                review_notes: notes || '',
            }),
            { useSuperuser: true, ...(config && config.admin || {}) },
        );
    }
    async function createLead(payload) {
        try { return await pb.collection('leads').create(payload); }
        catch (err) { throw asPbError(err); }
    }

    // ---- 8. user_profiles ----
    async function findUserProfileByUserId(userId) {
        try {
            const res = await pb.collection('user_profiles').getList(1, 1, {
                filter: `user_id = '${String(userId).replace(/'/g, "''")}'`,
            });
            return res.items && res.items[0] ? res.items[0] : null;
        } catch (err) { throw asPbError(err); }
    }
    async function getUserProfile(id, qs) {
        try { return await getCollection('user_profiles', id, qs); }
        catch (err) { throw asPbError(err); }
    }
    async function updateUserProfile(id, body) {
        try { return await pb.collection('user_profiles').update(id, body); }
        catch (err) { throw asPbError(err); }
    }
    async function updateUserProfileByUserId(userId, body) {
        const profile = await findUserProfileByUserId(userId);
        if (!profile) throw new PbError(404, `user_profiles 记录不存在 for user_id=${userId}`);
        return updateUserProfile(profile.id, body);
    }

    // ---- 9. Normalizers ----
    function normalizeCourse(r) {
        return {
            id: r.id, title: r.title, category: r.category, subcategory: r.subcategory,
            tags: r.tags || [], difficulty: r.difficulty, form: r.form,
            price: { type: r.price_type, amount: r.price_amount || 0,
                     origin: r.price_origin || 0, deposit: r.price_deposit || 0 },
            cover: r.cover, dog: r.dog,
            start_at: r.start_at, end_at: r.end_at,
            state: r.state, content_source: r.content_source, external_url: r.external_url,
            teacher: r.teacher, desc: r.desc,
            outline: r.outline || [],
            signup_fields: r.signup_fields || [],
            signup_fields_config: r.signup_fields_config || {},
            signup_review_required: !!r.signup_review_required,
        };
    }
    function normalizeEvent(r) {
        return {
            id: r.id, title: r.title, type: r.type, city: r.city, tag: r.tag,
            cover: r.cover, dog: r.dog,
            start_at: r.start_at, end_at: r.end_at,
            state: r.state, content_source: r.content_source, external_url: r.external_url,
            desc: r.desc, agenda: r.agenda || [],
            signup_fields: r.signup_fields || [],
            signup_fields_config: r.signup_fields_config || {},
            signup_review_required: !!r.signup_review_required,
        };
    }
    function normalizeHackathon(r) {
        return {
            id: r.id, title: r.title, theme: r.theme,
            prize_pool_usd: r.prize_pool_usd || 0,
            cover: r.cover, dog: r.dog,
            start_at: r.start_at, end_at: r.end_at, deadline: r.deadline,
            state: r.state, content_source: r.content_source, external_url: r.external_url,
            tracks: r.tracks || [], judging: r.judging || [], desc: r.desc,
            signup_fields: r.signup_fields || [],
            signup_fields_config: r.signup_fields_config || {},
            signup_review_required: !!r.signup_review_required,
        };
    }
    function normalizeJob(r) {
        return {
            id: r.id, title: r.title, role: r.role, company: r.company,
            city: r.city, remote: !!r.remote,
            job_type: r.job_type, desc: r.desc, reqs: r.reqs || [],
            contact: r.contact, salary_range: r.salary_range,
            review_status: r.review_status, content_source: r.content_source,
        };
    }
    function normalizeApp(r) {
        return { id: r.id, name: r.name, type: r.type, cover: r.cover, dog: r.dog,
                 desc: r.desc, url: r.url, contact: r.contact };
    }
    function normalizeProvider(r) {
        return { id: r.id, name: r.name, models: r.models, price: r.price,
                 settle: r.settle, contact: r.contact, todo: !!r.todo };
    }
    function normalizeJobPosting(r) {
        return {
            id: r.id, company_name: r.company_name, title: r.title, slug: r.slug,
            location: r.location, remote: !!r.remote, job_type: r.job_type,
            description: r.description, requirements: r.requirements,
            salary_range: r.salary_range, tags: r.tags || [],
            published: !!r.published, review_status: r.review_status,
        };
    }
    function normalizeTalentProfile(r) {
        return {
            id: r.id, nickname: r.nickname, expected_role: r.expected_role,
            work_experience: r.work_experience, skill_tags: r.skill_tags || [],
            resume_url: r.resume_url, bio: r.bio,
            expected_salary: r.expected_salary, expected_city: r.expected_city,
            status: r.status,
        };
    }
    function normalizeUserProfile(r) {
        return {
            id: r.id, email: r.email, nickname: r.nickname, avatar: r.avatar,
            city: r.city, bio: r.bio, skill_tags: r.skill_tags || [],
            resume_url: r.resume_url, social_links: r.social_links || {},
            login_method: r.login_method, wallet_address: r.wallet_address,
            extensions: r.extensions || {},
        };
    }

    // ---- 10. 列表 + 标准化 ----
    async function listCoursesNormalized(qs) {
        const r = await listCollection('courses', qs);
        return r.items.map(normalizeCourse);
    }
    async function listEventsNormalized(qs) {
        const r = await listCollection('events', qs);
        return r.items.map(normalizeEvent);
    }
    async function listHackathonsNormalized(qs) {
        const r = await listCollection('hackathons', qs);
        return r.items.map(normalizeHackathon);
    }
    async function listJobsNormalized(qs) {
        const r = await listCollection('jobs', qs);
        return r.items.map(normalizeJob);
    }
    async function listAppsNormalized(qs) {
        const r = await listCollection('apps', qs);
        return r.items.map(normalizeApp);
    }
    async function listProvidersNormalized(qs) {
        const r = await listCollection('providers', qs);
        return r.items.map(normalizeProvider);
    }
    async function listJobPostingsNormalized(qs) {
        const r = await listCollection('job_postings', qs);
        return r.items.map(normalizeJobPosting);
    }
    async function listTalentProfilesNormalized(qs) {
        const r = await listCollection('talent_profiles', qs);
        return r.items.map(normalizeTalentProfile);
    }
    async function getUserProfileNormalized(id) {
        return normalizeUserProfile(await getUserProfile(id));
    }
    async function getUserProfileByUserIdNormalized(userId) {
        const r = await findUserProfileByUserId(userId);
        return r ? normalizeUserProfile(r) : null;
    }

    // ---- 11a. 便捷 catalog 写操作（前端 AdminPage 兼容） ----
    // CLI：用 superuser 直连 PB
    // 浏览器：用 config.adminDemoSecret → /api/admin/proxy
    // 优先走 CLI 路径（直连），没有 superuser 配置就退化到 demo admin 路径。
    function adminCanWrite() {
        const cfg = (config && config.admin) || {};
        return !!(cfg.email && cfg.password);
    }
    async function adminProxyCall(collection, method, id, payload, query) {
        // 浏览器路径：走 /api/admin/proxy
        const tok = await getDemoAdminToken();
        const body = {
            collection, method, id: id || '',
            payload: payload || {}, query: query || {},
        };
        try {
            return await pb.send('/api/admin/proxy', {
                method: 'POST', body,
                headers: { 'X-Admin-Token': tok },
            });
        } catch (err) { throw asPbError(err); }
    }
    async function _adminCreate(name, payload) {
        if (adminCanWrite()) {
            try { return await pb.collection(name).create(payload); }
            catch (err) { throw asPbError(err); }
        }
        return adminProxyCall(name, 'POST', '', payload);
    }
    async function _adminUpdate(name, id, payload) {
        if (adminCanWrite()) {
            try { return await pb.collection(name).update(id, payload); }
            catch (err) { throw asPbError(err); }
        }
        return adminProxyCall(name, 'PATCH', id, payload);
    }
    async function _adminDelete(name, id) {
        if (adminCanWrite()) {
            try { return await pb.collection(name).delete(id); }
            catch (err) { throw asPbError(err); }
        }
        return adminProxyCall(name, 'DELETE', id, {});
    }
    // §15 新表（job_postings / talent_profiles）走 admin 代理，createRule 是 null / 登录用户
    async function adminCreateRecord(name, payload) { return _adminCreate(name, payload); }
    async function adminUpdateRecord(name, id, payload) { return _adminUpdate(name, id, payload); }
    async function adminDeleteRecord(name, id) { return _adminDelete(name, id); }
    // Convenience（与现有 src/utils/pb-client.js 命名一致）
    const createCourse     = (p) => _adminCreate('courses', p);
    const updateCourse     = (id, p) => _adminUpdate('courses', id, p);
    const deleteCourse     = (id) => _adminDelete('courses', id);
    const createEvent      = (p) => _adminCreate('events', p);
    const updateEvent      = (id, p) => _adminUpdate('events', id, p);
    const deleteEvent      = (id) => _adminDelete('events', id);
    const createHackathon  = (p) => _adminCreate('hackathons', p);
    const updateHackathon  = (id, p) => _adminUpdate('hackathons', id, p);
    const deleteHackathon  = (id) => _adminDelete('hackathons', id);
    const createJob        = (p) => _adminCreate('jobs', p);
    const updateJob        = (id, p) => _adminUpdate('jobs', id, p);
    const deleteJob        = (id) => _adminDelete('jobs', id);
    const createApp        = (p) => _adminCreate('apps', p);
    const updateApp        = (id, p) => _adminUpdate('apps', id, p);
    const deleteApp        = (id) => _adminDelete('apps', id);
    const createProvider   = (p) => _adminCreate('providers', p);
    const updateProvider   = (id, p) => _adminUpdate('providers', id, p);
    const deleteProvider   = (id) => _adminDelete('providers', id);

    // reviewSubmission 别名（store 用 id+status，不带 notes）
    function reviewSubmission(id, reviewStatus, notes) {
        return reviewSignup(id, reviewStatus, notes);
    }

    // loadUserSession —— 浏览器侧在 SDK 构造时已自动从 localStorage 恢复；
    // 这里返回当前 authStore 的快照（token / record / 剩余时间），与旧版兼容
    function loadUserSession() {
        const tok = pb.authStore.token;
        const rec = pb.authStore.record;
        if (!tok) return null;
        return { token: tok, record: rec, expMs: 0 };   // SDK 自己管过期
    }

    // ---- 11. 完整 SDK 暴露 ----
    return {
        // meta
        baseUrl,
        raw: pb,                                // 官方 SDK 底层，做特殊事情用
        // session
        getUserToken: () => pb.authStore.token,
        getUserRecord: () => pb.authStore.record,
        isLoggedIn: () => !!pb.authStore.token,
        logout,
        // auth
        requestEmailCode, verifyEmailCode,
        getWechatAuthUrl, wechatCallbackStub,
        getWalletNonce, verifyWallet,
        requestPrivyBridge,
        // admin
        getSuperuserToken, getDemoAdminToken, clearAdminToken, withAdminToken,
        // ai
        aiRoute,
        // catalog raw
        listCourses:        (qs) => listCollection('courses', qs),
        listEvents:         (qs) => listCollection('events', qs),
        listHackathons:     (qs) => listCollection('hackathons', qs),
        listJobs:           (qs) => listCollection('jobs', qs),
        listApps:           (qs) => listCollection('apps', qs),
        listProviders:      (qs) => listCollection('providers', qs),
        getCourse:          (id, qs) => getCollection('courses', id, qs),
        getEvent:           (id, qs) => getCollection('events', id, qs),
        getHackathon:       (id, qs) => getCollection('hackathons', id, qs),
        getJob:             (id, qs) => getCollection('jobs', id, qs),
        getApp:             (id, qs) => getCollection('apps', id, qs),
        getProvider:        (id, qs) => getCollection('providers', id, qs),
        // hiring
        listJobPostings:    (qs) => listCollection('job_postings', qs),
        getJobPosting:      (id, qs) => getCollection('job_postings', id, qs),
        listTalentProfiles: (qs) => listCollection('talent_profiles', qs),
        getTalentProfile:   (id, qs) => getCollection('talent_profiles', id, qs),
        // user profile
        getUserProfile, findUserProfileByUserId,
        updateUserProfile, updateUserProfileByUserId,
        listUserProfiles: (qs) => listCollection('user_profiles', qs),
        // writes
        createOrder, verifyOrder, resendAdvisorCode,
        createIntent, contactIntent, closeIntent,
        createSignup, reviewSignup, createLead,
        // generic CRUD
        createRecord, updateRecord, deleteRecord,
        // §15 admin 代理 CRUD
        adminCreateRecord, adminUpdateRecord, adminDeleteRecord,
        // convenience: 前端 AdminPage 兼容命名
        createCourse, updateCourse, deleteCourse,
        createEvent, updateEvent, deleteEvent,
        createHackathon, updateHackathon, deleteHackathon,
        createJob, updateJob, deleteJob,
        createApp, updateApp, deleteApp,
        createProvider, updateProvider, deleteProvider,
        // alias: 旧版命名
        reviewSubmission, loadUserSession,
        // health
        healthCheck,
        // normalized
        listCoursesNormalized, listEventsNormalized, listHackathonsNormalized,
        listJobsNormalized, listAppsNormalized, listProvidersNormalized,
        listJobPostingsNormalized, listTalentProfilesNormalized,
        getUserProfileNormalized, getUserProfileByUserIdNormalized,
        // single-record normalizer
        normalizeCourse, normalizeEvent, normalizeHackathon, normalizeJob,
        normalizeApp, normalizeProvider, normalizeJobPosting, normalizeTalentProfile,
        normalizeUserProfile,
    };
}

// ---- 12. 默认单例（懒加载） ----
let _default = null;
export function getDefaultClient() {
    if (!_default) _default = createPbClient();
    return _default;
}

export default createPbClient;
