import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiPost, apiGet } from '@/services/api'
import type { ApiResult } from '@/services/response'
import { ErrorCode, resolveErrorMessage } from '@/services/errors'

export interface User {
  id: number
  codename: string
  role: string
  clearance: number
  created_at?: string
}

interface AuthPayload {
  user: User
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref('')

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  function clearAuth() {
    user.value = null
  }

  function clearError() {
    error.value = ''
  }

  function handleAuthResult(res: ApiResult<AuthPayload>): boolean {
    if (res.ok) {
      // Verify admin role
      if (res.data.user.role !== 'admin') {
        error.value = 'Insufficient clearance. Admin access required.'
        clearAuth()
        return false
      }
      user.value = res.data.user
      clearError()
      return true
    }
    error.value = res.error || resolveErrorMessage(ErrorCode.UNKNOWN)
    return false
  }

  async function login(codename: string, password: string): Promise<boolean> {
    loading.value = true
    clearError()
    const res = await apiPost<AuthPayload>('/auth/login', { codename, password })
    loading.value = false
    return handleAuthResult(res)
  }

  async function fetchProfile(): Promise<boolean> {
    loading.value = true
    clearError()
    const res = await apiGet<AuthPayload>('/auth/me')
    loading.value = false
    if (res.ok) {
      if (res.data.user.role !== 'admin') {
        error.value = 'Insufficient clearance. Admin access required.'
        clearAuth()
        return false
      }
      user.value = res.data.user
      return true
    }
    error.value = res.error || resolveErrorMessage(ErrorCode.UNAUTHORIZED)
    clearAuth()
    return false
  }

  async function logout() {
    await apiPost('/auth/logout')
    clearAuth()
    clearError()
  }

  async function init() {
    await fetchProfile()
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    login,
    logout,
    fetchProfile,
    init,
    clearError,
  }
})
