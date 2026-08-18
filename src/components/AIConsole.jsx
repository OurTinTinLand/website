// 首页假 AI 对话区：吉祥物头部 + 聊天气泡流 + 下划线输入 + 快捷指令
// 文本对齐 spec v1.1 §5 首页设计：Hi，我是 TinTin / chip 列表 / 初始气泡
import React, { Fragment, useState, useRef, useEffect } from 'react';
import { matchRule } from '../ai/rules.js';
import { BotBubble, UserBubble } from '../ai/ChatBubble';
import { dogUrl } from '../utils/constants';

// spec §5：快捷 chip
const CHIPS = [
  '推荐一门课',
  '最近有什么黑客松',
  '找生态工作',
  '了解 Token Hub',
  '随便看看',
];

// spec §5：初始气泡
const INITIAL_MSG = 'Hi，我是 TinTin，来帮你找路。\n想学点 / 想打场 / 想找工作 / 想充 token——直接打字告诉我，或者点下面的快捷指令。';

export function AIConsole({ onAskReady }) {
  const [messages, setMessages] = useState([{ who:'bot', rule:null, text:INITIAL_MSG, key:0 }]);
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  const ask = (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed) return;
    const k = Date.now() + Math.random();
    setMessages((prev) => [...prev, { who:'user', text: trimmed, key: k }]);
    setTimeout(() => {
      const rule = matchRule(trimmed);
      setMessages((prev) => [...prev, { who:'bot', rule, key: k + 1 }]);
    }, 260);
  };

  useEffect(() => {
    if (onAskReady) onAskReady(ask);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    const input = e.target.elements.q;
    ask(input.value);
    input.value = '';
  };

  return (
    <div className="ask">
      <div className="wrap ask-in">
        <div className="ask-head">
          <div className="face"><img src={dogUrl('dog-head')} alt="TinTin" /></div>
          <div>
            <div className="tt">TinTin</div>
            <div className="ss">规则引擎 v1 · 真模型排在 V1.1，接口先留好</div>
          </div>
        </div>
        <div className="log" id="chatlog" ref={logRef}>
          {messages.map((m) => (
            <Fragment key={m.key}>
              {m.who === 'user' ? (
                <div className="m me">
                  <UserBubbleLite text={m.text} />
                </div>
              ) : m.rule ? (
                <div className="m">
                  <BotInline rule={m.rule} />
                </div>
              ) : (
                <div className="m">
                  <BotLite text={m.text} />
                </div>
              )}
            </Fragment>
          ))}
        </div>
        <form className="field" onSubmit={onSubmit}>
          <input id="chatInput" name="q" placeholder="💬 想学点什么？想打场比赛？想换个工作？" autoComplete="off" />
          <button type="submit" className="send" aria-label="发送">→</button>
        </form>
        <div className="qs">
          {CHIPS.map((q) => (
            <button key={q} onClick={() => ask(q)}>{q}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function UserBubbleLite({ text }) {
  return (
    <Fragment>
      <div className="av">你</div>
      <div className="bub">{text}</div>
    </Fragment>
  );
}

function BotLite({ text }) {
  return (
    <Fragment>
      <div className="av"><img src={dogUrl('dog-head')} alt="" /></div>
      <div className="bub">{text}</div>
    </Fragment>
  );
}

function BotInline({ rule }) {
  return (
    <Fragment>
      <div className="av"><img src={dogUrl('dog-head')} alt="" /></div>
      <div className="bub">
        <span className="itag">{rule.intent}</span>
        <div>{rule.reply}</div>
      </div>
    </Fragment>
  );
}
