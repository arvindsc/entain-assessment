import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import RaceList from '../../components/RaceList.vue';
import RaceCard from '../../components/RaceCard.vue';

// Create a shared store instance for all tests
const createMockStore = () => ({
  activeRaces: ref([]),
  isLoading: ref(false),
  error: ref(null),
  selectedCategories: ref(new Set()),
  config: ref({
    AUTO_REFRESH_INTERVAL: 30000,
  }),
  fetchRaces: vi.fn(),
  clearError: vi.fn(),
});

let mockStoreInstance;

// Mock the store
vi.mock('../../stores/raceStore', () => ({
  useRaceStore: () => mockStoreInstance,
}));

describe('RaceList', () => {
  let wrapper;

  beforeEach(async () => {
    setActivePinia(createPinia());
    mockStoreInstance = createMockStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', async () => {
      mockStoreInstance.isLoading.value = true;

      wrapper = mount(RaceList);

      expect(wrapper.find('.animate-spin').exists()).toBe(true);
      expect(wrapper.text()).toContain('Loading races...');
      expect(wrapper.find('[role="status"]').exists()).toBe(true);
    });

    it('shows loading message with accessibility attributes', async () => {
      mockStoreInstance.isLoading.value = true;

      wrapper = mount(RaceList);

      const loadingDiv = wrapper.find('[role="status"]');
      expect(loadingDiv.attributes('aria-live')).toBe('polite');
      expect(wrapper.text()).toContain(
        'Please wait while we fetch the latest race data'
      );
    });
  });

  describe('Error State', () => {
    it('shows error message when there is an error', async () => {
      mockStoreInstance.error.value = 'Network error occurred';

      wrapper = mount(RaceList);

      expect(wrapper.find('[role="alert"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Unable to load races');
      expect(wrapper.text()).toContain('Network error occurred');
    });

    it('shows retry button in error state', async () => {
      mockStoreInstance.error.value = 'Test error';

      wrapper = mount(RaceList);

      const retryButton = wrapper.find('button');
      expect(retryButton.text()).toBe('Try Again');

      await retryButton.trigger('click');
      expect(mockStoreInstance.clearError).toHaveBeenCalled();
      expect(mockStoreInstance.fetchRaces).toHaveBeenCalled();
    });

    it('shows loading state instead of error when both error and isLoading are true', async () => {
      mockStoreInstance.error.value = 'Test error';
      mockStoreInstance.isLoading.value = true;

      wrapper = mount(RaceList);

      // Loading takes precedence due to v-if="isLoading" coming before v-else-if="error"
      expect(wrapper.find('.animate-spin').exists()).toBe(true);
      expect(wrapper.text()).toContain('Loading races...');
      expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    });
  });

  describe('Race List Display', () => {
    const mockRaces = [
      {
        race_id: '1',
        meeting_name: 'Test Meeting 1',
        race_number: 1,
        category_id: '9daef0d7-bf3c-4f50-921d-8e818c60fe61',
        advertised_start: '2024-01-01T12:05:00Z',
        venue_name: 'Test Venue 1',
      },
      {
        race_id: '2',
        meeting_name: 'Test Meeting 2',
        race_number: 2,
        category_id: '4a2788f8-e825-4d36-9894-efd4baf1cfae',
        advertised_start: '2024-01-01T12:10:00Z',
        venue_name: 'Test Venue 2',
      },
    ];

    it('displays races when available', async () => {
      mockStoreInstance.activeRaces.value = mockRaces;

      wrapper = mount(RaceList);

      expect(wrapper.text()).toContain('2 races showing');
      expect(wrapper.findAllComponents(RaceCard)).toHaveLength(2);
    });

    it('shows correct race count', async () => {
      mockStoreInstance.activeRaces.value = mockRaces;

      wrapper = mount(RaceList);

      expect(wrapper.text()).toContain('2 races showing');
    });

    it('shows singular form for single race', async () => {
      mockStoreInstance.activeRaces.value = [mockRaces[0]];

      wrapper = mount(RaceList);

      expect(wrapper.text()).toContain('1 race showing');
    });

    it('has proper accessibility attributes for race list', async () => {
      mockStoreInstance.activeRaces.value = mockRaces;

      wrapper = mount(RaceList);

      expect(wrapper.find('[role="list"]').exists()).toBe(true);
      expect(
        wrapper.find('[aria-label="List of upcoming races"]').exists()
      ).toBe(true);
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no races available', async () => {
      wrapper = mount(RaceList);

      expect(wrapper.text()).toContain('No races available');
      expect(wrapper.find('[role="status"]').exists()).toBe(true);
    });

    it('shows appropriate message when categories are filtered', async () => {
      mockStoreInstance.selectedCategories.value.add('9daef0d7-bf3c-4f50-921d-8e818c60fe61');

      wrapper = mount(RaceList);

      expect(wrapper.text()).toContain(
        'No races found for the selected categories'
      );
    });

    it('shows refresh button in empty state', async () => {
      wrapper = mount(RaceList);

      const refreshButton = wrapper.find('button');
      expect(refreshButton.text()).toBe('Refresh Data');

      await refreshButton.trigger('click');
      expect(mockStoreInstance.fetchRaces).toHaveBeenCalled();
    });

    it('shows loading state instead of empty state when loading', async () => {
      mockStoreInstance.isLoading.value = true;

      wrapper = mount(RaceList);

      // Loading takes precedence due to v-if="isLoading" coming first
      expect(wrapper.find('.animate-spin').exists()).toBe(true);
      expect(wrapper.text()).toContain('Loading races...');
      expect(wrapper.text()).not.toContain('No races available');
    });
  });

  describe('Auto-refresh', () => {
    it('shows auto-refresh indicator', async () => {
      wrapper = mount(RaceList);

      expect(wrapper.text()).toContain('Auto-refreshing every 30 seconds');
      expect(wrapper.find('.animate-pulse-slow').exists()).toBe(true);
    });

    it('formats refresh interval correctly', async () => {
      wrapper = mount(RaceList);

      expect(wrapper.text()).toContain('Auto-refreshing every 30 seconds');
    });

    it('does not call fetchRaces on mount (handled by parent)', async () => {
      wrapper = mount(RaceList);

      // Data fetching and auto-refresh are managed by the parent App component
      expect(mockStoreInstance.fetchRaces).not.toHaveBeenCalled();
    });
  });

  describe('Component Lifecycle', () => {
    it('does not set up auto-refresh interval (handled by parent)', async () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      wrapper = mount(RaceList);

      // Auto-refresh is managed by the parent App component
      expect(setIntervalSpy).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('provides live regions for dynamic content', async () => {
      mockStoreInstance.activeRaces.value = [
        {
          race_id: '1',
          meeting_name: 'Test',
          race_number: 1,
          category_id: 'test',
          advertised_start: '2024-01-01T12:05:00Z',
        },
      ];

      wrapper = mount(RaceList);

      const liveRegions = wrapper.findAll('[aria-live]');
      expect(liveRegions.length).toBeGreaterThan(0);
    });
  });
});
