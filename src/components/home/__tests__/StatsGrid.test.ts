import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import StatsGrid from '../StatsGrid.vue'
import en from '@/locales/en'
import type { CrawlEntry, CrawlState } from '@/services/crawler'

function createTestI18n() {
  return createI18n({
    legacy: false,
    locale: 'en',
    fallbackLocale: 'en',
    messages: { en },
  })
}

const mockEntries: CrawlEntry[] = [
  { scpNumber: 173, name: 'The Sculpture', objectClass: 'Euclid', url: '', series: 1 },
  { scpNumber: 999, name: 'Tickle Monster', objectClass: 'Safe', url: '', series: 1 },
  { scpNumber: 682, name: 'Hard-to-Destroy Reptile', objectClass: 'Keter', url: '', series: 1 },
]

const mockState: CrawlState = {
  status: 'idle',
  lastCrawl: 1719400000000,
  totalEntries: 3,
}

describe('StatsGrid', () => {
  it('renders stat cards', () => {
    const wrapper = mount(StatsGrid, {
      props: { total: 3, entries: mockEntries, state: mockState },
      global: { plugins: [createTestI18n()] },
    })

    const cards = wrapper.findAll('.stat-card')
    expect(cards.length).toBe(4) // Total, Safe, Euclid, Keter
  })

  it('displays total count', () => {
    const wrapper = mount(StatsGrid, {
      props: { total: 100, entries: mockEntries, state: mockState },
      global: { plugins: [createTestI18n()] },
    })

    const values = wrapper.findAll('.stat-value')
    expect(values[0].text()).toBe('100')
  })

  it('counts entries by class', () => {
    const wrapper = mount(StatsGrid, {
      props: { total: 3, entries: mockEntries, state: mockState },
      global: { plugins: [createTestI18n()] },
    })

    const values = wrapper.findAll('.stat-value')
    // Total=3, Safe=1, Euclid=1, Keter=1
    expect(values[0].text()).toBe('3')
    expect(values[1].text()).toBe('1') // Safe
    expect(values[2].text()).toBe('1') // Euclid
    expect(values[3].text()).toBe('1') // Keter
  })

  it('handles empty entries', () => {
    const wrapper = mount(StatsGrid, {
      props: { total: 0, entries: [], state: null },
      global: { plugins: [createTestI18n()] },
    })

    const cards = wrapper.findAll('.stat-card')
    expect(cards.length).toBe(4)
  })

  it('renders stat labels', () => {
    const wrapper = mount(StatsGrid, {
      props: { total: 3, entries: mockEntries, state: mockState },
      global: { plugins: [createTestI18n()] },
    })

    const labels = wrapper.findAll('.stat-label')
    expect(labels.length).toBe(4)
  })

  it('renders stat icons', () => {
    const wrapper = mount(StatsGrid, {
      props: { total: 3, entries: mockEntries, state: mockState },
      global: { plugins: [createTestI18n()] },
    })

    const icons = wrapper.findAll('.stat-icon')
    expect(icons.length).toBe(4)
  })
})
