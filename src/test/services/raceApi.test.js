import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the logger and validator modules
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    apiError: vi.fn(),
    performance: vi.fn(),
  },
}));

vi.mock('../../utils/validator', () => ({
  validator: {
    validateApiResponse: vi.fn(() => ({
      isValid: true,
      errors: [],
      sanitizedValue: {},
    })),
    validateRaceData: vi.fn(() => ({
      isValid: true,
      errors: [],
      sanitizedValue: {},
    })),
  },
}));

// Mock axios BEFORE any imports
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}));

describe('RaceApiService', () => {
  let raceApi;
  let mockedAxios;
  let mockClient;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create a mock client
    mockClient = {
      get: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    };

    // Import axios and raceApi after mocking
    const axios = (await import('axios')).default;
    mockedAxios = vi.mocked(axios);

    // Setup the mock return value
    mockedAxios.create.mockReturnValue(mockClient);

    // Re-import raceApi to get a fresh instance with the mocked axios
    vi.resetModules();
    raceApi = (await import('../../services/raceApi')).raceApi;
  });

  describe('getRaces', () => {
    it('fetches races successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            next_to_go_ids: ['race-1', 'race-2'],
            race_summaries: {
              'race-1': {
                race_id: 'race-1',
                race_name: 'Test Race 1',
                race_number: 1,
                meeting_id: 'meeting-1',
                meeting_name: 'Test Meeting',
                category_id: '9daef0d7-bf3c-4f50-921d-8e818c60fe61',
                advertised_start: { seconds: 1704110400 },
                venue_id: 'venue-1',
                venue_name: 'Test Venue',
                venue_state: 'NSW',
                venue_country: 'AU',
              },
              'race-2': {
                race_id: 'race-2',
                race_name: 'Test Race 2',
                race_number: 2,
                meeting_id: 'meeting-2',
                meeting_name: 'Test Meeting 2',
                category_id: '4a2788f8-e825-4d36-9894-efd4baf1cfae',
                advertised_start: { seconds: 1704111000 },
                venue_id: 'venue-2',
                venue_name: 'Test Venue 2',
                venue_state: 'VIC',
                venue_country: 'AU',
              },
            },
          },
        },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await raceApi.getRaces();

      expect(result).toHaveLength(2);
      expect(result[0].race_id).toBe('race-1');
      expect(result[0].race_name).toBe('Test Race 1');
      expect(result[0].race_number).toBe(1);
      expect(result[0].meeting_name).toBe('Test Meeting');
      expect(result[0].category_id).toBe(
        '9daef0d7-bf3c-4f50-921d-8e818c60fe61',
      );
    });

    it('handles API errors correctly', async () => {
      mockClient.get.mockRejectedValue(new Error('Network error'));

      await expect(raceApi.getRaces()).rejects.toThrow('Network error');
    });

    it('handles invalid API response format', async () => {
      const mockResponse = {
        data: {
          data: {
            // Missing race_summaries
          },
        },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      await expect(raceApi.getRaces()).rejects.toThrow(
        'Invalid API response format',
      );
    });

    it('transforms race data correctly', async () => {
      const mockResponse = {
        data: {
          data: {
            next_to_go_ids: ['race-1'],
            race_summaries: {
              'race-1': {
                race_id: 'race-1',
                race_name: 'Test Race',
                race_number: 1,
                meeting_id: 'meeting-1',
                meeting_name: 'Test Meeting',
                category_id: 'test-category',
                advertised_start: { seconds: 1704110400 },
                venue_id: 'venue-1',
                venue_name: 'Test Venue',
                venue_state: 'NSW',
                venue_country: 'AU',
              },
            },
          },
        },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await raceApi.getRaces();

      expect(result[0].advertised_start).toBeInstanceOf(Date);
    });

    it('handles advertised_start correctly', async () => {
      const mockResponse = {
        data: {
          data: {
            next_to_go_ids: ['race-1'],
            race_summaries: {
              'race-1': {
                race_id: 'race-1',
                race_name: 'Test Race',
                race_number: 1,
                meeting_id: 'meeting-1',
                meeting_name: 'Test Meeting',
                category_id: 'test-category',
                advertised_start: { seconds: 1704110400 },
                venue_id: 'venue-1',
                venue_name: 'Test Venue',
                venue_state: 'NSW',
                venue_country: 'AU',
              },
            },
          },
        },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await raceApi.getRaces();

      expect(result[0].advertised_start).toBeInstanceOf(Date);
      expect(result[0].advertised_start.getTime()).toBeGreaterThan(0);
    });
  });

  describe('getRaceById', () => {
    it('fetches specific race by ID', async () => {
      const mockResponse = {
        data: {
          data: {
            next_to_go_ids: ['race-1', 'race-2'],
            race_summaries: {
              'race-1': {
                race_id: 'race-1',
                race_name: 'Test Race 1',
                race_number: 1,
                meeting_id: 'meeting-1',
                meeting_name: 'Test Meeting',
                category_id: 'test-category',
                advertised_start: { seconds: 1704110400 },
                venue_id: 'venue-1',
                venue_name: 'Test Venue',
                venue_state: 'NSW',
                venue_country: 'AU',
              },
              'race-2': {
                race_id: 'race-2',
                race_name: 'Test Race 2',
                race_number: 2,
                meeting_id: 'meeting-2',
                meeting_name: 'Test Meeting 2',
                category_id: 'test-category',
                advertised_start: { seconds: 1704111000 },
                venue_id: 'venue-2',
                venue_name: 'Test Venue 2',
                venue_state: 'VIC',
                venue_country: 'AU',
              },
            },
          },
        },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await raceApi.getRaceById('race-1');

      expect(result).not.toBeNull();
      expect(result?.race_id).toBe('race-1');
      expect(result?.race_name).toBe('Test Race 1');
    });

    it('handles errors when fetching race by ID', async () => {
      mockClient.get.mockRejectedValue(new Error('Not found'));

      const result = await raceApi.getRaceById('race-1');
      expect(result).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('handles network errors', async () => {
      const networkError = new Error('Network Error');
      networkError.request = {};

      const mockClient = {
        get: vi.fn().mockRejectedValue(networkError),
        interceptors: {
          request: { use: vi.fn() },
          response: {
            use: vi.fn((successHandler, errorHandler) => {
              // Simulate the interceptor behavior - call error handler
              return errorHandler;
            }),
          },
        },
      };

      mockedAxios.create.mockReturnValue(mockClient);
      vi.resetModules();
      raceApi = (await import('../../services/raceApi')).raceApi;

      await expect(raceApi.getRaces()).rejects.toThrow();
    });

    it('handles 404 response errors', async () => {
      const responseError = new Error('Not Found');
      responseError.response = {
        status: 404,
        statusText: 'Not Found',
        data: {},
      };

      mockClient.get.mockRejectedValue(responseError);

      await expect(raceApi.getRaces()).rejects.toThrow();
    });

    it('handles 500 response errors', async () => {
      const responseError = new Error('Server Error');
      responseError.response = {
        status: 500,
        statusText: 'Internal Server Error',
        data: {},
      };

      mockClient.get.mockRejectedValue(responseError);

      await expect(raceApi.getRaces()).rejects.toThrow();
    });
  });
});
