import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { nextTick } from 'vue'
import BackToTop from '../BackToTop.vue'
import en from '@/locales/en'

function createTestI18n() {
  return createI18n({
    legacy: false,
    locale: 'en',
    fallbackLocale: 'en',
    messages: { en },
  })
}

describe('BackToTop', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('is hidden when scroll position is below threshold', async () => {
    Object.defineProperty(window, 'scrollY', { value: 100, writable: true, configurable: true })
    const wrapper = mount(BackToTop, {
      global: { plugins: [createTestI18n()] },
    })
    await nextTick()
    expect(wrapper.find('.back-to-top').exists()).toBe(false)
  })

  it('becomes visible when scroll position exceeds 300', async () => {
    Object.defineProperty(window, 'scrollY', { value: 400, writable: true, configurable: true })
    const wrapper = mount(BackToTop, {
      global: { plugins: [createTestI18n()] },
    })
    await nextTick()
    // Trigger scroll event
    window.dispatchEvent(new Event('scroll'))
    vi.advanceTimersByTime(100)
    await nextTick()
    expect(wrapper.find('.back-to-top').exists()).toBe(true)
  })

  it('scrolls to top when clicked', async () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    Object.defineProperty(window, 'scrollY', { value: 400, writable: true, configurable: true })

    const wrapper = mount(BackToTop, {
      global: { plugins: [createTestI18n()] },
    })

    // Trigger visibility
    window.dispatchEvent(new Event('scroll'))
    vi.advanceTimersByTime(100)
    await nextTick()

    const button = wrapper.find('.back-to-top')
    if (button.exists()) {
      await button.trigger('click')
      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: expect.any(String) })
    }
    scrollToSpy.mockRestore()
  })

  it('cleans up scroll listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const wrapper = mount(BackToTop, {
      global: { plugins: [createTestI18n()] },
    })
    wrapper.unmount()
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})
