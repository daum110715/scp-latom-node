import { computed, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { STORAGE_KEYS } from '@/constants'

export function useLocale(): {
  currentLocale: ComputedRef<string>
  toggleLocale: () => void
  setLocale: (lang: string) => void
} {
  const { locale } = useI18n()

  const currentLocale = computed(() => locale.value)

  function toggleLocale() {
    locale.value = locale.value === 'en' ? 'zh' : 'en'
    localStorage.setItem(STORAGE_KEYS.LOCALE, locale.value)
    document.documentElement.lang = locale.value
  }

  function setLocale(lang: string) {
    locale.value = lang
    localStorage.setItem(STORAGE_KEYS.LOCALE, lang)
    document.documentElement.lang = lang
  }

  return { currentLocale, toggleLocale, setLocale }
}
