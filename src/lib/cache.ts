/**
 * Read-through micro-cache for hot public reads (booking boards, availability, leaderboards).
 * Entries are dropped the moment a matching realtime notification arrives (see realtime.ts), so when
 * 500 viewers refetch after a change the database serves ~1 query instead of 500. The short TTL is
 * only a safety net. A generation counter stops a slow read that started before a change from
 * re-populating the cache with stale data.
 */
type Entry = { at: number; v: Promise<unknown> };
const g = globalThis as unknown as { __cache?: Map<string, Entry>; __cacheGen?: Map<string, number> };
const store = (g.__cache ??= new Map());
const gens = (g.__cacheGen ??= new Map());

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.v as Promise<T>;
  const gen = gens.get(key) ?? 0;
  const v = fn();
  store.set(key, { at: Date.now(), v });
  v.then(
    () => { if ((gens.get(key) ?? 0) !== gen) store.delete(key); },
    () => store.delete(key),
  );
  return v;
}

export function invalidate(key: string) {
  gens.set(key, (gens.get(key) ?? 0) + 1);
  store.delete(key);
}

export function invalidatePrefix(prefix: string) {
  for (const k of [...store.keys()]) if (k.startsWith(prefix)) invalidate(k);
}
