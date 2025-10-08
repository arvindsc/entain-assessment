import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import RaceCard from '../../components/RaceCard.vue';
import CountdownTimer from '../../components/CountdownTimer.vue';

// Mock the store
vi.mock('../../stores/raceStore', () => ({
  useRaceStore: () => ({
    getCategoryShortName: id => {
      const map = {
        '9daef0d7-bf3c-4f50-921d-8e818c60fe61': 'Greyhound',
        '161d9be2-e909-4326-8c2c-35ed71fb460b': 'Harness',
        '4a2788f8-e825-4d36-9894-efd4baf1cfae': 'Horse',
      };
      return map[id] || 'Unknown';
    },
    getCategoryColor: id => {
      const map = {
        '9daef0d7-bf3c-4f50-921d-8e818c60fe61': 'bg-gray-600',
        '161d9be2-e909-4326-8c2c-35ed71fb460b': 'bg-blue-600',
        '4a2788f8-e825-4d36-9894-efd4baf1cfae': 'bg-green-600',
      };
      return map[id] || 'bg-gray-500';
    },
  }),
}));

describe('RaceCard', () => {
  let wrapper;

  const mockRace = {
    race_id: 'test-race-1',
    race_name: 'Test Race',
    race_number: 5,
    meeting_name: 'Test Meeting',
    category_id: '9daef0d7-bf3c-4f50-921d-8e818c60fe61',
    advertised_start: '2024-01-01T12:05:00Z',
    venue_name: 'Test Venue',
    meeting_date: '2024-01-01',
  };

  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('renders race information correctly', () => {
    wrapper = mount(RaceCard, {
      props: { race: mockRace },
    });

    expect(wrapper.find('h3').text()).toBe('Test Meeting');
    expect(wrapper.find('p').text()).toBe('Race 5');
    expect(wrapper.find('.bg-gray-600').exists()).toBe(true);
    expect(wrapper.text()).toContain('Greyhound');
  });

  it('displays correct category information', () => {
    wrapper = mount(RaceCard, {
      props: { race: mockRace },
    });

    const categorySpan = wrapper.find('span');
    expect(categorySpan.text()).toBe('Greyhound');
    expect(categorySpan.classes()).toContain('bg-gray-600');
  });

  it('formats start time correctly', () => {
    wrapper = mount(RaceCard, {
      props: { race: mockRace },
    });

    // Should display time in Australian timezone
    expect(wrapper.text()).toMatch(/\d{1,2}:\d{2} (am|pm)/);
  });

  it('handles missing venue name gracefully', () => {
    const raceWithoutVenue = { ...mockRace, venue_name: null };

    wrapper = mount(RaceCard, {
      props: { race: raceWithoutVenue },
    });

    expect(wrapper.find('p[aria-label*="Venue:"]').exists()).toBe(false);
  });

  it('validates race prop correctly', () => {
    const invalidRace = { race_id: 'test' }; // Missing required fields

    wrapper = mount(RaceCard, {
      props: { race: invalidRace },
    });

    // Should still render but handle missing data gracefully
    expect(wrapper.find('.race-card').exists()).toBe(true);
  });

  it('has proper accessibility attributes', () => {
    wrapper = mount(RaceCard, {
      props: { race: mockRace },
    });

    expect(wrapper.find('[role="article"]').exists()).toBe(true);
    expect(wrapper.find('[aria-labelledby]').exists()).toBe(true);
    expect(wrapper.find('[aria-describedby]').exists()).toBe(true);
    expect(wrapper.find('[tabindex="0"]').exists()).toBe(true);
  });

  it('includes CountdownTimer component', () => {
    wrapper = mount(RaceCard, {
      props: { race: mockRace },
    });

    expect(wrapper.findComponent(CountdownTimer).exists()).toBe(true);
  });

  it('handles different category types', () => {
    const horseRace = {
      ...mockRace,
      category_id: '4a2788f8-e825-4d36-9894-efd4baf1cfae',
    };

    wrapper = mount(RaceCard, {
      props: { race: horseRace },
    });

    expect(wrapper.text()).toContain('Horse');
    expect(wrapper.find('.bg-green-600').exists()).toBe(true);
  });

  it('applies hover and focus styles', () => {
    wrapper = mount(RaceCard, {
      props: { race: mockRace },
    });

    const card = wrapper.find('.race-card');
    expect(card.classes()).toContain('hover:shadow-lg');
    expect(card.classes()).toContain('focus-within:ring-2');
  });
});
