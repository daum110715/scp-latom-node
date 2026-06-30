import { apiGet, apiPost, apiDelete } from './api'
import type { ApiResult } from './response'

export interface CorsOrigin {
  id: number
  origin: string
  created_at: string
}

export function fetchCorsOrigins(): Promise<
  ApiResult<{ static: string[]; dynamic: CorsOrigin[] }>
> {
  return apiGet('/admin/cors')
}

export function addCorsOrigin(origin: string): Promise<ApiResult<{ origin: CorsOrigin }>> {
  return apiPost('/admin/cors', { origin })
}

export function removeCorsOrigin(id: number): Promise<ApiResult<{ message: string }>> {
  return apiDelete(`/admin/cors/${id}`)
}
