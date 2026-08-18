// =============================================================================
// TinTinLand Backend —— 浏览器端 SDK
// =============================================================================
//
// 轻量 fetch 封装，给现有的 esbuild+UMD React SPA 用（不需要 npm install
// pocketbase），所有方法返回 Promise。错误统一抛 PbError。
//
// 用法：
//   import { pb, aiRoute, listCourses, requestEmailCode, verifyEmailCode } from "../backend/pb-client.js";
//
// window.PB_URL 可在 host HTML 里覆盖，缺省 http://127.0.0.1:8090。
//
// 本文件既可以作为 ES module 直接被 src/ 下的 .jsx 文件 import，也可以由
// backend/start.sh 通过 esbuild alias 把 "@/pb" 指向这里。
//
const PB_URL = (typeof window !== "undefined" && window.PB_URL)
    || "http://127.0.0.1:8090";
const SUPERUSER_EMAIL = "admin@tintin.land";
const SUPERUSER_PASSWORD = "tintinland2026";

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
}

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
export function clearUserSession() { _userToken = null; _userTokenExp = 0; _userRecord = null; }

// ---- fetch wrapper ----
async function req(method, path, body, token) {
    const headers = { "Content-Type": "application/json" };
    const tok = token || _userToken;
    if (tok) headers["Authorization"] = tok;

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

// ---- superuser helpers（运营后台调试用，前端 demoAdmin 调用） ----
let _cachedSuperToken = null;
let _cachedSuperExp = 0;

export async function getSuperuserToken(force) {
    const now = Date.now();
    if (!force && _cachedSuperToken && _cachedSuperExp > now + 60_000) {
        return _cachedSuperToken;
    }
    const data = await req("POST", "/api/collections/_superusers/auth-with-password", {
        identity: SUPERUSER_EMAIL,
        password: SUPERUSER_PASSWORD,
    });
    _cachedSuperToken = data.token;
    _cachedSuperExp = now + 24 * 60 * 60 * 1000;
    return _cachedSuperToken;
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
    // passthrough shortcuts (guards hook 自动转成 filter)
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

// 公开 catalog
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

// 招聘：spec §9.7 / §15
export const listJobPostings    = (qs) => listCollection("job_postings", qs);
export const getJobPosting      = (id, qs) => getCollection("job_postings", id, qs);
export const listTalentProfiles = (qs) => listCollection("talent_profiles", qs);
export const getTalentProfile   = (id, qs) => getCollection("talent_profiles", id, qs);

// 个人中心：spec §9.5 / §16
// user_profiles 的 id 是自己的 PK；user_id 字段才指向 users.id
// 前端拿到 users record 后用 user_id 查 profile
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
    return req("PATCH", "/api/collections/orders/records/" + encodeURIComponent(id),
        { status: "verified" }, t);
}

// 手动补发顾问联系码（spec §14.5）
export async function resendAdvisorCode(orderId) {
    const t = await getSuperuserToken();
    return req("POST", "/api/orders/resend-advisor-code",
        { id: orderId }, t);
}

export const createIntent = (payload) =>
    req("POST", "/api/collections/intents/records", payload);

export async function contactIntent(id) {
    const t = await getSuperuserToken();
    return req("PATCH", "/api/collections/intents/records/" + encodeURIComponent(id),
        { status: "contacted" }, t);
}

export async function closeIntent(id) {
    const t = await getSuperuserToken();
    return req("PATCH", "/api/collections/intents/records/" + encodeURIComponent(id),
        { status: "closed" }, t);
}

export const createSignup = (payload) =>
    req("POST", "/api/collections/signups/records", payload);

// 运营：审核报名
export async function reviewSignup(id, reviewStatus, notes) {
    const t = await getSuperuserToken();
    return req("PATCH", "/api/collections/signups/records/" + encodeURIComponent(id),
        { review_status: reviewStatus, review_notes: notes || "" }, t);
}

export const createLead = (payload) =>
    req("POST", "/api/collections/leads/records", payload);

// ---- 5. 登录后读自己的数据 ----
export const myOrders  = (qs) => listCollection("orders", qs);
export const myIntents = (qs) => listCollection("intents", qs);
export const mySignups = (qs) => listCollection("signups", qs);
export const myLeads   = (qs) => listCollection("leads", qs);

// ---- 6. 兼容层：原 SPA 用的 src/data/*.js 形状 ----
function normalizeCourse(r) {
    return {
        id: r.id,
        title: r.title,
        category: r.category,
        difficulty: r.difficulty,
        form: r.form,
        price: {
            type: r.price_type,
            amount: r.price_amount || 0,
            origin: r.price_origin || 0,
            deposit: r.price_deposit || 0,
        },
        cover: r.cover,
        dog: r.dog,
        start_at: r.start_at,
        end_at: r.end_at,
        state: r.state,
        content_source: r.content_source,
        external_url: r.external_url,
        teacher: r.teacher,
        desc: r.desc,
        outline: r.outline || [],
        signup_fields: r.signup_fields || [],
    };
}

function normalizeEvent(r) {
    return {
        id: r.id,
        title: r.title,
        type: r.type,
        city: r.city,
        tag: r.tag,
        cover: r.cover,
        dog: r.dog,
        start_at: r.start_at,
        end_at: r.end_at,
        state: r.state,
        content_source: r.content_source,
        external_url: r.external_url,
        desc: r.desc,
        agenda: r.agenda || [],
        signup_fields: r.signup_fields || [],
    };
}

function normalizeHackathon(r) {
    return {
        id: r.id,
        title: r.title,
        theme: r.theme,
        prize_pool_usd: r.prize_pool_usd || 0,
        cover: r.cover,
        dog: r.dog,
        start_at: r.start_at,
        end_at: r.end_at,
        deadline: r.deadline,
        state: r.state,
        content_source: r.content_source,
        external_url: r.external_url,
        tracks: r.tracks || [],
        judging: r.judging || [],
        desc: r.desc,
        signup_fields: r.signup_fields || [],
    };
}

function normalizeJob(r) {
    return {
        id: r.id,
        title: r.title,
        role: r.role,
        company: r.company,
        city: r.city,
        remote: !!r.remote,
        desc: r.desc,
        reqs: r.reqs || [],
    };
}

function normalizeJobPosting(r) {
    // spec §9.7 / §15.1
    return {
        id: r.id,
        company_name: r.company_name,
        title: r.title,
        slug: r.slug,
        location: r.location,
        remote: !!r.remote,
        job_type: r.job_type,
        description: r.description,
        requirements: r.requirements,
        salary_range: r.salary_range,
        // contact 字段 hook 已脱敏，前台拿到的是 ""
        tags: r.tags || [],
        published: !!r.published,
        review_status: r.review_status,
    };
}

function normalizeTalentProfile(r) {
    // spec §9.7 / §15.2 — contact 不返回
    return {
        id: r.id,
        nickname: r.nickname,
        expected_role: r.expected_role,
        work_experience: r.work_experience,
        skill_tags: r.skill_tags || [],
        resume_url: r.resume_url,
        bio: r.bio,
        expected_salary: r.expected_salary,
        expected_city: r.expected_city,
        status: r.status,
    };
}

function normalizeUserProfile(r) {
    return {
        id: r.id,
        email: r.email,
        nickname: r.nickname,
        avatar: r.avatar,
        city: r.city,
        bio: r.bio,
        skill_tags: r.skill_tags || [],
        resume_url: r.resume_url,
        social_links: r.social_links || {},
        login_method: r.login_method,
        wallet_address: r.wallet_address,
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
export async function listJobPostingsNormalized(qs) {
    const { items } = await listJobPostings(qs);
    return items.map(normalizeJobPosting);
}
export async function listTalentProfilesNormalized(qs) {
    const { items } = await listTalentProfiles(qs);
    return items.map(normalizeTalentProfile);
}
export async function getUserProfileNormalized(id) {
    const r = await getUserProfile(id);
    return normalizeUserProfile(r);
}
export async function getUserProfileByUserIdNormalized(userId) {
    const r = await findUserProfileByUserId(userId);
    return r ? normalizeUserProfile(r) : null;
}

// ---- 7. 调试用 ----
export const pb = { url: PB_URL };

export default {
    // catalog
    aiRoute, listCourses, listEvents, listHackathons, listJobs, listApps, listProviders,
    getCourse, getEvent, getHackathon, getJob, getApp, getProvider,
    listJobPostings, getJobPosting, listTalentProfiles, getTalentProfile,
    // user profile
    getUserProfile, findUserProfileByUserId, updateUserProfileByUserId, updateUserProfile, listUserProfiles, getUserProfileNormalized,
    // auth
    requestEmailCode, verifyEmailCode,
    getWechatAuthUrl, wechatCallbackStub,
    getWalletNonce, verifyWallet,
    setUserSession, clearUserSession, getUserToken, getUserRecord, logout,
    // writes
    createOrder, verifyOrder, resendAdvisorCode,
    createIntent, contactIntent, closeIntent,
    createSignup, reviewSignup,
    createLead,
    myOrders, myIntents, mySignups, myLeads,
    // normalizers
    listCoursesNormalized, listEventsNormalized, listHackathonsNormalized,
    listJobsNormalized, listJobPostingsNormalized, listTalentProfilesNormalized,
    getUserProfileByUserIdNormalized,
    pb, getSuperuserToken,
};
