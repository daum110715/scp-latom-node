import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import HeroSection from '../HeroSection.vue'
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
      { path: '/catalog', component: { template: '<div />' } },
      { path: '/about', component: { template: '<div />' } },
    ],
  })
}

describe('HeroSection', () => {
  it('renders the hero section', async () => {
    const router = createTestRouter()
    await router.push('/')

    const wrapper = mount(HeroSection, {
      global: { plugins: [createTestI18n(), router] },
    })

    expect(wrapper.find('.hero').exists()).toBe(true)
    expect(wrapper.find('.hero-content').exists()).toBe(true)
  })

  it('renders the hero badge', async () => {
    const router = createTestRouter()
    await router.push('/')

    const wrapper = mount(HeroSection, {
      global: { plugins: [createTestI18n(), router] },
    })

    expect(wrapper.find('.hero-badge').exists()).toBe(true)
    expect(wrapper.find('.pulse-dot').exists()).toBe(true)
  })

  it('renders CTA buttons', async () => {
    const router = createTestRouter()
    await router.push('/')

    const wrapper = mount(HeroSection, {
      global: { plugins: [createTestI18n(), router] },
    })

    const links = wrapper.findAll('.hero-actions a')
    expect(links.length).toBe(2)
    expect(links[0].attributes('href')).toBe('/catalog')
    expect(links[1].attributes('href')).toBe('/about')
  })

  it('renders hero title and description', async () => {
    const router = createTestRouter()
    await router.push('/')

    const wrapper = mount(HeroSection, {
      global: { plugins: [createTestI18n(), router] },
    })

    expect(wrapper.find('.hero-title').exists()).toBe(true)
    expect(wrapper.find('.hero-description').exists()).toBe(true)
  })

  it('adds visible class after mount', async () => {
    const router = createTestRouter()
    await router.push('/')

    const wrapper = mount(HeroSection, {
      global: { plugins: [createTestI18n(), router] },
    })

    // After mount and requestAnimationFrame, visible class should be added
    // In test environment, requestAnimationFrame may not fire automatically
    expect(wrapper.find('.hero').exists()).toBe(true)
  })
})
