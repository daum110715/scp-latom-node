import { apiGet } from './api'
import type { ApiResult } from './response'

// ─── Types ──────────────────────────────────────────────────

export interface TagInfo {
  id: string
  categoryId: string
  name: string
  nameZh: string
  description: string
  aiKeywords: string[]
  sortOrder: number
}

export interface EntryTagsResponse {
  success: boolean
  scpNumber: number
  language: string
  tags: TagInfo[]
  grouped: Record<string, TagInfo[]>
}

// ─── Category display metadata ──────────────────────────────

export const TAG_CATEGORY_LABELS: Record<string, { en: string; zh: string; color: string }> = {
  object_class: { en: 'Object Class', zh: '项目等级', color: '#e74c3c' },
  anomaly: { en: 'Anomaly Type', zh: '异常类型', color: '#9b59b6' },
  goi: { en: 'Groups of Interest', zh: '相关组织', color: '#3498db' },
  narrative: { en: 'Narrative', zh: '叙事格式', color: '#2ecc71' },
  theme: { en: 'Theme', zh: '主题', color: '#f39c12' },
}

// ─── API Functions ──────────────────────────────────────────

/**
 * Fetch tags assigned to a specific SCP entry.
 */
export async function fetchEntryTags(
  scpNumber: number,
  language: string = 'en',
): Promise<ApiResult<EntryTagsResponse>> {
  return apiGet<EntryTagsResponse>(`/tags/entry/${scpNumber}?language=${language}`)
}
