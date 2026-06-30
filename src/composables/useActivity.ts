import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserActivityStore } from '@/stores/userActivity'

export function useActivity() {
  const { t } = useI18n()
  const activity = useUserActivityStore()

  const showClearConfirm = ref(false)

  function setLanguage(lang: string | null) {
    activity.setLangFilter(lang)
  }

  function formatTime(dateStr: string): string {
    try {
      return new Date(dateStr + 'Z').toLocaleString()
    } catch {
      return dateStr
    }
  }

  async function handleClear() {
    const ok = await activity.clearHistory()
    if (ok) showClearConfirm.value = false
  }

  async function handleDeleteHistory(id: number) {
    await activity.deleteHistoryEntryById(id)
  }

  async function handleRemoveBookmark(lang: string, scpNumber: number) {
    await activity.removeBookmark(lang, scpNumber)
  }

  onMounted(() => {
    activity.init()
  })

  return {
    t,
    activity,
    showClearConfirm,
    setLanguage,
    formatTime,
    handleClear,
    handleDeleteHistory,
    handleRemoveBookmark,
  }
}
