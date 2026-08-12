// 顶部导航：路由高亮 + 登录态切换 + syncAuth 行为
import React from 'react';
import { useRoute } from '../utils/router';
import { useStore, useToast } from '../state/store';

const NAV = [
  ['home','首页'], ['courses','课程'], ['events','活动'], ['hackathons','黑客松'],
  ['jobs','招聘'], ['tokenhub','Token Hub'], ['apps','应用工具'],
  ['enterprise','企业服务'], ['about','关于我们'],
];

export function TopNav({ openLogin, onAdminGate }) {
  const { page, go } = useRoute();
  const { session } = useStore();
  const toast = useToast();

  const onAuthClick = () => {
    if (session.logged) go('member');
    else openLogin(null);
  };

  return (
    <div className="topnav">
      <div className="container nav-inner">
        <div className="brand" onClick={() => go('home')}>
          <img src="assets-claude/brand/logo-h-dark.png" alt="TinTin" />
          <span className="bname">Land</span>
        </div>
        <div className="navlinks">
          {NAV.map(([p, label]) => (
            <button key={p} className={page === p ? 'active' : ''} onClick={() => go(p)}>{label}</button>
          ))}
        </div>
        <div className="nav-right">
          <button className="lang" onClick={() => toast.show('语言切换为原型占位，V1.1 接 i18n')}>中 / EN</button>
          <button className="btn btn-outline btn-sm" onClick={() => go('admin')}>运营后台</button>
          {session.logged ? (
            <button className="btn btn-ink btn-sm" onClick={onAuthClick}>{session.is_admin ? '个人中心 · 运营' : '个人中心'}</button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={onAuthClick}>登录</button>
          )}
        </div>
      </div>
    </div>
  );
}