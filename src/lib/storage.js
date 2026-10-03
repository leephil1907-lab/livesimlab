let memoryStore = new Map();

function canUseStorage() {
  try { return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'; }
  catch { return false; }
}

export function getStored(key, fallback = '') {
  if (!canUseStorage()) return memoryStore.has(key) ? memoryStore.get(key) : fallback;
  try { return window.localStorage.getItem(key) ?? fallback; }
  catch { return memoryStore.has(key) ? memoryStore.get(key) : fallback; }
}

export function setStored(key, value) {
  memoryStore.set(key, String(value));
  if (!canUseStorage()) return;
  try { window.localStorage.setItem(key, String(value)); } catch {}
}

export function removeStored(key) {
  memoryStore.delete(key);
  if (!canUseStorage()) return;
  try { window.localStorage.removeItem(key); } catch {}
}
