import { apiGet, apiPut, apiDelete, apiPost } from './api'
import type { ApiResult } from './response'

export interface AdminEntry {
  id: number
  scp_number: number
  language: string
  name: string
  object_class: string
  url: string
  series: number
  has_content?: number
  content?: string | null
  content_fetched_at?: string | null
  content_error?: string | null
  created_at: string
  updated_at: string
}

export interface AdminEntriesListResponse {
  entries: AdminEntry[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function fetchAdminEntries(
  params: {
    page?: number
    limit?: number
    q?: string
    language?: string
    object_class?: string
    series?: string
    hasContent?: string
  } = {},
): Promise<ApiResult<AdminEntriesListResponse>> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.q) qs.set('q', params.q)
  if (params.language) qs.set('language', params.language)
  if (params.object_class) qs.set('object_class', params.object_class)
  if (params.series) qs.set('series', params.series)
  if (params.hasContent) qs.set('hasContent', params.hasContent)
  const query = qs.toString()
  return apiGet(`/admin/entries${query ? `?${query}` : ''}`)
}

export function fetchAdminEntry(id: number): Promise<ApiResult<{ entry: AdminEntry }>> {
  return apiGet(`/admin/entries/${id}`)
}

export function updateAdminEntry(
  id: number,
  data: { name?: string; object_class?: string },
): Promise<ApiResult> {
  return apiPut(`/admin/entries/${id}`, data)
}

export function deleteAdminEntry(id: number): Promise<ApiResult> {
  return apiDelete(`/admin/entries/${id}`)
}

export function refetchEntryContent(id: number): Promise<ApiResult> {
  return apiPost(`/admin/entries/${id}/refetch`)
}

export function triggerCrawl(lang: string): Promise<ApiResult> {
  return apiPost(`/admin/entries/crawl/${lang}`)
}

export function fetchCrawlStatus(): Promise<ApiResult> {
  return apiGet('/admin/entries/crawl/status')
}
