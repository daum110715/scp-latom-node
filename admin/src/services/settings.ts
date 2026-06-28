import { apiGet } from './api'
import type { ApiResult } from './response'

export interface AdminSettings {
  database: {
    tables: Record<string, number>
  }
  cors: string[]
  logLevel: string
  crawlStates: any[]
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
