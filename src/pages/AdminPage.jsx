// 运营后台：spec v1.1 §14
// 按"运营人员工作流"划分 6 个模块（不按前台板块拆分独立后台页）：
//   14.2 内容管理中心（核心）— 含字段必选/可选配置 + 审核开关 + 上下架
//   14.3 首页运营位管理
//   14.4 报名/投递审核中心
//   14.5 订单与支付核销（含手动补发）
//   14.6 用户与权限管理（v1.2+ 走 user_profiles.role，4 角色 + super_admin 5 档）
//   14.7 系统通知文案配置（占位）
//   本周目标：模块一（内容管理）+ 模块四（订单核销）必须完整；其余做基础版
import React, { useState, useMemo, useEffect } from 'react';
import { useStore, useToast } from '../state/store';
import { useRoute } from '../utils/router';
import { money } from '../utils/format';
import { dogUrl } from '../utils/constants';
// admin 内容列表从 store.catalog 取（PB 优先 → seed）
import { COURSE_CATEGORIES, COURSE_SUBCATEGORIES } from '../data/index.js';
// V1.1：admin CRUD（创建/更新/上下架/删除都写 PB）
import * as PB from '../utils/pb-client.js';

const TABS = [
  ['content',   '① 内容管理'],
  ['homeops',   '② 首页运营位'],
  ['review',    '③ 报名/投递审核'],
  ['orders',    '④ 订单核销'],
  ['users',     '⑤ 用户权限'],
  ['notify',    '⑥ 通知文案'],
];

