import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  fetchAdminLogs,
  fetchLogStats,
  cleanupLogs,
  type AdminLogEntry,
  type LogStats,
} from '@/services/logs'

export const useLogsStore = defineStore('logs', () => {
  const logs = ref<AdminLogEntry[]>([])
  const total = ref(0)
  const page = ref(1)
  const limit = ref(50)
  const totalPages = ref(0)
  const loading = ref(false)
  const error = ref('')
  const levelFilter = ref('')
  const sourceFilter = ref('')
  const categoryFilter = ref('')
  const searchQuery = ref('')
  const stats = ref<LogStats | null>(null)

  async function fetchLogs() {
    loading.value = true
    error.value = ''
    const res = await fetchAdminLogs({
      page: page.value,
      limit: limit.value,
      level: levelFilter.value || undefined,
      source: sourceFilter.value || undefined,
      category: categoryFilter.value || undefined,
      q: searchQuery.value || undefined,
    })
    loading.value = false
    if (res.ok) {
      logs.value = res.data.logs
      total.value = res.data.total
      totalPages.value = res.data.totalPages
    } else {
      error.value = res.error
    }
  }

  async function fetchStats() {
    const res = await fetchLogStats()
    if (res.ok) stats.value = res.data.stats
  }

  async function cleanup(days = 30) {
    return cleanupLogs(days)
  }

  function setPage(p: number) {
    page.value = p
    fetchLogs()
  }

  function setLevelFilter(l: string) {
    levelFilter.value = l
    page.value = 1
    fetchLogs()
  }

  function setSourceFilter(s: string) {
    sourceFilter.value = s
    page.value = 1
    fetchLogs()
  }

  function setCategoryFilter(c: string) {
    categoryFilter.value = c
    page.value = 1
    fetchLogs()
  }

  function setSearch(q: string) {
    searchQuery.value = q
    page.value = 1
    fetchLogs()
  }

  return {
    logs,
    total,
    page,
    limit,
    totalPages,
    loading,
    error,
    levelFilter,
    sourceFilter,
    categoryFilter,
    searchQuery,
    stats,
    fetchLogs,
    fetchStats,
    cleanup,
    setPage,
    setLevelFilter,
    setSourceFilter,
    setCategoryFilter,
    setSearch,
  }
})
