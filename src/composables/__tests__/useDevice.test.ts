import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { useDevice } from '../useDevice'

function mountWithDevice() {
  let composable: ReturnType<typeof useDevice>
  const wrapper = mount(
    defineComponent({
      setup() {
        composable = useDevice()
        return () => ''
      },
    })
  )
  return { wrapper, composable: composable! }
}

function setWindowWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true, configurable: true })
}

describe('useDevice', () => {
  const originalWidth = window.innerWidth

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    setWindowWidth(originalWidth)
  })

  it('returns initial device type based on window width', () => {
    setWindowWidth(500)
    const { composable } = mountWithDevice()
    expect(composable.isMobile.value).toBe(true)
    expect(composable.device.value).toBe('mobile')
  })

  it('detects tablet device', () => {
    setWindowWidth(900)
    const { composable } = mountWithDevice()
    expect(composable.isTablet.value).toBe(true)
    expect(composable.device.value).toBe('tablet')
  })

  it('detects desktop device', () => {
    setWindowWidth(1200)
    const { composable } = mountWithDevice()
    expect(composable.isDesktop.value).toBe(true)
    expect(composable.device.value).toBe('desktop')
  })

  it('isMobileOrTablet is true for mobile', () => {
    setWindowWidth(500)
    const { composable } = mountWithDevice()
    expect(composable.isMobileOrTablet.value).toBe(true)
  })

  it('isMobileOrTablet is true for tablet', () => {
    setWindowWidth(900)
    const { composable } = mountWithDevice()
    expect(composable.isMobileOrTablet.value).toBe(true)
  })

  it('isMobileOrTablet is false for desktop', () => {
    setWindowWidth(1200)
    const { composable } = mountWithDevice()
    expect(composable.isMobileOrTablet.value).toBe(false)
  })

  it('uses correct breakpoints', () => {
    // Mobile: <= 768
    setWindowWidth(768)
    const { composable } = mountWithDevice()
    expect(composable.device.value).toBe('mobile')

    // Tablet: 769-1024
    setWindowWidth(769)
    // Need to trigger resize
    window.dispatchEvent(new Event('resize'))
    vi.advanceTimersByTime(150)
    expect(composable.device.value).toBe('tablet')

    // Desktop: > 1024
    setWindowWidth(1025)
    window.dispatchEvent(new Event('resize'))
    vi.advanceTimersByTime(150)
    expect(composable.device.value).toBe('desktop')
  })

  it('debounces resize events', async () => {
    setWindowWidth(1200)
    const { composable } = mountWithDevice()
    expect(composable.isDesktop.value).toBe(true)

    setWindowWidth(500)
    window.dispatchEvent(new Event('resize'))

    // Should not update immediately
    expect(composable.width.value).toBe(1200)

    // Advance past debounce
    vi.advanceTimersByTime(150)
    expect(composable.width.value).toBe(500)
    expect(composable.isMobile.value).toBe(true)
  })

  it('cleans up event listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { wrapper } = mountWithDevice()

    wrapper.unmount()

    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
  })
})
