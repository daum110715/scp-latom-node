export interface Env {
  DB: D1Database
  JWT_SECRET: string
  CORS_ORIGINS: string
  LOG_LEVEL?: string
  SCP_EN_CRAWLER: DurableObjectNamespace
  SCP_CN_CRAWLER: DurableObjectNamespace
  AI_CHAT_DO: DurableObjectNamespace
  AI_QUEUE_DO: DurableObjectNamespace
  GLM_API_KEY: string
}

export interface User {
  id: number
  codename: string
  password: string
  role: string
  clearance: number
  created_at: string
  updated_at: string
}

export interface UserPublic {
  id: number
  codename: string
  role: string
  clearance: number
  created_at?: string
}

export interface JwtPayload {
  sub: number
  codename: string
  role: string
  clearance: number
  exp: number
}

// ─── Crawler Types ───────────────────────────────────────────

export interface CrawlEntry {
  scpNumber: number
  name: string
  objectClass: string
  url: string
  series: number
}

export interface SyncResult {
  added: number
  changed: number
  unchanged: number
}

export interface CrawlState {
  status: 'idle' | 'crawling' | 'error'
  lastCrawl: number
  totalEntries: number
  error?: string
  lastSyncResult?: SyncResult
}

export interface CrawlResult {
  language: 'en' | 'cn'
  state: CrawlState
  entries: CrawlEntry[]
  series: Record<number, CrawlEntry[]>
}

export interface EntryContentResponse {
  success: boolean
  scpNumber: number
  language: string
  status: 'cached' | 'fetched' | 'pending' | 'fetching' | 'error'
  content?: string
  name?: string
  objectClass?: string
  fetchedAt?: string
  message?: string
  error?: string
}

// ─── History Types ─────────────────────────────────────────

export interface HistoryEntry {
  id: number
  user_id: number
  language: string
  scp_number: number
  name: string
  object_class: string
  visited_at: string
}

// ─── Bookmark Types ───────────────────────────────────────

export interface Bookmark {
  id: number
  user_id: number
  scp_number: number
  language: string
  created_at: string
}

export interface BookmarkPublic {
  scpNumber: number
  language: string
  name: string | null
  objectClass: string | null
  createdAt: string
}

// ─── Proposal Types ────────────────────────────────────────

export interface Proposal {
  id: number
  user_id: number
  title: string
  content: string
  category: string
  status: 'open' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

export interface ProposalVote {
  id: number
  proposal_id: number
  user_id: number
  vote: 'for' | 'against' | 'abstain'
  created_at: string
}

export interface ProposalPublic {
  id: number
  title: string
  content: string
  category: string
  status: string
  authorCodename: string
  votesFor: number
  votesAgainst: number
  votesAbstain: number
  userVote: 'for' | 'against' | 'abstain' | null
  createdAt: string
  updatedAt: string
}

// ─── Report Types ────────────────────────────────────────

export interface EntryReport {
  id: number
  user_id: number
  scp_number: number
  language: string
  report_type: 'content_error' | 'display_issue' | 'special_handling' | 'other'
  description: string
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed'
  admin_note: string | null
  created_at: string
  updated_at: string
}

export interface ReportPublic {
  id: number
  scpNumber: number
  language: string
  reportType: string
  description: string
  status: string
  createdAt: string
}

// ─── Admin Types ─────────────────────────────────────────

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

export interface AdminUserDetail {
  id: number
  codename: string
  role: string
  clearance: number
  created_at: string
  updated_at: string
  historyCount: number
  bookmarkCount: number
  proposalCount: number
  voteCount: number
}

export interface AdminEntry {
  id: number
  scp_number: number
  language: string
  name: string
  object_class: string
  url: string
  series: number
  content: string | null
  content_fetched_at: string | null
  content_error: string | null
  created_at: string
  updated_at: string
}

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

// ─── Tag Types ──────────────────────────────────────────────

export interface TagCategory {
  id: string
  name: string
  name_en: string
  description: string
  sort_order: number
  created_at: string
}

export interface Tag {
  id: string
  category_id: string
  name: string
  name_zh: string
  description: string
  ai_keywords: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface TagPublic {
  id: string
  categoryId: string
  name: string
  nameZh: string
  description: string
  aiKeywords: string[]
  sortOrder: number
}

export interface TagCategoryPublic {
  id: string
  name: string
  nameEn: string
  description: string
  sortOrder: number
  tags: TagPublic[]
}

export interface EntryTag {
  id: number
  scp_number: number
  language: string
  tag_id: string
  created_at: string
}

// ─── AI Chat Types ──────────────────────────────────────────

export interface AiMessage {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  createdAt: string
  tokenCount?: number
}

export interface AiConversationMeta {
  id: string
  userId: number
  title: string
  systemPrompt: string
  messageCount: number
  lastMessageAt: string
  createdAt: string
  updatedAt: string
}

export interface AiConversationPublic {
  id: string
  title: string
  systemPrompt: string
  messageCount: number
  lastMessageAt: string
  createdAt: string
}

export interface AiConversationDetail extends AiConversationPublic {
  messages: AiMessage[]
}

export interface AiChatRequest {
  conversationId?: string
  message: string
  systemPrompt?: string
  title?: string
  stream?: boolean
}

export interface AiChatResponse {
  conversationId: string
  message: AiMessage
  title: string
}

export interface AiConversationsListResponse {
  conversations: AiConversationMeta[]
  total: number
  page: number
  limit: number
  totalPages: number
}
