// =============================================================================
// 前端 PocketBase SDK 入口（薄 shim）
// =============================================================================
//
// 历史：
//   * 老版本是一个 ~475 行的 fetch 封装，自己管 token、自己实现 normalize。
//   * 现在改用官方 pocketbase js-sdk（npm install pocketbase），所有逻辑
//     收敛到 src/lib/pb-sdk.mjs；本文件只剩一个 re-export shim，保持旧 import
//     路径 (`from '../utils/pb-client.js'`) 不破坏现有 store/catalog/AdminPage。
//
// 浏览器侧：
//   - esbuild 会把 src/lib/pb-sdk.mjs + pocketbase npm 包一起打进 dist/bundle.js
//   - 默认走同源 fetch（PB --publicDir 托管），不依赖 window.PB_URL
//
// CLI 侧：
//   - 同一个 src/lib/pb-sdk.mjs 直接被 scripts/*.mjs 用 ESM import
//   - 配 config.admin.email/password 走 superuser 直连
//
// 用法（前端，保持不变）：
//   import * as PB from '../utils/pb-client.js';
//   await PB.requestEmailCode(email);
//   await PB.listCoursesNormalized({ state: 'upcoming' });
//
import { createPbClient, getDefaultClient, PbError, asPbError } from '../lib/pb-sdk.mjs';

// 单例：lazy 初始化，与原 store 用法对齐
let _client = null;
function client() {
    if (!_client) {
        _client = createPbClient({
            // 浏览器侧：取 window.PB_ADMIN_DEMO_SECRET（pb_hooks/inject_secrets.pb.js 注入）
            // CLI 侧：createClient() 会传 admin.email/password
            adminDemoSecret:
                (typeof window !== 'undefined' && window.PB_ADMIN_DEMO_SECRET) || '',
        });
    }
    return _client;
}

// 把 SDK 的方法 / 属性平铺导出，旧代码 `PB.<x>` 完全不感知。
// 用 Proxy 转发，最稳。
export const pb = new Proxy({}, {
    get(_t, prop) {
        if (prop === Symbol.toPrimitive || prop === 'toJSON') return undefined;
        const c = client();
        const v = c[prop];
        return typeof v === 'function' ? v.bind(c) : v;
    },
    has(_t, prop) { return prop in client(); },
});

// 兼容：默认导出（部分旧代码可能用 default import）
const _default = pb;
export default _default;

// 错误类型别名（保持旧 API）
export { PbError, asPbError };

// 显式 re-export：让 `import { xxx } from '../utils/pb-client.js'` 也通
export const {
    // session
    getUserToken, getUserRecord, isLoggedIn, logout, loadUserSession,
    // auth
    requestEmailCode, verifyEmailCode,
    getWechatAuthUrl, wechatCallbackStub,
    getWalletNonce, verifyWallet,
    // privy bridge (spec §6.4)
    requestPrivyBridge,
    // admin
    getSuperuserToken, getDemoAdminToken, clearAdminToken, withAdminToken,
    // ai
    aiRoute,
    // catalog raw
    listCourses, listEvents, listHackathons, listJobs, listApps, listProviders,
    getCourse, getEvent, getHackathon, getJob, getApp, getProvider,
    // hiring
    listJobPostings, getJobPosting, listTalentProfiles, getTalentProfile,
    // user profile
    getUserProfile, findUserProfileByUserId,
    updateUserProfile, updateUserProfileByUserId,
    listUserProfiles,
    // writes
    createOrder, verifyOrder, resendAdvisorCode,
    createIntent, contactIntent, closeIntent,
    createSignup, reviewSignup, reviewSubmission, createLead,
    // generic CRUD
    createRecord, updateRecord, deleteRecord,
    // §15 admin 代理 CRUD
    adminCreateRecord, adminUpdateRecord, adminDeleteRecord,
    // convenience
    createCourse, updateCourse, deleteCourse,
    createEvent, updateEvent, deleteEvent,
    createHackathon, updateHackathon, deleteHackathon,
    createJob, updateJob, deleteJob,
    createApp, updateApp, deleteApp,
    createProvider, updateProvider, deleteProvider,
    // health
    healthCheck,
    // normalized
    listCoursesNormalized, listEventsNormalized, listHackathonsNormalized,
    listJobsNormalized, listAppsNormalized, listProvidersNormalized,
    listJobPostingsNormalized, listTalentProfilesNormalized,
    getUserProfileNormalized, getUserProfileByUserIdNormalized,
    // normalizer 单条
    normalizeCourse, normalizeEvent, normalizeHackathon, normalizeJob,
    normalizeApp, normalizeProvider, normalizeJobPosting, normalizeTalentProfile,
    normalizeUserProfile,
} = pb;

// 工厂（高级用法：想拿自己的 client 实例，可 createPbClient() 一下）
export { createPbClient, getDefaultClient };
