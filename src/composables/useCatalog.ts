import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCrawlerStore } from '@/stores/crawler'
import { useEntryProtocol, INTERVAL_OPTIONS } from '@/composables/useEntryProtocol'
import { OBJECT_CLASSES } from '@/constants'
import type { ObjectClass } from '@/types'
import type { ProtocolMode } from '@/composables/useEntryProtocol'

export { INTERVAL_OPTIONS }

export function useCatalog() {
  const { t } = useI18n()
  const crawler = useCrawlerStore()
  const protocol = useEntryProtocol()

  const searchQuery = ref('')
  const activeClass = ref<ObjectClass | null>(null)
  const protocolVisible = ref(false)

  const ringRadius = ref(18)
  const ringCircumference = computed(() => 2 * Math.PI * ringRadius.value)
  const ringOffset = computed(() => {
    return ringCircumference.value * (1 - protocol.countdownProgress.value)
  })

  // Debounced search
  let searchTimeout: ReturnType<typeof setTimeout> | null = null
  watch(searchQuery, (val) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      crawler.setSearchQuery(val)
    }, 300)
  })

  function toggleClass(cls: ObjectClass) {
    if (activeClass.value === cls) {
      activeClass.value = null
      crawler.setClassFilter(null)
    } else {
      activeClass.value = cls
      crawler.setClassFilter(cls)
    }
  }

  function setLanguage(lang: 'en' | 'cn') {
    activeClass.value = null
    searchQuery.value = ''
    crawler.setLanguage(lang)
  }

  function switchProtocol(mode: ProtocolMode) {
    protocol.setMode(mode)
  }

  onMounted(async () => {
    crawler.init()
    requestAnimationFrame(() => {
      protocolVisible.value = true
    })

    // If auto mode was active before navigation, restart the timer
    // and refresh entries (countdown resets, isPaused resets)
    if (protocol.mode.value === 'auto') {
      protocol.isPaused.value = false
      await protocol.shuffle()
      protocol.startAutoRotation()
    }
  })

  return {
    t,
    crawler,
    protocol,
    searchQuery,
    activeClass,
    protocolVisible,
    objectClasses: OBJECT_CLASSES,
    ringRadius,
    ringCircumference,
    ringOffset,
    toggleClass,
    setLanguage,
    switchProtocol,
  }
}
