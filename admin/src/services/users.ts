import { apiGet, apiPut, apiDelete } from './api'
import type { ApiResult } from './response'

export interface AdminUser {
  id: number
  codename: string
  role: string
  clearance: number
  created_at: string
  updated_at: string
  historyCount?: number
  bookmarkCount?: number
  proposalCount?: number
  voteCount?: number
}

export interface AdminUsersListResponse {
  users: AdminUser[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function fetchAdminUsers(params: {
  page?: number
  limit?: number
  q?: string
  role?: string
  sort?: string
  order?: string
} = {}): Promise<ApiResult<AdminUsersListResponse>> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.q) qs.set('q', params.q)
  if (params.role) qs.set('role', params.role)
  if (params.sort) qs.set('sort', params.sort)
  if (params.order) qs.set('order', params.order)
  const query = qs.toString()
  return apiGet(`/admin/users${query ? `?${query}` : ''}`)
}

export function fetchAdminUser(id: number): Promise<ApiResult<{ user: AdminUser }>> {
  return apiGet(`/admin/users/${id}`)
}

export function fetchAdminUserHistory(id: number, page = 1, limit = 50): Promise<ApiResult<{ history: any[] }>> {
  return apiGet(`/admin/users/${id}/history?page=${page}&limit=${limit}`)
}

export function fetchAdminUserBookmarks(id: number): Promise<ApiResult<{ bookmarks: any[] }>> {
  return apiGet(`/admin/users/${id}/bookmarks`)
}

export function updateUserRole(id: number, role: string): Promise<ApiResult> {
  return apiPut(`/admin/users/${id}/role`, { role })
}

export function updateUserClearance(id: number, clearance: number): Promise<ApiResult> {
  return apiPut(`/admin/users/${id}/clearance`, { clearance })
}

export function banUser(id: number): Promise<ApiResult> {
  return apiPut(`/admin/users/${id}/ban`)
}

export function unbanUser(id: number): Promise<ApiResult> {
  return apiPut(`/admin/users/${id}/unban`)
}

export function deleteUser(id: number): Promise<ApiResult> {
  return apiDelete(`/admin/users/${id}`)
}
