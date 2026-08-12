// 页脚
import React from 'react';
import { useRoute } from '../utils/router';
import { useToast } from '../state/store';

export function Footer() {
  const { go } = useRoute();
  const toast = useToast();
  return (
    <footer>
      <div className="container">
        <div className="fgrid">
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:12 }}>
              <img src="assets-claude/brand/logo-v-white.png" style={{ height:38, width:'auto' }} alt="TinTin" />
              <span style={{ fontFamily:'var(--f-disp)', fontWeight:700, fontSize:18, color:'#fff' }}>Land</span>
            </div>
            <p style={{ fontSize:13, color:'#A79FC4', maxWidth:290, margin:0 }}>
              全球 Web3 × AI 生态增长引擎。教育 + 资源 + 生态闭环，驱动开发者与项目共同成长。
            </p>
          </div>
          <div>
            <h4>业务</h4>
            <a onClick={() => go('courses')}>课程</a>
            <a onClick={() => go('events')}>活动</a>
            <a onClick={() => go('hackathons')}>黑客松</a>
            <a onClick={() => go('tokenhub')}>Token Hub</a>
          </div>
          <div>
            <h4>公司</h4>
            <a onClick={() => go('about')}>关于我们</a>
            <a onClick={() => go('jobs')}>加入我们</a>
            <a onClick={() => go('enterprise')}>企业服务</a>
            <a onClick={() => go('admin')}>运营后台</a>
          </div>
          <div>
            <h4>社群</h4>
            <a onClick={() => toast.show('外链占位')}>X</a>
            <a onClick={() => toast.show('外链占位')}>Telegram</a>
            <a onClick={() => toast.show('外链占位')}>Bilibili</a>
            <a onClick={() => toast.show('外链占位')}>YouTube</a>
          </div>
        </div>
        <div className="fbottom">
          <span>© 2026 TinTinLand · 可点击原型 v2（React buildless 版），视觉基于 TinTin 品牌资产，非最终生产版本</span>
          <span>不做论坛 · 不做电商 · 不做代币发行 · 不做强制 KYC</span>
        </div>
      </div>
    </footer>
  );
}