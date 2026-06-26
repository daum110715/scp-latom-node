import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Card from '../Card.vue'

describe('Card', () => {
  it('renders slot content', () => {
    const wrapper = mount(Card, {
      slots: { default: '<p>Card content</p>' },
    })
    expect(wrapper.text()).toContain('Card content')
  })

  it('does not have hoverable class by default', () => {
    const wrapper = mount(Card)
    expect(wrapper.classes()).not.toContain('hoverable')
  })

  it('applies hoverable class when hoverable prop is true', () => {
    const wrapper = mount(Card, {
      props: { hoverable: true },
    })
    expect(wrapper.classes()).toContain('hoverable')
  })

  it('renders as a div element', () => {
    const wrapper = mount(Card)
    expect(wrapper.element.tagName).toBe('DIV')
  })

  it('always has card class', () => {
    const wrapper = mount(Card)
    expect(wrapper.classes()).toContain('card')
  })
})
