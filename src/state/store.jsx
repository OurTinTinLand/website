// 全局 Store：Context + useState。所有 mutator 走 setState(prev => ...)。
// 同时承载 Toast（useToast）——避免再起一个 Provider。
// 持久化：session / orders / intents / mySignups / orderSeq 写入 localStorage，
// 刷新后自动恢复。thTabReq 是 UI 跳转信号，不持久化。
import React, { useState, useEffect, useCallback, useMemo, useContext, createContext } from 'react';
import {
  seedSession, seedOrders, seedIntents, seedOrderSeq,
} from './seed.js';
import { loadState, saveState, clearState } from './persist.js';

const StoreCtx = createContext(null);
const ToastCtx = createContext(null);

export function StoreProvider({ children }) {
  const [session,   setSession]   = useState(() => loadState('session',   seedSession));
  const [orders,    setOrders]    = useState(() => loadState('orders',    seedOrders));
  const [intents,   setIntents]   = useState(() => loadState('intents',   seedIntents));
  const [mySignups, setMySignups] = useState(() => loadState('mySignups', []));
  const [orderSeq,  setOrderSeq]  = useState(() => loadState('orderSeq',  seedOrderSeq));
  const [thTabReq,  setThTabReq]  = useState(null);   // TokenHub tab 跳转请求（不持久化）

  // 写回 localStorage：每次 state 变化后同步一次
  useEffect(() => { saveState('session',   session);   }, [session]);
  useEffect(() => { saveState('orders',    orders);    }, [orders]);
  useEffect(() => { saveState('intents',   intents);   }, [intents]);
  useEffect(() => { saveState('mySignups', mySignups); }, [mySignups]);
  useEffect(() => { saveState('orderSeq',  orderSeq);  }, [orderSeq]);

  // —— mutators ——
  const login = useCallback((method, email) => {
    const id = 'u-' + (email || 'demo').split('@')[0];
    setSession((s) => ({ ...s, logged: true, method, email, user_id: id }));
  }, []);

  const logout = useCallback(() => {
    setSession({
      logged:false, is_admin:false, method:'', user_id:'', email:'',
      profile:{ name:'', phone:'', city:'', github:'' },
    });
    setMySignups([]);
    // 登录态清掉，订单/意向保留（用于演示）——生产环境应同时清掉
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
    setSession((s) => ({ ...s, profile: { ...s.profile, ...p } }));
  }, []);

  const addOrder = useCallback((o) => {
    setOrders((prev) => [o, ...prev]);
    setOrderSeq((n) => n + 1);
  }, []);

  const verifyOrder = useCallback((id) => {
    setOrders((prev) => prev.map((o) => o.id === id
      ? { ...o, status: 'verified', advisor_code_sent: true }
      : o));
  }, []);

  const addIntent = useCallback((i) => {
    setIntents((prev) => [i, ...prev]);
  }, []);

  const contactIntent = useCallback((id) => {
    setIntents((prev) => prev.map((i) => i.id === id ? { ...i, status: 'contacted' } : i));
  }, []);

  const closeIntent = useCallback((id) => {
    setIntents((prev) => prev.map((i) => i.id === id ? { ...i, status: 'closed' } : i));
  }, []);

  const addSignup = useCallback((s) => {
    setMySignups((prev) => [s, ...prev]);
  }, []);

  // 调试用：清空所有持久化数据（对应 spec §6"清除登录态"按钮）
  const resetAll = useCallback(() => {
    clearState('session');
    clearState('orders');
    clearState('intents');
    clearState('mySignups');
    clearState('orderSeq');
    setSession(seedSession);
    setOrders(seedOrders);
    setIntents(seedIntents);
    setMySignups([]);
    setOrderSeq(seedOrderSeq);
  }, []);

  const value = useMemo(() => ({
    session, orders, intents, mySignups, orderSeq, thTabReq,
    login, logout, demoAdmin, saveProfile,
    addOrder, verifyOrder, addIntent, contactIntent, closeIntent, addSignup,
    setThTabReq, resetAll,
  }), [session, orders, intents, mySignups, orderSeq, thTabReq]);

  return (
    <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
  );
}

export const useStore = () => useContext(StoreCtx);

// —— Toast —— 与原 toast(msg) 等价：自动 2.6s 后消失，瞬时全局可见
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((msg) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
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