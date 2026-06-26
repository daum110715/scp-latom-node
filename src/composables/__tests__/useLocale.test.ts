import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en'
import zh from '@/locales/zh'
import { useLocale } from '../useLocale'

function createTestI18n(locale = 'en') {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    messages: { en, zh },
  })
}

function mountWithLocale(initialLocale = 'en') {
  const i18n = createTestI18n(initialLocale)
  let composable: ReturnType<typeof useLocale>

  const wrapper = mount(
    defineComponent({
      setup() {
        composable = useLocale()
        return () => ''
      },
    }),
    { global: { plugins: [i18n] } }
  )

  return { wrapper, composable: composable!, i18n }
}

describe('useLocale', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.lang = 'en'
  })

  it('returns current locale', () => {
    const { composable } = mountWithLocale('en')
    expect(composable.currentLocale.value).toBe('en')
  })

  it('toggleLocale switches from en to zh', () => {
    const { composable } = mountWithLocale('en')
    composable.toggleLocale()
    expect(composable.currentLocale.value).toBe('zh')
    expect(document.documentElement.lang).toBe('zh')
  })

  it('toggleLocale switches from zh to en', () => {
    const { composable } = mountWithLocale('zh')
    composable.toggleLocale()
    expect(composable.currentLocale.value).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('toggleLocale persists to localStorage', () => {
    const { composable } = mountWithLocale('en')
    composable.toggleLocale()
    expect(localStorage.getItem('scp-locale')).toBe('zh')
  })

  it('setLocale sets a specific locale', () => {
    const { composable } = mountWithLocale('en')
    composable.setLocale('zh')
    expect(composable.currentLocale.value).toBe('zh')
    expect(document.documentElement.lang).toBe('zh')
    expect(localStorage.getItem('scp-locale')).toBe('zh')
  })

  it('setLocale updates document.documentElement.lang', () => {
    const { composable } = mountWithLocale('en')
    composable.setLocale('zh')
    expect(document.documentElement.lang).toBe('zh')
    composable.setLocale('en')
    expect(document.documentElement.lang).toBe('en')
  })
})
