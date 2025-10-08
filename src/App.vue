<template>
  <ErrorBoundary @error="handleGlobalError">
    <div id="app" class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white shadow-sm border-b border-gray-200" role="banner">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-4">
            <h1 class="text-2xl font-bold text-gray-900">Entain Racing</h1>
            <div class="text-sm text-gray-600">Live Racing Data</div>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="container mx-auto px-4 sm:px-6 lg:px-8 py-8" role="main">
        <!-- Mobile Layout -->
        <div class="lg:hidden space-y-6">
          <CategoryFilter />
          <RaceList />
        </div>

        <!-- Desktop Layout -->
        <div class="hidden lg:flex lg:gap-6">
          <!-- Sidebar with Category Filters -->
          <div class="w-80 flex-shrink-0">
            <CategoryFilter />
          </div>

          <!-- Main Race List -->
          <div class="flex-1 min-w-0">
            <RaceList />
          </div>
        </div>
      </main>

      <!-- Footer -->
      <footer
        class="bg-white border-t border-gray-200 mt-auto"
        role="contentinfo"
      >
        <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
          <p class="text-sm text-gray-500">
            © 2024 Entain Racing. Data provided by Neds API.
          </p>
          <p class="text-sm text-gray-500 mt-1">
            Races are automatically refreshed every 30 seconds.
          </p>
        </div>
      </footer>
    </div>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useRaceStore } from './stores/raceStore';
import CategoryFilter from './components/CategoryFilter.vue';
import RaceList from './components/RaceList.vue';
import ErrorBoundary from './components/ErrorBoundary.vue';
import { logger } from './utils/logger';

/**
 * Main Application Component
 *
 * Root component that provides the overall layout structure including:
 * - Header with branding
 * - Main content area with race list and filters
 * - Footer with copyright information
 * - Global error boundary for error handling
 *
 * Uses semantic HTML elements and ARIA roles for accessibility.
 * Handles data fetching and auto-refresh at app level to avoid duplicate API calls.
 */

const raceStore = useRaceStore();
const { config } = storeToRefs(raceStore);

let refreshInterval: NodeJS.Timeout | null = null;

// Setup auto-refresh functionality
const setupAutoRefresh = (): void => {
  refreshInterval = setInterval(() => {
    void raceStore.fetchRaces(10, true); // Silent refresh to avoid flickering
  }, config.value.AUTO_REFRESH_INTERVAL);
};

// Cleanup auto-refresh functionality
const cleanupAutoRefresh = (): void => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
};

// Handle global errors from error boundary
const handleGlobalError = (
  error: Error,
  errorInfo: { componentName?: string; componentStack?: string }
): void => {
  logger.error(
    'Global error caught by error boundary',
    {
      componentName: errorInfo.componentName,
      componentStack: errorInfo.componentStack,
    },
    error
  );

  // In a real application, you would send this to an error reporting service
  // like Sentry, LogRocket, or similar
};

onMounted(async () => {
  try {
    logger.info('Application mounted, initializing race data');

    // Initial data fetch
    await raceStore.fetchRaces();

    // Setup auto-refresh
    setupAutoRefresh();

    logger.info('Application initialization completed');
  } catch (error) {
    logger.error('Failed to initialize application', {}, error as Error);
  }
});

onUnmounted(() => {
  logger.info('Application unmounting, cleaning up resources');
  cleanupAutoRefresh();
});
</script>

<style>
#app {
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    'Open Sans',
    'Helvetica Neue',
    sans-serif;
}

/* Ensure proper focus management */
*:focus {
  outline: none;
}

/* Smooth scrolling for better UX */
html {
  scroll-behavior: smooth;
}

/* Ensure proper text rendering */
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
