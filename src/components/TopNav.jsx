// 顶部导航：路由高亮 + 登录态切换 + 移动端汉堡菜单
import React, { useState, useEffect } from 'react';
import { useRoute } from '../utils/router';
import { useStore, useToast } from '../state/store';

// v1.2 角色展示（spec §14.6）
// ROLE_SHORT 用在 Nav 上（窄按钮内显示全称太长）
const ROLE_SHORT = {
  super_admin: '超管',
  content_ops: '运营',
  reviewer: '审核',
  customer_support: '客服',
  member: '用户',
};



const NAV = [
  ['home','首页'], ['courses','课程'], ['events','活动'], ['hackathons','黑客松'],
  ['jobs','招聘'], ['tokenhub','Token Hub'], ['apps','应用工具'],
  ['enterprise','企业服务'], ['about','关于'],
];

export function TopNav({ openLogin }) {
  const { page, go } = useRoute();
  const { session, canAccessAdmin } = useStore();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [page]);

  const onAuthClick = () => {
    // 统一入口：openLogin dispatch 'app:openPrivyNative'，PrivyNativeLauncher 直接弹 Privy 原生 modal
    if (session.logged) { go('member'); return; }
    openLogin(null);
  };

  return (
    <div className="nav">
      <div className="wrap nav-in">
        <div className="logo" onClick={() => go('home')}>
          <img src="assets-claude/brand/logo-lockup.png" alt="TinTin" />
        </div>
        <div className={'nav-links' + (menuOpen ? ' open' : '')} id="navlinks">
          {NAV.map(([p, label]) => (
            <button
              key={p}
              data-p={p}
              className={page === p ? 'on' : ''}
              onClick={() => go(p)}
            >{label}</button>
          ))}
        </div>
        <div className="nav-r">
          <button className="btn btn-line btn-sm lang" onClick={() => toast.show('i18n 留到 V1.1')}>EN</button>
          {canAccessAdmin(session) && (
            <button className="btn btn-line btn-sm" id="navAdmin" onClick={() => go('admin')}>运营后台</button>
          )}
          <button className="btn btn-fill btn-sm" id="navAuth" onClick={onAuthClick}>
            {session.logged
              ? (canAccessAdmin(session) ? `我的 · ${ROLE_SHORT[session.role] || '运营'}` : '我的')
              : '登录'}
          </button>
          <button className="navtoggle" onClick={() => setMenuOpen((v) => !v)} aria-label={menuOpen ? '关闭菜单' : '打开菜单'}>
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