export function AdminPage({ openLogin }) {
  const { session, canAccessAdmin, canSeeAdminTab, logout } = useStore();
  const { go } = useRoute();
  const toast = useToast();
  const [tab, setTab] = useState('content');
  const role = session.role || 'member';

  return (
    <section className="page page-section">
      <div className="wrap">
        <div className="sec-h">
          <div><span className="kick">Admin</span><h2 className="t2">运营后台</h2></div>
          <p className="lead">按运营工作流划分 6 个模块。</p>
        </div>

        {/* 角色对应的 Tab（spec §14.6 角色 → Tab 映射）*/}
        <div className="subs scroll-x">
          {TABS.filter(([k]) => canSeeAdminTab(k, session)).map(([k, label]) => (
            <button key={k} className={'sub' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>

        <p className="xs" style={{ color:'var(--ink-3)', marginBottom: 16 }}>
          当前身份：<code>{role}</code> · 邮箱 {session.email || '—'}
          {role === 'super_admin' && ' · 全部权限'}
        </p>

        {!session.logged && (
          <LoginPrompt onLogin={() => {
            // 统一入口：openLogin 按 PRIVY_APP_ID 自动分发。
            // 不要传任何触发页面硬刷的回调 —— setSession 已经在 React 端同步更新了
            // role/logged，AdminPage 会自然 re-render；硬刷反而容易和 Privy
            // rehydration / saveState debounce 互相冲掉，把 session 留在旧 localStorage
            // 上、admin 页面反复弹 LoginPrompt。这里传 null 走"无 after"路径；
            // 如果一定要更新一次服务端数据，调用 reloadCatalog()（不会触发页面刷新）。
            openLogin(null);
          }} />
        )}

        {session.logged && !canAccessAdmin(session) && (
          <NoAccessPanel
            session={session}
            onHome={() => go('home')}
            onLogout={() => { logout(); toast.show('已退出'); go('home'); }}
          />
        )}

        {canAccessAdmin(session) && tab === 'content'   && <ContentCenter />}
        {canAccessAdmin(session) && tab === 'homeops'   && <HomeOps />}
        {canAccessAdmin(session) && tab === 'review'    && <ReviewCenter />}
        {canAccessAdmin(session) && tab === 'orders'    && <OrdersOps />}
        {canAccessAdmin(session) && tab === 'users'     && <UserOps />}
        {canAccessAdmin(session) && tab === 'notify'    && <NotifyConfig />}
      </div>
    </section>
  );
}

function LoginPrompt({ onLogin }) {
  return (
    <div className="empty">
      <img src={dogUrl('dog-harness')} alt="" />
      运营后台仅对运营角色开放。
      <br />
      请用 <b>Privy</b> 登录并在 Privy Dashboard 里把账号绑定到运营邮箱；
      角色由后台（user_profiles.role 字段）指定。
      <br /><br />
      <button className="btn btn-fill" onClick={onLogin}>用 Privy 登录</button>
      <br /><br />
      <p className="xs" style={{ color: 'var(--ink-3)' }}>
        角色说明：超级管理员（全部权限） · 内容运营（①+②） · 审核员（③+⑤） · 客服（④+⑤）· 注册用户（个人中心）
      </p>
    </div>
  );
}

// 已登录但角色不在运营白名单 —— 不要把 LoginPrompt 暴露给这种用户，
// 否则点 "用 Privy 登录" 会让 PrivyNativeLauncher 走 "already authenticated"
// 分支盲目 reload（at PrivyProviderRoot.jsx），循环往返同一帧（issue：页面循环重启）。
function NoAccessPanel({ session, onLogout, onHome }) {
  return (
    <div className="empty">
      <img src={dogUrl('dog-sit')} alt="" />
      你已登录为 <b>{session.email || '（无邮箱）'}</b>，但当前账号 <code>{session.role || 'member'}</code> 没有运营后台权限。
      <br />
      如需访问，请联系超管把你的账号在后台 <code>user_profiles.role</code> 字段升级为
      <code> content_ops</code> / <code>reviewer</code> / <code>customer_support</code> / <code>super_admin</code> 之一。
      <br /><br />
      <button className="btn btn-line" onClick={onHome}>返回首页</button>
      <button className="btn btn-fill" style={{ marginLeft:10 }} onClick={onLogout}>退出当前账号</button>
    </div>
  );
}

// ========== ① 内容管理中心 §14.2 ==========
// V1.1 真实接入：列表从 store.catalog 取（PB → seed fallback）；
//             保存走 PB CRUD（adminCreate/adminUpdate/adminDelete），前端乐观更新。
//             后端不通时降级为纯本地（toast 提示，不阻塞 UI）。
function ContentCenter() {
  const { catalog, reloadCatalog, pb } = useStore();
  const toast = useToast();
  const [kind, setKind] = useState('courses');
  const [list, setList] = useState(() => initialList('courses', catalog));
  const [editing, setEditing] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const fileRef = React.useRef(null);

  // 每次 catalog 重新加载（来自 PB）后，同步回填当前 kind 的本地列表
  useEffect(() => {
    setList(initialList(kind, catalog));
    setEditing(null);
  }, [catalog, kind]);

  const switchKind = (k) => {
    setKind(k);
    setList(initialList(k, catalog));
    setEditing(null);
  };

  // —— 乐观更新：本地立刻改，再异步 PB —— //
  const persistUpsert = async (saved) => {
    setList((prev) => {
      const exists = prev.find((x) => x.id === saved.id);
      if (exists) return prev.map((x) => x.id === saved.id ? saved : x);
      return [saved, ...prev];
    });
    setEditing(null); // 不管 PB 成不成功，先关弹窗（运营能看到本地生效）
    try {
      const api = adminApiFor(kind);
      const payload = toPbPayload(kind, saved);
      let realId = saved.id;
      if (saved.__new || !looksLikePbId(saved.id)) {
        const r = await api.create(payload);
        realId = r.id || saved.id;
      } else {
        await api.update(saved.id, payload);
      }
      // 用 PB 返回的真实 id 替换本地占位
      setList((prev) => prev.map((x) => x.id === saved.id ? { ...x, id: realId, _synced: true } : x));
      toast.show(`已保存 · ${kindLabel(kind)}「${saved.title || '（无标题）'}」`);
      // 触发 catalog reload（让 ListPage 等其他模块也看到最新数据）
      reloadCatalog();
    } catch (err) {
      console.warn('[admin.content.save] PB failed:', err.message);
      toast.show('保存失败：' + (err.message || 'unknown') + ' · 当前仅本地可见');
    }
  };

  const persistToggleState = async (id) => {
    let next = null;
    setList((prev) => prev.map((x) => {
      if (x.id !== id) return x;
      next = { ...x, state: x.state === 'off' ? 'upcoming' : 'off' };
      return next;
    }));
    if (!next) return;
    try {
      const api = adminApiFor(kind);
      await api.update(id, { state: next.state });
      toast.show(`${next.state === 'off' ? '已下架' : '已上架'} · ${kindLabel(kind)}`);
      reloadCatalog();
    } catch (err) {
      toast.show('状态切换失败：' + (err.message || 'unknown'));
    }
  };

  const persistRemove = async (id) => {
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id);
      toast.show('再次点击「确认删除」完成操作 · 5 秒后自动取消');
      setTimeout(() => setPendingDeleteId((cur) => cur === id ? null : cur), 5000);
      return;
    }
    setPendingDeleteId(null);
    const backup = list.find((x) => x.id === id);
    setList((prev) => prev.filter((x) => x.id !== id));
    try {
      const api = adminApiFor(kind);
      await api.remove(id);
      toast.show('已删除');
      reloadCatalog();
    } catch (err) {
      // 回滚
      if (backup) setList((prev) => [backup, ...prev]);
      toast.show('删除失败：' + (err.message || 'unknown'));
    }
  };

  // §14.2 批量导入：CSV（首行表头）→ 逐条走正常新建链路（复用 toPbPayload）
  const handleCsvImport = (ev) => {
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const rows = parseCsv(String(reader.result || ''));
      if (rows.length < 2) { toast.show('CSV 至少需要表头 + 一行数据'); return; }
      const headers = rows[0].map((h) => h.trim());
      let ok = 0, failed = 0;
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every((c) => !String(c).trim())) continue;
        const draft = { id: '', __new: true, kind };
        headers.forEach((h, j) => { if (h && row[j] !== undefined && String(row[j]).trim() !== '') draft[h] = String(row[j]).trim(); });
        try {
          const payload = toPbPayload(kind, draft);
          await adminApiFor(kind).create(payload);
          ok++;
        } catch (err) {
          failed++;
          console.warn('[admin.csv] row', i + 1, 'failed:', err.message);
        }
      }
      toast.show(`批量导入完成 · 成功 ${ok} 条${failed ? `，失败 ${failed} 条（详见控制台）` : ''}`);
      reloadCatalog();
    };
    reader.readAsText(file, 'utf-8');
  };

  return (
    <>
      <div className="spec" style={{ marginBottom:18 }}>
        课程 / 活动 / 黑客松 / 招聘 / 应用工具 / Token Hub 渠道 · 统一「列表 → 新建 → 编辑 → 上下架 → 删除」标准链路。
        {catalog?._source === 'fallback' && (
          <span style={{ marginLeft:10, color:'var(--danger, #c33)' }}>
            ⚠ 后端未连接 · 当前为本地缓存，编辑操作不会保存
          </span>
        )}
      </div>

      <div className="pills" style={{ marginBottom:18 }}>
        {[['courses','课程'],['events','活动'],['hackathons','黑客松'],['job_postings','企业岗位'],['talent_profiles','人才信息'],['apps','应用工具'],['providers','Token Hub 渠道']].map(([k, l]) => (
          <button key={k} className={kind === k ? 'on' : ''} onClick={() => switchKind(k)}>{l}</button>
        ))}
      </div>

      <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:14 }}>
        <button className="btn btn-fill btn-sm" onClick={() => setEditing({ id:'', __new:true, kind, review_required:false, fields_config:{}, tags:[], state:'upcoming', content_source:'native' })}>
          + 新建{kindLabel(kind)}
        </button>
        {/* §14.2 批量导入 CSV（建议项）：标题,分类,标签,内容来源,外链,状态… */}
        <button className="btn btn-line btn-sm" onClick={() => fileRef.current && fileRef.current.click()}>
          批量导入 CSV
        </button>
        <span className="xs" style={{ color:'var(--ink-3)' }}>
          模板列：title,category,tags,content_source,external_url,state（当前板块专属字段见表单）
        </span>
        <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display:'none' }}
               onChange={handleCsvImport} />
      </div>

      <ContentList kind={kind} list={list} pendingDeleteId={pendingDeleteId} onEdit={setEditing} onToggleState={persistToggleState} onRemove={persistRemove} />

      {editing && (
        <ContentEditModal
          def={editing}
          kind={kind}
          onClose={() => setEditing(null)}
          onSave={persistUpsert}
        />
      )}
    </>
  );
}

