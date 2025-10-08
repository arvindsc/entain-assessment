/**
 * Test utilities and helpers
 * Provides common testing utilities for components, stores, and services
 */

import { mount, VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { vi } from 'vitest';
import type { App } from 'vue';

// Mock data generators
export const mockRace = {
  race_id: 'test-race-1',
  race_name: 'Test Race',
  race_number: 1,
  meeting_id: 'test-meeting-1',
  meeting_name: 'Test Meeting',
  category_id: '9daef0d7-bf3c-4f50-921d-8e818c60fe61', // Greyhound
  advertised_start: new Date('2024-01-01T12:00:00Z'),
  venue_id: 'test-venue-1',
  venue_name: 'Test Venue',
  venue_state: 'NSW',
  venue_country: 'AU',
};

export const mockRaces = [
  mockRace,
  {
    ...mockRace,
    race_id: 'test-race-2',
    race_number: 2,
    category_id: '4a2788f8-e825-4d36-9894-efd4baf1cfae', // Horse
  },
  {
    ...mockRace,
    race_id: 'test-race-3',
    race_number: 3,
    category_id: '161d9be2-e909-4326-8c2c-35ed71fb460b', // Harness
  },
];

export const mockApiResponse = {
  status: 200,
  data: {
    next_to_go_ids: ['test-race-1', 'test-race-2', 'test-race-3'],
    race_summaries: {
      'test-race-1': {
        ...mockRace,
        advertised_start: {
          seconds: Math.floor(mockRace.advertised_start.getTime() / 1000),
        },
      },
      'test-race-2': {
        ...mockRaces[1],
        advertised_start: {
          seconds: Math.floor(mockRaces[1].advertised_start.getTime() / 1000),
        },
      },
      'test-race-3': {
        ...mockRaces[2],
        advertised_start: {
          seconds: Math.floor(mockRaces[2].advertised_start.getTime() / 1000),
        },
      },
    },
  },
  message: 'Success',
};

// Mock store factory
export const createMockRaceStore = (initialState = {}) => {
  return {
    races: ref(mockRaces),
    categories: ref([
      {
        id: '9daef0d7-bf3c-4f50-921d-8e818c60fe61',
        name: 'Greyhound Racing',
        color: 'bg-gray-600',
        shortName: 'Greyhound',
      },
      {
        id: '161d9be2-e909-4326-8c2c-35ed71fb460b',
        name: 'Harness Racing',
        color: 'bg-blue-600',
        shortName: 'Harness',
      },
      {
        id: '4a2788f8-e825-4d36-9894-efd4baf1cfae',
        name: 'Horse Racing',
        color: 'bg-green-600',
        shortName: 'Horse',
      },
    ]),
    selectedCategories: ref(new Set()),
    isLoading: ref(false),
    error: ref(null),
    lastFetchTime: ref(null),
    config: ref({
      MAX_RACES_DISPLAYED: 5,
      AUTO_REFRESH_INTERVAL: 30000,
      TIME_FILTER_HOURS: 24,
      RACE_REMOVAL_BUFFER: 60000,
    }),
    filteredRaces: computed(() => mockRaces),
    sortedRaces: computed(() => mockRaces),
    activeRaces: computed(() => mockRaces),
    fetchRaces: vi.fn().mockResolvedValue(undefined),
    toggleCategory: vi.fn(),
    selectAllCategories: vi.fn(),
    clearError: vi.fn(),
    reset: vi.fn(),
    getCategoryById: vi.fn(id => {
      const categories = [
        {
          id: '9daef0d7-bf3c-4f50-921d-8e818c60fe61',
          name: 'Greyhound Racing',
          color: 'bg-gray-600',
          shortName: 'Greyhound',
        },
        {
          id: '161d9be2-e909-4326-8c2c-35ed71fb460b',
          name: 'Harness Racing',
          color: 'bg-blue-600',
          shortName: 'Harness',
        },
        {
          id: '4a2788f8-e825-4d36-9894-efd4baf1cfae',
          name: 'Horse Racing',
          color: 'bg-green-600',
          shortName: 'Horse',
        },
      ];
      return categories.find(cat => cat.id === id);
    }),
    getCategoryShortName: vi.fn(id => {
      const map = {
        '9daef0d7-bf3c-4f50-921d-8e818c60fe61': 'Greyhound',
        '161d9be2-e909-4326-8c2c-35ed71fb460b': 'Harness',
        '4a2788f8-e825-4d36-9894-efd4baf1cfae': 'Horse',
      };
      return map[id] || 'Unknown';
    }),
    getCategoryColor: vi.fn(id => {
      const map = {
        '9daef0d7-bf3c-4f50-921d-8e818c60fe61': 'bg-gray-600',
        '161d9be2-e909-4326-8c2c-35ed71fb460b': 'bg-blue-600',
        '4a2788f8-e825-4d36-9894-efd4baf1cfae': 'bg-green-600',
      };
      return map[id] || 'bg-gray-500';
    }),
    ...initialState,
  };
};

// Component testing utilities
export const createTestWrapper = (component: any, options = {}) => {
  const pinia = createPinia();
  setActivePinia(pinia);

  return mount(component, {
    global: {
      plugins: [pinia],
      stubs: {
        // Stub external components if needed
        'router-link': true,
        'router-view': true,
      },
    },
    ...options,
  });
};

// Mock API utilities
export const mockAxios = {
  create: vi.fn(() => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  })),
};

