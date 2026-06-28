import { apiGet } from './api'
import type { ApiResult } from './response'

export interface AdminStats {
  totalUsers: number
  entriesByLanguage: { language: string; count: number }[]
  entriesByClass: { object_class: string; count: number }[]
  proposalsByStatus: { status: string; count: number }[]
  recentActivity: {
    newUsersToday: number
    newProposalsToday: number
    newVotesToday: number
    errorsLast24h: number
  }
  logErrorRate: { total: number; errors: number; rate: number }
}

export function fetchAdminStats(): Promise<ApiResult<{ stats: AdminStats }>> {
  return apiGet('/admin/stats')
}
