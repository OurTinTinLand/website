// 格式化工具：金额 / HTML 转义 / 外链平台推断 / 状态徽章
export const money = (n) => Number(n).toLocaleString('en-US');

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[c]));

export const platformOf = (url) => {
  if (!url) return '原始页面';
  if (url.includes('bilibili'))  return 'B 站';
  if (url.includes('youtube'))   return 'YouTube';
  if (url.includes('lu.ma'))     return 'Luma';
  if (url.includes('dorahacks')) return 'DoraHacks';
  return '原始页面';
};

export const badgeClass = (s) => `state ${s}`;
export const badgeText  = (ST, s) => ST[s];