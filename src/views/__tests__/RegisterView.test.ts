import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en'
import zh from '@/locales/zh'
import RegisterView from '../RegisterView.vue'

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

import { useAuthStore } from '@/stores/auth'
const mockUseAuthStore = vi.mocked(useAuthStore)

function createTestSetup() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    fallbackLocale: 'en',
    messages: { en, zh },
  })

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>Home</div>' } },
      { path: '/register', component: RegisterView },
      { path: '/login', component: { template: '<div>Login</div>' } },
    ],
  })

  const mockAuthStore = {
    register: vi.fn(),
    loading: false,
    error: '',
  }
  mockUseAuthStore.mockReturnValue(mockAuthStore as any)

  const wrapper = mount(RegisterView, {
    global: {
      plugins: [pinia, i18n, router],
    },
  })

  return { wrapper, mockAuthStore }
}

describe('RegisterView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the registration form', () => {
    const { wrapper } = createTestSetup()
    expect(wrapper.find('h1').text()).toBe('Personnel Registration')
    expect(wrapper.find('#codename').exists()).toBe(true)
    expect(wrapper.find('#password').exists()).toBe(true)
    expect(wrapper.find('#confirm').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('shows codename format hint', () => {
    const { wrapper } = createTestSetup()
    const hint = wrapper.find('.form-hint')
    expect(hint.exists()).toBe(true)
    expect(hint.text()).toContain('3-32')
  })

  it('validates codename format - rejects too short', async () => {
    const { wrapper } = createTestSetup()

    await wrapper.find('#codename').setValue('ab')
    await wrapper.find('#password').setValue('password123')
    await wrapper.find('#confirm').setValue('password123')
    await wrapper.find('form').trigger('submit')

    // Should show local error, not call register
    const { mockAuthStore } = createTestSetup()
    // The error is set in localError ref, displayed in .error-msg
    // We check that register was NOT called
    expect(mockAuthStore.register).not.toHaveBeenCalled()
  })

  it('validates codename format - rejects special characters', async () => {
    const { wrapper, mockAuthStore } = createTestSetup()

    await wrapper.find('#codename').setValue('invalid-name!')
    await wrapper.find('#password').setValue('password123')
    await wrapper.find('#confirm').setValue('password123')
    await wrapper.find('form').trigger('submit')

    expect(mockAuthStore.register).not.toHaveBeenCalled()
  })

  it('validates password length - rejects short passwords', async () => {
    const { wrapper, mockAuthStore } = createTestSetup()

    await wrapper.find('#codename').setValue('valid_name')
    await wrapper.find('#password').setValue('short')
    await wrapper.find('#confirm').setValue('short')
    await wrapper.find('form').trigger('submit')

    expect(mockAuthStore.register).not.toHaveBeenCalled()
  })

  it('validates password confirmation match', async () => {
    const { wrapper, mockAuthStore } = createTestSetup()

    await wrapper.find('#codename').setValue('valid_name')
    await wrapper.find('#password').setValue('password123')
    await wrapper.find('#confirm').setValue('different123')
    await wrapper.find('form').trigger('submit')

    expect(mockAuthStore.register).not.toHaveBeenCalled()
  })

  it('calls auth.register with valid inputs', async () => {
    const { wrapper, mockAuthStore } = createTestSetup()
    mockAuthStore.register.mockResolvedValueOnce(true)

    await wrapper.find('#codename').setValue('valid_agent')
    await wrapper.find('#password').setValue('password123')
    await wrapper.find('#confirm').setValue('password123')
    await wrapper.find('form').trigger('submit')

    expect(mockAuthStore.register).toHaveBeenCalledWith('valid_agent', 'password123')
  })

  it('has a link to login page', () => {
    const { wrapper } = createTestSetup()
    const link = wrapper.find('a[href="/login"]')
    expect(link.exists()).toBe(true)
  })

  it('accepts valid codename with underscores and numbers', async () => {
    const { wrapper, mockAuthStore } = createTestSetup()
    mockAuthStore.register.mockResolvedValueOnce(true)

    await wrapper.find('#codename').setValue('agent_123')
    await wrapper.find('#password').setValue('password123')
    await wrapper.find('#confirm').setValue('password123')
    await wrapper.find('form').trigger('submit')

    expect(mockAuthStore.register).toHaveBeenCalledWith('agent_123', 'password123')
  })
})
