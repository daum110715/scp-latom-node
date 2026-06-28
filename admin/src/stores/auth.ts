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
  token?: string
}

const TOKEN_KEY = 'scp-admin-token'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string>(localStorage.getItem(TOKEN_KEY) || '')
  const loading = ref(false)
  const error = ref('')

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  function setToken(t: string) {
    token.value = t
    localStorage.setItem(TOKEN_KEY, t)
  }

  function clearAuth() {
    user.value = null
    token.value = ''
    localStorage.removeItem(TOKEN_KEY)
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
      if (res.data.token) setToken(res.data.token)
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
    if (!token.value) return false
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

  function logout() {
    clearAuth()
    clearError()
  }

  async function init() {
    if (token.value) {
      await fetchProfile()
    }
  }

  return {
    user,
    token,
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
