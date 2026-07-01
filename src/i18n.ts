import { createI18n } from 'vue-i18n'
import en from './locales/en'
import zh from './locales/zh'
import { STORAGE_KEYS } from './constants'

const savedLocale =
  localStorage.getItem(STORAGE_KEYS.LOCALE) || (navigator.language.startsWith('zh') ? 'zh' : 'en')

const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: { en, zh },
})

export default i18n
