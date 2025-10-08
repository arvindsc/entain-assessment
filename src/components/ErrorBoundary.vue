<template>
  <div v-if="hasError" class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
      <div class="mb-6">
        <svg
          class="w-16 h-16 text-red-500 mx-auto"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>

      <h2 class="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>

      <p class="text-gray-600 mb-8 leading-relaxed">
        We're sorry, but something unexpected happened. Our team has been
        notified and is working to fix the issue.
      </p>

      <div class="flex flex-col sm:flex-row gap-4 justify-center mb-6">
        <button
          @click="handleRetry"
          class="px-6 py-3 rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
          :disabled="isRetrying"
        >
          <span
            v-if="isRetrying"
            class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"
            aria-hidden="true"
          ></span>
          {{ isRetrying ? 'Retrying...' : 'Try Again' }}
        </button>

        <button @click="handleReload" class="px-6 py-3 rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500">Reload Page</button>
      </div>

      <details v-if="showDetails" class="text-left mb-4">
        <summary class="cursor-pointer text-sm text-gray-600 hover:text-gray-800 font-medium">Technical Details</summary>
        <div class="mt-4 p-4 bg-gray-50 rounded-lg text-sm">
          <p class="mb-2">
            <strong>Error:</strong>
            {{ error?.message || 'Unknown error' }}
          </p>
          <p class="mb-2">
            <strong>Component:</strong>
            {{ errorInfo?.componentName || 'Unknown' }}
          </p>
          <p class="mb-2">
            <strong>Time:</strong>
            {{ errorTime }}
          </p>
          <details v-if="error?.stack" class="mt-4">
            <summary class="cursor-pointer text-sm text-gray-600 hover:text-gray-800 font-medium">Stack Trace</summary>
            <pre class="text-xs text-gray-500 bg-gray-100 p-2 rounded overflow-x-auto mt-2">{{ error.stack }}</pre>
          </details>
        </div>
      </details>

      <button @click="toggleDetails" class="text-sm text-gray-500 hover:text-gray-700 underline">
        {{ showDetails ? 'Hide' : 'Show' }} Technical Details
      </button>
    </div>
  </div>

  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured, onMounted } from 'vue';
import { logger } from '../utils/logger';

interface Props {
  fallback?: boolean;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorInfo {
  componentName?: string;
  componentStack?: string;
}

const props = withDefaults(defineProps<Props>(), {
  fallback: true,
});

const emit = defineEmits<{
  error: [error: Error, errorInfo: ErrorInfo];
}>();

const hasError = ref(false);
const error = ref<Error | null>(null);
const errorInfo = ref<ErrorInfo | null>(null);
const errorTime = ref<string>('');
const isRetrying = ref(false);
const showDetails = ref(false);

onErrorCaptured((err: Error, instance, info: string) => {
  logger.error('Error boundary caught error', {
    error: err.message,
    componentStack: info,
    componentName: instance?.$options.name || 'Unknown',
  });

  error.value = err;
  errorInfo.value = {
    componentName: instance?.$options.name || 'Unknown',
    componentStack: info,
  };
  errorTime.value = new Date().toISOString();
  hasError.value = true;

  // Emit error event for parent components
  emit('error', err, errorInfo.value);

  // Call custom error handler if provided
  if (props.onError) {
    props.onError(err, errorInfo.value);
  }

  // Prevent error from propagating further
  return false;
});

const handleRetry = async () => {
  isRetrying.value = true;

  try {
    // Store component name before clearing errorInfo
    const componentName = errorInfo.value?.componentName || 'Unknown';

    // Wait a moment before retrying
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Reset error state
    hasError.value = false;
    error.value = null;
    errorInfo.value = null;

    logger.info('Error boundary retry attempted', {
      componentName,
    });
  } catch (retryError) {
    logger.error('Error during retry', {}, retryError as Error);
  } finally {
    isRetrying.value = false;
  }
};

const handleReload = () => {
  const componentName = errorInfo.value?.componentName || 'Unknown';

  logger.info('Error boundary reload triggered', {
    componentName,
  });

  window.location.reload();
};

const toggleDetails = () => {
  showDetails.value = !showDetails.value;
};

onMounted(() => {
  // Set up global error handlers for unhandled errors
  const handleUnhandledError = (event: ErrorEvent) => {
    logger.error('Unhandled error caught by error boundary', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    logger.error('Unhandled promise rejection caught by error boundary', {
      reason: event.reason,
    });
  };

  window.addEventListener('error', handleUnhandledError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  // Cleanup on unmount
  return () => {
    window.removeEventListener('error', handleUnhandledError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
});
</script>

