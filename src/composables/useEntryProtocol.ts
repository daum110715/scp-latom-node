import { ref, computed, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchCrawlerEntries } from '@/services/crawler'
import type { CrawlEntry } from '@/services/crawler'

export type ProtocolMode = 'auto' | 'manual'

export const INTERVAL_OPTIONS = [10, 15, 30, 60] as const
const RECOMMENDED_COUNT = 6
const DEFAULT_INTERVAL = 15

const MODE_KEY = 'scp-protocol-mode'
const INTERVAL_KEY = 'scp-protocol-interval'

const VALID_MODES: readonly ProtocolMode[] = ['auto', 'manual']

function readMode(): ProtocolMode {
  const stored = localStorage.getItem(MODE_KEY)
  return VALID_MODES.includes(stored as ProtocolMode) ? (stored as ProtocolMode) : 'manual'
}

// ─── Shared state (persists across component mount/unmount cycles) ───
const mode = ref<ProtocolMode>(readMode())
const interval = ref<number>(Number(localStorage.getItem(INTERVAL_KEY)) || DEFAULT_INTERVAL)
const recommendedEntries = ref<CrawlEntry[]>([])
const isPaused = ref(false)
const countdown = ref(interval.value)
const loadingRecommendations = ref(false)
const transitioning = ref(false)
const cardEntranceKey = ref(0)

let countdownTimer: ReturnType<typeof setInterval> | null = null

function clearTimers() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

function startAutoRotation() {
  clearTimers()
  countdown.value = interval.value

  countdownTimer = setInterval(() => {
    if (!isPaused.value) {
      countdown.value--
      if (countdown.value <= 0) {
        // Trigger shuffle via the shared state
        shuffleFromTimer()
      }
    }
  }, 1000)
}

function stopAutoRotation() {
  clearTimers()
  countdown.value = interval.value
}

// Internal shuffle called by the timer (no composable context needed)
async function shuffleFromTimer() {
  transitioning.value = true
  await new Promise((resolve) => setTimeout(resolve, 300))

  // We need to determine the language — use the stored locale
  const locale = localStorage.getItem('scp-locale') || 'en'
  const lang: 'en' | 'cn' = locale === 'zh' ? 'cn' : 'en'

  try {
    loadingRecommendations.value = true
    const randomPage = Math.floor(Math.random() * 20) + 1
    const res = await fetchCrawlerEntries(lang, {
      page: randomPage,
      limit: 50,
    })

    if (res.ok && res.data.entries.length > 0) {
      const shuffled = [...res.data.entries].sort(() => Math.random() - 0.5)
      recommendedEntries.value = shuffled.slice(0, RECOMMENDED_COUNT)
      cardEntranceKey.value++
    }
  } catch {
    // Silently handle errors
  } finally {
    loadingRecommendations.value = false
    transitioning.value = false
    countdown.value = interval.value
  }
}

// ─── Composable ──────────────────────────────────────────────────────
export function useEntryProtocol() {
  const { locale } = useI18n()

  // Map UI locale to crawler language
  const crawlerLang = computed<'en' | 'cn'>(() => {
    return locale.value === 'zh' ? 'cn' : 'en'
  })

  // Countdown progress 0→1 for the SVG ring
  const countdownProgress = computed(() => {
    if (isPaused.value) return 0
    return 1 - countdown.value / interval.value
  })

  async function fetchRandomEntries(): Promise<CrawlEntry[]> {
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
    }

    return []
  }

  async function shuffle() {
    transitioning.value = true
    await new Promise((resolve) => setTimeout(resolve, 300))

    loadingRecommendations.value = true
    const entries = await fetchRandomEntries()
    loadingRecommendations.value = false

    if (entries.length > 0) {
      recommendedEntries.value = entries
      cardEntranceKey.value++
    }

    transitioning.value = false
    countdown.value = interval.value
  }

  async function setMode(newMode: ProtocolMode) {
    mode.value = newMode
    localStorage.setItem(MODE_KEY, newMode)

    if (newMode === 'auto') {
      isPaused.value = false
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
    localStorage.setItem(INTERVAL_KEY, String(seconds))
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
    // Stop the timer — the shared state (mode, entries, etc.) survives
    clearTimers()
  })

  return {
    // State (all from shared module scope — persists across navigation)
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
    startAutoRotation,
    stopAutoRotation,
  }
}
