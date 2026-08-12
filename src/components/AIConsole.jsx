// Hero 内的假 AI 控制台：消息流 + 快捷 chips + persona + 输入框
// 通过 prop 暴露 ask() 给外部 persona 卡使用
import React, { Fragment, useState, useRef, useEffect } from 'react';
import { matchRule } from '../ai/rules.js';
import { BotBubble, UserBubble } from '../ai/ChatBubble';

const CHIPS = [
  ['/推荐一门课',       '推荐一门课'],
  ['/最近黑客松',        '最近有什么黑客松'],
  ['/找生态工作',        '找生态工作'],
  ['/了解 Token Hub',   '了解 token hub 怎么充值'],
  ['/随便看看',          '随便看看'],
];

const INITIAL_MSG = '汪！点上面的快捷指令，或者直接打字告诉我你想干嘛——学东西、打黑客松、找工作、买大模型 token，我都能给你指路。';

// props:
//   helpers: { navigate, openDetail, openForm, ... } 注入到 bot 消息的 CTA
//   onAskReady?: (ask) => void   父组件拿到 ask 函数后传给 PersonaRow
export function AIConsole({ helpers, onAskReady }) {
  const [messages, setMessages] = useState([{ who:'bot', rule:null, text:INITIAL_MSG, key:0 }]);
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  const ask = (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed) return;
    const userKey = Date.now() + Math.random();
    setMessages((prev) => [...prev, { who:'user', text: trimmed, key: userKey }]);
    setTimeout(() => {
      const rule = matchRule(trimmed);
      setMessages((prev) => [...prev, { who:'bot', rule, key: userKey + 1 }]);
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

  const onRecOpen = (it) => {
    const k = 'price' in it ? 'courses'
          : 'prize_pool_usd' in it ? 'hackathons'
          : 'reqs' in it ? 'jobs' : 'events';
    helpers.navigate(`${k}/${it.id}`);
  };

  return (
    <div className="console">
      <div className="console-bar">
        <div className="tri"><span></span><span></span><span></span></div>
        <span className="t">tintin@tintinland — chat-router v1（规则引擎 · 非真实大模型 · V1.1 换真 AI 前端不改）</span>
      </div>
      <div className="console-body">
        <div className="chatlog" ref={logRef}>
          {messages.map((m) => (
            <div key={m.key} className={'msg' + (m.who === 'user' ? ' user' : '')}>
              {m.who === 'user' ? (
                <UserBubble text={m.text} />
              ) : (m.rule ? (
                <BotBubble rule={m.rule} helpers={helpers} onRecOpen={onRecOpen} />
              ) : (
                <BotBubbleLite text={m.text} />
              ))}
            </div>
          ))}
        </div>
        <div className="chips">
          {CHIPS.map(([label, q]) => (
            <button key={label} className="chip" onClick={() => ask(q)}>{label}</button>
          ))}
        </div>
        <form className="console-input" onSubmit={onSubmit}>
          <span className="p">➜</span>
          <input name="q" placeholder="想学点 / 想打场 / 想找工作…  按 Enter 发送" />
          <button type="submit" className="send">发送</button>
        </form>
      </div>
    </div>
  );
}

function BotBubbleLite({ text }) {
  return (
    <Fragment>
      <div className="av"><img src="assets-claude/brand/dog-head.png" alt="TinTin" /></div>
      <div className="bubble"><div>{text}</div></div>
    </Fragment>
  );
}