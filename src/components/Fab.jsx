// 悬浮 TinTin + 聊天面板
import React, { useState, useRef, useEffect } from 'react';
import { useRoute } from '../utils/router';
import { useStore } from '../state/store';
import { matchRule } from '../ai/rules.js';
import { BotBubble, UserBubble } from '../ai/ChatBubble';
import { dogUrl } from '../utils/constants';

const WELCOME = '汪！我在。想问「怎么报名」「怎么充值 token」「有什么课」都可以。';

export function Fab({ hidden }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showDot, setShowDot] = useState(true);
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
    <div className="fab" onClick={toggle}>
      {showDot && <div className="dot"></div>}
      <img src={dogUrl('dog-head')} alt="TinTin" />
    </div>
    <div className={'fabpanel' + (open ? ' on' : '')}>
      <div className="fabhead">
        <div className="av"><img src={dogUrl('dog-head')} alt="" /></div>
        <div><div className="nm">TinTin 助手</div><div className="st">● 规则引擎在线</div></div>
        <button onClick={toggle}>✕</button>
      </div>
      <div className="fabbody" ref={logRef}>
        {messages.map((m) => (
          <div key={m.key} className={'msg' + (m.who === 'user' ? ' user' : '')}>
            {m.who === 'user' ? (
              <UserBubble text={m.text} />
            ) : (m.rule ? (
              <BotBubble rule={m.rule} helpers={helpers} onRecOpen={onRecOpen} />
            ) : (
              <React.Fragment>
                <div className="av"><img src={dogUrl('dog-head')} alt="" /></div>
                <div className="bubble"><div>{m.text}</div></div>
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>
      <form className="fabinput" onSubmit={onSubmit}>
        <input name="q" placeholder="怎么报名？怎么充值？" />
        <button type="submit">发送</button>
      </form>
    </div>
    </>
  );
}