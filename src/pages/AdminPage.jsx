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

export function AdminPage() {
  const { session, canAccessAdmin, canSeeAdminTab } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState('content');
  const role = session.role || 'member';

  return (
    <section className="page page-section">
      <div className="wrap">
        <div className="sec-h">
          <div><span className="kick">Admin</span><h2 className="t2">运营后台</h2></div>
          <p className="lead">按运营工作流划分 6 个模块 · 本周完成 ① 内容管理 + ④ 订单核销，其余基础版。</p>
        </div>

        {/* 角色对应的 Tab（spec §14.6 角色 → Tab 映射）*/}
        <div className="subs scroll-x">
          {TABS.filter(([k]) => canSeeAdminTab(k, session)).map(([k, label]) => (
            <button key={k} className={'sub' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>

        <p className="xs" style={{ color:'var(--ink-3)', marginBottom: 16 }}>
          当前身份：<code>{role}</code> · 邮箱 {session.email || '—'}
          {role === 'super_admin' && ' · PB _superusers 自动识别'}
        </p>

        {!canAccessAdmin(session) && <LoginPrompt onLogin={() => {
          // SDK enabled → 发 app:openPrivyNative，PrivyNativeLauncher 监听后会直接弹 Privy native modal（不走 LoginModal）
          // SDK disabled → fallback 到 app:openLogin，走 LoginModal → PrivyStandaloneLogin
          const evt = (window.PRIVY_APP_ID && String(window.PRIVY_APP_ID).trim())
            ? 'app:openPrivyNative'
            : 'app:openLogin';
          window.dispatchEvent(new CustomEvent(evt, {
            detail: { after: () => location.reload() }
          }));
        }} />}

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
      toast.show(`已保存到 PocketBase · ${kindLabel(kind)}「${saved.title || '（无标题）'}」`);
      // 触发 catalog reload（让 ListPage 等其他模块也看到最新数据）
      reloadCatalog();
    } catch (err) {
      console.warn('[admin.content.save] PB failed:', err.message);
      toast.show('PB 写入失败：' + (err.message || 'unknown') + ' · 当前仅本地可见');
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
      toast.show('PB 状态切换失败：' + (err.message || 'unknown'));
    }
  };

  const persistRemove = async (id) => {
    if (!confirm('确认删除？此操作会从 PocketBase 中删除该记录（不可恢复）')) return;
    const backup = list.find((x) => x.id === id);
    setList((prev) => prev.filter((x) => x.id !== id));
    try {
      const api = adminApiFor(kind);
      await api.remove(id);
      toast.show('已从数据库删除');
      reloadCatalog();
    } catch (err) {
      // 回滚
      if (backup) setList((prev) => [backup, ...prev]);
      toast.show('PB 删除失败：' + (err.message || 'unknown'));
    }
  };

  return (
    <>
      <div className="spec" style={{ marginBottom:18 }}>
        课程 / 活动 / 黑客松 / 招聘 / 应用工具 / Token Hub 渠道 · 统一「列表 → 新建 → 编辑 → 上下架 → 删除」标准链路。
        {catalog?._source === 'fallback' && (
          <span style={{ marginLeft:10, color:'var(--danger, #c33)' }}>
            ⚠ PB 未连接 · 当前为种子数据，操作仅本地生效
          </span>
        )}
      </div>

      <div className="pills" style={{ marginBottom:18 }}>
        {[['courses','课程'],['events','活动'],['hackathons','黑客松'],['jobs','招聘'],['apps','应用工具'],['providers','Token Hub 渠道']].map(([k, l]) => (
          <button key={k} className={kind === k ? 'on' : ''} onClick={() => switchKind(k)}>{l}</button>
        ))}
      </div>

      <button className="btn btn-fill btn-sm" style={{ marginBottom:14 }} onClick={() => setEditing({ id:'', __new:true, kind, review_required:false, fields_config:{}, tags:[], state:'upcoming', content_source:'native' })}>
        + 新建{kindLabel(kind)}
      </button>

      <ContentList kind={kind} list={list} onEdit={setEditing} onToggleState={persistToggleState} onRemove={persistRemove} />

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
  return ({ courses:'课程', events:'活动', hackathons:'黑客松', jobs:'招聘', apps:'应用工具', providers:'Token Hub 渠道' })[k] || k;
}

function initialList(kind, cat) {
  cat = cat || {};
  const arr =
      kind === 'courses'    ? cat.courses
    : kind === 'events'     ? cat.events
    : kind === 'hackathons' ? cat.hackathons
    : kind === 'jobs'       ? cat.jobs
    : kind === 'apps'       ? cat.apps
    : kind === 'providers'  ? cat.providers
    : [];
  if (Array.isArray(arr) && arr.length) return arr.map(slim);
  // 降级占位（仅在 PB 完全无数据时展示，让运营至少能看到空白页结构）
  if (kind === 'apps')       return [{ id:'ap-1', title:'占位应用', state:'upcoming', review_required:false, content_source:'native', fields_config:{}, tags:[] }];
  if (kind === 'providers')  return [{ id:'pv-1', title:'合作渠道 A', state:'upcoming', review_required:false, content_source:'native', fields_config:{}, tags:[] }];
  return [];
}

function slim(x) {
  return {
    id: x.id, title: x.title || x.name || '',
    category: x.category || x.tag || x.role || x.theme || '',
    subcategory: x.subcategory || '',
    tags: x.tags || [],
    state: x.state || 'upcoming',
    review_required: !!x.signup_review_required,
    fields_config: x.signup_fields_config || {},
    content_source: x.content_source || 'native',
  };
}

function ContentList({ kind, list, onEdit, onToggleState, onRemove }) {
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
                <button className="lnk" style={{ marginLeft:10, color:'var(--danger, #c33)' }} onClick={() => remove(x.id)}>删除</button>
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

          <div className="fr"><label>自定义标签 · 中英文逗号分隔</label>
            <input value={(draft.tags || []).join('，')} onChange={(e) => set('tags', e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean))} placeholder="Solidity，EVM，审计" />
          </div>

          <div className="fr"><label>内容来源</label>
            <select value={draft.content_source || 'native'} onChange={(e) => set('content_source', e.target.value)}>
              <option value="native">站内自建（native）</option>
              <option value="external_link">外链第三方（external_link）</option>
            </select>
          </div>

          <hr className="hr-soft" />

          <div className="spec">spec §14.2：报名审核开关 + 字段必选/可选</div>
          <div className="fr"><label>报名是否需审核</label>
            <label className="ck">
              <input type="checkbox" checked={!!draft.review_required} onChange={(e) => set('review_required', e.target.checked)} />
              开启审核（公开课程可不开启，仅用于建立用户数据库）
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
function HomeOps() {
  return (
    <>
      <div className="spec">合作项目 Logo 墙 · 首页 Hero 内容 · 最新动态手动置顶</div>
      <div className="grid g2">
        <div className="card-ops">
          <h4>合作项目 Logo 墙</h4>
          <p>支持增删、拖拽排序</p>
          <button className="btn btn-line btn-sm">管理 Logo</button>
        </div>
        <div className="card-ops">
          <h4>首页 Hero 内容</h4>
          <p>替换焦点图 / 标题 / 副标题 / 快捷 chip</p>
          <button className="btn btn-line btn-sm">编辑 Hero</button>
        </div>
        <div className="card-ops">
          <h4>最新动态手动置顶</h4>
          <p>不完全依赖时间自动排序</p>
          <button className="btn btn-line btn-sm">选择置顶内容</button>
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
        spec §8.3：用户下单后联系码已立即发放，运营只更新订单状态为 verified；如联系码自动发送失败，可在此手动补发。
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
                  <span className={'bdg ' + (o.status === 'verified' ? 'b-verified' : o.status === 'failed' ? 'b-failed' : 'b-pending')}>{o.status}</span>
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
        spec §14.6：5 种角色（super_admin / content_ops / reviewer / customer_support / member），见 user_profiles.role。
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
function NotifyConfig() {
  return (
    <>
      <div className="spec" style={{ marginBottom:18 }}>
        spec §14.7：审核通过 / 订单核实 / 活动提醒等系统通知文案，由运营维护，不需要每次改动找开发。
      </div>
      <div className="fcard" style={{ maxWidth:680 }}>
        <div className="fr"><label>审核通过</label>
          <textarea rows="2" defaultValue="你报名的 {item_title} 已通过审核，期待你的参与！" />
        </div>
        <div className="fr"><label>订单核实</label>
          <textarea rows="2" defaultValue="订单 {order_id} 已核实到账，正式为你开通课程/活动权限。" />
        </div>
        <div className="fr"><label>活动提醒</label>
          <textarea rows="2" defaultValue="{item_title} 将在 {start_at} 开始，记得按时参加。" />
        </div>
        <button className="btn btn-fill" style={{ marginTop:10 }}>保存模板（V1.1）</button>
        <div className="spec">V1.1 接入 PocketBase hooks 后，运营改文案无需发布。</div>
      </div>
    </>
  );
}
