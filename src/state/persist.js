// localStorage 持久化层（轻量封装）
// - 任何键的读写都包在 try/catch，避免无痕模式/隐私模式抛错导致白屏
// - 写操作做节流：500ms 内的多次写合并成一次
const PREFIX = 'tintin:';
const SCHEMA = 1;

const timers = new Map();

export function loadState(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.__schema === SCHEMA) {
      return parsed.value !== undefined ? parsed.value : fallback;
    }
    // 旧版本（无 schema 标记）直接当 value 用，下次写入时升级
    return parsed;
  } catch (e) {
    return fallback;
  }
}

export function saveState(key, value) {
  if (typeof window === 'undefined') return;
  if (timers.has(key)) return;     // 同一 key 500ms 内多次写合并
  timers.set(key, true);
  setTimeout(() => timers.delete(key), 500);
  try {
    window.localStorage.setItem(
      PREFIX + key,
      JSON.stringify({ __schema: SCHEMA, value })
    );
  } catch (e) { /* quota or private mode — silently skip */ }
}

export function clearState(key) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(PREFIX + key); } catch (e) { /* skip */ }
}
