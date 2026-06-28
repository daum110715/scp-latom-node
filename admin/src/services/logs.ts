import { apiGet, apiDelete } from './api'
import type { ApiResult } from './response'

export interface AdminLogEntry {
  id: number
  timestamp: string
  level: string
  message: string
  context: string | null
  request_id: string | null
  user_id: number | null
  source: string
  category: string | null
  path: string | null
  user_agent: string | null
  ip: string | null
  created_at: string
}

export interface AdminLogsListResponse {
  logs: AdminLogEntry[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface LogStats {
  byLevel: { level: string; count: number }[]
  bySource: { source: string; count: number }[]
  byCategory: { category: string; count: number }[]
  errorRate: { total: number; errors: number; rate: number }
}

export function fetchAdminLogs(params: {
  page?: number
  limit?: number
  level?: string
  source?: string
  category?: string
  userId?: string
  q?: string
  from?: string
  to?: string
  sort?: string
  order?: string
} = {}): Promise<ApiResult<AdminLogsListResponse>> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.level) qs.set('level', params.level)
  if (params.source) qs.set('source', params.source)
  if (params.category) qs.set('category', params.category)
  if (params.userId) qs.set('userId', params.userId)
  if (params.q) qs.set('q', params.q)
  if (params.from) qs.set('from', params.from)
  if (params.to) qs.set('to', params.to)
  if (params.sort) qs.set('sort', params.sort)
  if (params.order) qs.set('order', params.order)
  const query = qs.toString()
  return apiGet(`/admin/logs${query ? `?${query}` : ''}`)
}

export function fetchAdminLog(id: number): Promise<ApiResult<{ log: AdminLogEntry }>> {
  return apiGet(`/admin/logs/${id}`)
}

export function fetchLogStats(): Promise<ApiResult<{ stats: LogStats }>> {
  return apiGet('/admin/logs/stats')
}

export function cleanupLogs(days = 30): Promise<ApiResult<{ deleted: number }>> {
  return apiDelete(`/admin/logs/cleanup?days=${days}`)
}
