<template>
  <div class="countdown-timer" role="timer" :aria-label="ariaLabel">
    <div v-if="timeLeft > 0" class="flex items-center gap-2">
      <span class="text-xs sm:text-sm font-medium text-gray-700">
        Starts in:
      </span>
      <span
        :class="[
          'text-base sm:text-lg font-bold tabular-nums transition-colors duration-300',
          timeLeft <= 60000
            ? 'text-red-600'
            : timeLeft <= 300000
              ? 'text-orange-600'
              : 'text-gray-900',
        ]"
        :aria-live="timeLeft <= 60000 ? 'assertive' : 'polite'"
      >
        {{ formattedTime }}
      </span>
    </div>
    <div v-else class="flex items-center gap-2">
      <span class="text-xs sm:text-sm font-medium text-gray-700">
        Race Status:
      </span>
      <span
        class="text-base sm:text-lg font-bold text-red-600"
        aria-live="assertive"
      >
        STARTED
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

/**
 * Props for CountdownTimer component
 * @typedef {Object} Props
 * @property {string} startTime - ISO string of race start time
 * @property {string} [ariaLabel] - Custom aria-label for accessibility
 */
const props = defineProps({
  startTime: {
    type: [String, Date],
    required: true,
    validator: value => {
      if (value instanceof Date) {
        return true;
      }
      return !isNaN(Date.parse(value));
    },
  },
  ariaLabel: {
    type: String,
    default: 'Race countdown timer',
  },
});

// ===== REACTIVE STATE =====
const timeLeft = ref(0);
const intervalId = ref(null);

// ===== COMPUTED PROPERTIES =====

/**
 * Format time remaining in human-readable format
 * @returns {string} Formatted time string - always shows seconds for consistency
 */
const formattedTime = computed(() => {
  if (timeLeft.value <= 0) {
    return '0s';
  }

  const days = Math.floor(timeLeft.value / (24 * 60 * 60 * 1000));
  const hours = Math.floor(
    (timeLeft.value % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000),
  );
  const minutes = Math.floor((timeLeft.value % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((timeLeft.value % (60 * 1000)) / 1000);

  // Always show seconds for consistency in countdown
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
});

// ===== METHODS =====

/**
 * Update countdown timer
 * @private
 */
const updateCountdown = () => {
  const now = new Date().getTime();
  const startTime =
    props.startTime instanceof Date
      ? props.startTime.getTime()
      : new Date(props.startTime).getTime();
  timeLeft.value = Math.max(0, startTime - now);

  // Clear interval when countdown reaches zero
  if (timeLeft.value <= 0 && intervalId.value) {
    clearInterval(intervalId.value);
    intervalId.value = null;
  }
};

/**
 * Start the countdown timer
 * @private
 */
const startTimer = () => {
  updateCountdown();
  intervalId.value = setInterval(updateCountdown, 1000);
};

/**
 * Stop the countdown timer
 * @private
 */
const stopTimer = () => {
  if (intervalId.value) {
    clearInterval(intervalId.value);
    intervalId.value = null;
  }
};

// ===== LIFECYCLE HOOKS =====

onMounted(() => {
  startTimer();
});

onUnmounted(() => {
  stopTimer();
});

// ===== WATCHERS =====

// Restart timer only if startTime actually changes (compare timestamps)
watch(
  () => props.startTime,
  (newTime, oldTime) => {
    const newTimestamp =
      newTime instanceof Date ? newTime.getTime() : new Date(newTime).getTime();
    const oldTimestamp =
      oldTime instanceof Date ? oldTime.getTime() : new Date(oldTime).getTime();

    // Only restart if timestamp actually changed
    if (newTimestamp !== oldTimestamp) {
      stopTimer();
      startTimer();
    }
  },
);
</script>

<style scoped>
.countdown-timer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
</style>