export const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  apiError: vi.fn(),
  userAction: vi.fn(),
  performance: vi.fn(),
  getLogs: vi.fn(() => []),
  clearLogs: vi.fn(),
};

export const mockValidator = {
  validate: vi.fn(() => ({ isValid: true, errors: [], sanitizedValue: null })),
  validateRaceData: vi.fn(() => ({
    isValid: true,
    errors: [],
    sanitizedValue: mockRace,
  })),
  validateCategoryId: vi.fn(() => ({
    isValid: true,
    errors: [],
    sanitizedValue: 'test-category',
  })),
  validateApiResponse: vi.fn(() => ({
    isValid: true,
    errors: [],
    sanitizedValue: mockApiResponse,
  })),
  sanitizeString: vi.fn(input => input),
  sanitizeHtml: vi.fn(input => input),
};

// Test environment setup
export const setupTestEnvironment = () => {
  // Mock global objects
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock performance API
  global.performance = {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByType: vi.fn(() => []),
    getEntriesByName: vi.fn(() => []),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
  } as any;

  // Mock fetch API
  global.fetch = vi.fn();

  // Mock console methods
  global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
};

// Cleanup utilities
export const cleanupTestEnvironment = () => {
  vi.clearAllMocks();
  vi.resetAllMocks();
  vi.restoreAllMocks();
};

// Custom matchers
export const customMatchers = {
  toBeValidRace: (received: any) => {
    const requiredFields = [
      'race_id',
      'race_name',
      'race_number',
      'meeting_name',
      'category_id',
      'advertised_start',
      'venue_name',
    ];

    const missingFields = requiredFields.filter(field => !(field in received));

    if (missingFields.length > 0) {
      return {
        message: () =>
          `Expected race to have required fields: ${missingFields.join(', ')}`,
        pass: false,
      };
    }

    if (typeof received.race_id !== 'string') {
      return {
        message: () => 'Expected race_id to be a string',
        pass: false,
      };
    }

    if (typeof received.race_number !== 'number') {
      return {
        message: () => 'Expected race_number to be a number',
        pass: false,
      };
    }

    if (!(received.advertised_start instanceof Date)) {
      return {
        message: () => 'Expected advertised_start to be a Date',
        pass: false,
      };
    }

    return {
      message: () => 'Expected race to be invalid',
      pass: true,
    };
  },
};

// Test data factories
export const createRaceFactory = (overrides = {}) => ({
  race_id: `test-race-${Math.random().toString(36).substr(2, 9)}`,
  race_name: 'Test Race',
  race_number: Math.floor(Math.random() * 10) + 1,
  meeting_id: `test-meeting-${Math.random().toString(36).substr(2, 9)}`,
  meeting_name: 'Test Meeting',
  category_id: '9daef0d7-bf3c-4f50-921d-8e818c60fe61',
  advertised_start: new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000),
  venue_id: `test-venue-${Math.random().toString(36).substr(2, 9)}`,
  venue_name: 'Test Venue',
  venue_state: 'NSW',
  venue_country: 'AU',
  ...overrides,
});

export const createApiResponseFactory = (races = [mockRace]) => ({
  status: 200,
  data: {
    next_to_go_ids: races.map(race => race.race_id),
    race_summaries: races.reduce(
      (acc, race) => {
        acc[race.race_id] = {
          ...race,
          advertised_start: {
            seconds: Math.floor(race.advertised_start.getTime() / 1000),
          },
        };
        return acc;
      },
      {} as Record<string, any>
    ),
  },
  message: 'Success',
});

// Export all utilities
export default {
  mockRace,
  mockRaces,
  mockApiResponse,
  createMockRaceStore,
  createTestWrapper,
  mockAxios,
  mockLogger,
  mockValidator,
  setupTestEnvironment,
  cleanupTestEnvironment,
  customMatchers,
  createRaceFactory,
  createApiResponseFactory,
};
