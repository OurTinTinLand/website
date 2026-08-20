// =============================================================================
// TinTinLand Backend —— 浏览器端 SDK
// =============================================================================
//
// 轻量 fetch 封装，给 esbuild+UMD React SPA 用（无需 npm install pocketbase）。
// 所有方法返回 Promise；错误统一抛 PbError。
//
// 调用约定：所有 API 用相对路径（'/api/...'、'/_/...'）。
//   - dev / staging / prod 一致，永远相对当前 origin
//   - 由 PocketBase 的 pb_public 静态托管保证同源：浏览器加载页面后，
//     fetch('/api/...') 永远走同一个 origin 的 /api/* 处理
//   - dev：直接 ./backend/pocketbase serve --publicDir=backend/pb_public
//   - prod：Dockerfile 单容器跑 PB 同一进程（Railway 统一 Service）
//
// 之前有过一整套 base URL 机制（PB_URL / window.PB_URL / PUBLIC_PB_URL）
// 加 Node 反代层，已完全删除。同源托管天然免去 host 头 / cookie domain
// / CORS preflight / 反代 header 修复这些坑。
//
const PB_URL = "";   // 永远相对当前 origin（由 PocketBase pb_public 同源托管保证）
// ─── 运营后台 token：不再在前端硬编码超管凭据 ───
// 历史：曾经把 SUPERUSER_EMAIL/PASSWORD 直接写在前端，任何 DevTools 都能拿到。
// 现在：前端只有 window.PB_ADMIN_DEMO_SECRET（由 PB onServe 钩子从 PB_ADMIN_DEMO_SECRET 环境变量注入），
// 凭这个 secret 调 /api/admin/superuser-token 拿后端现签的超管 token。
// secret 错 / 没配：后端 401，整个 admin 流不可用。
function getDemoSecret() {
    if (typeof window !== "undefined" && window.PB_ADMIN_DEMO_SECRET) {
        return String(window.PB_ADMIN_DEMO_SECRET);
    }
    return "";
}

export class PbError extends Error {
    constructor(status, message, data) {
        super(message);
        this.name = "PbError";
        this.status = status;
        this.data = data;
    }
}

// ---- token cache（浏览器端） ----
let _userToken = null;
let _userTokenExp = 0;
let _userRecord = null;

export function setUserSession(token, record, expMs) {
    _userToken = token || null;
    _userRecord = record || null;
    _userTokenExp = _userToken ? (Date.now() + (expMs || 24 * 60 * 60 * 1000)) : 0;
    try { window.localStorage?.setItem("pb_token", JSON.stringify({ t: _userToken, r: _userRecord, e: _userTokenExp })); } catch (_) {}
}

export function loadUserSession() {
    try {
        const raw = window.localStorage?.getItem("pb_token");
        if (!raw) return null;
        const j = JSON.parse(raw);
        if (j && j.t && j.e > Date.now()) {
            _userToken = j.t; _userRecord = j.r; _userTokenExp = j.e;
            return { token: j.t, record: j.r, expMs: j.e - Date.now() };
        }
    } catch (_) {}
    return null;
}
loadUserSession();

export function getUserToken(force) {
    if (!force && _userToken && _userTokenExp > Date.now() + 60_000) {
        return Promise.resolve(_userToken);
    }
    if (!force && _userToken) {
        return Promise.resolve(_userToken);
    }
    return Promise.reject(new PbError(0, "未登录"));
}

export function getUserRecord() { return _userRecord; }
export function clearUserSession() {
    _userToken = null; _userTokenExp = 0; _userRecord = null;
    try { window.localStorage?.removeItem("pb_token"); } catch (_) {}
}

// ---- fetch wrapper ----
async function req(method, path, body, token, extraHeaders) {
    const headers = { "Content-Type": "application/json" };
    const tok = token || _userToken;
    if (tok) headers["Authorization"] = tok;
    if (extraHeaders && typeof extraHeaders === "object") {
        for (var _k in extraHeaders) {
            if (Object.prototype.hasOwnProperty.call(extraHeaders, _k)) {
                headers[_k] = extraHeaders[_k];
            }
        }
    }

    let resp;
    try {
        resp = await fetch(PB_URL + path, {
            method,
            headers,
            body: body == null ? undefined : JSON.stringify(body),
        });
    } catch (networkErr) {
        throw new PbError(0, "后端连不上（" + PB_URL + "）：" + networkErr.message);
    }

    let data = null;
    try { data = await resp.json(); } catch (_) {}

    if (!resp.ok) {
        const msg = (data && data.message) || (resp.status + " " + resp.statusText);
        throw new PbError(resp.status, msg, data);
    }
    return data || {};
}

