// 列表筛选：状态 segs + 分类 pills + 来源 pills + cnt
// 课程板块多一级：选中「Web3 技术」后展开二级子类（spec §7.1.1）
import React from 'react';
import { COURSE_CATS, COURSE_SUBS } from '../utils/constants';

const ST_TABS = [['all','全部'], ['upcoming','即将'], ['ongoing','进行中'], ['past','已结束']];
const SRC_OPTS = [['all','全部来源'], ['native','站内'], ['external_link','历史外链']];

export function ListFilters({ kind, filter, setFilter, categories }) {
  const showSrc = ['courses','events','hackathons'].includes(kind);
  const isCourse = kind === 'courses';
  const subList = (isCourse && filter.cat && COURSE_SUBS[filter.cat]) || [];

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
            onClick={() => setFilter({ ...filter, cat: v, sub: 'all' })}
          >{l}</button>
        ))}

        {subList.length > 0 && (
          <>
            <span style={{ width:1, height:16, background:'var(--line)', margin:'0 6px' }} />
            <span className="pills-label">二级</span>
            {[['all','全部子类'], ...subList.map((v) => [v, v])].map(([v, l]) => (
              <button
                key={v}
                className={'sub-pill' + (filter.sub === v ? ' on' : '')}
                onClick={() => setFilter({ ...filter, sub: v })}
              >{l}</button>
            ))}
          </>
        )}

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
