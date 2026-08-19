// 顶层装配
import React, { useState } from 'react';
import { StoreProvider, ToastProvider, useStore } from './state/store';
import { Router, useRoute } from './utils/router';

import { TopNav } from './components/TopNav';
import { Footer } from './components/Footer';
import { Fab } from './components/Fab';

import { HomePage } from './pages/HomePage';
import { ListPage } from './pages/ListPage';
import { TokenHubPage } from './pages/TokenHubPage';
import { EnterprisePage } from './pages/EnterprisePage';
import { AboutPage } from './pages/AboutPage';
import { MemberPage } from './pages/MemberPage';
import { AdminPage } from './pages/AdminPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AuthLoginPage, AuthCallbackPage } from './pages/AuthPages';

// catalog 走 store（PB 加载），data/* 仅作 seed fallback
import { courses as seedCourses, events as seedEvents, hackathons as seedHackathons, jobs as seedJobs } from './data/index.js';

import { DetailModal } from './modals/DetailModal';
import { LoginModal } from './modals/LoginModal';
import { FormModal } from './modals/FormModal';
import { PayModal } from './modals/PayModal';

function Shell() {
  const { page, detailId, go } = useRoute();
  const { session, demoAdmin, catalog } = useStore();

  const [loginOpen,  setLoginOpen]  = useState(false);
  const [loginAfter, setLoginAfter] = useState(null);
  const [formDef,    setFormDef]    = useState(null);
  const [payCourseId, setPayCourseId] = useState(null);

  // 优先用 PB 加载的 catalog，降级到 seed
  const courses    = catalog?.courses    ?? seedCourses;
  const events     = catalog?.events     ?? seedEvents;
  const hackathons = catalog?.hackathons ?? seedHackathons;
  const jobs       = catalog?.jobs       ?? seedJobs;

  const openLogin  = (after) => { setLoginAfter(() => after || null); setLoginOpen(true); };
  const closeLogin = () => setLoginOpen(false);
  const openForm   = (kind, id, itemTitle) => setFormDef({ kind, id, itemTitle });
  const closeForm  = () => setFormDef(null);
  const openPay    = (courseId) => setPayCourseId(courseId);
  const closePay   = () => setPayCourseId(null);

  const handleSignup = (kind, id) => {
    const itemsByKind = { course: courses, event: events, hackathon: hackathons, job: jobs };
    const item = itemsByKind[kind] ? itemsByKind[kind].find((x) => x.id === id) : null;
    const itemTitle = item ? item.title : '—';
    if (!session.logged) { openLogin(() => handleSignup(kind, id)); return; }
    if (kind === 'course' && item && item.price.type === 'paid') {
      openPay(id);
    } else {
      openForm(kind, id, itemTitle);
    }
  };

  const handleApply = (kind, id, title) => {
    if (!session.logged) {
      openLogin(() => handleApply(kind, id, title));
      return;
    }
    openForm(kind, id, title);
  };

  const renderPage = () => {
    if (page === 'home') return <HomePage />;
    if (['courses','events','hackathons','jobs','apps'].includes(page)) {
      return (
        <ListPage
          kind={page}
          onOpen={(id) => go(`${page}/${id}`)}
          onApply={(kind, id, title) => handleApply(kind, id, title)}
          onConsult={(kind) => handleApply(kind)}
        />
      );
    }
    if (page === 'tokenhub')   return <TokenHubPage />;
    if (page === 'enterprise') return <EnterprisePage onApply={handleApply} onGoto={go} />;
    if (page === 'about')      return <AboutPage />;
    if (page === 'member')     return <MemberPage openLogin={openLogin} />;
    if (page === 'admin')      return <AdminPage />;
    if (page === 'authLogin')  return <AuthLoginPage openLogin={openLogin} />;
    if (page === 'authCallback') return <AuthCallbackPage />;
    if (page === 'notFound')   return <NotFoundPage />;
    return <NotFoundPage />;
  };

  return (
    <>
      <TopNav openLogin={openLogin} />
      <main>{renderPage()}</main>
      <Fab hidden={page === 'home'} />
      <Footer />

      {detailId && (page === 'courses' || page === 'events' || page === 'hackathons' || page === 'jobs') && (
        <DetailModal
          kind={page}
          id={detailId}
          onClose={() => go(page)}
          onSignup={handleSignup}
          onPay={(courseId) => { if (!session.logged) { openLogin(() => openPay(courseId)); return; } openPay(courseId); }}
          onToast={(msg) => { window.dispatchEvent(new CustomEvent('app:toast', { detail: msg })); }}
        />
      )}

      <LoginModal open={loginOpen} afterLogin={loginAfter} onClose={closeLogin} />
      <FormModal def={formDef} onClose={closeForm} />
      <PayModal
        course={payCourseId ? courses.find((c) => c.id === payCourseId) : null}
        onClose={closePay}
        onAdminJump={() => { demoAdmin(); go('admin'); }}
      />
    </>
  );
}

function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <Router>
          <Shell />
        </Router>
      </ToastProvider>
    </StoreProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
