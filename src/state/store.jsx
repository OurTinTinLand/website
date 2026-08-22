// 全局 Store：Context + useState。
// V1.1 调整（接 PB 后端）：
//   - session / auth：通过 pb-client.js 走真实 email-OTP / wallet 登录
//   - mutations：走真实 PB API（createOrder/createIntent/createSignup）；
//     同时本地维护一份"展示用的乐观状态"，让 UI 不被网络阻塞
//   - reviewQueue / orderSeq / intents 仍用本地 seed 做运营后台演示
//   - session 持久化：PB token 由 pb-client.js 自己管 localStorage
// spec 引用：
//   - §6 真实登录 · §7 板块业务 · §8.3 下单即发码 · §14 运营后台
import React, { useState, useEffect, useCallback, useMemo, useContext, createContext } from 'react';
import {
  seedOrders, seedIntents, seedOrderSeq, seedReviewQueue,
} from './seed.js';
import { loadState, saveState, clearState } from './persist.js';
import * as PB from '../utils/pb-client.js';
import { useCatalog } from './catalog.js';

const StoreCtx = createContext(null);
const ToastCtx = createContext(null);

// ===== spec §14.6 · role 模型 =====
// 5 个角色（与 backend/pb_migrations/1755000060_add_role_to_user_profiles.js 对齐）：
//
//   super_admin         全部权限（PB _superusers 自动映射）
//   content_ops         内容管理 + 首页运营位（Tab ① + ②）
//   reviewer            报名/投递审核 + 用户档案查询（Tab ③ + ⑤）
//   customer_support    订单核销 + 用户历史行为（Tab ④ + ⑤）
//   member              注册用户；个人中心 / 我的报名 / 我的订单
export const ROLES = ['member', 'content_ops', 'reviewer', 'customer_support', 'super_admin'];
const OPS_ROLES = ['super_admin', 'content_ops', 'reviewer', 'customer_support'];
const ROLE_LABELS = {
  super_admin: '超级管理员',
  content_ops: '内容运营',
  reviewer: '审核员',
  customer_support: '客服',
  member: '注册用户',
};

export function isOpsRole(role) {
  return OPS_ROLES.indexOf(role) !== -1;
}
export function canAccessAdmin(session) {
  return !!(session && session.logged && isOpsRole(session.role));
}
// 把 role ∈ {admin tabs} → 决定 Tab 是否可见（spec §14.6 角色 → Tab 映射）
export function canSeeAdminTab(tabKey, session) {
  if (!canAccessAdmin(session)) return false;
  const role = session.role;
  if (role === 'super_admin') return true;
  // Tab ① 内容 / ② 首页运营位 = content_ops
  if (tabKey === 'content' || tabKey === 'homeops') return role === 'content_ops';
  // Tab ③ 审核 / ⑤ 用户权限 = reviewer
  if (tabKey === 'review' || tabKey === 'users') return role === 'reviewer' || role === 'super_admin';
  // Tab ④ 订单核销 = customer_support
  if (tabKey === 'orders') return role === 'customer_support';
  // Tab ⑥ 通知 = content_ops（运营团队公用）
  if (tabKey === 'notify') return role === 'content_ops';
  return false;
}

const nowStamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

const emptyProfile = () => ({
  name: '', phone: '', city: '', github: '', bio: '', resume_url: '',
  skill_tags: [],
  social_links: { github: '', x: '', telegram: '', linkedin: '' },
});