// 路由：admin API 选择 + frontend draft → PB payload 映射
function adminApiFor(kind) {
  // 返回 { create, update, remove }
  switch (kind) {
    case 'courses':    return { create: PB.createCourse,    update: PB.updateCourse,    remove: PB.deleteCourse };
    case 'events':     return { create: PB.createEvent,     update: PB.updateEvent,     remove: PB.deleteEvent };
    case 'hackathons': return { create: PB.createHackathon, update: PB.updateHackathon, remove: PB.deleteHackathon };
    case 'jobs':       return { create: PB.createJob,       update: PB.updateJob,       remove: PB.deleteJob };
    // §15 新表：走 admin 代理（createRule=null / 登录用户，裸 createRecord 会 403）
    case 'job_postings':    return { create: (b) => PB.adminCreateRecord('job_postings', b),    update: (id, b) => PB.adminUpdateRecord('job_postings', id, b),    remove: (id) => PB.adminDeleteRecord('job_postings', id) };
    case 'talent_profiles': return { create: (b) => PB.adminCreateRecord('talent_profiles', b), update: (id, b) => PB.adminUpdateRecord('talent_profiles', id, b), remove: (id) => PB.adminDeleteRecord('talent_profiles', id) };
    case 'apps':       return { create: PB.createApp,       update: PB.updateApp,       remove: PB.deleteApp };
    case 'providers':  return { create: PB.createProvider,  update: PB.updateProvider,  remove: PB.deleteProvider };
    default:           return { create: async () => { throw new Error('unsupported kind: ' + kind); },
                                update: async () => { throw new Error('unsupported kind: ' + kind); },
                                remove: async () => { throw new Error('unsupported kind: ' + kind); } };
  }
}

// 把前端的 draft 转成 PB 需要的字段；schema 不存在的字段会被丢弃
// 注意：PB 的 select 字段如果 required=true，传空串会被服务端忽略但不报错，
//      导致"看起来写成功了但其实没落库"。这里对必填 select 都做兜底。
function toPbPayload(kind, draft) {
  const base = {
    title: draft.title || '（无标题）',
    state: draft.state || 'upcoming',
    content_source: draft.content_source || 'native',
    signup_review_required: !!draft.review_required,
    signup_fields_config: draft.fields_config || {},
  };
  // slug 兜底：PB schema 都要求 unique slug（来自旧 v1.0 init），
  // 用 title 拼一个基本可读的 slug；运营后续可在后台 UI 里改更友好的版本
  const title = draft.title || '（无标题）';
  const slugFallback = String(title)
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'untitled-' + Date.now();
  // 只在非空时输出字段；PB 对 required+空值的 select 会静默丢，
  // 所以此处宁可少字段，也不要把空串传过去。
  const out = (o, k, v) => { if (v !== '' && v !== null && v !== undefined) o[k] = v; return o; };
  if (kind === 'courses') {
    // PB 的 category 是 required select，不传或传 "" 会静默失败（API 返回 200 但实际不落库）。
    // 兜底给 'AI 应用'；运营在 UI 上选别的就覆盖。
    return {
      ...base,
      slug: draft.slug || slugFallback,
      tags: Array.isArray(draft.tags) ? draft.tags : [],
      category: draft.category || 'AI 应用',
      subcategory: draft.subcategory || '',
      difficulty: draft.difficulty || '入门',
      form: draft.form || '直播',
      price_type: draft.price_type || 'free',
    };
  }
  if (kind === 'events') {
    // events.type / hackathons.theme / jobs.role / apps.type 都是 required select，
    // 不传/传空会导致 PB 静默失败（API 返回 200 但 INSERT 不执行）。
    // 兜底给个合理默认值；运营在 UI 选别的就覆盖。
    return {
      ...base,
      slug: draft.slug || slugFallback,
      type: draft.type || '线上',
      tag: draft.category || '',
    };
  }
  if (kind === 'hackathons') {
    return {
      ...base,
      slug: draft.slug || slugFallback,
      theme: draft.theme || draft.category || '通用',
    };
  }
  if (kind === 'jobs') {
    return {
      ...base,
      slug: draft.slug || slugFallback,
      role: draft.role || draft.category || '工程',
      company: draft.company || '',
    };
  }
  if (kind === 'job_postings') {
    // §15.1 企业招聘信息：contact 仅后台可见；review_status 由审核中心流转
    const p = {};
    out(p, 'title', draft.title); out(p, 'slug', draft.slug || slugFallback);
    out(p, 'company_name', draft.company_name || draft.company || '');
    out(p, 'location', draft.location); out(p, 'remote', !!draft.remote);
    out(p, 'job_type', draft.job_type || 'full_time');
    out(p, 'description', draft.description); out(p, 'requirements', draft.requirements);
    out(p, 'salary_range', draft.salary_range); out(p, 'contact', draft.contact);
    p.tags = Array.isArray(draft.tags) ? draft.tags : [];
    p.review_status = draft.review_status || 'pending_review';
    p.published = draft.published === false ? false : true;
    p.state = draft.state || 'upcoming';
    return p;
  }
  if (kind === 'talent_profiles') {
    // §15.2 社区人才信息：contact 仅后台可见
    const t = {};
    out(t, 'slug', draft.slug || slugFallback);
    out(t, 'nickname', draft.nickname || draft.title || '');
    out(t, 'expected_role', draft.expected_role || draft.category || '');
    out(t, 'work_experience', draft.work_experience);
    t.skill_tags = Array.isArray(draft.skill_tags) ? draft.skill_tags : (Array.isArray(draft.tags) ? draft.tags : []);
    out(t, 'contact', draft.contact); out(t, 'resume_url', draft.resume_url);
    out(t, 'bio', draft.bio); out(t, 'expected_salary', draft.expected_salary);
    out(t, 'expected_city', draft.expected_city);
    t.status = draft.status || 'looking';
    t.review_status = draft.review_status || 'pending_review';
    t.published = draft.published === false ? false : true;
    return t;
  }
  if (kind === 'apps') {
    // apps schema 用 slug，name 字段没有 unique 约束
    return {
      ...base,
      slug: draft.slug || slugFallback,
      name: title,
      type: draft.type || 'agency',
      ic: draft.ic || '',
    };
  }
  if (kind === 'providers') {
    return { ...base, slug: draft.slug || slugFallback, name: title };
  }
  return base;
}

