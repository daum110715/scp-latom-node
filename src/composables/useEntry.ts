import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { fetchEntryContent, type EntryContentResponse } from '@/services/crawler'
import { fetchEntryTags, type TagInfo } from '@/services/tags'
import { downloadEntry } from '@/services/download'
import { checkReports } from '@/services/reports'
import { useAuthStore } from '@/stores/auth'
import { useUserActivityStore } from '@/stores/userActivity'

export function useEntry() {
  const { t } = useI18n()
  const route = useRoute()
  const auth = useAuthStore()
  const activityStore = useUserActivityStore()

  const bookmarked = ref(false)
  const bookmarkLoading = ref(false)
  const downloading = ref(false)
  const reportOpen = ref(false)
  const reportCount = ref(0)
  const reportMax = ref(3)

  const lang = computed(() => route.params.lang as 'en' | 'cn')
  const scpNumber = computed(() => parseInt(route.params.scpNumber as string, 10))
  const scpId = computed(() => `SCP-${String(scpNumber.value).padStart(3, '0')}`)

  const loading = ref(true)
  const error = ref('')
  const data = ref<EntryContentResponse | null>(null)
  const tags = ref<TagInfo[]>([])
  const tagsLoading = ref(false)
  let pollTimer: ReturnType<typeof setTimeout> | null = null

  // Collapse all <details> elements in footer content after render
  // Accepts a CSS selector so desktop/mobile can target their own container
  function collapseFooterDetails(bodySelector: string) {
    nextTick(() => {
      const body = document.querySelector(bodySelector)
      if (!body) return
      body.querySelectorAll('details').forEach((el) => {
        el.removeAttribute('open')
      })
    })
  }

  async function loadContent(bodySelector: string) {
    loading.value = true
    error.value = ''

    const res = await fetchEntryContent(lang.value, scpNumber.value)

    if (!res.ok) {
      loading.value = false
      error.value = res.error
      return
    }

    data.value = res.data

    if (res.data.status === 'cached' || res.data.status === 'fetched') {
      loading.value = false
      recordVisit(res.data)
      loadTags()
      return
    }

    if (res.data.status === 'pending' || res.data.status === 'fetching') {
      pollTimer = setTimeout(() => {
        pollForContent(bodySelector)
      }, 2000)
      return
    }

    // status === 'error'
    loading.value = false
    error.value = res.data.error || 'Failed to fetch entry content'
  }

  function recordVisit(entry: EntryContentResponse) {
    if (!auth.isAuthenticated) return
    activityStore.recordVisit({
      language: lang.value,
      scpNumber: scpNumber.value,
      name: entry.name,
      objectClass: entry.objectClass,
    })
  }

  async function loadTags() {
    tagsLoading.value = true
    const res = await fetchEntryTags(scpNumber.value, lang.value)
    if (res.ok) {
      tags.value = res.data.tags
    }
    tagsLoading.value = false
  }

  async function pollForContent(bodySelector: string) {
    const res = await fetchEntryContent(lang.value, scpNumber.value)

    if (!res.ok) {
      loading.value = false
      error.value = res.error
      return
    }

    data.value = res.data

    if (res.data.status === 'cached' || res.data.status === 'fetched') {
      loading.value = false
      recordVisit(res.data)
      loadTags()
      return
    }

    if (res.data.status === 'pending' || res.data.status === 'fetching') {
      pollTimer = setTimeout(() => {
        pollForContent(bodySelector)
      }, 2000)
      return
    }

    loading.value = false
    error.value = res.data.error || 'Failed to fetch entry content'
  }

  function retry(bodySelector: string) {
    data.value = null
    loadContent(bodySelector)
  }

  async function toggleBookmark() {
    if (!auth.isAuthenticated) return
    bookmarkLoading.value = true
    const result = await activityStore.toggleBookmark(lang.value, scpNumber.value)
    if (result) bookmarked.value = !bookmarked.value
    bookmarkLoading.value = false
  }

  function handleDownload() {
    if (!data.value || downloading.value) return
    downloading.value = true
    downloadEntry(scpNumber.value, lang.value, data.value)
    downloading.value = false
  }

  function init(bodySelector: string) {
    if (!scpNumber.value || isNaN(scpNumber.value)) {
      error.value = 'Invalid SCP number'
      loading.value = false
      return
    }
    loadContent(bodySelector)

    // Check bookmark status for authenticated users
    if (auth.isAuthenticated) {
      activityStore.checkBookmark(lang.value, scpNumber.value).then((result: boolean) => {
        bookmarked.value = result
      })
      checkReports(lang.value, scpNumber.value).then((res) => {
        if (res.ok) {
          reportCount.value = res.data.count
          reportMax.value = res.data.maxReports
        }
      })
    }
  }

  onUnmounted(() => {
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  })

  return {
    t,
    auth,
    lang,
    scpNumber,
    scpId,
    loading,
    error,
    data,
    tags,
    tagsLoading,
    bookmarked,
    bookmarkLoading,
    downloading,
    reportOpen,
    reportCount,
    reportMax,
    collapseFooterDetails,
    loadContent,
    retry,
    toggleBookmark,
    handleDownload,
    init,
  }
}
