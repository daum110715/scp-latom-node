import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  fetchAdminEntries,
  fetchAdminEntry,
  updateAdminEntry,
  deleteAdminEntry,
  refetchEntryContent,
  triggerCrawl,
  fetchCrawlStatus,
  type AdminEntry,
} from '@/services/entries'

export const useEntriesStore = defineStore('entries', () => {
  const entries = ref<AdminEntry[]>([])
  const total = ref(0)
  const page = ref(1)
  const limit = ref(50)
  const totalPages = ref(0)
  const loading = ref(false)
  const error = ref('')
  const searchQuery = ref('')
  const languageFilter = ref('')
  const classFilter = ref('')
  const currentEntry = ref<AdminEntry | null>(null)
  const crawlStatus = ref<unknown>(null)

  async function fetchEntries() {
    loading.value = true
    error.value = ''
    const res = await fetchAdminEntries({
      page: page.value,
      limit: limit.value,
      q: searchQuery.value || undefined,
      language: languageFilter.value || undefined,
      object_class: classFilter.value || undefined,
    })
    loading.value = false
    if (res.ok) {
      entries.value = res.data.entries
      total.value = res.data.total
      totalPages.value = res.data.totalPages
    } else {
      error.value = res.error
    }
  }

  async function fetchEntry(id: number) {
    loading.value = true
    error.value = ''
    const res = await fetchAdminEntry(id)
    loading.value = false
    if (res.ok) {
      currentEntry.value = res.data.entry
    } else {
      error.value = res.error
    }
  }

  async function updateEntry(id: number, data: { name?: string; object_class?: string }) {
    const res = await updateAdminEntry(id, data)
    if (res.ok) await fetchEntries()
    return res
  }

  async function removeEntry(id: number) {
    const res = await deleteAdminEntry(id)
    if (res.ok) await fetchEntries()
    return res
  }

  async function refetch(id: number) {
    return refetchEntryContent(id)
  }

  async function crawl(lang: string) {
    return triggerCrawl(lang)
  }

  async function getCrawlStatus() {
    const res = await fetchCrawlStatus()
    if (res.ok) crawlStatus.value = res.data
    return res
  }

  function setPage(p: number) {
    page.value = p
    fetchEntries()
  }

  function setSearch(q: string) {
    searchQuery.value = q
    page.value = 1
    fetchEntries()
  }

  function setLanguageFilter(l: string) {
    languageFilter.value = l
    page.value = 1
    fetchEntries()
  }

  function setClassFilter(c: string) {
    classFilter.value = c
    page.value = 1
    fetchEntries()
  }

  return {
    entries,
    total,
    page,
    limit,
    totalPages,
    loading,
    error,
    searchQuery,
    languageFilter,
    classFilter,
    currentEntry,
    crawlStatus,
    fetchEntries,
    fetchEntry,
    updateEntry,
    removeEntry,
    refetch,
    crawl,
    getCrawlStatus,
    setPage,
    setSearch,
    setLanguageFilter,
    setClassFilter,
  }
})
