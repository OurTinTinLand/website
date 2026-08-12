// 列表筛选：状态 tabs + 分类 chips + 来源 chips + count
import React, { Fragment } from 'react';
import { ST } from '../utils/constants';

const ST_TABS = [['all','全部'], ['past','过去'], ['ongoing','进行中'], ['upcoming','即将']];
const SRC_OPTS = [['all','全部来源'], ['native','站内自建'], ['external_link','历史内容 · 外链']];

// props:
//   kind: 'courses' | 'events' | 'hackathons'  （没有 src 字段的如 jobs/apps 不会渲染来源）
//   filter: { st, cat, src }
//   setFilter: (next) => void
//   categories: string[]
export function ListFilters({ kind, filter, setFilter, categories }) {
  const showSrc = ['courses','events','hackathons'].includes(kind);

  return (
    <div className="filters">
      {ST_TABS && (
        <div className="tabs">
          {ST_TABS.map(([v, l]) => (
            <button key={v}
                    className={'tab ' + (filter.st === v ? 'active' : '')}
                    onClick={() => setFilter({ ...filter, st: v })}>{l}</button>
          ))}
        </div>
      )}
      <div className="fsel">
        {[['all','全部分类'], ...categories.map((v) => [v, v])].map(([v, l]) => (
          <button key={v}
                  className={filter.cat === v ? 'on' : ''}
                  onClick={() => setFilter({ ...filter, cat: v })}>{l}</button>
        ))}
        {showSrc && (
          <Fragment>
            <span style={{ width:1, height:20, background:'var(--line)', margin:'0 4px' }}></span>
            {SRC_OPTS.map(([v, l]) => (
              <button key={v}
                      className={filter.src === v ? 'on' : ''}
                      onClick={() => setFilter({ ...filter, src: v })}>{l}</button>
            ))}
          </Fragment>
        )}
      </div>
    </div>
  );
}