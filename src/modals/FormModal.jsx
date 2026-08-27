// 通用场景化表单弹层：基于 FORM_DEF 下划线输入
// V1.1 真实接入：addSignup → PB /api/collections/signups/records（带 review_status）
// §15.2：talent-post 直接创建 talent_profiles（登录用户，进入待审核）
import React, { useState, useEffect } from 'react';
import { FORM_DEF } from '../utils/constants';
import { useStore, useToast } from '../state/store';
import * as PB from '../utils/pb-client.js';

export function FormModal({ def, onClose, onSubmitted }) {
  const { session, saveProfile, addSignup, reloadCatalog } = useStore();
  const toast = useToast();

  const meta = def ? FORM_DEF[def.kind] : null;
  const [vals, setVals] = useState({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!def || !meta) return;
    const pre = {
      name:    session.profile.name,
      email:   session.email,
      phone:   session.profile.phone,
      city:    session.profile.city,
      github:  session.profile.github,
      contact: session.email,
      ...(def.prefill || {}),
    };
    const next = {};
    for (const [k] of meta.fields) next[k] = pre[k] || '';
    setVals(next);
  }, [def, session.email]);

  if (!def || !meta) return null;

  const onField = (k, v) => setVals((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setPending(true);
    try {
      // 写档案（乐观）
      if (vals.name) saveProfile({ name: vals.name });
      if (vals.phone) saveProfile({ phone: vals.phone });
      if (vals.city) saveProfile({ city: vals.city });
      if (vals.github) saveProfile({ github: vals.github });

      // 业务写入：signups 表
      if (['course','event','hackathon','job','job-posting','talent-contact'].includes(def.kind)) {
        const fields = { ...vals };
        delete fields.name; delete fields.email;
        await addSignup({
          user_id: session.user_id || '',
          kind: def.kind,
          item_id: def.id || '',
          title: def.itemTitle || '—',
          time: new Date().toISOString().slice(0, 19).replace('T', ' '),
          status: '待审核',
          fields,
        });
      } else if (def.kind === 'talent-post') {
        // §15.2 社区用户发布人才信息 → talent_profiles（待审核）
        if (!session.logged) throw new Error('请先登录');
        const slug = 't-' + Date.now().toString(36);
        await PB.createRecord('talent_profiles', {
          user_id: session.user_id || '',
          user_email: session.email || '',
          nickname: vals.nickname || '',
          expected_role: vals.expected_role || '',
          work_experience: vals.work_experience || '',
          skill_tags: String(vals.skill_tags || '').split(/[,，]/).map((s) => s.trim()).filter(Boolean),
          contact: vals.contact || '',
          resume_url: vals.resume_url || '',
          bio: vals.bio || '',
          expected_salary: vals.expected_salary || '',
          expected_city: vals.expected_city || '',
          slug,
          status: 'looking',
        });
        reloadCatalog();
      }
      toast.show('提交成功 · 我们会尽快审核');
      onClose();
      if (onSubmitted) onSubmitted();
    } catch (err) {
      toast.show('提交失败：' + (err.message || 'unknown'));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mask on" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal narrow">
        <button className="x" onClick={onClose} aria-label="关闭">✕</button>
        <div className="mb">
          <h2 style={{ fontSize:24 }}>{meta.title}</h2>
          <p className="xs" style={{ margin:'12px 0 26px' }}>
            {session.logged ? '已从档案带出可复用字段，改动会同步回档案。' : '提交后我们尽快联系你。'}
          </p>
          {meta.fields.map(([k, l]) => (
            <div key={k} className="fr">
              <label>{l}</label>
              <input value={vals[k] || ''} onChange={(e) => onField(k, e.target.value)} placeholder={l} />
            </div>
          ))}
          <button className="btn btn-fill btn-lg" style={{ width:'100%', marginTop:10 }} disabled={pending} onClick={submit}>
            {pending ? '提交中…' : '提交'}
          </button>
        </div>
      </div>
    </div>
  );
}
