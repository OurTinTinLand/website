// 404 fallback
import React from 'react';
import { useRoute } from '../utils/router';
import { dogUrl } from '../utils/constants';

export function NotFoundPage() {
  const { go } = useRoute();
  return (
    <section className="page page-section">
      <div className="wrap" style={{ textAlign:'center' }}>
        <img src={dogUrl('dog-sleep')} style={{ width:200, margin:'0 auto 14px' }} alt="" />
        <h2 className="t2" style={{ marginBottom:8 }}>这页还没写好（404）</h2>
        <p className="lead" style={{ margin:'0 auto 24px', maxWidth:520 }}>
          链接可能拼错了，或者这个板块还在排期内。先回首页看看，或者挑个常用入口。
        </p>
        <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
          <button className="btn btn-fill" onClick={() => go('home')}>回首页</button>
          <button className="btn btn-line" onClick={() => go('courses')}>看课程</button>
          <button className="btn btn-line" onClick={() => go('hackathons')}>看黑客松</button>
          <button className="btn btn-line" onClick={() => go('about')}>关于我们</button>
        </div>
      </div>
    </section>
  );
}
