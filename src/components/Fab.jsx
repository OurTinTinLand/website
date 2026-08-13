// 悬浮 TinTin + 简洁聊天面板（仅首页以外的页面）
import React, { useState, useRef, useEffect } from 'react';
import { useRoute } from '../utils/router';
import { useStore } from '../state/store';
import { matchRule } from '../ai/rules.js';
import { BotBubble, UserBubble } from '../ai/ChatBubble';
import { dogUrl } from '../utils/constants';

const WELCOME = '在的。想问「怎么报名」「怎么充值 token」「有什么课」都行。';

export function Fab({ hidden }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showDot, setShowDot] = useState(false);
  const logRef = useRef(null);
  const { go } = useRoute();
  const { setThTabReq } = useStore();

  const helpers = {
    navigate: go,
    openDetail: (kind, id) => go(`${kind}/${id}`),
    openForm: undefined,
    closeAll: () => setOpen(false),
    setThTab: (n) => setThTabReq(n),
    scrollTo: (y) => window.scrollTo({ top: y, behavior: 'smooth' }),
  };

  useEffect(() => {
    if (hidden) return;
    const t = setTimeout(() => setShowDot(true), 3000);
    return () => clearTimeout(t);
  }, [hidden]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  const toggle = () => {
    setOpen((o) => !o);
    setShowDot(false);
    if (!open && messages.length === 0) {
      setMessages([{ who:'bot', rule:null, text:WELCOME, key: Date.now() }]);
    }
  };

  const ask = (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed) return;
    const k = Date.now();
    setMessages((prev) => [...prev, { who:'user', text: trimmed, key: k }]);
    setTimeout(() => {
      const rule = matchRule(trimmed);
      setMessages((prev) => [...prev, { who:'bot', rule, key: k + 1 }]);
    }, 240);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const input = e.target.elements.q;
    ask(input.value);
    input.value = '';
  };

  if (hidden) return null;

  const onRecOpen = (it) => {
    const k = 'price' in it ? 'courses'
          : 'prize_pool_usd' in it ? 'hackathons'
          : 'reqs' in it ? 'jobs' : 'events';
    go(`${k}/${it.id}`);
    setOpen(false);
  };

  return (
    <>
      <div className="fab" onClick={toggle} aria-label="打开助手">
        {showDot && <div className="rd" />}
        <img src={dogUrl('dog-head')} alt="TinTin" />
      </div>
      <div className={'fpanel' + (open ? ' on' : '')}>
        <div className="fh">
          <div className="av"><img src={dogUrl('dog-head')} alt="" /></div>
          <div>
            <div className="a">TinTin</div>
            <div className="b">● 在线</div>
          </div>
          <button onClick={toggle} aria-label="关闭">✕</button>
        </div>
        <div className="fbody" id="fabbody" ref={logRef}>
          {messages.map((m) => (
            <React.Fragment key={m.key}>
              {m.who === 'user' ? (
                <div className="m me">
                  <UserBubble text={m.text} />
                </div>
              ) : m.rule ? (
                <div className="m">
                  <BotBubble rule={m.rule} helpers={helpers} onRecOpen={onRecOpen} />
                </div>
              ) : (
                <div className="m">
                  <div className="av"><img src={dogUrl('dog-head')} alt="" /></div>
                  <div className="bub">{m.text}</div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        <form className="finput" onSubmit={onSubmit}>
          <input name="q" placeholder="怎么报名？怎么充值？" autoComplete="off" />
          <button type="submit" aria-label="发送">→</button>
        </form>
      </div>
    </>
  );
}
