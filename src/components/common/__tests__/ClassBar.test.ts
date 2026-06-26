import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ClassBar from '../ClassBar.vue'
import type { ObjectClass } from '@/types'

const ALL_CLASSES: ObjectClass[] = ['Safe', 'Euclid', 'Keter', 'Thaumiel', 'Apollyon', 'Neutralized']

describe('ClassBar', () => {
  it.each(ALL_CLASSES)('renders indicator for %s class', (objectClass) => {
    const wrapper = mount(ClassBar, {
      props: { objectClass },
    })
    const indicator = wrapper.find('.class-indicator')
    expect(indicator.exists()).toBe(true)
    expect(indicator.attributes('style')).toContain('background')
  })

  it('hides label by default', () => {
    const wrapper = mount(ClassBar, {
      props: { objectClass: 'Safe' },
    })
    expect(wrapper.find('.class-label').exists()).toBe(false)
  })

  it('shows label when showLabel is true', () => {
    const wrapper = mount(ClassBar, {
      props: { objectClass: 'Keter', showLabel: true },
    })
    const label = wrapper.find('.class-label')
    expect(label.exists()).toBe(true)
    expect(label.text()).toBe('Keter')
  })

  it('sets title attribute to objectClass', () => {
    const wrapper = mount(ClassBar, {
      props: { objectClass: 'Euclid' },
    })
    expect(wrapper.find('.class-bar').attributes('title')).toBe('Euclid')
  })

  it('applies correct CSS variable for each class', () => {
    for (const cls of ALL_CLASSES) {
      const wrapper = mount(ClassBar, {
        props: { objectClass: cls },
      })
      const style = wrapper.find('.class-indicator').attributes('style')
      expect(style).toContain(`var(--class-${cls.toLowerCase()})`)
    }
  })
})
