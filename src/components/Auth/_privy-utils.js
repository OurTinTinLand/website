// Privy user → 平铺字段工具（与 PrivyBridge/PrivyProviderRoot 共享）
export function pickEmail(privyUser) {
  if (!privyUser) return '';
  const e = privyUser.email;
  if (e && typeof e === 'object' && Array.isArray(e.addresses) && e.addresses.length) {
    return e.addresses[0].address || '';
  }
  if (typeof e === 'string') return e;
  const la = (privyUser.linkedAccounts || privyUser.linked_accounts) || [];
  for (const a of la) {
    if (a && a.email) return a.email;
    if (a && a.type === 'email_oauth' && a.address) return a.address;
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
