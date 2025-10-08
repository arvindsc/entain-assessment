import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type { Race, RaceApiResponse, RaceSummary, ApiError } from '../types';
import { logger } from '../utils/logger';
import { validator } from '../utils/validator';
import { CONFIG } from '../config';

/**
 * API Base URL for Neds racing data
 * Uses CORS proxy to handle network/DNS blocking issues
 */
const getApiBaseUrl = (): string => {
  if (CONFIG.USE_CORS_PROXY) {
    return CONFIG.CORS_PROXY_URL + encodeURIComponent(CONFIG.API_BASE_URL);
  }
  return CONFIG.API_BASE_URL;
};

/**
 * Race API Service
 * Handles all API calls to the Neds racing API with proper error handling
 */
class RaceApiService {
  private readonly api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: getApiBaseUrl(),
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request/response interceptors for logging and error handling
   * @private
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      config => {
        const startTime = performance.now();
        // Use proper typing for axios config with custom property
        (config as typeof config & { __startTime: number }).__startTime =
          startTime;

        logger.debug('API Request initiated', {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params,
        });

        return config;
      },
      error => {
        logger.error('Request interceptor error', {}, error);
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.api.interceptors.response.use(
      response => {
        const configWithStartTime =
          response.config as typeof response.config & {
            __startTime?: number;
          };
        const duration =
          performance.now() - (configWithStartTime.__startTime ?? 0);

        logger.info('API Response received', {
          status: response.status,
          url: response.config.url,
          duration: Math.round(duration),
          dataSize: JSON.stringify(response.data).length,
        });

        logger.performance('API Request', duration, {
          url: response.config.url,
          status: response.status,
        });

        return response;
      },
      (error: AxiosError) => {
        const configWithStartTime = error.config as typeof error.config & {
          __startTime?: number;
        };
        const duration =
          performance.now() - (configWithStartTime?.__startTime ?? 0);
        const apiError = this.handleApiError(error);

        logger.apiError('API request failed', apiError, {
          url: error.config?.url,
          method: error.config?.method,
          duration: Math.round(duration),
        });

        return Promise.reject(apiError);
      },
    );
  }

  /**
   * Handle API errors and convert to user-friendly messages
   * @param {AxiosError} error - Axios error object
   * @returns {ApiError} Formatted error
   * @private
   */
  private handleApiError(error: AxiosError): ApiError {
    const apiError: ApiError = new Error('Failed to fetch race data');

    if (error.response) {
      // Server responded with error status
      apiError.status = error.response.status;
      apiError.code = `HTTP_${error.response.status}`;
      apiError.response = {
        data: error.response.data,
        status: error.response.status,
      };

      switch (error.response.status) {
        case 400:
          apiError.message = 'Invalid request. Please try again.';
          break;
        case 404:
          apiError.message = 'Race data not found.';
          break;
        case 429:
          apiError.message = 'Too many requests. Please wait a moment.';
          break;
        case 500:
          apiError.message = 'Server error. Please try again later.';
          break;
        default:
          apiError.message = `Server error (${error.response.status}). Please try again.`;
      }
    } else if (error.request) {
      // Network error
      apiError.code = 'NETWORK_ERROR';
      apiError.message = 'Network error. Please check your connection.';
    } else {
      // Other error
      apiError.code = 'UNKNOWN_ERROR';
      apiError.message = 'An unexpected error occurred.';
    }

    return apiError;
  }

  /**
   * Transform race data from API response to application format
   * @param {RaceSummary} raceSummary - Race summary from API
   * @returns {Race} Transformed race object
   * @private
   */
  private transformRaceData(raceSummary: RaceSummary): Race {
    return {
      race_id: raceSummary.race_id,
      race_name: raceSummary.race_name,
      race_number: raceSummary.race_number,
      meeting_id: raceSummary.meeting_id,
      meeting_name: raceSummary.meeting_name,
      category_id: raceSummary.category_id,
      advertised_start: this.parseAdvertisedStart(raceSummary.advertised_start),
      venue_id: raceSummary.venue_id,
      venue_name: raceSummary.venue_name,
      venue_state: raceSummary.venue_state,
      venue_country: raceSummary.venue_country,
    };
  }

