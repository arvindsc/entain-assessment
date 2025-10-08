<template>
  <div class="race-list">
    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="flex flex-col justify-center items-center py-16 bg-white rounded-lg shadow-sm border border-gray-200"
      role="status"
      aria-live="polite"
    >
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-entain-primary mb-4"
      />
      <span class="text-lg text-gray-600">Loading races...</span>
      <span class="text-sm text-gray-500 mt-2">
        Please wait while we fetch the latest race data
      </span>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6"
      role="alert"
      aria-live="assertive"
    >
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <svg
            class="h-6 w-6 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <div class="ml-3 flex-1">
          <h3 class="text-sm font-medium text-red-800">Unable to load races</h3>
          <p class="text-sm text-red-700 mt-1">
            {{ error }}
          </p>
          <div class="mt-4">
            <button
              class="bg-red-100 text-red-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
              :disabled="isLoading"
              @click="handleRetry"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Race List -->
    <div v-else-if="activeRaces.length > 0" class="space-y-4">
      <!-- Race count indicator -->
      <div class="text-sm text-gray-500 mb-4" role="status" aria-live="polite">
        {{ activeRaces.length }} race{{ activeRaces.length === 1 ? '' : 's' }}
        showing
      </div>

      <div class="grid gap-4" role="list" aria-label="List of upcoming races">
        <RaceCard
          v-for="race in activeRaces"
          :key="race.race_id"
          :race="race"
          role="listitem"
        />
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="bg-white rounded-lg shadow-sm border border-gray-200 py-16 px-6"
      role="status"
      aria-live="polite"
    >
      <div class="flex flex-col items-center justify-center text-center">
        <div class="w-16 h-16 text-gray-400 mb-4">
          <svg
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">
          No races available
        </h3>
        <p class="text-sm text-gray-600 mb-6 max-w-md">
          {{ getEmptyStateMessage }}
        </p>
        <button
          class="bg-entain-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-entain-secondary focus:outline-none focus:ring-2 focus:ring-entain-primary focus:ring-offset-2 transition-colors duration-200"
          :disabled="isLoading"
          @click="handleRefresh"
        >
          Refresh Data
        </button>
      </div>
    </div>

    <!-- Auto-refresh indicator -->
    <div class="mt-6 text-center">
      <div
        class="inline-flex items-center justify-center text-sm text-gray-500"
        role="status"
        aria-live="polite"
      >
        <div
          class="animate-pulse-slow w-2 h-2 bg-entain-primary rounded-full mr-2"
          aria-hidden="true"
        />
        Auto-refreshing every {{ formatRefreshInterval }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useRaceStore } from '../stores/raceStore';
import RaceCard from './RaceCard.vue';

/**
 * RaceList Component
 *
 * Displays race data with comprehensive error handling and loading states.
 * Data fetching and auto-refresh are managed by the parent App component.
 */
const raceStore = useRaceStore();

// Destructure reactive state with storeToRefs to maintain reactivity
const { activeRaces, isLoading, error, config, selectedCategories } =
  storeToRefs(raceStore);

// Destructure actions directly (they don't need reactivity)
const { fetchRaces, clearError } = raceStore;

// ===== COMPUTED PROPERTIES =====

/**
 * Get appropriate empty state message based on current filters
 * @returns {string} Empty state message
 */
const getEmptyStateMessage = computed(() => {
  if (selectedCategories.value.size > 0) {
    return 'No races found for the selected categories. Try selecting different categories or refresh the data.';
  }
  return 'No upcoming races are currently available. The data will refresh automatically.';
});

/**
 * Format refresh interval for display
 * @returns {string} Formatted interval string
 */
const formatRefreshInterval = computed(() => {
  const seconds = config.value.AUTO_REFRESH_INTERVAL / 1000;
  return seconds < 60 ? `${seconds} seconds` : `${seconds / 60} minutes`;
});

// ===== METHODS =====

/**
 * Handle retry action for error state
 */
const handleRetry = async () => {
  clearError();
  await fetchRaces();
};

/**
 * Handle refresh action for empty state
 */
const handleRefresh = async () => {
  await fetchRaces();
};
</script>

<style scoped>
.race-list {
  min-height: 24rem;
}

/* Ensure proper focus management */
button:focus {
  outline: none;
}

/* Smooth transitions for better UX */
button {
  transition: all 0.2s ease-in-out;
}

/* Loading animation */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Pulse animation for refresh indicator */
@keyframes pulse-slow {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse-slow {
  animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
