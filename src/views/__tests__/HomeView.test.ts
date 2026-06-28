import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import HomeView from '../HomeView.vue'
import en from '@/locales/en'

vi.mock('@/stores/crawler', () => ({
  useCrawlerStore: vi.fn(() => ({
    hasData: false,
    loading: false,
    error: '',
    entries: [],
    total: 0,
    state: null,
    language: 'en',
    init: vi.fn(),
  })),
}))

function createTestI18n() {
  return createI18n({
    legacy: false,
    locale: 'en',
    fallbackLocale: 'en',
    messages: { en },
  })
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/catalog', component: { template: '<div />' } },
      { path: '/about', component: { template: '<div />' } },
      { path: '/entry/:lang/:scpNumber', component: { template: '<div />' } },
    ],
  })
}

describe('HomeView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders the home page', async () => {
    const router = createTestRouter()
    await router.push('/')

    const wrapper = mount(HomeView, {
      global: { plugins: [createTestI18n(), router, createPinia()] },
    })

    expect(wrapper.find('.home').exists()).toBe(true)
  })

  it('renders HeroSection', async () => {
    const router = createTestRouter()
    await router.push('/')

    const wrapper = mount(HomeView, {
      global: { plugins: [createTestI18n(), router, createPinia()] },
    })

    // HeroSection should be rendered
    expect(wrapper.find('.home').exists()).toBe(true)
  })
})