  /**
   * Parse advertised start time from API response
   * @param {object} advertisedStart - Advertised start object from API
   * @returns {Date} Parsed date object
   * @private
   */
  private parseAdvertisedStart(advertisedStart: { seconds: number }): Date {
    try {
      // Validate input
      if (!advertisedStart || typeof advertisedStart.seconds !== 'number') {
        throw new Error('Invalid advertised_start format');
      }

      // Convert seconds to milliseconds for Date constructor
      const timestamp = advertisedStart.seconds * 1000;

      logger.debug('Parsing race timestamp', {
        originalSeconds: advertisedStart.seconds,
        timestamp,
        parsedDate: new Date(timestamp).toISOString(),
      });

      const date = new Date(timestamp);

      // Validate the parsed date
      if (isNaN(date.getTime())) {
        throw new Error('Invalid timestamp: cannot parse date');
      }

      // Handle dates far in the future (more than 1 year from now) - adjust to current time + random hours
      const now = new Date();
      const oneYearFromNow = new Date(
        now.getTime() + 365 * 24 * 60 * 60 * 1000,
      );

      if (date.getTime() > oneYearFromNow.getTime()) {
        const adjustedDate = new Date(
          now.getTime() + Math.random() * 24 * 60 * 60 * 1000,
        );

        logger.warn('Adjusted future race date', {
          originalDate: date.toISOString(),
          adjustedDate: adjustedDate.toISOString(),
        });

        return adjustedDate;
      }

      return date;
    } catch (error) {
      logger.error(
        'Failed to parse advertised start time',
        {
          advertisedStart,
        },
        error as Error,
      );

      // Return current time as fallback
      return new Date();
    }
  }

  /**
   * Fetch races from the API
   * @param {number} count - Number of races to fetch
   * @returns {Promise<readonly Race[]>} Array of race objects
   */
  async getRaces(count: number = 10): Promise<readonly Race[]> {
    const startTime = performance.now();

    try {
      // Validate input
      if (typeof count !== 'number' || count < 1 || count > 100) {
        throw new Error('Invalid count parameter: must be between 1 and 100');
      }

      logger.info('Fetching races from API', { count });

      const response = await this.api.get<RaceApiResponse>('/', {
        params: {
          method: 'nextraces',
          count,
        },
      });

      const { data } = response.data;

      // Validate API response structure
      const validationResult = validator.validateApiResponse(response.data);
      if (!validationResult.isValid) {
        throw new Error(
          `Invalid API response: ${validationResult.errors.join(', ')}`,
        );
      }

      if (!data?.next_to_go_ids || !data.race_summaries) {
        throw new Error('Invalid API response format: missing required fields');
      }

      logger.debug('API response validation passed', {
        raceIdsCount: data.next_to_go_ids.length,
        raceSummariesCount: Object.keys(data.race_summaries).length,
      });

      // Transform and validate race summaries
      const races: Race[] = [];
      const errors: string[] = [];

      for (const raceId of data.next_to_go_ids) {
        const raceSummary = data.race_summaries[raceId];

        if (!raceSummary) {
          logger.warn('Missing race summary for ID', { raceId });
          continue;
        }

        try {
          // Transform race data first (converts advertised_start to Date)
          const race = this.transformRaceData(raceSummary);

          // Validate the transformed race data
          const raceValidation = validator.validateRaceData(race);
          if (!raceValidation.isValid) {
            logger.warn('Invalid race data after transformation', {
              raceId,
              errors: raceValidation.errors,
            });
            errors.push(`Race ${raceId}: ${raceValidation.errors.join(', ')}`);
            continue;
          }

          races.push(race);
        } catch (transformError) {
          logger.error(
            'Failed to transform race data',
            {
              raceId,
              raceSummary,
            },
            transformError as Error,
          );
          errors.push(`Race ${raceId}: transformation failed`);
        }
      }

      const duration = performance.now() - startTime;

      logger.info('Races fetched successfully', {
        requestedCount: count,
        actualCount: races.length,
        errorsCount: errors.length,
        duration: Math.round(duration),
      });

      logger.performance('Race API fetch', duration, {
        requestedCount: count,
        actualCount: races.length,
      });

      // Log validation errors if any
      if (errors.length > 0) {
        logger.warn('Race data validation errors', { errors });
      }

      return races;
    } catch (error) {
      const duration = performance.now() - startTime;

      logger.error(
        'Failed to fetch races',
        {
          count,
          duration: Math.round(duration),
        },
        error as Error,
      );

      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch races');
    }
  }

  /**
   * Get a specific race by ID
   * @param {string} raceId - The race ID
   * @returns {Promise<Race | null>} Race object or null if not found
   */
  async getRaceById(raceId: string): Promise<Race | null> {
    try {
      // Validate input
      if (typeof raceId !== 'string' || raceId.trim().length === 0) {
        throw new Error('Invalid race ID: must be a non-empty string');
      }

      logger.debug('Fetching race by ID', { raceId });

      const races = await this.getRaces(50); // Get more races to increase chances of finding the specific one
      const race = races.find(r => r.race_id === raceId);

      if (race) {
        logger.debug('Race found by ID', { raceId, raceName: race.race_name });
      } else {
        logger.warn('Race not found by ID', { raceId });
      }

      return race ?? null;
    } catch (error) {
      logger.error('Error fetching race by ID', { raceId }, error as Error);
      return null;
    }
  }
}

// Export singleton instance
export const raceApi = new RaceApiService();
