import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useRaceStore } from '../../stores/raceStore';
import { raceApi } from '../../services/raceApi';

// Mock the API service
vi.mock('../../services/raceApi', () => ({
  raceApi: {
    getRaces: vi.fn(),
  },
}));

describe('Race Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('initializes with correct default state', () => {
    const store = useRaceStore();

    expect(store.races).toEqual([]);
    expect(store.selectedCategories.size).toBe(0);
    expect(store.isLoading).toBe(false);
    expect(store.error).toBe(null);
    expect(store.categories).toHaveLength(3);
  });

  it('toggles category selection correctly', () => {
    const store = useRaceStore();
    const categoryId = store.categories[0].id;

    store.toggleCategory(categoryId);
    expect(store.selectedCategories.has(categoryId)).toBe(true);

    store.toggleCategory(categoryId);
    expect(store.selectedCategories.has(categoryId)).toBe(false);
  });

  it('selects all categories when clearing selection', () => {
    const store = useRaceStore();
    const categoryId = store.categories[0].id;

    store.toggleCategory(categoryId);
    expect(store.selectedCategories.size).toBe(1);

    store.selectAllCategories();
    expect(store.selectedCategories.size).toBe(0);
  });

  it('selects only specific category', () => {
    const store = useRaceStore();
    const categoryId1 = store.categories[0].id;
    const categoryId2 = store.categories[1].id;

    store.toggleCategory(categoryId1);
    store.toggleCategory(categoryId2);
    expect(store.selectedCategories.size).toBe(2);

    store.selectAllCategories();
    store.toggleCategory(categoryId1);
    expect(store.selectedCategories.size).toBe(1);
    expect(store.selectedCategories.has(categoryId1)).toBe(true);
    expect(store.selectedCategories.has(categoryId2)).toBe(false);
  });

  it('filters races correctly when no categories selected', async () => {
    const store = useRaceStore();
    const mockRaces = [
      {
        race_id: '1',
        category_id: store.categories[0].id,
        race_name: 'Test Race 1',
        race_number: 1,
        meeting_id: 'meeting-1',
        meeting_name: 'Test Meeting',
        advertised_start: new Date('2024-01-01T10:00:00Z'),
        venue_id: 'venue-1',
        venue_name: 'Test Venue',
        venue_state: 'NSW',
        venue_country: 'AU',
      },
      {
        race_id: '2',
        category_id: store.categories[1].id,
        race_name: 'Test Race 2',
        race_number: 2,
        meeting_id: 'meeting-2',
        meeting_name: 'Test Meeting 2',
        advertised_start: new Date('2024-01-01T11:00:00Z'),
        venue_id: 'venue-2',
        venue_name: 'Test Venue 2',
        venue_state: 'VIC',
        venue_country: 'AU',
      },
    ];

    raceApi.getRaces.mockResolvedValueOnce(mockRaces);
    await store.fetchRaces();

    expect(store.filteredRaces).toEqual(mockRaces);
  });

  it('filters races correctly when categories selected', async () => {
    const store = useRaceStore();
    const categoryId = store.categories[0].id;
    const mockRaces = [
      {
        race_id: '1',
        category_id: categoryId,
        race_name: 'Test Race 1',
        race_number: 1,
        meeting_id: 'meeting-1',
        meeting_name: 'Test Meeting',
        advertised_start: new Date('2024-01-01T10:00:00Z'),
        venue_id: 'venue-1',
        venue_name: 'Test Venue',
        venue_state: 'NSW',
        venue_country: 'AU',
      },
      {
        race_id: '2',
        category_id: store.categories[1].id,
        race_name: 'Test Race 2',
        race_number: 2,
        meeting_id: 'meeting-2',
        meeting_name: 'Test Meeting 2',
        advertised_start: new Date('2024-01-01T11:00:00Z'),
        venue_id: 'venue-2',
        venue_name: 'Test Venue 2',
        venue_state: 'VIC',
        venue_country: 'AU',
      },
    ];

    raceApi.getRaces.mockResolvedValueOnce(mockRaces);
    await store.fetchRaces();
    store.toggleCategory(categoryId);

    expect(store.filteredRaces).toHaveLength(1);
    expect(store.filteredRaces[0].race_id).toBe('1');
  });

  it('sorts races by start time', async () => {
    const store = useRaceStore();
    const mockRaces = [
      {
        race_id: '1',
        advertised_start: new Date('2024-01-01T12:05:00Z'),
        race_name: 'Test Race 1',
        race_number: 1,
        meeting_id: 'meeting-1',
        meeting_name: 'Test Meeting',
        category_id: store.categories[0].id,
        venue_id: 'venue-1',
        venue_name: 'Test Venue',
        venue_state: 'NSW',
        venue_country: 'AU',
      },
      {
        race_id: '2',
        advertised_start: new Date('2024-01-01T12:03:00Z'),
        race_name: 'Test Race 2',
        race_number: 2,
        meeting_id: 'meeting-2',
        meeting_name: 'Test Meeting 2',
        category_id: store.categories[1].id,
        venue_id: 'venue-2',
        venue_name: 'Test Venue 2',
        venue_state: 'VIC',
        venue_country: 'AU',
      },
      {
        race_id: '3',
        advertised_start: new Date('2024-01-01T12:01:00Z'),
        race_name: 'Test Race 3',
        race_number: 3,
        meeting_id: 'meeting-3',
        meeting_name: 'Test Meeting 3',
        category_id: store.categories[2].id,
        venue_id: 'venue-3',
        venue_name: 'Test Venue 3',
        venue_state: 'QLD',
        venue_country: 'AU',
      },
    ];

    raceApi.getRaces.mockResolvedValueOnce(mockRaces);
    await store.fetchRaces();

    expect(store.sortedRaces[0].race_id).toBe('3');
    expect(store.sortedRaces[1].race_id).toBe('2');
    expect(store.sortedRaces[2].race_id).toBe('1');
  });

  it('limits sorted races to max display count', async () => {
    const store = useRaceStore();
    const mockRaces = Array.from({ length: 10 }, (_, i) => ({
      race_id: i.toString(),
      advertised_start: new Date(Date.now() + i * 60000),
      race_name: `Test Race ${i}`,
      race_number: i,
      meeting_id: `meeting-${i}`,
      meeting_name: `Test Meeting ${i}`,
      category_id: store.categories[i % 3].id,
      venue_id: `venue-${i}`,
      venue_name: `Test Venue ${i}`,
      venue_state: 'NSW',
      venue_country: 'AU',
    }));

    raceApi.getRaces.mockResolvedValueOnce(mockRaces);
    await store.fetchRaces();

    expect(store.sortedRaces).toHaveLength(store.config.MAX_RACES_DISPLAYED);
  });

  it('provides correct category information', () => {
    const store = useRaceStore();
    const category = store.categories[0];

    expect(store.getCategoryById(category.id)).toEqual(category);
    expect(store.getCategoryShortName(category.id)).toBe(category.shortName);
    expect(store.getCategoryColor(category.id)).toBe(category.color);
  });

  it('handles unknown category IDs gracefully', () => {
    const store = useRaceStore();
    const unknownId = 'unknown-id';

    expect(store.getCategoryById(unknownId)).toBeUndefined();
    expect(store.getCategoryShortName(unknownId)).toBe('Unknown');
    expect(store.getCategoryColor(unknownId)).toBe('bg-gray-500');
  });

  it('clears error state', async () => {
    const store = useRaceStore();

    // Set error by triggering a failed fetch
    raceApi.getRaces.mockRejectedValueOnce(new Error('Test error'));
    try {
      await store.fetchRaces();
    } catch (e) {
      // Error expected
    }

    expect(store.error).not.toBe(null);
    store.clearError();
    expect(store.error).toBe(null);
  });

  it('resets store to initial state', async () => {
    const store = useRaceStore();

    // Modify state
    raceApi.getRaces.mockResolvedValueOnce([{ race_id: '1' }]);
    await store.fetchRaces();
    store.toggleCategory(store.categories[0].id);

    store.reset();

    expect(store.races).toEqual([]);
    expect(store.selectedCategories.size).toBe(0);
    expect(store.isLoading).toBe(false);
    expect(store.error).toBe(null);
  });
});
