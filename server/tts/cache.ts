interface CacheEntry {
  buffer: Buffer;
  expiresAt: number;
}

const MAX_ENTRIES = 50;
const TTL_MS = 10 * 60 * 1000; // 10 minutes

const store = new Map<string, CacheEntry>();

/** Returns a cached TTS buffer for the given text, or null if not cached. */
export function getCached(text: string): Buffer | null {
  const entry = store.get(text);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(text);
    return null;
  }
  return entry.buffer;
}

/** Stores a TTS buffer in the cache. Evicts oldest entry if at capacity. */
export function setCached(text: string, buffer: Buffer): void {
  if (store.size >= MAX_ENTRIES) {
    const firstKey = store.keys().next().value;
    if (firstKey !== undefined) store.delete(firstKey);
  }
  store.set(text, { buffer, expiresAt: Date.now() + TTL_MS });
}

/** Returns cache stats (for the /health endpoint). */
export function cacheStats(): { size: number; maxSize: number } {
  return { size: store.size, maxSize: MAX_ENTRIES };
}
