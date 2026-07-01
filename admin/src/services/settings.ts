import { apiGet } from './api'
import type { ApiResult } from './response'

export interface CrawlState {
  language: string
  status: string
  total_entries: number
  last_crawl: number | null
  error: string | null
}

export interface AdminSettings {
  database: {
    tables: Record<string, number>
  }
  cors: string[]
  logLevel: string
  crawlStates: CrawlState[]
  totals: {
    users: number
    entries: number
    proposals: number
    logs: number
  }
}

export function fetchAdminSettings(): Promise<ApiResult<{ settings: AdminSettings }>> {
  return apiGet('/admin/settings')
}
