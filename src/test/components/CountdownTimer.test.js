import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CountdownTimer from '../../components/CountdownTimer.vue'

describe('CountdownTimer', () => {
  let wrapper

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    if (wrapper) {
      wrapper.unmount()
    }
  })

  it('renders correctly with valid start time', () => {
    const startTime = new Date('2024-01-01T12:05:00Z').toISOString()
    
    wrapper = mount(CountdownTimer, {
      props: {
        startTime,
        ariaLabel: 'Test timer'
      }
    })

    expect(wrapper.find('.countdown-timer').exists()).toBe(true)
    expect(wrapper.find('[role="timer"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Test timer"]').exists()).toBe(true)
  })

  it('displays correct countdown time', async () => {
    const startTime = new Date('2024-01-01T12:05:00Z').toISOString()

    wrapper = mount(CountdownTimer, {
      props: { startTime }
    })

    // Wait for component to initialize
    await wrapper.vm.$nextTick()

    // Should show 5 minutes
    expect(wrapper.text()).toContain('5m 0s')
  })

  it('shows "STARTED" when countdown reaches zero', () => {
    const startTime = new Date('2024-01-01T11:59:00Z').toISOString()
    
    wrapper = mount(CountdownTimer, {
      props: { startTime }
    })

    // Fast forward 2 minutes
    vi.advanceTimersByTime(120000)

    expect(wrapper.text()).toContain('STARTED')
    expect(wrapper.find('[aria-live="assertive"]').exists()).toBe(true)
  })

  it('applies warning styles when time is low', () => {
    const startTime = new Date('2024-01-01T12:00:30Z').toISOString()

    wrapper = mount(CountdownTimer, {
      props: { startTime }
    })

    const timeSpan = wrapper.findAll('span')[1]
    expect(timeSpan.classes()).toContain('text-red-600')
  })

  it('validates startTime prop', () => {
    const invalidStartTime = 'invalid-date'
    
    wrapper = mount(CountdownTimer, {
      props: { startTime: invalidStartTime }
    })

    // Should still render but handle invalid date gracefully
    expect(wrapper.find('.countdown-timer').exists()).toBe(true)
  })

  it('updates when startTime prop changes', async () => {
    const initialStartTime = new Date('2024-01-01T12:05:00Z').toISOString()
    const newStartTime = new Date('2024-01-01T12:10:00Z').toISOString()

    wrapper = mount(CountdownTimer, {
      props: { startTime: initialStartTime }
    })

    // Wait for component to initialize
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('5m 0s')

    await wrapper.setProps({ startTime: newStartTime })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('10m 0s')
  })

  it('cleans up interval on unmount', () => {
    const startTime = new Date('2024-01-01T12:05:00Z').toISOString()
    
    wrapper = mount(CountdownTimer, {
      props: { startTime }
    })

    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    
    wrapper.unmount()
    
    expect(clearIntervalSpy).toHaveBeenCalled()
  })
})