// PB record id 形如 'abc123def45678'（15 位 hex）；本地占位用 'new-<ts>' 或 'ap-1' / 'pv-1'
function looksLikePbId(id) {
  return typeof id === 'string' && /^[a-z0-9]{15}$/i.test(id);
}

function kindLabel(k) {
  return ({ courses:'课程', events:'活动', hackathons:'黑客松', jobs:'招聘', job_postings:'企业岗位', talent_profiles:'人才信息', apps:'应用工具', providers:'Token Hub 渠道' })[k] || k;
}

function initialList(kind, cat) {
  cat = cat || {};
  const arr =
      kind === 'courses'    ? cat.courses
    : kind === 'events'     ? cat.events
    : kind === 'hackathons' ? cat.hackathons
    : kind === 'jobs'       ? cat.jobs
    : kind === 'job_postings'    ? cat.jobPostings
    : kind === 'talent_profiles' ? cat.talents
    : kind === 'apps'       ? cat.apps
    : kind === 'providers'  ? cat.providers
    : [];
  if (Array.isArray(arr) && arr.length) return arr.map(slim);
  // 降级占位（仅在 PB 完全无数据时展示，让运营至少能看到空白页结构）
  if (kind === 'apps')       return [{ id:'ap-1', title:'应用待上架', state:'upcoming', review_required:false, content_source:'native', fields_config:{}, tags:[] }];
  if (kind === 'providers')  return [{ id:'pv-1', title:'合作渠道 A', state:'upcoming', review_required:false, content_source:'native', fields_config:{}, tags:[] }];
  return [];
}

function slim(x) {
  return {
    id: x.id, title: x.title || x.name || x.nickname || '',
    category: x.category || x.tag || x.role || x.theme || x.company_name || x.expected_role || '',
    subcategory: x.subcategory || '',
    tags: x.tags || x.skill_tags || [],
    state: x.state || 'upcoming',
    review_required: !!x.signup_review_required,
    fields_config: x.signup_fields_config || {},
    content_source: x.content_source || 'native',
    // §15 新表透传字段（ContentEditModal 编辑用）
    company_name: x.company_name || '', location: x.location || '', remote: !!x.remote,
    job_type: x.job_type || 'full_time', description: x.description || '',
    requirements: x.requirements || '', salary_range: x.salary_range || '',
    contact: x.contact || '', nickname: x.nickname || '', expected_role: x.expected_role || '',
    work_experience: x.work_experience || '', skill_tags: x.skill_tags || [],
    resume_url: x.resume_url || '', bio: x.bio || '',
    expected_salary: x.expected_salary || '', expected_city: x.expected_city || '',
    status: x.status || 'looking', review_status: x.review_status || 'pending_review',
    published: x.published === false ? false : true,
  };
}

