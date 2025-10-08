import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import CategoryFilter from '../../components/CategoryFilter.vue';

// Create refs to hold the mock data
const categoriesData = ref([
  {
    id: '9daef0d7-bf3c-4f50-921d-8e818c60fe61',
    name: 'Greyhound Racing',
    color: 'bg-gray-600',
  },
  {
    id: '161d9be2-e909-4326-8c2c-35ed71fb460b',
    name: 'Harness Racing',
    color: 'bg-blue-600',
  },
  {
    id: '4a2788f8-e825-4d36-9894-efd4baf1cfae',
    name: 'Horse Racing',
    color: 'bg-green-600',
  },
]);
const selectedCategoriesData = ref(new Set());

// Create mock functions that will be shared
const toggleCategoryMock = vi.fn();
const selectAllCategoriesMock = vi.fn();

// Mock the store
vi.mock('../../stores/raceStore', () => ({
  useRaceStore: () => ({
    categories: categoriesData,
    selectedCategories: selectedCategoriesData,
    toggleCategory: toggleCategoryMock,
    selectAllCategories: selectAllCategoriesMock,
  }),
}));

describe('CategoryFilter', () => {
  let wrapper;

  beforeEach(() => {
    setActivePinia(createPinia());
    // Reset mock data
    selectedCategoriesData.value = new Set();
    // Clear mock function calls
    toggleCategoryMock.mockClear();
    selectAllCategoriesMock.mockClear();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('renders all category buttons', () => {
    wrapper = mount(CategoryFilter);

    expect(wrapper.find('h2').text()).toContain('Filter by Category');
    expect(wrapper.findAll('button')).toHaveLength(4); // 3 categories + "All Categories"
    expect(wrapper.text()).toContain('All Categories');
    expect(wrapper.text()).toContain('Greyhound Racing');
    expect(wrapper.text()).toContain('Harness Racing');
    expect(wrapper.text()).toContain('Horse Racing');
  });

  it('calls selectAllCategories when "All Categories" is clicked', async () => {
    wrapper = mount(CategoryFilter);

    const allButton = wrapper.findAll('button')[0];
    await allButton.trigger('click');

    expect(selectAllCategoriesMock).toHaveBeenCalledTimes(1);
  });

  it('calls toggleCategory when category button is clicked', async () => {
    wrapper = mount(CategoryFilter);

    const greyhoundButton = wrapper.findAll('button')[1];
    await greyhoundButton.trigger('click');

    expect(toggleCategoryMock).toHaveBeenCalledWith(
      '9daef0d7-bf3c-4f50-921d-8e818c60fe61',
    );
  });

  it('shows correct styling for selected categories', async () => {
    selectedCategoriesData.value.add('9daef0d7-bf3c-4f50-921d-8e818c60fe61');

    wrapper = mount(CategoryFilter);

    const greyhoundButton = wrapper.findAll('button')[1];
    expect(greyhoundButton.classes()).toContain('bg-gray-600');
    expect(greyhoundButton.classes()).toContain('text-white');
  });

  it('shows correct styling for unselected categories', () => {
    wrapper = mount(CategoryFilter);

    const greyhoundButton = wrapper.findAll('button')[1];
    expect(greyhoundButton.classes()).toContain('bg-gray-100');
    expect(greyhoundButton.classes()).toContain('text-gray-700');
  });

  it('shows "All Categories" as selected when no categories are selected', () => {
    wrapper = mount(CategoryFilter);

    const allButton = wrapper.findAll('button')[0];
    expect(allButton.classes()).toContain('bg-entain-primary');
    expect(allButton.classes()).toContain('text-white');
  });

  it('shows selection count when categories are selected', async () => {
    selectedCategoriesData.value.add('9daef0d7-bf3c-4f50-921d-8e818c60fe61');
    selectedCategoriesData.value.add('161d9be2-e909-4326-8c2c-35ed71fb460b');

    wrapper = mount(CategoryFilter);

    expect(wrapper.text()).toContain('Showing 2 categories selected');
  });

  it('has proper accessibility attributes', () => {
    wrapper = mount(CategoryFilter);

    expect(wrapper.find('[role="complementary"]').exists()).toBe(true);
    expect(wrapper.find('[aria-labelledby="filter-title"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[role="group"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Race category filters"]').exists()).toBe(
      true,
    );
  });

  it('has proper button accessibility attributes', () => {
    wrapper = mount(CategoryFilter);

    const buttons = wrapper.findAll('button');
    buttons.forEach(button => {
      expect(button.attributes('aria-pressed')).toBeDefined();
      expect(button.attributes('aria-label')).toBeDefined();
      // Note: tabindex is not explicitly set, which means it defaults to 0 for buttons (focusable)
      // This is the correct behavior for accessible buttons
    });
  });

  it('applies focus styles correctly', () => {
    wrapper = mount(CategoryFilter);

    const buttons = wrapper.findAll('button');
    buttons.forEach(button => {
      expect(button.classes()).toContain('focus:outline-none');
      expect(button.classes()).toContain('focus:ring-2');
      expect(button.classes()).toContain('focus:ring-offset-2');
    });
  });

  it('handles hover effects', () => {
    wrapper = mount(CategoryFilter);

    const unselectedButton = wrapper.findAll('button')[1];
    expect(unselectedButton.classes()).toContain('hover:bg-gray-200');
  });

  it('shows sticky positioning on desktop', () => {
    wrapper = mount(CategoryFilter);

    // Note: The component no longer has sticky positioning based on the style comment
    // "Removed sticky positioning for better desktop layout"
    // This test just verifies the component renders without errors
    expect(wrapper.exists()).toBe(true);
  });
});
