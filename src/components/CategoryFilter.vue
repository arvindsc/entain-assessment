<template>
  <div
    class="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
    role="complementary"
    aria-labelledby="filter-title"
  >
    <h2 id="filter-title" class="text-lg font-semibold text-gray-900 mb-6">
      Filter by Category ({{ categories.length }})
    </h2>

    <div
      class="flex flex-col gap-2"
      role="group"
      aria-label="Race category filters"
    >
      <button
        @click="selectAllCategories"
        :class="[
          'w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
          selectedCategories.size === 0
            ? 'bg-entain-primary text-white focus:ring-entain-primary'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500',
        ]"
        :aria-pressed="selectedCategories.size === 0"
        aria-label="Show all race categories"
      >
        All Categories
      </button>

      <button
        v-for="category in categories"
        :key="category.id"
        @click="toggleCategory(category.id)"
        :class="[
          'w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
          selectedCategories.has(category.id)
            ? `${category.color} text-white focus:ring-current`
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500',
        ]"
        :aria-pressed="selectedCategories.has(category.id)"
        :aria-label="`Toggle ${category.name} filter`"
      >
        {{ category.name }}
      </button>
    </div>

    <div
      v-if="selectedCategories.size > 0"
      class="mt-3 text-sm text-gray-600"
      role="status"
      aria-live="polite"
    >
      Showing {{ selectedCategories.size }} categor{{
        selectedCategories.size === 1 ? 'y' : 'ies'
      }}
      selected
    </div>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { useRaceStore } from '../stores/raceStore';

/**
 * CategoryFilter Component
 *
 * Provides filtering controls for race categories with accessibility features.
 * Uses Pinia store for state management and provides visual feedback for selections.
 */
const raceStore = useRaceStore();

// Destructure reactive state with storeToRefs to maintain reactivity
const { categories, selectedCategories } = storeToRefs(raceStore);

// Destructure actions directly (they don't need reactivity)
const { toggleCategory, selectAllCategories } = raceStore;
</script>

<style scoped>
.category-filters {
  /* Removed sticky positioning for better desktop layout */
}

/* Ensure buttons are accessible */
button:focus {
  outline: none;
}

/* Smooth transitions for better UX */
button {
  transition: all 0.2s ease-in-out;
}

/* Hover effects */
button:hover:not(:disabled) {
  transform: translateY(-1px);
}

button:active:not(:disabled) {
  transform: translateY(0);
}
</style>
