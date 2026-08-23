// 页脚：业务 / 公司 / 社群 + 暗黑背景
import React from 'react';
import { useRoute } from '../utils/router';
import { useStore, useToast } from '../state/store';

export function Footer() {
  const { go } = useRoute();
  const { session, canAccessAdmin } = useStore();
  const toast = useToast();
  return (
    <footer className="ft">
      <div className="wrap">
        <div className="ftg">
          <div>
            <img src="assets-claude/brand/logo-lockup-dark.png" style={{ height:25, width:'auto', marginBottom:20 }} alt="TinTin" />
            <p style={{ fontSize:13.5, color:'var(--d-txt)', maxWidth:320, margin:0, lineHeight:1.75 }}>
              全球 Web3 × AI 生态增长引擎。教育、资源、生态闭环，驱动开发者与项目一起长大。
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
            <a onClick={() => go('about')}>关于</a>
            <a onClick={() => go('jobs')}>加入我们</a>
            <a onClick={() => go('enterprise')}>企业服务</a>
            {canAccessAdmin(session) && (
              <a onClick={() => go('admin')}>运营后台</a>
            )}
          </div>
          <div>
            <h4>社群</h4>
            <a onClick={() => toast.show('即将上线')}>X</a>
            <a onClick={() => toast.show('即将上线')}>Telegram</a>
            <a onClick={() => toast.show('即将上线')}>Bilibili</a>
            <a onClick={() => toast.show('即将上线')}>YouTube</a>
          </div>
        </div>
        <div className="ftb">
          <span>© {new Date().getFullYear()} TinTin · 全球 Web3 × AI 生态增长引擎</span>
        </div>
      </div>
    </footer>
  );
}
