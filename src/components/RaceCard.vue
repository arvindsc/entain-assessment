<template>
  <article
    class="race-card bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-all duration-200 focus-within:ring-2 focus-within:ring-entain-primary focus-within:ring-offset-2"
    :aria-labelledby="`race-title-${race.race_id}`"
    :aria-describedby="`race-details-${race.race_id}`"
    tabindex="0"
    role="article"
  >
    <header
      class="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 space-y-2 sm:space-y-0"
    >
      <div class="flex-1 min-w-0">
        <h3
          :id="`race-title-${race.race_id}`"
          class="text-base sm:text-lg font-semibold text-gray-900 mb-1 truncate"
          :title="race.meeting_name"
        >
          {{ race.meeting_name }}
        </h3>
        <p
          :id="`race-details-${race.race_id}`"
          class="text-xs sm:text-sm text-gray-600"
        >
          Race {{ race.race_number }}
        </p>
      </div>
      <div class="flex items-center justify-between sm:justify-end sm:ml-4">
        <span
          :class="[
            'px-2 py-1 rounded-full text-xs font-medium text-white',
            categoryColor,
          ]"
          :aria-label="`${categoryName} racing category`"
        >
          {{ categoryName }}
        </span>
      </div>
    </header>

    <div
      class="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0"
    >
      <div class="text-xs sm:text-sm text-gray-500">
        <p :aria-label="`Race starts at ${formatStartTime}`">
          {{ formatStartTime }}
        </p>
        <p
          v-if="race.venue_name"
          :aria-label="`Venue: ${race.venue_name}`"
          class="truncate"
        >
          {{ race.venue_name }}
        </p>
      </div>
      <div class="flex justify-end sm:justify-start">
        <CountdownTimer
          :start-time="race.advertised_start"
          :aria-label="`Countdown for ${race.meeting_name} race ${race.race_number}`"
        />
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue';
import CountdownTimer from './CountdownTimer.vue';

/**
 * Props for RaceCard component
 * @typedef {Object} Race
 * @property {string} race_id - Unique race identifier
 * @property {string} race_name - Name of the race
 * @property {number} race_number - Race number
 * @property {string} meeting_name - Name of the meeting
 * @property {string} category_id - Category identifier
 * @property {string} advertised_start - ISO string of start time
 * @property {string} venue_name - Name of the venue
 * @property {string} meeting_date - Date of the meeting
 */

/**
 * Props definition
 */
const props = defineProps({
  race: {
    type: Object,
    required: true,
    validator: race => {
      return (
        race &&
        typeof race.race_id === 'string' &&
        typeof race.meeting_name === 'string' &&
        typeof race.race_number === 'number' &&
        typeof race.category_id === 'string' &&
        (race.advertised_start instanceof Date || typeof race.advertised_start === 'string')
      );
    },
  },
});

// ===== COMPUTED PROPERTIES =====

/**
 * Get category short name for display
 * @returns {string} Category short name
 */
const categoryName = computed(() => {
  const categoryMap = {
    '9daef0d7-bf3c-4f50-921d-8e818c60fe61': 'Greyhound',
    '161d9be2-e909-4326-8c2c-35ed71fb460b': 'Harness',
    '4a2788f8-e825-4d36-9894-efd4baf1cfae': 'Horse',
  };
  return categoryMap[props.race.category_id] || 'Unknown';
});

/**
 * Get category color class for styling
 * @returns {string} Tailwind color class
 */
const categoryColor = computed(() => {
  const colorMap = {
    '9daef0d7-bf3c-4f50-921d-8e818c60fe61': 'bg-gray-600',
    '161d9be2-e909-4326-8c2c-35ed71fb460b': 'bg-blue-600',
    '4a2788f8-e825-4d36-9894-efd4baf1cfae': 'bg-green-600',
  };
  return colorMap[props.race.category_id] || 'bg-gray-500';
});

/**
 * Format start time for display
 * @returns {string} Formatted time string
 */
const formatStartTime = computed(() => {
  try {
    const startTime = props.race.advertised_start instanceof Date
      ? props.race.advertised_start
      : new Date(props.race.advertised_start);
    return startTime.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    console.warn('Invalid start time format:', props.race.advertised_start);
    return 'TBD';
  }
});
</script>

<style scoped>
.race-card {
  min-height: 120px;
  cursor: pointer;
}

.race-card:focus {
  outline: none;
}

.race-card:hover {
  transform: translateY(-1px);
}

/* Ensure text doesn't overflow */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