export function StoreProvider({ children }) {
  const [session,     setSession]     = useState(() => loadState('session', { logged: false, role: 'member', is_admin: false, method: '', user_id: '', email: '', profile: emptyProfile() }));
  const [orders,      setOrders]      = useState(() => loadState('orders', seedOrders));
  const [intents,     setIntents]     = useState(() => loadState('intents', seedIntents));
  const [mySignups,   setMySignups]   = useState(() => loadState('mySignups', []));
  const [orderSeq,    setOrderSeq]    = useState(() => loadState('orderSeq', seedOrderSeq));
  const [reviewQueue, setReviewQueue] = useState(() => loadState('reviewQueue', seedReviewQueue));
  const [thTabReq,    setThTabReq]    = useState(null);

  // Catalog 懒加载（PB 优先，失败降级到 seed）
  const [catalog, reloadCatalog] = useCatalog();

  // PB 启动时尝试恢复 session（reload 后会再调 /api/auth/privy-bridge 更新 role）
  useEffect(() => {
    const restored = PB.loadUserSession();
    if (restored && restored.record) {
      const r = restored.record;
      setSession((s) => ({
        ...s,
        logged: true,
        method: s.method || '邮箱验证码',
        email: r.email || '',
        user_id: r.id,
        // role 在首次 mount 后会被 AuthPage/RouteGuard 的 useEffect 异步刷；
        // 这里先保持本地（如果用户已经登录过一次，role 是已写好的）
        role: s.role && s.role !== 'member' ? s.role : (s.role || 'member'),
      }));
    }
  }, []);

  useEffect(() => { saveState('session',     session);     }, [session]);
  useEffect(() => { saveState('orders',      orders);      }, [orders]);
  useEffect(() => { saveState('intents',     intents);     }, [intents]);
  useEffect(() => { saveState('mySignups',   mySignups);   }, [mySignups]);
  useEffect(() => { saveState('orderSeq',    orderSeq);    }, [orderSeq]);
  useEffect(() => { saveState('reviewQueue', reviewQueue); }, [reviewQueue]);

  // —— Auth（spec §6）——
  // 返回 Promise；UI 用 await + toast 提示错误
  const loginEmailOtp = useCallback(async (email, code) => {
    const data = await PB.verifyEmailCode(email, code);
    const r = data.record || {};
    // 后端 verifyEmailCode 当前没回 role；以默认 'member' 写入，
    // 运营角色由 admin 在后台 user_profiles 表里手动设。
    setSession({
      logged: true,
      is_admin: false,
      role: 'member',
      method: '邮箱验证码',
      email: r.email || email, user_id: r.id,
      profile: emptyProfile(),
    });
    return data;
  }, []);

// GitHub（mock）已删除：v1.2 起所有 OAuth 都走 Privy，不再有 demo GitHub 登录

  const loginWallet = useCallback(async (address, signature, nonce) => {
    const data = await PB.verifyWallet(address, signature, nonce);
    const r = data.record || {};
    setSession({
      logged: true, is_admin: false, role: 'member',
      method: 'Web3 钱包',
      email: r.email || '', user_id: r.id,
      profile: { ...emptyProfile(), wallet_address: address },
    });
    return data;
  }, []);

  // Privy 桥接（spec §6.4 + §14.6）—— 接收后端 /api/auth/privy-bridge 返回值，写入 session
  // payload 形如 { ok, token, record, login_method, subject, strict, role, email, method, ... }
  const loginPrivyBridge = useCallback(async (payload) => {
    if (!payload || !payload.token || !payload.record) {
      throw new Error('Privy 桥接响应缺少 token/record');
    }
    const r = payload.record || {};
    const method = payload.login_method || payload.method || 'privy';
    const labelByMethod = {
      google:'Google', x:'X (Twitter)', twitter:'Twitter', github:'GitHub', discord:'Discord',
      apple:'Apple', wallet:'Web3 钱包', email:'邮箱验证码', sms:'短信', privy:'Privy',
    };
    const methodLabel = labelByMethod[method] || 'Privy';
    // 角色（spec §14.6）：server 解析后塞进来；缺省 member。
    // 向后兼容：v1.2 之前的 DB 里有人手动写过 role='admin'（PB schema 当时还没 select 约束），
    // 那种记录现在仍可能在 PB 里被返回。前端当作 'super_admin' 处理就行 —— DB 侧
    // 建议在后台 UI 里改回 'super_admin'，但前端不能因为字符串不匹配就降级到 'member'
    // 把运营挡在门外。
    const ALIAS = { admin: 'super_admin' };
    const rawRole = payload.role || '';
    const aliased = ALIAS[rawRole] || rawRole;
    const role = (aliased && ROLES.indexOf(aliased) !== -1) ? aliased : 'member';
    const nextSession = {
      logged: true,
      // 旧字段保留（前端其它地方可能仍读 is_admin）；
      // 新代码应该读 role 与 canAccessAdmin(session)。
      is_admin: isOpsRole(role),
      role: role,
      method: methodLabel,
      email: r.email || (payload.email || ''),
      user_id: r.id,
      // 把 Privy subject（DID 或钱包地址） 留给 profile；
      // wallet_login 的 subject 是 address；OAuth / email 则不写 wallet_address
      profile: method === 'wallet'
        ? { ...emptyProfile(), wallet_address: payload.subject || '' }
        : emptyProfile(),
      // 内部小标记：哪些 method 走过（方便后续风控 / 招聘板块判断）
      privy: { subject: payload.subject || '', strict: !!payload.strict, method, role },
    };
    setSession(nextSession);
    // 同步把新 session 写到 localStorage。saveState 自带 500ms debounce，
    // 调用方（PrivyNativeLauncher）会再 flushState 一次。这里先 saveState 是
    // 为了兜住"调用方忘了 flush"的场景（LoginModal 的几条老路径），以及
    // 让"组件卸载前 + reload"之间多一次保险。
    try {
      saveState('session', nextSession);
    } catch (_) {}
    return payload;
  }, []);

  const logout = useCallback(() => {
    PB.logout();
    setSession({ logged: false, is_admin: false, role: 'member', method: '', user_id: '', email: '', profile: emptyProfile() });
    setMySignups([]);
  }, []);

// demoAdmin() 删除 — v1.2 前端的运营身份必须走后端 role 解析；
// 没有 PB _superusers / user_profiles.role，就不显示 admin 内容。

  const saveProfile = useCallback((p) => {
    setSession((s) => {
      const next = { ...s.profile, ...p };
      if (p.social_links) next.social_links = { ...(s.profile.social_links || {}), ...p.social_links };
      return { ...s, profile: next };
    });
    // 异步同步到后端 user_profiles（登录后才生效）
    if (session.user_id) {
      PB.findUserProfileByUserId(session.user_id).then((profile) => {
        if (!profile) return;
        return PB.updateUserProfile(profile.id, p);
      }).catch(() => {});
    }
  }, [session.user_id]);

  // —— 业务写入（spec §7 / §8.3）——
  // addOrder：先本地 stamp（UI 即时反馈），再异步 POST PB；
  //          PB 失败时本地状态保留 + toast 错误
  const addOrder = useCallback(async (o) => {
    const stamped = {
      ...o,
      advisor_code_sent: true,
      advisor_code_sent_at: nowStamp(),
      resend_count: 0,
      last_resend_at: '',
      _synced: false,
    };
    setOrders((prev) => [stamped, ...prev]);
    setOrderSeq((n) => n + 1);

    try {
      const r = await PB.createOrder({
        user: session.user_id || undefined,
        user_email: session.email || o.user_email,
        item_type: o.item_type, item_id: o.item_id, item_title: o.item_title,
        amount: o.amount, is_deposit: !!o.is_deposit,
        channel: o.channel || 'icbc_qr',
        status: 'pending_review',
      });
      // 用 PB 返回的真实 id 替换本地占位 id
      setOrders((prev) => prev.map((x) => x.id === o.id ? { ...x, id: r.id, _synced: true } : x));
      return { ok: true, id: r.id };
    } catch (err) {
      console.warn('[order] PB create failed, kept local:', err.message);
      return { ok: false, error: err, keptLocal: true };
    }
  }, [session.user_id, session.email]);

  const verifyOrder = useCallback(async (id) => {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: 'verified' } : o));
    try { await PB.verifyOrder(id); } catch (err) { console.warn('[order.verify] PB failed:', err.message); }
  }, []);

  const resendAdvisorCode = useCallback(async (id) => {
    setOrders((prev) => prev.map((o) => o.id === id ? {
      ...o,
      advisor_code_sent: true,
      advisor_code_sent_at: nowStamp(),
      resend_count: (o.resend_count || 0) + 1,
      last_resend_at: nowStamp(),
    } : o));
    try { await PB.resendAdvisorCode(id); } catch (err) { console.warn('[order.resend] PB failed:', err.message); }
  }, []);

  const addIntent = useCallback(async (i) => {
    setIntents((prev) => [i, ...prev]);
    try {
      const r = await PB.createIntent({
        user: session.user_id || undefined,
        user_email: session.email || i.user_email,
        provider: i.provider, expected_volume: i.expected_volume,
        contact: i.contact, scene: i.scene, status: 'pending',
      });
      setIntents((prev) => prev.map((x) => x.id === i.id ? { ...x, id: r.id, _synced: true } : x));
      return { ok: true, id: r.id };
    } catch (err) {
      console.warn('[intent] PB create failed:', err.message);
      return { ok: false, error: err, keptLocal: true };
    }
  }, [session.user_id, session.email]);

  const contactIntent = useCallback(async (id) => {
    setIntents((prev) => prev.map((i) => i.id === id ? { ...i, status: 'contacted' } : i));
    try { await PB.contactIntent(id); } catch (err) { console.warn('[intent.contact] PB failed:', err.message); }
  }, []);

  const closeIntent = useCallback(async (id) => {
    setIntents((prev) => prev.map((i) => i.id === id ? { ...i, status: 'closed' } : i));
    try { await PB.closeIntent(id); } catch (err) { console.warn('[intent.close] PB failed:', err.message); }
  }, []);

  const addSignup = useCallback(async (s) => {
    setMySignups((prev) => [s, ...prev]);
    try {
      const r = await PB.createSignup({
        user: session.user_id || undefined,
        user_email: session.email || '',
        kind: s.kind, item_id: s.item_id, item_title: s.title,
        fields: s.fields || {},
        review_status: 'pending',
        submitted_at: s.time,
      });
      setMySignups((prev) => prev.map((x) => x === s ? { ...x, id: r.id, _synced: true } : x));
      return { ok: true, id: r.id };
    } catch (err) {
      console.warn('[signup] PB create failed:', err.message);
      return { ok: false, error: err, keptLocal: true };
    }
  }, [session.user_id, session.email]);

  // 报名审核（spec §14.4）
  const reviewSubmission = useCallback(async (ids, status) => {
    setReviewQueue((prev) => prev.map((r) => ids.includes(r.id) ? { ...r, review_status: status } : r));
    await Promise.all(ids.map((id) => PB.reviewSubmission(id, status).catch((e) => console.warn('[review]', id, e.message))));
  }, []);

  const addReviewItem = useCallback((item) => {
    setReviewQueue((prev) => [item, ...prev]);
  }, []);

  const resetAll = useCallback(() => {
    ['session','orders','intents','mySignups','orderSeq','reviewQueue'].forEach(clearState);
    PB.logout();
    setSession({ logged: false, is_admin: false, method: '', user_id: '', email: '', profile: emptyProfile() });
    setOrders(seedOrders);
    setIntents(seedIntents);
    setMySignups([]);
    setOrderSeq(seedOrderSeq);
    setReviewQueue(seedReviewQueue);
  }, []);

  const value = useMemo(() => ({
    session, orders, intents, mySignups, orderSeq, reviewQueue, thTabReq,
    catalog,
    // auth
    loginEmailOtp, loginWallet, loginPrivyBridge, logout, saveProfile,
    // role helpers（spec §14.6）
    canAccessAdmin, canSeeAdminTab, isOpsRole, ROLES, ROLE_LABELS,
    // mutations
    addOrder, verifyOrder, resendAdvisorCode,
    addIntent, contactIntent, closeIntent, addSignup,
    reviewSubmission, addReviewItem,
    setThTabReq, resetAll,
    reloadCatalog,
    // PB 原始 client（运营后台调用 listJobPostings 等高级操作）
    pb: PB,
  }), [session, orders, intents, mySignups, orderSeq, reviewQueue, thTabReq, catalog,
      loginEmailOtp, loginWallet, logout, saveProfile,
      addOrder, verifyOrder, resendAdvisorCode, addIntent, contactIntent, closeIntent, addSignup,
      reviewSubmission, addReviewItem, resetAll]);

  return (
    <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
  );
}

export const useStore = () => useContext(StoreCtx);

// —— Toast ——
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2600);
  }, []);
  const value = useMemo(() => ({ show, toasts }), [show, toasts]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 34, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 120, pointerEvents: 'none' }}>
        {toasts.map((t) => <div key={t.id} className="toast on">{t.msg}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
