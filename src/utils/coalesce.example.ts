/**
 * Examples of using the Request Coalescer utilities
 * This file is for documentation purposes only and is not executed in production.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */

import {
  RequestCoalescer,
  CachedRequestCoalescer,
  coalesceFunction,
  createKey,
} from './coalesce';

// ============================================================================
// Example 1: Basic Request Coalescing for API Calls
// ============================================================================

interface User {
  id: string;
  name: string;
  email: string;
}

// Without coalescing - multiple API calls
async function fetchUserBad(userId: string): Promise<User> {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
}

// With coalescing - deduplicated API calls
const userCoalescer = new RequestCoalescer<string, User>();

async function fetchUserGood(userId: string): Promise<User> {
  return userCoalescer.execute(userId, async () => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  });
}

// Usage example:
async function exampleBasicUsage() {
  // Even if called 100 times concurrently, only 1 API call is made
  const promises = Array.from({ length: 100 }, () => fetchUserGood('user-123'));
  const users = await Promise.all(promises);
  // All 100 promises resolve with the same user data
  console.log(`Fetched ${users.length} users with 1 API call`);
}

// ============================================================================
// Example 2: Function Wrapper Pattern
// ============================================================================

// Original API function
async function fetchProduct(
  productId: string,
): Promise<{ id: string; name: string }> {
  const response = await fetch(`/api/products/${productId}`);
  return response.json();
}

// Wrap it with coalescing
const fetchProductCoalesced = coalesceFunction(fetchProduct);

// Now use it anywhere - concurrent calls are automatically deduplicated
async function exampleFunctionWrapper() {
  const [product1, product2, product3] = await Promise.all([
    fetchProductCoalesced('prod-123'),
    fetchProductCoalesced('prod-123'), // Same ID - will reuse the first call
    fetchProductCoalesced('prod-456'), // Different ID - separate call
  ]);
  console.log('Only 2 API calls made instead of 3');
}

// ============================================================================
// Example 3: Cached Coalescing with TTL
// ============================================================================

// Create a coalescer with 5-second cache
const cachedUserCoalescer = new CachedRequestCoalescer<string, User>({
  ttl: 5000, // 5 seconds
  maxSize: 100, // Maximum 100 cached users
});

async function fetchUserCached(userId: string): Promise<User> {
  return cachedUserCoalescer.execute(userId, async () => {
    console.log(`Actually fetching user ${userId} from API`);
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  });
}

async function exampleCachedCoalescing() {
  // First call - hits the API
  await fetchUserCached('user-123');

  // Second call within 5 seconds - returns cached result
  await fetchUserCached('user-123');

  // Wait 6 seconds
  await new Promise(resolve => setTimeout(resolve, 6000));

  // This call - cache expired, hits API again
  await fetchUserCached('user-123');
}

// ============================================================================
// Example 4: Complex Key Generation
// ============================================================================

interface SearchParams {
  query: string;
  category: string;
  page: number;
}

const searchCoalescer = new RequestCoalescer<string, unknown[]>();

async function searchProducts(params: SearchParams) {
  // Create a unique key from multiple parameters
  const key = createKey(params.query, params.category, params.page);

  return searchCoalescer.execute(key, async () => {
    const response = await fetch(
      `/api/search?q=${params.query}&cat=${params.category}&page=${params.page}`,
    );
    return response.json();
  });
}

// Custom key function for more control
const searchWithCustomKey = coalesceFunction(
  async (params: SearchParams) => {
    const response = await fetch(
      `/api/search?q=${params.query}&cat=${params.category}&page=${params.page}`,
    );
    return response.json();
  },
  // Custom key that ignores the page parameter
  params => `${params.query}-${params.category}`,
);

// ============================================================================
// Example 5: Real-world Vue.js Store Integration
// ============================================================================

import { ref } from 'vue';

// In a Pinia store or composable
export function useUserStore() {
  const users = ref<Map<string, User>>(new Map());
  const coalescer = new CachedRequestCoalescer<string, User>({
    ttl: 60000, // 1 minute cache
    maxSize: 500,
  });

  async function getUser(userId: string): Promise<User> {
    return coalescer.execute(userId, async () => {
      const response = await fetch(`/api/users/${userId}`);
      const user = await response.json();
      users.value.set(userId, user);
      return user;
    });
  }

  function invalidateUser(userId: string) {
    coalescer.invalidate(userId);
    users.value.delete(userId);
  }

  return {
    users,
    getUser,
    invalidateUser,
    stats: () => coalescer.getStats(),
  };
}

// ============================================================================
// Example 6: Race Condition Protection
// ============================================================================

// Dangerous: Without coalescing, race conditions can occur
let sharedState = 0;
async function incrementWithoutCoalescing() {
  const current = sharedState;
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API call
  sharedState = current + 1;
}

// Safe: With coalescing, operations are serialized
const stateCoalescer = new RequestCoalescer<string, number>();
async function incrementWithCoalescing() {
  return stateCoalescer.execute('shared-state', async () => {
    const current = sharedState;
    await new Promise(resolve => setTimeout(resolve, 100));
    sharedState = current + 1;
    return sharedState;
  });
}

async function exampleRaceCondition() {
  // Without coalescing - race condition!
  sharedState = 0;
  await Promise.all([
    incrementWithoutCoalescing(),
    incrementWithoutCoalescing(),
    incrementWithoutCoalescing(),
  ]);
  console.log(`Without coalescing: ${sharedState}`); // Might be 1 or 2, not 3!

  // With coalescing - safe!
  sharedState = 0;
  await Promise.all([
    incrementWithCoalescing(),
    incrementWithCoalescing(),
    incrementWithCoalescing(),
  ]);
  console.log(`With coalescing: ${sharedState}`); // Always 1 (all share same call)
}

// ============================================================================
// Example 7: Monitoring and Debugging
// ============================================================================

const monitoredCoalescer = new CachedRequestCoalescer<string, unknown>({
  ttl: 30000,
  maxSize: 200,
});

async function fetchWithMonitoring(
  key: string,
  fetcher: () => Promise<unknown>,
) {
  const startTime = Date.now();
  const wasCached = monitoredCoalescer.isCached(key);
  const wasPending = monitoredCoalescer.isPending(key);

  try {
    const result = await monitoredCoalescer.execute(key, fetcher);
    const duration = Date.now() - startTime;

    console.log({
      key,
      duration,
      wasCached,
      wasPending,
      status: 'success',
      stats: monitoredCoalescer.getStats(),
    });

    return result;
  } catch (error) {
    console.error({
      key,
      wasCached,
      wasPending,
      status: 'error',
      error,
    });
    throw error;
  }
}
