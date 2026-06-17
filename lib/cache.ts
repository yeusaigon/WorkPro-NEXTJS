/**
 * Lightweight in-memory cache with TTL (Time-To-Live) support.
 * Reduces redundant Firestore reads and speeds up repeated data access.
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    // Move to end for LRU-like behavior
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs = 60_000): void {
    // Evict oldest if at capacity
    if (this.store.size >= this.maxSize) {
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

export const globalCache = new MemoryCache(200);

/**
 * Debounce utility – delays execution until calls pause for `delayMs`.
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delayMs = 300,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delayMs);
  };
}

/**
 * Throttle utility – ensures fn is called at most once per `limitMs`.
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  limitMs = 300,
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= limitMs) {
      lastCall = now;
      fn(...args);
    }
  };
}

/**
 * Rate limiter – allows `maxCalls` invocations within `windowMs`.
 * Returns true if allowed, false if rate-limited.
 */
export class RateLimiter {
  private timestamps: number[] = [];
  private maxCalls: number;
  private windowMs: number;

  constructor(maxCalls = 10, windowMs = 5_000) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
  }

  tryCall(): boolean {
    const now = Date.now();
    // Remove expired timestamps
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
    if (this.timestamps.length >= this.maxCalls) return false;
    this.timestamps.push(now);
    return true;
  }

  reset(): void {
    this.timestamps = [];
  }
}