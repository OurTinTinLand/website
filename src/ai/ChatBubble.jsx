// 假 AI 聊天气泡：bot 消息渲染（intent-tag + reply + recs + ctas）
// 用于：首页对话区 / 悬浮球面板（结构共享）
import React, { Fragment } from 'react';
import { money } from '../utils/format';

// 在对话流里渲染一条 bot 消息：头像 + intent 标签 + 文案 + 推荐条 + action 按钮
export function BotBubble({ rule, onRecOpen, helpers }) {
  const recs = rule.recs();
  const ctas = rule.ctas(helpers);
  return (
    <Fragment>
      <div className="av"><img src="assets-claude/brand/dog-head.png" alt="TinTin" /></div>
      <div className="bub">
        <span className="itag">{rule.intent}</span>
        <div>{rule.reply}</div>
        {recs.map((r, i) => <RecItem key={i} item={r} onOpen={onRecOpen} />)}
        <div className="acts">
          {ctas.map(([label, fn, kind], i) => (
            <button key={i} className={kind || ''} onClick={fn}>{label}</button>
          ))}
        </div>
      </div>
    </Fragment>
  );
}

export function UserBubble({ text }) {
  return (
    <Fragment>
      <div className="av">你</div>
      <div className="bub">{text}</div>
    </Fragment>
  );
}

function RecItem({ item, onOpen }) {
  const isCourse = 'price' in item;
  const isHack   = 'prize_pool_usd' in item;
  const isJob    = 'reqs' in item;
  const sub = isCourse
    ? (item.price.type === 'free' ? '免费 · ' + item.form : '¥' + money(item.price.amount) + ' · ' + item.form)
    : isHack
      ? '奖金池 $' + money(item.prize_pool_usd)
      : isJob
        ? item.company + ' · ' + item.city
        : (item.tag + ' · ' + item.city);

  return (
    <div className="rec" onClick={() => onOpen(item)}>
      <div>
        <div className="a">{item.title}</div>
        <div className="b">{sub}</div>
      </div>
      <span className="go">→</span>
    </div>
  );
}
