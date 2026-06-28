import { ref, computed, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchCrawlerEntries } from '@/services/crawler'
import type { CrawlEntry } from '@/services/crawler'

export type ProtocolMode = 'auto' | 'manual'

export const INTERVAL_OPTIONS = [10, 15, 30, 60] as const
const RECOMMENDED_COUNT = 6
const DEFAULT_INTERVAL = 15

export function useEntryProtocol() {
  const { locale } = useI18n()

  const mode = ref<ProtocolMode>('manual')
  const recommendedEntries = ref<CrawlEntry[]>([])
  const isPaused = ref(false)
  const countdown = ref(DEFAULT_INTERVAL)
  const interval = ref(DEFAULT_INTERVAL)
  const loadingRecommendations = ref(false)
  const transitioning = ref(false)
  const cardEntranceKey = ref(0)

  let countdownTimer: ReturnType<typeof setInterval> | null = null

  // Map UI locale to crawler language
  const crawlerLang = computed<'en' | 'cn'>(() => {
    return locale.value === 'zh' ? 'cn' : 'en'
  })

  // Countdown progress 0-1 for the SVG ring
  const countdownProgress = computed(() => {
    if (isPaused.value) return 0
    return 1 - countdown.value / interval.value
  })

  function clearTimers() {
    if (countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }

  async function fetchRandomEntries(): Promise<CrawlEntry[]> {
    loadingRecommendations.value = true

    try {
      const randomPage = Math.floor(Math.random() * 20) + 1
      const res = await fetchCrawlerEntries(crawlerLang.value, {
        page: randomPage,
        limit: 50,
      })

      if (res.ok && res.data.entries.length > 0) {
        const shuffled = [...res.data.entries].sort(() => Math.random() - 0.5)
        return shuffled.slice(0, RECOMMENDED_COUNT)
      }
    } catch {
      // Silently handle errors
    } finally {
      loadingRecommendations.value = false
    }

    return []
  }

  async function shuffle() {
    transitioning.value = true

    // Brief transition pause for visual effect
    await new Promise(resolve => setTimeout(resolve, 300))

    const entries = await fetchRandomEntries()
    if (entries.length > 0) {
      recommendedEntries.value = entries
      cardEntranceKey.value++
    }

    transitioning.value = false
    countdown.value = interval.value
  }

  function startAutoRotation() {
    clearTimers()
    countdown.value = interval.value

    countdownTimer = setInterval(() => {
      if (!isPaused.value) {
        countdown.value--
        if (countdown.value <= 0) {
          shuffle()
        }
      }
    }, 1000)
  }

  function stopAutoRotation() {
    clearTimers()
    countdown.value = interval.value
  }

  async function setMode(newMode: ProtocolMode) {
    mode.value = newMode

    if (newMode === 'auto') {
      if (recommendedEntries.value.length === 0) {
        await shuffle()
      }
      startAutoRotation()
    } else {
      stopAutoRotation()
    }
  }

  function togglePause() {
    isPaused.value = !isPaused.value
  }

  function setIntervalOption(seconds: number) {
    interval.value = seconds
    countdown.value = seconds
    if (mode.value === 'auto' && !isPaused.value) {
      startAutoRotation()
    }
  }

  // Watch for language changes and refresh in auto mode
  watch(crawlerLang, async () => {
    if (mode.value === 'auto') {
      await shuffle()
      startAutoRotation()
    }
  })

  onUnmounted(() => {
    clearTimers()
  })

  return {
    // State
    mode,
    recommendedEntries,
    isPaused,
    countdown,
    interval,
    loadingRecommendations,
    transitioning,
    cardEntranceKey,
    crawlerLang,

    // Computed
    countdownProgress,

    // Actions
    setMode,
    togglePause,
    shuffle,
    setIntervalOption,
  }
}