function ContentList({ kind, list, pendingDeleteId, onEdit, onToggleState, onRemove }) {
  // toggleState / remove 都由父组件 persistToggleState / persistRemove 实现，
  // 这里只做 UI 触发，PB 调用与乐观更新都在父层
  const toggleState = (id) => onToggleState(id);
  const remove = (id) => onRemove(id);

  if (!list.length) return <div className="empty">该分类暂无内容</div>;

  return (
    <div className="tbl-scroll">
      <table className="t">
        <tbody>
          <tr>
            <th>标题</th><th>分类</th><th>二级</th><th>来源</th>
            <th>报名审核</th><th>字段配置</th><th>状态</th><th>操作</th>
          </tr>
          {list.map((x) => (
            <tr key={x.id}>
              <td>{x.title}</td>
              <td>{x.category || '—'}</td>
              <td>{x.subcategory || '—'}</td>
              <td><span className="xs">{x.content_source === 'external_link' ? '外链' : '站内'}</span></td>
              <td>
                {x.review_required
                  ? <span className="bdg b-pending">需审核</span>
                  : <span className="xs">不审核</span>}
              </td>
              <td><span className="xs">{Object.keys(x.fields_config || {}).length} 字段</span></td>
              <td>
                <span className={'bdg ' + (x.state === 'off' ? 'b-failed' : 'b-verified')}>
                  {x.state === 'off' ? '已下架' : '已上架'}
                </span>
              </td>
              <td style={{ whiteSpace:'nowrap' }}>
                <button className="lnk" onClick={() => onEdit(x)}>编辑</button>
                <button className="lnk" style={{ marginLeft:10 }} onClick={() => toggleState(x.id)}>
                  {x.state === 'off' ? '上架' : '下架'}
                </button>
                <button className="lnk" style={{ marginLeft:10, color:'var(--danger, #c33)', fontWeight: pendingDeleteId === x.id ? 700 : 400 }} onClick={() => remove(x.id)}>
                  {pendingDeleteId === x.id ? '确认删除' : '删除'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContentEditModal({ def, kind, onClose, onSave }) {
  const [draft, setDraft] = useState(def);
  const set = (k, v) => setDraft((p) => ({ ...p, [k]: v }));

  const FIELD_KEYS = ['name','email','phone','region','role','tech_bg','age','edu','notify','company','title','city','github'];

  const toggleFieldRequired = (k) => {
    const cfg = { ...(draft.fields_config || {}) };
    cfg[k] = cfg[k] === 'required' ? 'optional' : 'required';
    if (!cfg[k]) delete cfg[k];
    set('fields_config', cfg);
  };

  return (
    <div className="mask on" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <button className="x" onClick={onClose} aria-label="关闭">✕</button>
        <div className="mb">
          <h2 style={{ fontSize:22 }}>{draft.__new ? '新建' : '编辑'}{kindLabel(kind)}</h2>

          <div className="fr"><label>标题</label><input value={draft.title || ''} onChange={(e) => set('title', e.target.value)} /></div>

          {kind === 'courses' && (
            <>
              <div className="fr"><label>一级分类</label>
                <select value={draft.category || ''} onChange={(e) => set('category', e.target.value)}>
                  <option value="">—</option>
                  {COURSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              {draft.category === 'Web3 技术' && (
                <div className="fr"><label>二级子类</label>
                  <select value={draft.subcategory || ''} onChange={(e) => set('subcategory', e.target.value)}>
                    <option value="">—</option>
                    {COURSE_SUBCATEGORIES['Web3 技术'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </>
          )}

          <div className="fr"><label>自定义标签 · 英文逗号分隔</label>
            <input value={(draft.tags || []).join(',')} onChange={(e) => set('tags', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} placeholder="Solidity,EVM,审计" />
          </div>

          {kind === 'job_postings' && (
            <>
              <div className="fr"><label>公司名称</label><input value={draft.company_name || ''} onChange={(e) => set('company_name', e.target.value)} /></div>
              <div className="fr"><label>工作地点</label><input value={draft.location || ''} onChange={(e) => set('location', e.target.value)} placeholder="上海 / 新加坡 / 远程" /></div>
              <div className="fr"><label>是否远程</label>
                <label className="ck"><input type="checkbox" checked={!!draft.remote} onChange={(e) => set('remote', e.target.checked)} />支持远程</label>
              </div>
              <div className="fr"><label>职位类型</label>
                <select value={draft.job_type || 'full_time'} onChange={(e) => set('job_type', e.target.value)}>
                  <option value="full_time">全职</option><option value="part_time">兼职</option><option value="intern">实习</option>
                </select>
              </div>
              <div className="fr"><label>薪资范围</label><input value={draft.salary_range || ''} onChange={(e) => set('salary_range', e.target.value)} placeholder="25K-45K · 14 薪 / 面议" /></div>
              <div className="fr"><label>职位描述</label><textarea value={draft.description || ''} onChange={(e) => set('description', e.target.value)} /></div>
              <div className="fr"><label>任职要求 · 每行一条</label><textarea value={draft.requirements || ''} onChange={(e) => set('requirements', e.target.value)} placeholder={'3 年以上工程或咨询经验\n熟悉主流大模型 API'} /></div>
              <div className="fr"><label>联系方式（仅后台可见）</label><input value={draft.contact || ''} onChange={(e) => set('contact', e.target.value)} placeholder="hr@tintin.land" /></div>
            </>
          )}

          {kind === 'talent_profiles' && (
            <>
              <div className="fr"><label>昵称</label><input value={draft.nickname || ''} onChange={(e) => set('nickname', e.target.value)} /></div>
              <div className="fr"><label>期望职位方向</label><input value={draft.expected_role || ''} onChange={(e) => set('expected_role', e.target.value)} /></div>
              <div className="fr"><label>工作经历</label><textarea value={draft.work_experience || ''} onChange={(e) => set('work_experience', e.target.value)} /></div>
              <div className="fr"><label>技能标签 · 英文逗号分隔</label>
                <input value={(draft.skill_tags || []).join(',')} onChange={(e) => set('skill_tags', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} placeholder="React,Solidity" />
              </div>
              <div className="fr"><label>联系方式（仅后台可见）</label><input value={draft.contact || ''} onChange={(e) => set('contact', e.target.value)} /></div>
              <div className="fr"><label>简历 / 主页链接</label><input value={draft.resume_url || ''} onChange={(e) => set('resume_url', e.target.value)} placeholder="https://" /></div>
              <div className="fr"><label>自我介绍</label><textarea value={draft.bio || ''} onChange={(e) => set('bio', e.target.value)} /></div>
              <div className="fr"><label>期望薪资</label><input value={draft.expected_salary || ''} onChange={(e) => set('expected_salary', e.target.value)} /></div>
              <div className="fr"><label>期望城市</label><input value={draft.expected_city || ''} onChange={(e) => set('expected_city', e.target.value)} /></div>
            </>
          )}

          <div className="fr"><label>内容来源</label>
            <select value={draft.content_source || 'native'} onChange={(e) => set('content_source', e.target.value)}>
              <option value="native">站内自建（native）</option>
              <option value="external_link">外链第三方（external_link）</option>
            </select>
          </div>

          <hr className="hr-soft" />

          <div className="spec">报名审核开关 + 字段必选/可选</div>
          <div className="fr"><label>报名是否需审核</label>
            <label className="ck">
              <input type="checkbox" checked={!!draft.review_required} onChange={(e) => set('review_required', e.target.checked)} />
              开启审核（公开课程可不开启）
            </label>
          </div>

          <div className="fr"><label>字段必选/可选</label>
            <div className="fields-cfg">
              {FIELD_KEYS.map((k) => {
                const v = (draft.fields_config || {})[k];
                return (
                  <label key={k} className={'field-chip ' + (v || 'off')}>
                    <input type="checkbox" checked={v === 'required'} onChange={() => toggleFieldRequired(k)} />
                    {k}
                  </label>
                );
              })}
              <span className="xs">勾选 = required；不勾选 = optional；未列出 = 不出现</span>
            </div>
          </div>

          <button className="btn btn-fill btn-lg" style={{ width:'100%', marginTop:18 }} onClick={() => {
            const saved = { ...draft, id: draft.id || ('new-' + Date.now()), state: draft.state || 'upcoming' };
            delete saved.__new;
            onSave(saved);
          }}>保存</button>
        </div>
      </div>
    </div>
  );
}

// ========== ② 首页运营位 §14.3 ==========
// 三块可编辑运营配置，落库 home_ops 表（key + data json），前台实时读取：
//   logo_wall（增删、排序）/ hero 文案 / feed_pin 最新动态置顶
function HomeOps() {
  const { catalog, reloadCatalog } = useStore();
  const toast = useToast();
  const ho = catalog?.homeOps || {};

  const [wall, setWall] = useState(() => (ho.logoWall || []).map((g) => [g[0], g[1], (g[2] || []).join(',')]));
  const [hero, setHero] = useState(() => ({ badge: '', h1: '', lead: '' }));
  const [pin, setPin] = useState(() => []);
  const [pickKind, setPickKind] = useState('event');
  const [pickId, setPickId] = useState('');

  // catalog 异步到达后同步本地草稿（仅当本地还是初始空值时）
  useEffect(() => {
    if (ho.logoWall && !wall.length) setWall(ho.logoWall.map((g) => [g[0], g[1], (g[2] || []).join(',')]));
    if (ho.hero && !hero.badge) setHero({ badge: ho.hero.badge || '', h1: ho.hero.h1 || '', lead: ho.hero.lead || '' });
    if (ho.feedPin && !pin.length) setPin([...(ho.feedPin || [])]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ho.logoWall, ho.hero, ho.feedPin]);

  const saveHomeOp = async (key, data) => {
    try {
      const raw = catalog?.homeOps?.raw || [];
      const rec = raw.find((r) => r.key === key);
      if (rec) await PB.adminUpdateRecord('home_ops', rec.id, { data });
      else await PB.adminCreateRecord('home_ops', { key, data });
      toast.show(`已保存 · ${key}`);
      reloadCatalog();
    } catch (err) {
      toast.show('保存失败：' + (err.message || 'unknown'));
    }
  };

  // —— Logo 墙 ——
  const setGroup = (i, k, v) => setWall((p) => p.map((g, j) => j === i ? { ...g, [k]: v } : g));
  const moveGroup = (i, dir) => setWall((p) => {
    const j = i + dir;
    if (j < 0 || j >= p.length) return p;
    const q = [...p];
    [q[i], q[j]] = [q[j], q[i]];
    return q;
  });
  const saveWall = () => saveHomeOp('logo_wall', wall.map((g) => [String(g[0]).trim(), g[1] || '#5F23F0', String(g[2]).split(',').map((s) => s.trim()).filter(Boolean)]));

  // —— 置顶 ——
  const pickPool = {
    event:     (catalog?.events || []).filter((x) => x.content_source === 'native'),
    hackathon: (catalog?.hackathons || []).filter((x) => x.content_source === 'native'),
    course:    (catalog?.courses || []).filter((x) => x.content_source === 'native'),
  }[pickKind] || [];
  const addPin = () => {
    if (!pickId) { toast.show('请先选择要置顶的内容'); return; }
    const item = pickPool.find((x) => x.id === pickId);
    setPin((p) => [...p, { kind: pickKind, id: pickId }].filter((x, i, a) => a.findIndex((y) => y.kind === x.kind && y.id === x.id) === i));
    setPickId('');
    if (item) toast.show(`已加入置顶列表 · ${item.title.slice(0, 24)}`);
  };
  const movePin = (i, dir) => setPin((p) => {
    const j = i + dir;
    if (j < 0 || j >= p.length) return p;
    const q = [...p];
    [q[i], q[j]] = [q[j], q[i]];
    return q;
  });
  const pinLabel = (p) => {
    const pool = { event: catalog?.events, hackathon: catalog?.hackathons, course: catalog?.courses }[p.kind] || [];
    const it = pool.find((x) => x.id === p.id);
    return it ? `${p.kind} · ${it.title}` : `${p.kind} · ${p.id}`;
  };

  return (
    <>
      <div className="spec" style={{ marginBottom:18 }}>
        合作项目 Logo 墙 · 首页 Hero 内容 · 最新动态手动置顶 —— 保存后前台实时生效（spec §14.3）。
      </div>
      <div className="grid g2">

        {/* Logo 墙 */}
        <div className="card-ops">
          <h4>合作项目 Logo 墙</h4>
          <p className="xs">分组名 + 颜色 + 名称（英文逗号分隔）。支持增删与上下排序。</p>
          {wall.map((g, i) => (
            <div key={i} className="fcard" style={{ marginBottom:10 }}>
              <div className="fr"><label>分组 {i + 1}</label>
                <input value={g[0]} onChange={(e) => setGroup(i, 0, e.target.value)} />
              </div>
              <div className="fr"><label>颜色</label>
                <input value={g[1]} onChange={(e) => setGroup(i, 1, e.target.value)} style={{ width:120 }} placeholder="#5F23F0" />
              </div>
              <div className="fr"><label>名称</label>
                <textarea rows={2} value={g[2]} onChange={(e) => setGroup(i, 2, e.target.value)} placeholder="Polkadot,Aptos,…" />
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-line btn-xs" onClick={() => moveGroup(i, -1)} disabled={i === 0}>↑</button>
                <button className="btn btn-line btn-xs" onClick={() => moveGroup(i, 1)} disabled={i === wall.length - 1}>↓</button>
                <button className="btn btn-line btn-xs" onClick={() => setWall((p) => p.filter((_, j) => j !== i))}>删除组</button>
              </div>
            </div>
          ))}
          <div style={{ display:'flex', gap:10, marginTop:6 }}>
            <button className="btn btn-line btn-sm" onClick={() => setWall((p) => [...p, ['新分组', '#5F23F0', '']])}>+ 新增分组</button>
            <button className="btn btn-fill btn-sm" onClick={saveWall}>保存 Logo 墙</button>
          </div>
        </div>

        {/* Hero 内容 */}
        <div className="card-ops">
          <h4>首页 Hero 内容</h4>
          <p className="xs">badge 徽标 / 主标题（\n 换行，第二行强调）/ 副标题段落。</p>
          <div className="fcard">
            <div className="fr"><label>徽标 badge</label>
              <input value={hero.badge} onChange={(e) => setHero((p) => ({ ...p, badge: e.target.value }))} />
            </div>
            <div className="fr"><label>主标题 h1 · 两行用 \n 分隔</label>
              <textarea rows={2} value={hero.h1} onChange={(e) => setHero((p) => ({ ...p, h1: e.target.value }))} placeholder={'华语开发者的主场\n现在向 AI 敞开。'} />
            </div>
            <div className="fr"><label>副标题 lead</label>
              <textarea rows={3} value={hero.lead} onChange={(e) => setHero((p) => ({ ...p, lead: e.target.value }))} />
            </div>
            <button className="btn btn-fill btn-sm" onClick={() => saveHomeOp('hero', { badge: hero.badge, h1: hero.h1, lead: hero.lead })}>保存 Hero</button>
          </div>
        </div>

        {/* 最新动态置顶 */}
        <div className="card-ops">
          <h4>最新动态手动置顶</h4>
          <p className="xs">选择站内活动 / 黑客松 / 课程置顶到时间线最前（按列表顺序，最多 8 条展示）。</p>
          <div style={{ display:'flex', gap:8, marginBottom:10 }}>
            <select value={pickKind} onChange={(e) => { setPickKind(e.target.value); setPickId(''); }} style={{ flex:1 }}>
              <option value="event">活动</option>
              <option value="hackathon">黑客松</option>
              <option value="course">课程</option>
            </select>
            <select value={pickId} onChange={(e) => setPickId(e.target.value)} style={{ flex:2 }}>
              <option value="">选择内容…</option>
              {pickPool.map((x) => <option key={x.id} value={x.id}>{x.title.slice(0, 36)}</option>)}
            </select>
            <button className="btn btn-line btn-sm" onClick={addPin}>置顶</button>
          </div>
          {pin.length === 0 ? (
            <div className="empty" style={{ padding:'16px 0' }}>暂无置顶内容</div>
          ) : (
            pin.map((p, i) => (
              <div key={i} style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
                <span className="xs" style={{ flex:1 }}>{i + 1}. {pinLabel(p)}</span>
                <button className="btn btn-line btn-xs" onClick={() => movePin(i, -1)} disabled={i === 0}>↑</button>
                <button className="btn btn-line btn-xs" onClick={() => movePin(i, 1)} disabled={i === pin.length - 1}>↓</button>
                <button className="btn btn-line btn-xs" onClick={() => setPin((q) => q.filter((_, j) => j !== i))}>移除</button>
              </div>
            ))
          )}
          <button className="btn btn-fill btn-sm" style={{ marginTop:6 }} onClick={() => saveHomeOp('feed_pin', pin)}>保存置顶</button>
        </div>

      </div>
    </>
  );
}

// ========== ③ 报名/投递审核中心 §14.4 ==========
function ReviewCenter() {
  const { reviewQueue, reviewSubmission } = useStore();
  const toast = useToast();
  const [kind, setKind] = useState('all');
  const [status, setStatus] = useState('all');
  const [picked, setPicked] = useState([]);

  const filtered = useMemo(() => reviewQueue.filter((r) =>
    (kind === 'all' || r.kind === kind) &&
    (status === 'all' || r.review_status === status)
  ), [reviewQueue, kind, status]);

  const toggle = (id) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const bulk = (target) => {
    if (!picked.length) { toast.show('请先勾选'); return; }
    reviewSubmission(picked, target);
    toast.show(`已${target === 'approved' ? '通过' : '拒绝'} ${picked.length} 条`);
    setPicked([]);
  };

  const KIND_OPTS = [
    ['all','全部'],['course','课程报名'],['event','活动报名'],
    ['hackathon','黑客松报名'],['job','招聘投递'],['job_posting','企业发布'],['talent','人才信息'],
  ];
  const STATUS_OPTS = [
    ['all','全部状态'],['pending','待审核'],['approved','已通过'],['rejected','已拒绝'],['auto_approved','系统自动通过'],
  ];

  return (
    <>
      <div className="spec" style={{ marginBottom:14 }}>
        覆盖课程 / 活动 / 黑客松 / 招聘投递 / 企业发布 / 人才信息 · 仅对开启「报名审核开关」的内容生效，公开内容会自动通过。
      </div>

      <div className="pills" style={{ marginBottom:10 }}>
        {KIND_OPTS.map(([v, l]) => <button key={v} className={kind === v ? 'on' : ''} onClick={() => setKind(v)}>{l}</button>)}
      </div>
      <div className="pills" style={{ marginBottom:14 }}>
        {STATUS_OPTS.map(([v, l]) => <button key={v} className={status === v ? 'on' : ''} onClick={() => setStatus(v)}>{l}</button>)}
      </div>

      <div style={{ marginBottom:10, display:'flex', gap:8 }}>
        <button className="btn btn-fill btn-sm" onClick={() => bulk('approved')}>批量通过 · {picked.length}</button>
        <button className="btn btn-line btn-sm" onClick={() => bulk('rejected')}>批量拒绝</button>
        <button className="btn btn-line btn-sm" onClick={() => exportCsv(filtered)}>导出 CSV（用于签到）</button>
      </div>

      <div className="tbl-scroll">
        <table className="t">
          <tbody>
            <tr>
              <th><input type="checkbox" onChange={(e) => setPicked(e.target.checked ? filtered.map((r) => r.id) : [])} /></th>
              <th>类型</th><th>对应内容</th><th>申请人</th><th>邮箱</th><th>电话</th><th>关键字段</th><th>状态</th><th>提交时间</th>
            </tr>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td><input type="checkbox" checked={picked.includes(r.id)} onChange={() => toggle(r.id)} /></td>
                <td><span className="xs">{KIND_OPTS.find(([v]) => v === r.kind)?.[1] || r.kind}</span></td>
                <td>{r.item_title}</td>
                <td>{r.applicant}</td>
                <td>{r.email}</td>
                <td>{r.phone}</td>
                <td><span className="xs">{Object.entries(r.fields || {}).map(([k, v]) => `${k}:${v}`).join(' · ')}</span></td>
                <td>
                  <span className={'bdg ' + (
                    r.review_status === 'approved' || r.review_status === 'auto_approved' ? 'b-verified'
                      : r.review_status === 'rejected' ? 'b-failed' : 'b-pending'
                  )}>{r.review_status}</span>
                </td>
                <td className="mono xs">{r.submitted_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function exportCsv(rows) {
  if (!rows.length) return;
  const headers = ['id','kind','item_title','applicant','email','phone','fields','review_status','submitted_at'];
  const csv = [headers, ...rows.map((r) => [
    r.id, r.kind, r.item_title, r.applicant, r.email, r.phone,
    JSON.stringify(r.fields || {}), r.review_status, r.submitted_at,
  ])].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `review-queue-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

// ========== ④ 订单核销 §14.5 ==========
function OrdersOps() {
  const { orders, verifyOrder, resendAdvisorCode } = useStore();
  const toast = useToast();

  return (
    <>
      <div className="spec" style={{ marginBottom:18 }}>
        用户下单后联系码已立即发放，运营只更新订单状态；如联系码自动发送失败，可在此手动补发。
      </div>
      <div className="tbl-scroll">
        <table className="t">
          <tbody>
            <tr>
              <th>订单号</th><th>用户</th><th>项目</th><th>金额</th><th>下单时间</th><th>码发放</th><th>补发次数</th><th>状态</th><th>操作</th>
            </tr>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="mono">{o.id}</td>
                <td>{o.user_email}</td>
                <td>{o.item_title}</td>
                <td>¥{money(o.amount)}{o.is_deposit ? <span className="lo" style={{ marginLeft:6 }}>定金</span> : null}</td>
                <td className="mono" style={{ fontSize:11.5, color:'var(--ink-3)' }}>{o.created_at}</td>
                <td className="mono xs">{o.advisor_code_sent_at || '—'}</td>
                <td>{o.resend_count || 0}</td>
                <td>
                  <span className={'bdg ' + (o.status === 'verified' ? 'b-verified' : o.status === 'failed' ? 'b-failed' : 'b-pending')}>
                    {o.status === 'verified' ? '已核实' : o.status === 'failed' ? '失败' : '待核实'}
                  </span>
                </td>
                <td style={{ whiteSpace:'nowrap' }}>
                  {o.status === 'pending_review'
                    ? <button className="btn btn-fill btn-sm" onClick={() => { verifyOrder(o.id); toast.show(`${o.id} 已核实到账 · 仅更新状态（联系码已发）`); }}>标记已核实</button>
                    : <span className="xs">已完成</span>}
                  <button className="btn btn-line btn-sm" style={{ marginLeft:6 }} onClick={() => { resendAdvisorCode(o.id); toast.show(`${o.id} 已重新发放顾问码`); }}>补发码</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ========== ⑤ 用户权限 §14.6 ==========
function UserOps() {
  return (
    <>
      <div className="spec" style={{ marginBottom:18 }}>
        5 种角色：超级管理员 / 内容运营 / 审核员 / 客服 / 普通用户
      </div>
      <div className="grid g2">
        <div className="card-ops"><h4>超级管理员</h4><p>全部权限</p></div>
        <div className="card-ops"><h4>内容运营</h4><p>内容管理中心 + 首页运营位</p></div>
        <div className="card-ops"><h4>审核员</h4><p>报名/投递审核中心</p></div>
        <div className="card-ops"><h4>客服</h4><p>用户历史行为查询（用于处理客诉）</p></div>
      </div>
    </>
  );
}

// ========== ⑥ 通知文案 §14.7 ==========
// ========== ⑥ 系统通知文案 §14.7 ==========
// 模板存 home_ops.notify_templates，{item_title} / {order_id} / {start_at} 为变量占位
function NotifyConfig() {
  const { catalog, reloadCatalog } = useStore();
  const toast = useToast();
  const tpl = catalog?.homeOps?.notifyTemplates || {};
  const [draft, setDraft] = useState({
    approved: tpl.approved || '你报名的 {item_title} 已通过审核，期待你的参与！',
    order_verified: tpl.order_verified || '订单 {order_id} 已核实到账，正式为你开通课程/活动权限。',
    event_reminder: tpl.event_reminder || '{item_title} 将在 {start_at} 开始，记得按时参加。',
  });

  useEffect(() => {
    if (tpl.approved) setDraft((p) => ({ ...p, approved: tpl.approved, order_verified: tpl.order_verified || p.order_verified, event_reminder: tpl.event_reminder || p.event_reminder }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tpl.approved]);

  const save = async () => {
    try {
      const raw = catalog?.homeOps?.raw || [];
      const rec = raw.find((r) => r.key === 'notify_templates');
      if (rec) await PB.adminUpdateRecord('home_ops', rec.id, { data: draft });
      else await PB.adminCreateRecord('home_ops', { key: 'notify_templates', data: draft });
      toast.show('通知模板已保存');
      reloadCatalog();
    } catch (err) {
      toast.show('保存失败：' + (err.message || 'unknown'));
    }
  };

  return (
    <>
      <div className="spec" style={{ marginBottom:18 }}>
        审核通过、订单核实、活动提醒等系统通知文案，运营可直接修改（变量占位符，如 {'{item_title}'}）。保存后前台发送通知时生效。
      </div>
      <div className="fcard" style={{ maxWidth:680 }}>
        <div className="fr"><label>审核通过</label>
          <textarea rows="2" value={draft.approved} onChange={(e) => setDraft((p) => ({ ...p, approved: e.target.value }))} />
        </div>
        <div className="fr"><label>订单核实</label>
          <textarea rows="2" value={draft.order_verified} onChange={(e) => setDraft((p) => ({ ...p, order_verified: e.target.value }))} />
        </div>
        <div className="fr"><label>活动提醒</label>
          <textarea rows="2" value={draft.event_reminder} onChange={(e) => setDraft((p) => ({ ...p, event_reminder: e.target.value }))} />
        </div>
        <button className="btn btn-fill" style={{ marginTop:10 }} onClick={save}>保存模板</button>
        <div className="spec">运营可直接修改文案，无需重新发布。</div>
      </div>
    </>
  );
}

// §14.2 批量导入：极简 CSV 解析（支持双引号包裹与转义引号）
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', inQ = false;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQ) {
      if (ch === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++; }
        else inQ = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ',') {
      row.push(cell); cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => String(c).trim() !== '')) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => String(c).trim() !== '')) rows.push(row);
  return rows;
}
