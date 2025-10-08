/**
 * Request Coalescer
 *
 * Deduplicates concurrent async requests by key. When multiple requests with the same key
 * are made before the first one completes, they all share the same promise and result.
 *
 * @example
 * const coalescer = new RequestCoalescer<string, User>();
 * const user1 = await coalescer.execute('user-123', () => fetchUser('123'));
 * const user2 = await coalescer.execute('user-123', () => fetchUser('123'));
 * // Only one API call is made, both get the same result
 */
export class RequestCoalescer<TKey = string, TResult = unknown> {
  private pendingRequests = new Map<TKey, Promise<TResult>>();

  /**
   * Execute a request, coalescing concurrent calls with the same key
   *
   * @param key - Unique identifier for this request
   * @param request - Async function to execute if no pending request exists
   * @returns Promise that resolves to the request result
   */
  async execute(key: TKey, request: () => Promise<TResult>): Promise<TResult> {
    const pending = this.pendingRequests.get(key);

    if (pending) {
      return pending;
    }

    const promise = request()
      .then(result => {
        this.pendingRequests.delete(key);
        return result;
      })
      .catch(error => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Check if a request with the given key is currently pending
   */
  isPending(key: TKey): boolean {
    return this.pendingRequests.has(key);
  }

  /**
   * Get the number of pending requests
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Clear a specific pending request
   */
  clear(key: TKey): void {
    this.pendingRequests.delete(key);
  }

  /**
   * Clear all pending requests
   */
  clearAll(): void {
    this.pendingRequests.clear();
  }
}

/**
 * Advanced Request Coalescer with TTL and size limits
 *
 * Adds cache-like features to request coalescing:
 * - TTL: Results are cached for a specified duration
 * - Size limit: Maximum number of cached results
 * - LRU eviction: Least recently used items are removed when size limit is reached
 */
export interface CachedCoalescerOptions {
  /**
   * Time-to-live in milliseconds for cached results
   * @default undefined (no caching, only coalescing)
   */
  ttl?: number;

  /**
   * Maximum number of cached results
   * @default undefined (no limit)
   */
  maxSize?: number;
}

interface CacheEntry<TResult> {
  result: TResult;
  timestamp: number;
  promise?: Promise<TResult>;
}

export class CachedRequestCoalescer<TKey = string, TResult = unknown> {
  private cache = new Map<TKey, CacheEntry<TResult>>();
  private pendingRequests = new Map<TKey, Promise<TResult>>();
  private accessOrder: TKey[] = [];

  constructor(private options: CachedCoalescerOptions = {}) {}

  /**
   * Execute a request with caching and coalescing
   */
  async execute(key: TKey, request: () => Promise<TResult>): Promise<TResult> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && this.isCacheValid(cached)) {
      this.updateAccessOrder(key);
      return cached.result;
    }

    // Check for pending request
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending;
    }

    // Execute new request
    const promise = request()
      .then(result => {
        this.pendingRequests.delete(key);

        // Cache the result if TTL is set
        if (this.options.ttl) {
          this.setCacheEntry(key, result);
        }

        return result;
      })
      .catch(error => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  private isCacheValid(entry: CacheEntry<TResult>): boolean {
    if (!this.options.ttl) {
      return false;
    }
    return Date.now() - entry.timestamp < this.options.ttl;
  }

  private setCacheEntry(key: TKey, result: TResult): void {
    // Evict LRU entry if size limit is reached
    if (this.options.maxSize && this.cache.size >= this.options.maxSize) {
      const lruKey = this.accessOrder[0];
      if (lruKey !== undefined) {
        this.cache.delete(lruKey);
        this.accessOrder.shift();
      }
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });

    this.updateAccessOrder(key);
  }

  private updateAccessOrder(key: TKey): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: TKey): void {
    this.cache.delete(key);
    this.pendingRequests.delete(key);
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Clear all cache and pending requests
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingCount: this.pendingRequests.size,
      maxSize: this.options.maxSize,
      ttl: this.options.ttl,
    };
  }

  isPending(key: TKey): boolean {
    return this.pendingRequests.has(key);
  }

  isCached(key: TKey): boolean {
    const cached = this.cache.get(key);
    return cached ? this.isCacheValid(cached) : false;
  }
}

/**
 * Helper function to create a key from multiple parameters
 */
export function createKey(...params: unknown[]): string {
  return JSON.stringify(params);
}

/**
 * Create a coalesced version of any async function
 */
export function coalesceFunction<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyFn: (...args: TArgs) => string = (...args) => createKey(...args),
): (...args: TArgs) => Promise<TResult> {
  const coalescer = new RequestCoalescer<string, TResult>();

  return (...args: TArgs) => {
    const key = keyFn(...args);
    return coalescer.execute(key, () => fn(...args));
  };
}
