// 全局 Store：Context + useState。所有 mutator 走 setState(prev => ...)。
// 同时承载 Toast（useToast）——避免再起一个 Provider。
// 持久化：session / orders / intents / mySignups / orderSeq / reviewQueue 写入 localStorage，
// 刷新后自动恢复。thTabReq 是 UI 跳转信号，不持久化。
// spec v1.1 调整：
// - §8.3 顾问码改为下单即发（PayModal 创建订单时直接 advisor_code_sent=true）
// - §14.4 新增 reviewQueue（报名/投递审核）
// - §14.5 新增 resendAdvisorCode mutator
// - §14.2 reviewSubmission 批量审核
import React, { useState, useEffect, useCallback, useMemo, useContext, createContext } from 'react';
import {
  seedSession, seedOrders, seedIntents, seedOrderSeq, seedReviewQueue,
} from './seed.js';
import { loadState, saveState, clearState } from './persist.js';

const StoreCtx = createContext(null);
const ToastCtx = createContext(null);

const nowStamp = () => {
  const d = new Date('2026-08-12T12:00:00');
  return d.toISOString().slice(0, 19).replace('T', ' ');
};

export function StoreProvider({ children }) {
  const [session,     setSession]     = useState(() => loadState('session',     seedSession));
  const [orders,      setOrders]      = useState(() => loadState('orders',      seedOrders));
  const [intents,     setIntents]     = useState(() => loadState('intents',     seedIntents));
  const [mySignups,   setMySignups]   = useState(() => loadState('mySignups',   []));
  const [orderSeq,    setOrderSeq]    = useState(() => loadState('orderSeq',    seedOrderSeq));
  const [reviewQueue, setReviewQueue] = useState(() => loadState('reviewQueue', seedReviewQueue));
  const [thTabReq,    setThTabReq]    = useState(null);

  useEffect(() => { saveState('session',     session);     }, [session]);
  useEffect(() => { saveState('orders',      orders);      }, [orders]);
  useEffect(() => { saveState('intents',     intents);     }, [intents]);
  useEffect(() => { saveState('mySignups',   mySignups);   }, [mySignups]);
  useEffect(() => { saveState('orderSeq',    orderSeq);    }, [orderSeq]);
  useEffect(() => { saveState('reviewQueue', reviewQueue); }, [reviewQueue]);

  // —— mutators ——
  const login = useCallback((method, email, extras) => {
    const id = 'u-' + (email || 'demo').split('@')[0];
    setSession((s) => ({
      ...s, logged: true, method, email, user_id: id,
      // GitHub 登录时回填主页
      ...(extras && extras.profile ? { profile: { ...s.profile, ...extras.profile } } : null),
    }));
  }, []);

  const logout = useCallback(() => {
    setSession({
      logged:false, is_admin:false, method:'', user_id:'', email:'',
      profile: { name:'', phone:'', city:'', github:'', bio:'', resume_url:'',
                 skill_tags:[], social_links:{ github:'', x:'', telegram:'', linkedin:'' } },
    });
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
      // 合并 social_links（避免整对象被覆盖）
      if (p.social_links) next.social_links = { ...(s.profile.social_links || {}), ...p.social_links };
      return { ...s, profile: next };
    });
  }, []);

  // spec §8.3：下单即发码，所以 markPaid 默认 advisor_code_sent=true
  const addOrder = useCallback((o) => {
    const stamped = {
      ...o,
      advisor_code_sent: o.advisor_code_sent !== false,
      advisor_code_sent_at: o.advisor_code_sent_at || nowStamp(),
      resend_count: o.resend_count || 0,
      last_resend_at: o.last_resend_at || '',
    };
    setOrders((prev) => [stamped, ...prev]);
    setOrderSeq((n) => n + 1);
  }, []);

  const verifyOrder = useCallback((id) => {
    // §8.3 核实到账只更新状态，不再触发发码（已在前置环节发放）
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: 'verified' } : o));
  }, []);

  // §14.5 手动补发：防止联系码自动发送失败
  const resendAdvisorCode = useCallback((id) => {
    setOrders((prev) => prev.map((o) => o.id === id ? {
      ...o,
      advisor_code_sent: true,
      advisor_code_sent_at: nowStamp(),
      resend_count: (o.resend_count || 0) + 1,
      last_resend_at: nowStamp(),
    } : o));
  }, []);

  const addIntent = useCallback((i) => { setIntents((prev) => [i, ...prev]); }, []);
  const contactIntent = useCallback((id) => {
    setIntents((prev) => prev.map((i) => i.id === id ? { ...i, status: 'contacted' } : i));
  }, []);
  const closeIntent = useCallback((id) => {
    setIntents((prev) => prev.map((i) => i.id === id ? { ...i, status: 'closed' } : i));
  }, []);

  // 报名记录：把 kind + item_id 写入行动轨迹
  const addSignup = useCallback((s) => {
    setMySignups((prev) => [s, ...prev]);
  }, []);

  // §14.4 报名/投递审核
  const reviewSubmission = useCallback((ids, status) => {
    setReviewQueue((prev) => prev.map((r) => ids.includes(r.id) ? { ...r, review_status: status } : r));
  }, []);

  const addReviewItem = useCallback((item) => {
    setReviewQueue((prev) => [item, ...prev]);
  }, []);

  const resetAll = useCallback(() => {
    ['session','orders','intents','mySignups','orderSeq','reviewQueue'].forEach(clearState);
    setSession(seedSession);
    setOrders(seedOrders);
    setIntents(seedIntents);
    setMySignups([]);
    setOrderSeq(seedOrderSeq);
    setReviewQueue(seedReviewQueue);
  }, []);

  const value = useMemo(() => ({
    session, orders, intents, mySignups, orderSeq, reviewQueue, thTabReq,
    login, logout, demoAdmin, saveProfile,
    addOrder, verifyOrder, resendAdvisorCode,
    addIntent, contactIntent, closeIntent, addSignup,
    reviewSubmission, addReviewItem,
    setThTabReq, resetAll,
  }), [session, orders, intents, mySignups, orderSeq, reviewQueue, thTabReq]);

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
      <React.Fragment>
        {children}
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 34, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 120, pointerEvents: 'none' }}>
          {toasts.map((t) => <div key={t.id} className="toast on">{t.msg}</div>)}
        </div>
      </React.Fragment>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
