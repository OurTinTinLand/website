// Hash 路由：保留原型的 location.hash 语义
// useRoute() → { page, detailId, go }
import React, { useState, useEffect, useCallback, useMemo, useContext, createContext } from 'react';
import { PATH_ROUTE } from './constants';

const RouteCtx = createContext(null);

// 已知路由前缀集合：hash 第一段是这些时算合法，其余一律进 404
const KNOWN_TOP = new Set([
  '/', '/courses', '/events', '/hackathons', '/jobs', '/tokenhub', '/token-hub',
  '/apps', '/enterprise', '/about', '/member', '/admin',
  '/auth/login', '/auth/callback',
]);

function parseHash() {
  const h = (location.hash || '#/').slice(1);
  const seg = h.split('/').filter(Boolean);
  if (!seg.length) return { page: 'home', detailId: null };
  const base = '/' + seg[0];
  if (!KNOWN_TOP.has(base)) return { page: 'notFound', detailId: null };
  const page = PATH_ROUTE[base] || 'home';
  return { page, detailId: seg[1] || null };
}

export function Router({ children }) {
  const [route, setRoute] = useState(parseHash);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = useCallback((path, skipHash) => {
    const norm = String(path || 'home').replace(/^\/+/, '');
    if (!skipHash) location.hash = '#/' + norm;
    else setRoute(parseHash());
  }, []);

  const value = useMemo(() => ({ ...route, go }), [route.page, route.detailId, go]);
  return <RouteCtx.Provider value={value}>{children}</RouteCtx.Provider>;
}

export const useRoute = () => useContext(RouteCtx);