import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Badge from '../Badge.vue'

describe('Badge', () => {
  it('renders slot content', () => {
    const wrapper = mount(Badge, {
      slots: { default: 'Safe' },
    })
    expect(wrapper.text()).toBe('Safe')
  })

  it('applies default variant class when no variant prop', () => {
    const wrapper = mount(Badge, {
      slots: { default: 'Test' },
    })
    expect(wrapper.classes()).toContain('default')
  })

  it('applies variant class when variant prop is provided', () => {
    const wrapper = mount(Badge, {
      props: { variant: 'safe' },
      slots: { default: 'Safe' },
    })
    expect(wrapper.classes()).toContain('safe')
  })

  it.each(['safe', 'euclid', 'keter', 'thaumiel', 'apollyon', 'neutralized', 'info', 'danger'] as const)(
    'applies "%s" variant class',
    (variant) => {
      const wrapper = mount(Badge, {
        props: { variant },
        slots: { default: 'Test' },
      })
      expect(wrapper.classes()).toContain(variant)
    }
  )

  it('renders as a span element', () => {
    const wrapper = mount(Badge)
    expect(wrapper.element.tagName).toBe('SPAN')
  })

  it('renders empty slot gracefully', () => {
    const wrapper = mount(Badge)
    expect(wrapper.text()).toBe('')
  })
})
