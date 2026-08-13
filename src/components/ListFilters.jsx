// 列表筛选：状态 segs + 分类 pills + 来源 pills + cnt
import React from 'react';

const ST_TABS = [['all','全部'], ['upcoming','即将'], ['ongoing','进行中'], ['past','已结束']];
const SRC_OPTS = [['all','全部来源'], ['native','站内'], ['external_link','历史外链']];

export function ListFilters({ kind, filter, setFilter, categories }) {
  const showSrc = ['courses','events','hackathons'].includes(kind);
  return (
    <div className="filters">
      <div className="segs">
        {ST_TABS.map(([v, l]) => (
          <button
            key={v}
            className={'seg' + (filter.st === v ? ' on' : '')}
            onClick={() => setFilter({ ...filter, st: v })}
          >{l}</button>
        ))}
      </div>
      <div className="pills">
        {[['all','全部分类'], ...categories.map((v) => [v, v])].map(([v, l]) => (
          <button
            key={v}
            className={filter.cat === v ? 'on' : ''}
            onClick={() => setFilter({ ...filter, cat: v })}
          >{l}</button>
        ))}
        {showSrc && (
          <>
            <span style={{ width:1, height:16, background:'var(--line)', margin:'0 6px' }} />
            {SRC_OPTS.map(([v, l]) => (
              <button
                key={v}
                className={filter.src === v ? 'on' : ''}
                onClick={() => setFilter({ ...filter, src: v })}
              >{l}</button>
            ))}
          </>
        )}
      </div>
      <div className="cnt" id={'n-' + kind}></div>
    </div>
  );
}
