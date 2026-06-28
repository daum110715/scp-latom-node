import { createI18n } from 'vue-i18n'
import en from './locales/en'
import zh from './locales/zh'

const savedLocale =
  localStorage.getItem('scp-locale') || (navigator.language.startsWith('zh') ? 'zh' : 'en')

const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: { en, zh },
})

export default i18n
