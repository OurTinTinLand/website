// Privy user → 平铺字段工具（与 PrivyBridge/PrivyProviderRoot 共享）
//
// Privy v3 (>=3.x) 的 user 对象结构：
//   user.email:  { address: string }                       ← 单字段对象（不是 addresses[]）
//   user.phone:  { number:  string }
//   user.linkedAccounts: [
//     { type: 'email',       address: string, ... },       ← email OTP 登录产生的账号
//     { type: 'google_oauth', email: string, ... },       ← OAuth 登录产生的账号（带 email 字段）
//     { type: 'wallet', ... },
//     ...
//   ]
export function pickEmail(privyUser) {
  if (typeof window !== 'undefined') console.log('[pickEmail] input shape:', JSON.stringify({
    hasUser: !!privyUser,
    emailType: privyUser && typeof privyUser.email,
    emailKeys: privyUser && privyUser.email && Object.keys(privyUser.email),
    emailAddress: privyUser && privyUser.email && privyUser.email.address,
    laTypes: privyUser && privyUser.linkedAccounts && privyUser.linkedAccounts.map(function(a){ return a && a.type; }),
  }));
  if (!privyUser) return '';

  // v3 主流路径：user.email.address
  if (privyUser.email && typeof privyUser.email === 'object') {
    const e = privyUser.email;
    if (typeof e.address === 'string' && e.address) return e.address;
    // 防御性兼容：某些扩展/旧版本用 addresses[] 数组
    if (Array.isArray(e.addresses) && e.addresses.length) {
      const first = e.addresses[0];
      if (first && typeof first.address === 'string' && first.address) return first.address;
    }
  }
  // 极旧版本：email 直接是字符串
  if (typeof privyUser.email === 'string' && privyUser.email) return privyUser.email;

  // 兜底：从 linkedAccounts 里找
  const la = (privyUser.linkedAccounts || privyUser.linked_accounts) || [];
  for (const a of la) {
    if (!a) continue;
    // v3：email OTP 登录的账号是 type === 'email' + address
    if (a.type === 'email' && typeof a.address === 'string' && a.address) return a.address;
    // OAuth 类（google_oauth / github_oauth 等）通常带 email 字段
    if (typeof a.email === 'string' && a.email) return a.email;
  }
  return '';
}

export function pickSubject(privyUser) {
  if (!privyUser) return '';
  if (privyUser.id) return String(privyUser.id);
  if (privyUser.subject) return String(privyUser.subject);
  return '';
}

export function pickMethod(privyUser) {
  const la = (privyUser && (privyUser.linkedAccounts || privyUser.linked_accounts)) || [];
  const order = ['wallet', 'google', 'x', 'twitter', 'github', 'discord', 'apple', 'email', 'sms'];
  for (const want of order) {
    const found = la.find(a => {
      const t = (a && (a.type || a.provider) || '').toString().toLowerCase();
      if (!t) return false;
      if (t === want) return true;
      if (want === 'google' && t === 'google_oauth') return true;
      if (t === want + '_oauth') return true;
      if (t === want + '_custom') return true;
      return false;
    });
    if (found) return want;
  }
  return 'privy';
}
