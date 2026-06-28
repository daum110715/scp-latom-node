import { apiGet, apiPut, apiDelete } from './api'
import type { ApiResult } from './response'

export interface AdminProposal {
  id: number
  title: string
  content: string
  category: string
  status: string
  authorCodename: string
  votesFor: number
  votesAgainst: number
  votesAbstain: number
  voters?: { vote: string; created_at: string; codename: string }[]
  createdAt: string
  updatedAt: string
}

export interface AdminProposalsListResponse {
  proposals: AdminProposal[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function fetchAdminProposals(params: {
  page?: number
  limit?: number
  status?: string
  category?: string
  userId?: string
} = {}): Promise<ApiResult<AdminProposalsListResponse>> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.status) qs.set('status', params.status)
  if (params.category) qs.set('category', params.category)
  if (params.userId) qs.set('userId', params.userId)
  const query = qs.toString()
  return apiGet(`/admin/proposals${query ? `?${query}` : ''}`)
}

export function fetchAdminProposal(id: number): Promise<ApiResult<{ proposal: AdminProposal }>> {
  return apiGet(`/admin/proposals/${id}`)
}

export function updateProposalStatus(id: number, status: string): Promise<ApiResult> {
  return apiPut(`/admin/proposals/${id}/status`, { status })
}

export function deleteAdminProposal(id: number): Promise<ApiResult> {
  return apiDelete(`/admin/proposals/${id}`)
}