// PB_URL 留作模块内常量（恒为 ""），不再对外 export。新代码直接用相对路径 fetch。
// ---- superuser helpers（运营后台用：调后端 /api/admin/superuser-token 换短命 token） ----
let _cachedSuperToken = null;
let _cachedSuperExp = 0;

export async function getSuperuserToken(force) {
    const now = Date.now();
    if (!force && _cachedSuperToken && _cachedSuperExp > now + 60_000) {
        return _cachedSuperToken;
    }
    const secret = getDemoSecret();
    if (!secret) {
        throw new PbError(0, "demo admin 未启用（缺少 PB_ADMIN_DEMO_SECRET）");
    }
    // 不再直连 PB superuser auth 端点 —— 走后端 /api/admin/superuser-token
    // 凭 secret 让后端去签发超管 token，secret 不入 PB，泄露面更小。
    const data = await req("POST", "/api/admin/superuser-token", { secret: secret });
    if (!data || !data.token) {
        throw new PbError(0, "未能签发 admin token");
    }
    _cachedSuperToken = data.token;
    _cachedSuperExp = now + (data.exp_ms || 30 * 60 * 1000);
    return _cachedSuperToken;
}

export function clearSuperuserToken() {
    _cachedSuperToken = null;
    _cachedSuperExp = 0;
}

// ---- 1. AI 路由 ----
export async function aiRoute(message, chips) {
    const body = { message: message || "" };
    if (Array.isArray(chips)) body.chips = chips;
    return req("POST", "/api/ai-route", body);
}

// ---- 2. Catalog 列表 ----
function buildQuery(qs) {
    if (!qs) return "";
    const parts = [];
    if (qs.filter)   parts.push("filter=" + encodeURIComponent(qs.filter));
    if (qs.sort)     parts.push("sort=" + encodeURIComponent(qs.sort));
    if (qs.page)     parts.push("page=" + qs.page);
    if (qs.perPage)  parts.push("perPage=" + qs.perPage);
    if (qs.fields)   parts.push("fields=" + encodeURIComponent(qs.fields));
    if (qs.expand)   parts.push("expand=" + encodeURIComponent(qs.expand));
    if (qs.state)     parts.push("state=" + encodeURIComponent(qs.state));
    if (qs.published) parts.push("published=" + encodeURIComponent(qs.published));
    if (qs.category)  parts.push("category=" + encodeURIComponent(qs.category));
    if (qs.tag)       parts.push("tag=" + encodeURIComponent(qs.tag));
    if (qs.theme)     parts.push("theme=" + encodeURIComponent(qs.theme));
    if (qs.role)      parts.push("role=" + encodeURIComponent(qs.role));
    if (qs.type)      parts.push("type=" + encodeURIComponent(qs.type));
    return parts.length ? "?" + parts.join("&") : "";
}

async function listCollection(name, qs) {
    return req("GET", "/api/collections/" + name + "/records" + buildQuery(qs));
}

async function getCollection(name, id, qs) {
    return req("GET", "/api/collections/" + name + "/records/" + encodeURIComponent(id) + buildQuery(qs));
}

export const listCourses        = (qs) => listCollection("courses", qs);
export const listEvents         = (qs) => listCollection("events", qs);
export const listHackathons     = (qs) => listCollection("hackathons", qs);
export const listJobs           = (qs) => listCollection("jobs", qs);
export const listApps           = (qs) => listCollection("apps", qs);
export const listProviders      = (qs) => listCollection("providers", qs);
export const getCourse          = (id, qs) => getCollection("courses", id, qs);
export const getEvent           = (id, qs) => getCollection("events", id, qs);
export const getHackathon       = (id, qs) => getCollection("hackathons", id, qs);
export const getJob             = (id, qs) => getCollection("jobs", id, qs);
export const getApp             = (id, qs) => getCollection("apps", id, qs);
export const getProvider        = (id, qs) => getCollection("providers", id, qs);

