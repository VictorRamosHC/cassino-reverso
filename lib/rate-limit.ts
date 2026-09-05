const hits = new Map<string, number>();
export function checkRateLimit(key: string, windowMs = 1200) {
  const now = Date.now(); const last = hits.get(key) || 0;
  if (now - last < windowMs) return false;
  hits.set(key, now); return true;
}
