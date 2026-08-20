// localStorage 持久化层（轻量封装）
// - 任何键的读写都包在 try/catch，避免无痕模式/隐私模式抛错导致白屏
// - 写操作做去抖（debounce）：同一 key 在 500ms 内的多次写合并成一次最终写
//   历史问题：曾用 throttle-drop（500ms 内首次之外的写直接丢弃），快速连续
//   状态更新（如订单创建→同步）会丢失中间状态。这里改成 debounce-trailing：
//   每次 saveState 都重置定时器，最终只写最后一次的值。
const PREFIX = 'tintin:';
const SCHEMA = 1;
const DEBOUNCE_MS = 500;

const timers = new Map();   // key → timer id
const pending = new Map();  // key → 最新待写值

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
  pending.set(key, value);
  if (timers.has(key)) {
    clearTimeout(timers.get(key));
  }
  const t = setTimeout(() => {
    timers.delete(key);
    const v = pending.get(key);
    pending.delete(key);
    try {
      window.localStorage.setItem(
        PREFIX + key,
        JSON.stringify({ __schema: SCHEMA, value: v })
      );
    } catch (e) { /* quota or private mode — silently skip */ }
  }, DEBOUNCE_MS);
  timers.set(key, t);
}

// 立即 flush（用于 resetAll、登出前同步等）
export function flushState(key) {
  if (typeof window === 'undefined') return;
  if (timers.has(key)) {
    clearTimeout(timers.get(key));
    timers.delete(key);
  }
  const v = pending.get(key);
  if (v === undefined) return;
  pending.delete(key);
  try {
    window.localStorage.setItem(
      PREFIX + key,
      JSON.stringify({ __schema: SCHEMA, value: v })
    );
  } catch (e) { /* skip */ }
}

export function clearState(key) {
  if (typeof window === 'undefined') return;
  if (timers.has(key)) {
    clearTimeout(timers.get(key));
    timers.delete(key);
  }
  pending.delete(key);
  try { window.localStorage.removeItem(PREFIX + key); } catch (e) { /* skip */ }
}

// 页面 unload 前 flush 一次（避免浏览器在 debounce 期内关闭导致最后一段状态丢失）
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    pending.forEach((_v, key) => flushState(key));
  });
}
