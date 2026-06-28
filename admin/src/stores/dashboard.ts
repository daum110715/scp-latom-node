import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchAdminStats, type AdminStats } from '@/services/dashboard'

export const useDashboardStore = defineStore('dashboard', () => {
  const stats = ref<AdminStats | null>(null)
  const loading = ref(false)
  const error = ref('')

  async function fetchStats() {
    loading.value = true
    error.value = ''
    const res = await fetchAdminStats()
    loading.value = false
    if (res.ok) {
      stats.value = res.data.stats
    } else {
      error.value = res.error
    }
  }

  return { stats, loading, error, fetchStats }
})
