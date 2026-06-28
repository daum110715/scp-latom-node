import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import NotFoundView from '../NotFoundView.vue'
import en from '@/locales/en'

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
      { path: '/:pathMatch(.*)*', component: NotFoundView },
    ],
  })
}

describe('NotFoundView', () => {
  it('renders the 404 page', async () => {
    const router = createTestRouter()
    await router.push('/nonexistent')

    const wrapper = mount(NotFoundView, {
      global: { plugins: [createTestI18n(), router] },
    })

    expect(wrapper.find('.not-found').exists()).toBe(true)
    expect(wrapper.find('.error-code').exists()).toBe(true)
    expect(wrapper.find('.error-code').text()).toBe('404')
  })

  it('renders error badge', async () => {
    const router = createTestRouter()
    await router.push('/nonexistent')

    const wrapper = mount(NotFoundView, {
      global: { plugins: [createTestI18n(), router] },
    })

    expect(wrapper.find('.error-badge').exists()).toBe(true)
    expect(wrapper.find('.pulse-dot').exists()).toBe(true)
  })

  it('renders error meta information', async () => {
    const router = createTestRouter()
    await router.push('/nonexistent')

    const wrapper = mount(NotFoundView, {
      global: { plugins: [createTestI18n(), router] },
    })

    expect(wrapper.find('.error-meta').exists()).toBe(true)
    const rows = wrapper.findAll('.meta-row')
    expect(rows.length).toBe(3) // Error code, terminal, timestamp
  })

  it('renders return button', async () => {
    const router = createTestRouter()
    await router.push('/nonexistent')

    const wrapper = mount(NotFoundView, {
      global: { plugins: [createTestI18n(), router] },
    })

    const link = wrapper.find('.btn-primary')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/')
  })

  it('renders title and description', async () => {
    const router = createTestRouter()
    await router.push('/nonexistent')

    const wrapper = mount(NotFoundView, {
      global: { plugins: [createTestI18n(), router] },
    })

    expect(wrapper.find('h1').exists()).toBe(true)
    expect(wrapper.find('p').exists()).toBe(true)
  })
})
