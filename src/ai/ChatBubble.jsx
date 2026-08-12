// 假 AI 聊天气泡：bot 消息渲染（intent-tag + reply + recs + ctas）
import React, { Fragment } from 'react';
import { money } from '../utils/format';
import { COVERS, DOGS, dogUrl } from '../utils/constants';

// 单条推荐卡（点击触发 onOpen(item) → 调用方决定开详情 / 跳转）
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
      <div className="rc"></div>
      <div>
        <div className="rt">{item.title}</div>
        <div className="rs">{sub}</div>
      </div>
      <span style={{ marginLeft:'auto', fontSize:12, color:'var(--violet-800)', fontWeight:650 }}>查看 →</span>
    </div>
  );
}

// 一条 bot 消息
export function BotBubble({ rule, onRecOpen, helpers }) {
  const recs = rule.recs();
  const ctas = rule.ctas(helpers);
  return (
    <Fragment>
      <div className="av"><img src={dogUrl('dog-head')} alt="TinTin" /></div>
      <div className="bubble">
        <span className="intent-tag">intent: {rule.intent}</span>
        <div>{rule.reply}</div>
        {recs.map((r, i) => <RecItem key={i} item={r} onOpen={onRecOpen} />)}
        <div className="ctas">
          {ctas.map(([label, fn, kind], i) => (
            <button key={i} className={kind || ''} onClick={fn}>{label}</button>
          ))}
        </div>
      </div>
    </Fragment>
  );
}

// 一条 user 消息
export function UserBubble({ text }) {
  return (
    <Fragment>
      <div className="av">你</div>
      <div className="bubble">{text}</div>
    </Fragment>
  );
}