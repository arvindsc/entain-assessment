import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RequestCoalescer,
  CachedRequestCoalescer,
  createKey,
  coalesceFunction,
} from './coalesce';

describe('RequestCoalescer', () => {
  let coalescer: RequestCoalescer<string, string>;

  beforeEach(() => {
    coalescer = new RequestCoalescer<string, string>();
  });

  it('should execute a single request', async () => {
    const request = vi.fn(async () => 'result');

    const result = await coalescer.execute('key1', request);

    expect(result).toBe('result');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('should coalesce concurrent requests with the same key', async () => {
    let resolveFn: ((value: string) => void) | undefined;
    const request = vi.fn(
      async () =>
        new Promise<string>(resolve => {
          resolveFn = resolve;
        }),
    );

    const promise1 = coalescer.execute('key1', request);
    const promise2 = coalescer.execute('key1', request);
    const promise3 = coalescer.execute('key1', request);

    // Resolve the promise
    resolveFn!('result');

    const [result1, result2, result3] = await Promise.all([
      promise1,
      promise2,
      promise3,
    ]);

    expect(result1).toBe('result');
    expect(result2).toBe('result');
    expect(result3).toBe('result');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('should not coalesce sequential requests', async () => {
    const request = vi.fn(async () => 'result');

    await coalescer.execute('key1', request);
    await coalescer.execute('key1', request);

    expect(request).toHaveBeenCalledTimes(2);
  });

  it('should handle different keys independently', async () => {
    const request1 = vi.fn(async () => 'result1');
    const request2 = vi.fn(async () => 'result2');

    const [result1, result2] = await Promise.all([
      coalescer.execute('key1', request1),
      coalescer.execute('key2', request2),
    ]);

    expect(result1).toBe('result1');
    expect(result2).toBe('result2');
    expect(request1).toHaveBeenCalledTimes(1);
    expect(request2).toHaveBeenCalledTimes(1);
  });

  it('should handle request failures', async () => {
    const error = new Error('Request failed');
    const request = vi.fn(async () => {
      throw error;
    });

    await expect(coalescer.execute('key1', request)).rejects.toThrow(
      'Request failed',
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('should allow new requests after failure', async () => {
    const error = new Error('Request failed');
    let callCount = 0;
    const request = vi.fn(async () => {
      callCount++;
      if (callCount === 1) {
        throw error;
      }
      return 'success';
    });

    await expect(coalescer.execute('key1', request)).rejects.toThrow(
      'Request failed',
    );
    const result = await coalescer.execute('key1', request);

    expect(result).toBe('success');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('should coalesce even when some requests fail during execution', async () => {
    const error = new Error('Request failed');
    let rejectFn: ((reason: Error) => void) | undefined;
    const request = vi.fn(
      async () =>
        new Promise<string>((_, reject) => {
          rejectFn = reject;
        }),
    );

    const promise1 = coalescer.execute('key1', request).catch(e => e);
    const promise2 = coalescer.execute('key1', request).catch(e => e);
    const promise3 = coalescer.execute('key1', request).catch(e => e);

    // Reject the promise
    rejectFn!(error);

    const results = await Promise.all([promise1, promise2, promise3]);

    expect(results[0]).toBe(error);
    expect(results[1]).toBe(error);
    expect(results[2]).toBe(error);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('should track pending requests', async () => {
    let resolveFn: ((value: string) => void) | undefined;
    const request = vi.fn(
      async () =>
        new Promise<string>(resolve => {
          resolveFn = resolve;
        }),
    );

    expect(coalescer.isPending('key1')).toBe(false);

    const promise = coalescer.execute('key1', request);
    expect(coalescer.isPending('key1')).toBe(true);

    resolveFn!('result');
    await promise;
    expect(coalescer.isPending('key1')).toBe(false);
  });

  it('should report correct pending count', async () => {
    const resolvers: Array<(value: string) => void> = [];
    const request = vi.fn(
      async () =>
        new Promise<string>(resolve => {
          resolvers.push(resolve);
        }),
    );

    expect(coalescer.getPendingCount()).toBe(0);

    const promise1 = coalescer.execute('key1', request);
    expect(coalescer.getPendingCount()).toBe(1);

    const promise2 = coalescer.execute('key2', request);
    expect(coalescer.getPendingCount()).toBe(2);

    resolvers[0]('result');
    resolvers[1]('result');
    await Promise.all([promise1, promise2]);
    expect(coalescer.getPendingCount()).toBe(0);
  });

  it('should clear specific pending request', async () => {
    let resolveFn: ((value: string) => void) | undefined;
    const request = vi.fn(
      async () =>
        new Promise<string>(resolve => {
          resolveFn = resolve;
        }),
    );

    const promise = coalescer.execute('key1', request);
    expect(coalescer.isPending('key1')).toBe(true);

    coalescer.clear('key1');
    expect(coalescer.isPending('key1')).toBe(false);

    // Original promise should still resolve
    resolveFn!('result');
    const result = await promise;
    expect(result).toBe('result');
  });

  it('should clear all pending requests', async () => {
    const resolvers: Array<(value: string) => void> = [];
    const request = vi.fn(
      async () =>
        new Promise<string>(resolve => {
          resolvers.push(resolve);
        }),
    );

    const promise1 = coalescer.execute('key1', request);
    const promise2 = coalescer.execute('key2', request);

    expect(coalescer.getPendingCount()).toBe(2);

    coalescer.clearAll();
    expect(coalescer.getPendingCount()).toBe(0);

    // Original promises should still resolve
    resolvers[0]('result');
    resolvers[1]('result');
    const [result1, result2] = await Promise.all([promise1, promise2]);
    expect(result1).toBe('result');
    expect(result2).toBe('result');
  });

  it('should work with complex key types', async () => {
    const coalescer = new RequestCoalescer<
      { id: string; type: string },
      string
    >();
    const request = vi.fn(async () => 'result');

    const key = { id: '123', type: 'user' };
    const result = await coalescer.execute(key, request);

    expect(result).toBe('result');
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe('CachedRequestCoalescer', () => {
  let coalescer: CachedRequestCoalescer<string, string>;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute without caching when ttl is not set', async () => {
    coalescer = new CachedRequestCoalescer<string, string>();
    const request = vi.fn(async () => 'result');

    await coalescer.execute('key1', request);
    await coalescer.execute('key1', request);

    expect(request).toHaveBeenCalledTimes(2);
  });

  it('should cache results when ttl is set', async () => {
    coalescer = new CachedRequestCoalescer<string, string>({ ttl: 1000 });
    const request = vi.fn(async () => 'result');

    const result1 = await coalescer.execute('key1', request);
    const result2 = await coalescer.execute('key1', request);

    expect(result1).toBe('result');
    expect(result2).toBe('result');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('should expire cached results after ttl', async () => {
    coalescer = new CachedRequestCoalescer<string, string>({ ttl: 1000 });
    const request = vi.fn(async () => 'result');

    await coalescer.execute('key1', request);

    vi.advanceTimersByTime(1001);

    await coalescer.execute('key1', request);

    expect(request).toHaveBeenCalledTimes(2);
  });

  it('should coalesce concurrent requests even with caching', async () => {
    coalescer = new CachedRequestCoalescer<string, string>({ ttl: 1000 });
    const request = vi.fn(async () => {
      await vi.advanceTimersByTimeAsync(50);
      return 'result';
    });

    const [result1, result2, result3] = await Promise.all([
      coalescer.execute('key1', request),
      coalescer.execute('key1', request),
      coalescer.execute('key1', request),
    ]);

    expect(result1).toBe('result');
    expect(result2).toBe('result');
    expect(result3).toBe('result');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('should respect maxSize limit', async () => {
    coalescer = new CachedRequestCoalescer<string, string>({
      ttl: 1000,
      maxSize: 2,
    });
    const request = vi.fn(async (key: string) => `result-${key}`);

    await coalescer.execute('key1', () => request('key1'));
    await coalescer.execute('key2', () => request('key2'));
    await coalescer.execute('key3', () => request('key3'));

    const stats = coalescer.getStats();
    expect(stats.cacheSize).toBe(2);
  });

  it('should evict LRU entries when maxSize is exceeded', async () => {
    coalescer = new CachedRequestCoalescer<string, string>({
      ttl: 1000,
      maxSize: 2,
    });
    const request = vi.fn(async (key: string) => `result-${key}`);

    await coalescer.execute('key1', () => request('key1'));
    await coalescer.execute('key2', () => request('key2'));

    // Access key1 to make it more recently used
    await coalescer.execute('key1', () => request('key1'));

    // This should evict key2 (LRU)
    await coalescer.execute('key3', () => request('key3'));

    expect(coalescer.isCached('key1')).toBe(true);
    expect(coalescer.isCached('key2')).toBe(false);
    expect(coalescer.isCached('key3')).toBe(true);
  });

  it('should invalidate specific cache entry', async () => {
    coalescer = new CachedRequestCoalescer<string, string>({ ttl: 1000 });
    const request = vi.fn(async () => 'result');

    await coalescer.execute('key1', request);
    expect(coalescer.isCached('key1')).toBe(true);

    coalescer.invalidate('key1');
    expect(coalescer.isCached('key1')).toBe(false);

    await coalescer.execute('key1', request);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('should clear all cache and pending requests', async () => {
    coalescer = new CachedRequestCoalescer<string, string>({ ttl: 1000 });
    const request = vi.fn(async () => 'result');

    await coalescer.execute('key1', request);
    await coalescer.execute('key2', request);

    let stats = coalescer.getStats();
    expect(stats.cacheSize).toBe(2);

    coalescer.clear();

    stats = coalescer.getStats();
    expect(stats.cacheSize).toBe(0);
    expect(stats.pendingCount).toBe(0);
  });

  it('should provide accurate statistics', async () => {
    coalescer = new CachedRequestCoalescer<string, string>({
      ttl: 1000,
      maxSize: 5,
    });
    const resolvers: Array<(value: string) => void> = [];
    const request = vi.fn(
      async () =>
        new Promise<string>(resolve => {
          resolvers.push(resolve);
        }),
    );

    const promise1 = coalescer.execute('key1', request);
    const promise2 = coalescer.execute('key2', request);

    let stats = coalescer.getStats();
    expect(stats.pendingCount).toBe(2);
    expect(stats.cacheSize).toBe(0);
    expect(stats.maxSize).toBe(5);
    expect(stats.ttl).toBe(1000);

    resolvers[0]('result');
    resolvers[1]('result');
    await Promise.all([promise1, promise2]);

    stats = coalescer.getStats();
    expect(stats.pendingCount).toBe(0);
    expect(stats.cacheSize).toBe(2);
  });

  it('should check if request is pending', async () => {
    coalescer = new CachedRequestCoalescer<string, string>({ ttl: 1000 });
    let resolveFn: ((value: string) => void) | undefined;
    const request = vi.fn(
      async () =>
        new Promise<string>(resolve => {
          resolveFn = resolve;
        }),
    );

    expect(coalescer.isPending('key1')).toBe(false);

    const promise = coalescer.execute('key1', request);
    expect(coalescer.isPending('key1')).toBe(true);

    resolveFn!('result');
    await promise;
    expect(coalescer.isPending('key1')).toBe(false);
  });

  it('should not cache failed requests', async () => {
    coalescer = new CachedRequestCoalescer<string, string>({ ttl: 1000 });
    const error = new Error('Request failed');
    const request = vi.fn(async () => {
      throw error;
    });

    await expect(coalescer.execute('key1', request)).rejects.toThrow(
      'Request failed',
    );

    expect(coalescer.isCached('key1')).toBe(false);
    expect(request).toHaveBeenCalledTimes(1);

    await expect(coalescer.execute('key1', request)).rejects.toThrow(
      'Request failed',
    );
    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe('createKey', () => {
  it('should create consistent keys for same parameters', () => {
    const key1 = createKey('user', 123, true);
    const key2 = createKey('user', 123, true);

    expect(key1).toBe(key2);
  });

  it('should create different keys for different parameters', () => {
    const key1 = createKey('user', 123);
    const key2 = createKey('user', 456);

    expect(key1).not.toBe(key2);
  });

  it('should handle complex objects', () => {
    const key1 = createKey({ id: 123, name: 'test' }, [1, 2, 3]);
    const key2 = createKey({ id: 123, name: 'test' }, [1, 2, 3]);

    expect(key1).toBe(key2);
  });
});

describe('coalesceFunction', () => {
  it('should coalesce function calls', async () => {
    const fn = vi.fn(async (id: string) => `result-${id}`);

    const coalescedFn = coalesceFunction(fn);

    const [result1, result2, result3] = await Promise.all([
      coalescedFn('123'),
      coalescedFn('123'),
      coalescedFn('123'),
    ]);

    expect(result1).toBe('result-123');
    expect(result2).toBe('result-123');
    expect(result3).toBe('result-123');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should use custom key function', async () => {
    const fn = vi.fn(
      async (obj: { id: string; ignore: string }) => `result-${obj.id}`,
    );

    // Key function that only considers the id property
    const coalescedFn = coalesceFunction(fn, obj => obj.id);

    const [result1, result2] = await Promise.all([
      coalescedFn({ id: '123', ignore: 'a' }),
      coalescedFn({ id: '123', ignore: 'b' }),
    ]);

    expect(result1).toBe('result-123');
    expect(result2).toBe('result-123');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple different keys', async () => {
    const fn = vi.fn(async (id: string) => `result-${id}`);
    const coalescedFn = coalesceFunction(fn);

    const [result1, result2] = await Promise.all([
      coalescedFn('123'),
      coalescedFn('456'),
    ]);

    expect(result1).toBe('result-123');
    expect(result2).toBe('result-456');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should work with multiple arguments', async () => {
    const fn = vi.fn(
      async (a: string, b: number, c: boolean) => `${a}-${b}-${c}`,
    );
    const coalescedFn = coalesceFunction(fn);

    const [result1, result2] = await Promise.all([
      coalescedFn('test', 123, true),
      coalescedFn('test', 123, true),
    ]);

    expect(result1).toBe('test-123-true');
    expect(result2).toBe('test-123-true');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
