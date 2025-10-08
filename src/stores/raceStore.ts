import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { raceApi } from '../services/raceApi';
import type { Race, Category, RaceStore } from '../types';
import { logger } from '../utils/logger';
import { validator } from '../utils/validator';
import { CONFIG } from '../config';

/**
 * Race categories with their display properties
 * @constant {readonly Category[]}
 */
const RACE_CATEGORIES: readonly Category[] = [
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
] as const;

/**
 * Race Store - Manages race data, filtering, and state
 * Uses Pinia for reactive state management with Vue 3 Composition API
 */
export const useRaceStore = defineStore('race', (): RaceStore => {
  // State
  const races = ref<readonly Race[]>([]);
  const selectedCategories = ref<Set<string>>(new Set());
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const lastFetchTime = ref<Date | null>(null);

  // Getters
  const categories = computed<readonly Category[]>(() => RACE_CATEGORIES);
  const config = computed<typeof CONFIG>(() => CONFIG);

  /**
   * Get races filtered by selected categories
   * @returns {readonly Race[]} Filtered race array
   */
  const filteredRaces = computed<readonly Race[]>(() => {
    if (selectedCategories.value.size === 0) {
      return races.value;
    }
    return races.value.filter(race =>
      selectedCategories.value.has(race.category_id),
    );
  });

  /**
   * Get races sorted by start time and limited to max display count
   * @returns {readonly Race[]} Sorted race array
   */
  const sortedRaces = computed<readonly Race[]>(() => {
    return [...filteredRaces.value]
      .sort(
        (a, b) => a.advertised_start.getTime() - b.advertised_start.getTime(),
      )
      .slice(0, CONFIG.MAX_RACES_DISPLAYED);
  });

  /**
   * Get active races that haven't started yet or are within the removal buffer
   * @returns {readonly Race[]} Active race array
   */
  const activeRaces = computed<readonly Race[]>(() => {
    const result = sortedRaces.value;
    logger.debug('Active races computed', {
      sortedCount: sortedRaces.value.length,
      filteredCount: filteredRaces.value.length,
      totalRaces: races.value.length,
      selectedCategories: Array.from(selectedCategories.value),
      activeCount: result.length,
      races: result,
    });
    return result;
  });

  /**
   * Get category information by ID
   * @param {string} categoryId - The category ID
   * @returns {Category | undefined} Category object or undefined
   */
  const getCategoryById = (categoryId: string): Category | undefined => {
    return categories.value.find(cat => cat.id === categoryId);
  };

  /**
   * Get short name for a category
   * @param {string} categoryId - The category ID
   * @returns {string} Short name or fallback
   */
  const getCategoryShortName = (categoryId: string): string => {
    const category = getCategoryById(categoryId);
    return category?.shortName ?? 'Unknown';
  };

  /**
   * Get color class for a category
   * @param {string} categoryId - The category ID
   * @returns {string} Color class or fallback
   */
  const getCategoryColor = (categoryId: string): string => {
    const category = getCategoryById(categoryId);
    return category?.color ?? 'bg-gray-500';
  };

  // Actions
  /**
   * Fetch races from the API
   * @param {number} count - Number of races to fetch
   * @param {boolean} silent - If true, don't show loading state (for background refresh)
   * @returns {Promise<void>}
   */
  const fetchRaces = async (
    count: number = 10,
    silent: boolean = false,
  ): Promise<void> => {
    const startTime = performance.now();

    // Prevent concurrent requests
    if (isLoading.value && !silent) {
      logger.warn('Race fetch already in progress, skipping', {
        count,
        silent,
      });
      return;
    }

    // Validate input
    if (typeof count !== 'number' || count < 1 || count > 100) {
      const errorMsg = 'Invalid count parameter: must be between 1 and 100';
      logger.error('Invalid fetchRaces parameter', { count });
      if (!silent) {
        error.value = errorMsg;
      }
      throw new Error(errorMsg);
    }

    if (!silent) {
      isLoading.value = true;
      error.value = null;
    }

    try {
      logger.info('Fetching races from store', { count, silent });

      const data = await raceApi.getRaces(count);

      logger.debug('Races fetched from API', {
        count: data.length,
        races: data,
      });

      logger.info('Raw API data received', {
        count: data.length,
        firstRace: data[0]
          ? {
              race_id: data[0].race_id,
              advertised_start: data[0].advertised_start,
              advertised_start_type: typeof data[0].advertised_start,
              advertised_start_value:
                data[0].advertised_start instanceof Date
                  ? data[0].advertised_start.toISOString()
                  : data[0].advertised_start,
            }
          : null,
      });

      // Validate fetched data
      const validRaces: Race[] = [];
      const invalidRaces: string[] = [];

      for (const race of data) {
        const validation = validator.validateRaceData(race);

        if (validation.isValid) {
          validRaces.push(race);
        } else {
          logger.warn('Race validation failed', {
            race_id: race.race_id,
            errors: validation.errors,
            advertised_start: race.advertised_start,
          });
          invalidRaces.push(`${race.race_id}: ${validation.errors.join(', ')}`);
        }
      }

      races.value = validRaces;
      lastFetchTime.value = new Date();

      logger.info('Races stored', {
        validCount: validRaces.length,
        invalidCount: invalidRaces.length,
        racesInStore: races.value.length,
      });

      const duration = performance.now() - startTime;

      logger.info('Races fetched successfully in store', {
        requestedCount: count,
        validCount: validRaces.length,
        invalidCount: invalidRaces.length,
        duration: Math.round(duration),
        silent,
      });

      logger.performance('Store race fetch', duration, {
        requestedCount: count,
        validCount: validRaces.length,
      });

      if (invalidRaces.length > 0) {
        logger.warn('Some races failed validation', { invalidRaces });
      }
    } catch (err) {
      const duration = performance.now() - startTime;

      logger.error(
        'Error fetching races in store',
        {
          count,
          silent,
          duration: Math.round(duration),
        },
        err as Error,
      );

      if (!silent) {
        error.value =
          err instanceof Error ? err.message : 'Unknown error occurred';
      }

      if (!silent) {
        throw err;
      }
    } finally {
      if (!silent) {
        isLoading.value = false;
      }
    }
  };

  /**
   * Toggle category selection
   * @param {string} categoryId - The category ID to toggle
   */
  const toggleCategory = (categoryId: string): void => {
    // Validate category ID
    const validation = validator.validateCategoryId(categoryId);
    if (!validation.isValid) {
      logger.warn('Invalid category ID provided to toggleCategory', {
        categoryId,
        errors: validation.errors,
      });
      return;
    }

    const newSet = new Set(selectedCategories.value);
    const wasSelected = newSet.has(categoryId);

    if (wasSelected) {
      newSet.delete(categoryId);
    } else {
      newSet.add(categoryId);
    }

    selectedCategories.value = newSet;

    logger.userAction('Category toggled', {
      categoryId,
      wasSelected,
      isNowSelected: !wasSelected,
      totalSelected: newSet.size,
    });
  };

  /**
   * Select all categories (clear selection)
   */
  const selectAllCategories = (): void => {
    const previousSize = selectedCategories.value.size;
    selectedCategories.value = new Set();

    logger.userAction('All categories selected', {
      previousSelectedCount: previousSize,
      newSelectedCount: 0,
    });
  };

  /**
   * Clear error state
   */
  const clearError = (): void => {
    if (error.value) {
      logger.info('Error state cleared by user', {
        previousError: error.value,
      });
    }
    error.value = null;
  };

  /**
   * Reset store to initial state
   */
  const reset = (): void => {
    logger.info('Race store reset to initial state', {
      previousRaceCount: races.value.length,
      previousSelectedCategories: selectedCategories.value.size,
    });

    races.value = [];
    selectedCategories.value = new Set();
    isLoading.value = false;
    error.value = null;
    lastFetchTime.value = null;
  };

  return {
    // State
    races: computed(() => races.value),
    categories,
    selectedCategories: computed(() => selectedCategories.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    lastFetchTime: computed(() => lastFetchTime.value),
    config,

    // Getters
    filteredRaces,
    sortedRaces,
    activeRaces,

    // Actions
    fetchRaces,
    toggleCategory,
    selectAllCategories,
    clearError,
    reset,
    getCategoryById,
    getCategoryShortName,
    getCategoryColor,
  };
});
