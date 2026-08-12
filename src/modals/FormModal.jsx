// 通用表单弹层：基于 FORM_DEF 动态字段；登录后从 profile 自动带出
import React, { useState, useEffect } from 'react';
import { FORM_DEF } from '../utils/constants';
import { useStore, useToast } from '../state/store';
import { esc } from '../utils/format';

// props:
//   def: { kind, id?, title?, prefill?, submitLabel? }
//   onClose()
//   onSubmitted?: () => void  提交成功后回调（用于跳支付 / 关弹层）
export function FormModal({ def, onClose, onSubmitted }) {
  const { session, saveProfile, addSignup } = useStore();
  const toast = useToast();

  const meta = def ? FORM_DEF[def.kind] : null;
  const [vals, setVals] = useState({});

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

  const submit = () => {
    if (vals.name)    saveProfile({ name: vals.name });
    if (vals.phone)   saveProfile({ phone: vals.phone });
    if (vals.city)    saveProfile({ city: vals.city });
    if (vals.github)  saveProfile({ github: vals.github });
    if (['course','event','hackathon','job'].includes(def.kind)) {
      const src = { course: 'courses', event: 'events', hackathon: 'hackathons', job: 'jobs' };
      addSignup({
        user_id: session.user_id,
        kind: def.kind,
        item_id: def.id,
        title: def.itemTitle || '—',
        time: '2026-08-12 10:30',
        status: '已报名',
      });
    }
    toast.show('提交成功（原型演示）· 已写入用户档案与后台列表');
    onClose();
    if (onSubmitted) onSubmitted();
  };

  return (
    <div className="mask on" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal narrow">
        <button className="mclose" onClick={onClose}>✕</button>
        <div className="mbody">
          <h3 style={{ marginBottom:5 }}>{meta.title}</h3>
          <p className="note" style={{ margin:'0 0 16px' }}>
            {session.logged ? '已从档案自动带出可复用字段，改动会同步回档案。' : '提交后我们会尽快联系你。'}
          </p>
          {meta.fields.map(([k, l]) => (
            <div key={k} className="frow">
              <label>{l}</label>
              <input value={vals[k] || ''} onChange={(e) => onField(k, e.target.value)} placeholder={l} />
            </div>
          ))}
          <button className="btn btn-primary" style={{ width:'100%' }} onClick={submit}>提交</button>
          <div className="spec">对应 UserProfile.extensions：一次填写写入档案，下次同类表单自动带出。</div>
        </div>
      </div>
    </div>
  );
}
