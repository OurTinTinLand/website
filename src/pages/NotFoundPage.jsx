// 404 fallback：未匹配 hash 落到这里
import React from 'react';
import { useRoute } from '../utils/router';
import { dogUrl } from '../utils/constants';

export function NotFoundPage() {
  const { go } = useRoute();
  return (
    <div className="container" style={{ padding: '80px 28px 100px', textAlign: 'center' }}>
      <img src={dogUrl('dog-sleep')} style={{ width: 200, margin: '0 auto 12px' }} alt="" />
      <h2 style={{ fontSize: 30, marginBottom: 6 }}>这页还没写好（404）</h2>
      <p className="sec-desc" style={{ maxWidth: 520, margin: '0 auto 22px' }}>
        链接可能拼错了，或者这个板块还在排期内。先回首页看看，或者挑个常用入口。
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => go('home')}>回首页</button>
        <button className="btn btn-outline" onClick={() => go('courses')}>看课程</button>
        <button className="btn btn-outline" onClick={() => go('hackathons')}>看黑客松</button>
        <button className="btn btn-outline" onClick={() => go('about')}>关于我们</button>
      </div>
    </div>
  );
}