export const listJobPostings    = (qs) => listCollection("job_postings", qs);
export const getJobPosting      = (id, qs) => getCollection("job_postings", id, qs);
export const listTalentProfiles = (qs) => listCollection("talent_profiles", qs);
export const getTalentProfile   = (id, qs) => getCollection("talent_profiles", id, qs);

export const getUserProfile     = (id, qs) => getCollection("user_profiles", id, qs);
export async function findUserProfileByUserId(userId) {
    const r = await req("GET", "/api/collections/user_profiles/records?filter=" +
        encodeURIComponent("user_id = '" + String(userId).replace(/'/g, "''") + "'") + "&perPage=1");
    return r.items && r.items[0] ? r.items[0] : null;
}
export async function updateUserProfileByUserId(userId, body) {
    const profile = await findUserProfileByUserId(userId);
    if (!profile) throw new PbError(404, "user_profiles 记录不存在 for user_id=" + userId);
    return req("PATCH", "/api/collections/user_profiles/records/" + encodeURIComponent(profile.id), body);
}
export const updateUserProfile  = (id, body) => req("PATCH", "/api/collections/user_profiles/records/" + encodeURIComponent(id), body);
export const listUserProfiles   = (qs) => listCollection("user_profiles", qs);

// ---- 3. Auth（spec §6） ----
export async function requestEmailCode(email) {
    return req("POST", "/api/auth/email-code", { email });
}
export async function verifyEmailCode(email, code) {
    const data = await req("POST", "/api/auth/email-code/verify", { email, code });
    if (data && data.token) {
        setUserSession(data.token, data.record);
    }
    return data;
}
export function getWechatAuthUrl() {
    return req("GET", "/api/auth/wechat/url");
}
export function wechatCallbackStub(code) {
    return req("POST", "/api/auth/wechat/callback", { code });
}
export function getWalletNonce() {
    return req("GET", "/api/auth/wallet/nonce");
}
export async function verifyWallet(address, signature, nonce) {
    const data = await req("POST", "/api/auth/wallet/verify",
        { address, signature, nonce });
    if (data && data.token) {
        setUserSession(data.token, data.record);
    }
    return data;
}
export function logout() { clearUserSession(); }

// ---- 4. 业务写入 ----
export const createOrder = (payload) =>
    req("POST", "/api/collections/orders/records", payload);

export async function verifyOrder(id) {
    const t = await getSuperuserToken();
    return req("POST", "/api/admin/proxy", {
        collection: "orders", method: "PATCH", id: id,
        payload: { status: "verified" },
    }, t, { "X-Admin-Token": t });
}

export async function resendAdvisorCode(orderId) {
    const t = await getSuperuserToken();
    return req("POST", "/api/orders/resend-advisor-code",
        { order_id: orderId }, t, { "X-Admin-Token": t });
}

export const createIntent = (payload) =>
    req("POST", "/api/collections/intents/records", payload);

export async function contactIntent(id) {
    const t = await getSuperuserToken();
    return req("POST", "/api/admin/proxy", {
        collection: "intents", method: "PATCH", id: id,
        payload: { status: "contacted" },
    }, t, { "X-Admin-Token": t });
}

export async function closeIntent(id) {
    const t = await getSuperuserToken();
    return req("POST", "/api/admin/proxy", {
        collection: "intents", method: "PATCH", id: id,
        payload: { status: "closed" },
    }, t, { "X-Admin-Token": t });
}

export const createSignup = (payload) =>
    req("POST", "/api/collections/signups/records", payload);

export async function reviewSubmission(id, reviewStatus, notes) {
    const t = await getSuperuserToken();
    return req("POST", "/api/admin/proxy", {
        collection: "signups", method: "PATCH", id: id,
        payload: { review_status: reviewStatus, review_notes: notes || "" },
    }, t, { "X-Admin-Token": t });
}

export const createLead = (payload) =>
    req("POST", "/api/collections/leads/records", payload);

// ---- 4b. 运营后台：目录 CRUD（courses / events / hackathons / jobs / apps / providers） ----
// 写操作需要 superuser token（运营后台；前端 demoAdmin 登录后调用）
// admin 写操作走 /api/admin/proxy：后端校验 X-Admin-Token 后才转发到 PB。
// 这里把 token 走成 header（不是 body / query），避免落入 access log / referer。
async function adminProxy(collection, method, id, payload, query) {
    const t = await getSuperuserToken();
    return req("POST", "/api/admin/proxy", {
        collection: collection,
        method: method,
        id: id || "",
        payload: payload || {},
        query: query || {},
    }, t, { "X-Admin-Token": t });
}
async function adminCreate(name, payload) {
    return adminProxy(name, "POST", "", payload || {});
}
async function adminUpdate(name, id, payload) {
    return adminProxy(name, "PATCH", id, payload || {});
}
async function adminDelete(name, id) {
    return adminProxy(name, "DELETE", id, {});
}

export const createCourse     = (p) => adminCreate("courses",     p);
export const updateCourse     = (id, p) => adminUpdate("courses", id, p);
export const deleteCourse     = (id) => adminDelete("courses", id);
export const createEvent      = (p) => adminCreate("events",      p);
export const updateEvent      = (id, p) => adminUpdate("events", id, p);
export const deleteEvent      = (id) => adminDelete("events", id);
export const createHackathon   = (p) => adminCreate("hackathons",  p);
export const updateHackathon  = (id, p) => adminUpdate("hackathons", id, p);
export const deleteHackathon  = (id) => adminDelete("hackathons", id);
export const createJob        = (p) => adminCreate("jobs",        p);
export const updateJob        = (id, p) => adminUpdate("jobs", id, p);
export const deleteJob        = (id) => adminDelete("jobs", id);
export const createApp        = (p) => adminCreate("apps",        p);
export const updateApp        = (id, p) => adminUpdate("apps", id, p);
export const deleteApp        = (id) => adminDelete("apps", id);
export const createProvider   = (p) => adminCreate("providers",   p);
export const updateProvider   = (id, p) => adminUpdate("providers", id, p);
export const deleteProvider   = (id) => adminDelete("providers", id);

// ---- 5. 登录后读自己的数据 ----
export const myOrders  = (qs) => listCollection("orders", qs);
export const myIntents = (qs) => listCollection("intents", qs);
export const mySignups = (qs) => listCollection("signups", qs);
export const myLeads   = (qs) => listCollection("leads", qs);

// ---- 6. 数据规范化 ----
function normalizeCourse(r) {
    return {
        id: r.id, title: r.title, category: r.category,
        subcategory: r.subcategory, tags: r.tags || [],
        difficulty: r.difficulty, form: r.form,
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
        id: r.id, title: r.title, role: r.role,
        company: r.company, city: r.city, remote: !!r.remote,
        job_type: r.job_type, desc: r.desc, reqs: r.reqs || [],
        contact: r.contact, salary_range: r.salary_range,
        review_status: r.review_status, content_source: r.content_source,
    };
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

export async function listCoursesNormalized(qs) {
    const { items } = await listCourses(qs);
    return items.map(normalizeCourse);
}
export async function listEventsNormalized(qs) {
    const { items } = await listEvents(qs);
    return items.map(normalizeEvent);
}
export async function listHackathonsNormalized(qs) {
    const { items } = await listHackathons(qs);
    return items.map(normalizeHackathon);
}
export async function listJobsNormalized(qs) {
    const { items } = await listJobs(qs);
    return items.map(normalizeJob);
}
export async function listAppsNormalized(qs) {
    const { items } = await listApps(qs);
    return items.map(normalizeApp);
}
function normalizeApp(r) {
    return {
        id: r.id, name: r.name, type: r.type, cover: r.cover, dog: r.dog,
        desc: r.desc, url: r.url, contact: r.contact,
    };
}
export async function listProvidersNormalized(qs) {
    const { items } = await listProviders(qs);
    return items.map(normalizeProvider);
}
function normalizeProvider(r) {
    return {
        id: r.id, name: r.name, models: r.models, price: r.price,
        settle: r.settle, contact: r.contact, todo: !!r.todo,
    };
}
export async function listJobPostingsNormalized(qs) {
    const { items } = await listJobPostings(qs);
    return items.map(normalizeJobPosting);
}
export async function listTalentProfilesNormalized(qs) {
    const { items } = await listTalentProfiles(qs);
    return items.map(normalizeTalentProfile);
}
export async function getUserProfileNormalized(id) {
    return normalizeUserProfile(await getUserProfile(id));
}

// ---- 7. 健康检查 ----
export async function healthCheck() {
    return req("GET", "/api/health");
}
