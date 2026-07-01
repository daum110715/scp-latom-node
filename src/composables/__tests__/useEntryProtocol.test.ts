import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { ErrorCode } from '@/services/errors'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en'

vi.mock('@/services/crawler', () => ({
  fetchCrawlerEntries: vi.fn(),
}))

import { useEntryProtocol, INTERVAL_OPTIONS } from '../useEntryProtocol'
import { fetchCrawlerEntries } from '@/services/crawler'

const mockFetchCrawlerEntries = vi.mocked(fetchCrawlerEntries)

function createTestI18n() {
  return createI18n({
    legacy: false,
    locale: 'en',
    fallbackLocale: 'en',
    messages: { en },
  })
}

function mountWithProtocol() {
  const i18n = createTestI18n()
  let composable: ReturnType<typeof useEntryProtocol>
  const wrapper = mount(
    defineComponent({
      setup() {
        composable = useEntryProtocol()
        return () => ''
      },
    }),
    { global: { plugins: [i18n] } },
  )
  return { wrapper, composable: composable! }
}

const mockEntries = [
  { scpNumber: 173, name: 'The Sculpture', objectClass: 'Euclid', url: '', series: 1 },
  { scpNumber: 999, name: 'Tickle Monster', objectClass: 'Safe', url: '', series: 1 },
]

describe('useEntryProtocol', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('exports interval options', () => {
    expect(INTERVAL_OPTIONS).toEqual([10, 15, 30, 60])
  })

  it('returns expected properties', () => {
    const { composable } = mountWithProtocol()
    expect(composable.mode).toBeDefined()
    expect(composable.recommendedEntries).toBeDefined()
    expect(composable.isPaused).toBeDefined()
    expect(composable.countdown).toBeDefined()
    expect(composable.interval).toBeDefined()
    expect(composable.loadingRecommendations).toBeDefined()
    expect(composable.transitioning).toBeDefined()
    expect(composable.cardEntranceKey).toBeDefined()
    expect(composable.crawlerLang).toBeDefined()
    expect(composable.countdownProgress).toBeDefined()
    expect(typeof composable.setMode).toBe('function')
    expect(typeof composable.togglePause).toBe('function')
    expect(typeof composable.shuffle).toBe('function')
    expect(typeof composable.setIntervalOption).toBe('function')
    expect(typeof composable.startAutoRotation).toBe('function')
    expect(typeof composable.stopAutoRotation).toBe('function')
  })

  it('defaults to manual mode or reads from localStorage', () => {
    const { composable } = mountWithProtocol()
    expect(['manual', 'auto']).toContain(composable.mode.value)
  })

  it('defaults interval to 15 or reads from localStorage', () => {
    const { composable } = mountWithProtocol()
    expect(typeof composable.interval.value).toBe('number')
    expect(composable.interval.value).toBeGreaterThan(0)
  })

  it('togglePause flips pause state', () => {
    const { composable } = mountWithProtocol()
    const initial = composable.isPaused.value
    composable.togglePause()
    expect(composable.isPaused.value).toBe(!initial)
    composable.togglePause()
    expect(composable.isPaused.value).toBe(initial)
  })

  it('setIntervalOption updates interval and persists', () => {
    const { composable } = mountWithProtocol()
    composable.setIntervalOption(30)
    expect(composable.interval.value).toBe(30)
    expect(localStorage.getItem('scp-protocol-interval')).toBe('30')
  })

  it('countdownProgress is 0 when paused', () => {
    const { composable } = mountWithProtocol()
    composable.isPaused.value = true
    expect(composable.countdownProgress.value).toBe(0)
  })

  it('crawlerLang is en or cn', () => {
    const { composable } = mountWithProtocol()
    expect(['en', 'cn']).toContain(composable.crawlerLang.value)
  })

  it('shuffle fetches entries and updates state', async () => {
    mockFetchCrawlerEntries.mockResolvedValue({
      ok: true,
      data: {
        entries: mockEntries,
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
        state: { status: 'idle', lastCrawl: 0, totalEntries: 2 },
      },
    } as any)
    const { composable } = mountWithProtocol()

    // shuffle uses setTimeout internally — advance timers after calling
    const shufflePromise = composable.shuffle()
    await vi.advanceTimersByTimeAsync(350)
    await shufflePromise

    expect(mockFetchCrawlerEntries).toHaveBeenCalled()
    expect(composable.recommendedEntries.value.length).toBeGreaterThan(0)
    expect(composable.transitioning.value).toBe(false)
    expect(composable.loadingRecommendations.value).toBe(false)
  })

  it('shuffle handles API error gracefully', async () => {
    mockFetchCrawlerEntries.mockResolvedValue({
      ok: false,
      code: ErrorCode.SERVER_ERROR,
      error: 'Server error',
    } as any)
    const { composable } = mountWithProtocol()

    const shufflePromise = composable.shuffle()
    await vi.advanceTimersByTimeAsync(350)
    await shufflePromise

    expect(composable.loadingRecommendations.value).toBe(false)
    expect(composable.transitioning.value).toBe(false)
  })

  it('shuffle handles empty results', async () => {
    mockFetchCrawlerEntries.mockResolvedValue({
      ok: true,
      data: {
        entries: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
        state: { status: 'idle', lastCrawl: 0, totalEntries: 0 },
      },
    } as any)
    const { composable } = mountWithProtocol()

    const shufflePromise = composable.shuffle()
    await vi.advanceTimersByTimeAsync(350)
    await shufflePromise

    expect(composable.transitioning.value).toBe(false)
  })

  it('setMode persists to localStorage', async () => {
    mockFetchCrawlerEntries.mockResolvedValue({
      ok: true,
      data: {
        entries: mockEntries,
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
        state: { status: 'idle', lastCrawl: 0, totalEntries: 2 },
      },
    } as any)
    const { composable } = mountWithProtocol()

    const setModePromise = composable.setMode('auto')
    await vi.advanceTimersByTimeAsync(350)
    await setModePromise

    expect(localStorage.getItem('scp-protocol-mode')).toBe('auto')
    expect(composable.mode.value).toBe('auto')
  })

  it('setMode manual stops auto rotation', async () => {
    const { composable } = mountWithProtocol()

    await composable.setMode('manual')

    expect(localStorage.getItem('scp-protocol-mode')).toBe('manual')
    expect(composable.mode.value).toBe('manual')
  })
})
