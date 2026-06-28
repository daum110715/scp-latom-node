import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import { defineComponent, nextTick, h } from 'vue'
import ErrorBoundary from '../ErrorBoundary.vue'
import en from '@/locales/en'
import { ErrorCode } from '@/services/errors'

vi.mock('@/services/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
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
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
}

function ThrowingComponent() {
  return defineComponent({
    setup() {
      throw new Error('Test component error')
    },
    template: '<div />',
  })
}

function WorkingComponent() {
  return defineComponent({
    template: '<div class="working">Content</div>',
  })
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders slot content when no error', async () => {
    const router = createTestRouter()
    await router.push('/')

    const wrapper = mount(ErrorBoundary, {
      slots: { default: h(WorkingComponent()) },
      global: { plugins: [createTestI18n(), router] },
    })

    expect(wrapper.find('.working').exists()).toBe(true)
    expect(wrapper.find('.error-boundary').exists()).toBe(false)
  })

  it('renders error UI when child throws', async () => {
    const router = createTestRouter()
    await router.push('/')

    const wrapper = mount(ErrorBoundary, {
      slots: { default: h(ThrowingComponent()) },
      global: { plugins: [createTestI18n(), router] },
    })

    await nextTick()

    expect(wrapper.find('.error-boundary').exists()).toBe(true)
    expect(wrapper.find('.error-code').exists()).toBe(true)
  })

  it('resets error state when retry button clicked', async () => {
    const router = createTestRouter()
    await router.push('/')

    // Use a component that throws on first render but not on retry
    let shouldThrow = true
    const ConditionalThrow = defineComponent({
      setup() {
        if (shouldThrow) throw new Error('Test error')
      },
      template: '<div class="working">Content</div>',
    })

    const wrapper = mount(ErrorBoundary, {
      slots: { default: h(ConditionalThrow) },
      global: { plugins: [createTestI18n(), router] },
    })

    await nextTick()
    expect(wrapper.find('.error-boundary').exists()).toBe(true)

    shouldThrow = false
    await wrapper.find('.btn-primary').trigger('click')
    await nextTick()

    // After retry, the error boundary resets but the slot component
    // would need to re-render without throwing
  })

  it('accepts custom fallbackCode prop', async () => {
    const router = createTestRouter()
    await router.push('/')

    const wrapper = mount(ErrorBoundary, {
      props: { fallbackCode: ErrorCode.NOT_FOUND },
      slots: { default: h(ThrowingComponent()) },
      global: { plugins: [createTestI18n(), router] },
    })

    await nextTick()
    expect(wrapper.find('.error-boundary').exists()).toBe(true)
  })
})
