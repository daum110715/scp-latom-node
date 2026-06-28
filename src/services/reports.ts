import { apiGet, apiPost } from './api'
import type { ApiResult } from './response'

// ─── Types ──────────────────────────────────────────────────

export type ReportType = 'content_error' | 'display_issue' | 'special_handling' | 'other'

export interface ReportSubmission {
  scpNumber: number
  language: 'en' | 'cn'
  reportType: ReportType
  description: string
}

export interface ReportItem {
  id: number
  scpNumber: number
  language: string
  reportType: string
  description: string
  status: string
  createdAt: string
  name?: string | null
  objectClass?: string | null
}

export interface ReportsListResponse {
  success: boolean
  reports: ReportItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ReportCheckResponse {
  success: boolean
  hasReports: boolean
  reports: { id: number; reportType: string; status: string }[]
  count: number
  maxReports: number
}

export interface ReportSubmitResponse {
  success: boolean
  message: string
  report: ReportItem
}

// ─── API Functions ──────────────────────────────────────────

/**
 * Submit a report for an SCP entry.
 */
export function submitReport(data: ReportSubmission): Promise<ApiResult<ReportSubmitResponse>> {
  return apiPost<ReportSubmitResponse>('/reports', {
    scpNumber: data.scpNumber,
    language: data.language,
    reportType: data.reportType,
    description: data.description,
  })
}

/**
 * List current user's reports.
 */
export function fetchReports(
  params?: { page?: number; limit?: number }
): Promise<ApiResult<ReportsListResponse>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))

  const query = searchParams.toString()
  const path = `/reports${query ? `?${query}` : ''}`

  return apiGet<ReportsListResponse>(path)
}

/**
 * Check if user has already reported a specific entry.
 */
export function checkReports(
  lang: 'en' | 'cn',
  scpNumber: number
): Promise<ApiResult<ReportCheckResponse>> {
  return apiGet<ReportCheckResponse>(`/reports/check/${lang}/${scpNumber}`)
}
