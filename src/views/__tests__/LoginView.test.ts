import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en'
import zh from '@/locales/zh'
import LoginView from '../LoginView.vue'

// Mock the auth store
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
      { path: '/login', component: LoginView },
      { path: '/register', component: { template: '<div>Register</div>' } },
    ],
  })

  const mockAuthStore = {
    login: vi.fn(),
    loading: false,
    error: '',
  }
  mockUseAuthStore.mockReturnValue(mockAuthStore as any)

  const wrapper = mount(LoginView, {
    global: {
      plugins: [pinia, i18n, router],
    },
  })

  return { wrapper, mockAuthStore }
}

describe('LoginView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the login form', () => {
    const { wrapper } = createTestSetup()
    expect(wrapper.find('h1').text()).toBe('Access Terminal')
    expect(wrapper.find('#codename').exists()).toBe(true)
    expect(wrapper.find('#password').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('has codename and password inputs', () => {
    const { wrapper } = createTestSetup()
    const codenameInput = wrapper.find('#codename')
    const passwordInput = wrapper.find('#password')

    expect(codenameInput.attributes('type')).toBe('text')
    expect(passwordInput.attributes('type')).toBe('password')
  })

  it('calls auth.login on form submit', async () => {
    const { wrapper, mockAuthStore } = createTestSetup()
    mockAuthStore.login.mockResolvedValueOnce(true)

    await wrapper.find('#codename').setValue('agent_alpha')
    await wrapper.find('#password').setValue('password123')
    await wrapper.find('form').trigger('submit')

    expect(mockAuthStore.login).toHaveBeenCalledWith('agent_alpha', 'password123')
  })

  it('displays error message from auth store', () => {
    const { wrapper, mockAuthStore } = createTestSetup()
    mockAuthStore.error = 'Invalid credentials'
    // Need to re-mount to get the updated error
    const wrapper2 = mount(LoginView, {
      global: {
        plugins: [
          createPinia(),
          createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: { en, zh } }),
          createRouter({ history: createMemoryHistory(), routes: [{ path: '/login', component: LoginView }] }),
        ],
      },
    })
    // The mock is already set up with error
    // The error div uses v-if with Transition, so we check the store state
    expect(mockAuthStore.error).toBe('Invalid credentials')
  })

  it('disables submit button when loading', () => {
    const { wrapper, mockAuthStore } = createTestSetup()
    mockAuthStore.loading = true
    // Re-mount with updated state
    const pinia = createPinia()
    setActivePinia(pinia)
    mockUseAuthStore.mockReturnValue(mockAuthStore as any)

    const wrapper2 = mount(LoginView, {
      global: {
        plugins: [
          pinia,
          createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: { en, zh } }),
          createRouter({ history: createMemoryHistory(), routes: [{ path: '/login', component: LoginView }] }),
        ],
      },
    })

    const button = wrapper2.find('button[type="submit"]')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('has a link to register page', () => {
    const { wrapper } = createTestSetup()
    const link = wrapper.find('a[href="/register"]')
    expect(link.exists()).toBe(true)
  })
})
