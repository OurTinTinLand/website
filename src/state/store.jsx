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

const nowStamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

const emptyProfile = () => ({
  name: '', phone: '', city: '', github: '', bio: '', resume_url: '',
  skill_tags: [],
  social_links: { github: '', x: '', telegram: '', linkedin: '' },
});

export function StoreProvider({ children }) {
  const [session,     setSession]     = useState(() => loadState('session', { logged: false, is_admin: false, method: '', user_id: '', email: '', profile: emptyProfile() }));
  const [orders,      setOrders]      = useState(() => loadState('orders', seedOrders));
  const [intents,     setIntents]     = useState(() => loadState('intents', seedIntents));
  const [mySignups,   setMySignups]   = useState(() => loadState('mySignups', []));
  const [orderSeq,    setOrderSeq]    = useState(() => loadState('orderSeq', seedOrderSeq));
  const [reviewQueue, setReviewQueue] = useState(() => loadState('reviewQueue', seedReviewQueue));
  const [thTabReq,    setThTabReq]    = useState(null);

  // Catalog 懒加载（PB 优先，失败降级到 seed）
  const [catalog, reloadCatalog] = useCatalog();

  // PB 启动时尝试恢复 session
  useEffect(() => {
    const restored = PB.loadUserSession();
    if (restored && restored.record) {
      const r = restored.record;
      setSession((s) => ({
        ...s,
        logged: true,
        method: '邮箱验证码',
        email: r.email || '',
        user_id: r.id,
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
    setSession({
      logged: true, is_admin: false, method: '邮箱验证码',
      email: r.email || email, user_id: r.id,
      profile: emptyProfile(),
    });
    return data;
  }, []);

  // GitHub OAuth UI 占位（spec §6.2 P1）：
  // 本周未接 OAuth，不走后端、不写 PB。调用方传入什么就是什么。
  // 安全注意：纯前端伪造 session，不要给"管理员"权限。生产必须换成真 OAuth 回调。
  const loginGithubMock = useCallback((email, ghLogin) => {
    if (!email || !ghLogin) return { ok: false, error: '缺少 email 或 ghLogin' };
    const id = 'u-gh-' + (ghLogin || email.split('@')[0]);
    setSession({
      logged: true, is_admin: false, method: 'GitHub (mock)',
      email, user_id: id,
      profile: { ...emptyProfile(), github: 'github.com/' + ghLogin },
    });
    return { ok: true, mock: true };
  }, []);

  const loginWallet = useCallback(async (address, signature, nonce) => {
    const data = await PB.verifyWallet(address, signature, nonce);
    const r = data.record || {};
    setSession({
      logged: true, is_admin: false, method: 'Web3 钱包',
      email: r.email || '', user_id: r.id,
      profile: { ...emptyProfile(), wallet_address: address },
    });
    return data;
  }, []);

  // Privy 桥接（spec §6.4）—— 接收后端 /api/auth/privy-bridge 返回值，写入 session
  // payload 形如 { ok, token, record, login_method, subject, strict, email, method, ... }
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
    setSession({
      logged: true,
      is_admin: false,
      method: methodLabel,
      email: r.email || (payload.email || ''),
      user_id: r.id,
      // 把 Privy subject（DID 或钱包地址） 留给 profile；
      // wallet_login 的 subject 是 address；OAuth / email 则不写 wallet_address
      profile: method === 'wallet'
        ? { ...emptyProfile(), wallet_address: payload.subject || '' }
        : emptyProfile(),
      // 内部小标记：哪些 method 走过（方便后续风控 / 招聘板块判断）
      privy: { subject: payload.subject || '', strict: !!payload.strict, method },
    });
    return payload;
  }, []);

  const logout = useCallback(() => {
    PB.logout();
    setSession({ logged: false, is_admin: false, method: '', user_id: '', email: '', profile: emptyProfile() });
    setMySignups([]);
  }, []);

  const demoAdmin = useCallback(() => {
    setSession((s) => ({
      ...s, logged: true, is_admin: true,
      method:  s.method  || '邮箱验证码',
      email:   s.email   || 'ops@tintinland.com',
      user_id: s.user_id || 'u-ops',
    }));
  }, []);

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
    loginEmailOtp, loginGithubMock, loginWallet, loginPrivyBridge, logout, demoAdmin, saveProfile,
    // mutations
    addOrder, verifyOrder, resendAdvisorCode,
    addIntent, contactIntent, closeIntent, addSignup,
    reviewSubmission, addReviewItem,
    setThTabReq, resetAll,
    reloadCatalog,
    // PB 原始 client（运营后台调用 listJobPostings 等高级操作）
    pb: PB,
  }), [session, orders, intents, mySignups, orderSeq, reviewQueue, thTabReq, catalog,
      loginEmailOtp, loginGithubMock, loginWallet, logout, demoAdmin, saveProfile,
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
