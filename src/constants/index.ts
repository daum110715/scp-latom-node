import type { ObjectClass } from '@/types'

// ─── SCP Object Classes ───
export const OBJECT_CLASSES: ObjectClass[] = [
  'Safe',
  'Euclid',
  'Keter',
  'Thaumiel',
  'Apollyon',
  'Neutralized',
]

// ─── Class color tokens (CSS custom properties) ───
export const CLASS_COLORS: Record<string, string> = {
  safe: 'var(--class-safe)',
  euclid: 'var(--class-euclid)',
  keter: 'var(--class-keter)',
  thaumiel: 'var(--class-thaumiel)',
  apollyon: 'var(--color-danger)',
  neutralized: 'var(--class-neutralized)',
}

export const CLASS_GLOW: Record<string, string> = {
  safe: 'var(--class-safe-glow, rgba(74, 222, 128, 0.15))',
  euclid: 'var(--class-euclid-glow, rgba(250, 204, 21, 0.15))',
  keter: 'var(--class-keter-glow, rgba(239, 68, 68, 0.15))',
  thaumiel: 'var(--class-thaumiel-glow, rgba(168, 85, 247, 0.15))',
  apollyon: 'var(--class-apollyon-glow, rgba(239, 68, 68, 0.2))',
  neutralized: 'var(--class-neutralized-glow, rgba(107, 114, 128, 0.15))',
}

export const CLASS_KEYS = [
  'safe',
  'euclid',
  'keter',
  'thaumiel',
  'apollyon',
  'neutralized',
] as const

// ─── Document classification levels ───
export const CLASS_LEVEL: Record<string, number> = {
  Unclassified: 0,
  Restricted: 1,
  Confidential: 2,
  Secret: 3,
  'Top Secret': 4,
}

export const CLASS_COLOR_MAP: Record<string, string> = {
  Unclassified: 'var(--class-safe)',
  Restricted: 'var(--class-euclid)',
  Confidential: 'var(--class-keter)',
  Secret: 'var(--class-thaumiel)',
  'Top Secret': 'var(--color-danger)',
}

export const TYPE_ICON: Record<string, string> = {
  protocol: '◈',
  research: '◇',
  incident: '⚠',
  directive: '▣',
}

export const DOCUMENT_TYPES = ['protocol', 'research', 'incident', 'directive'] as const

export function classVariant(c: string) {
  const map: Record<string, string> = {
    Unclassified: 'safe',
    Restricted: 'euclid',
    Confidential: 'keter',
    Secret: 'thaumiel',
    'Top Secret': 'apollyon',
  }
  return (map[c] || 'default') as 'default' | 'safe' | 'euclid' | 'keter' | 'thaumiel' | 'apollyon'
}

// ─── Proposal categories ───
export const PROPOSAL_CATEGORIES = ['protocol', 'research', 'containment', 'general'] as const

export const CATEGORY_VARIANT: Record<string, string> = {
  protocol: 'keter',
  research: 'thaumiel',
  containment: 'euclid',
  general: 'safe',
}

// ─── localStorage keys ───
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'scp-auth-token',
  ADMIN_TOKEN: 'scp-admin-token',
  THEME: 'scp-theme',
  ADMIN_THEME: 'scp-admin-theme',
  LOCALE: 'scp-locale',
  SIDEBAR_COLLAPSED: 'scp-sidebar-collapsed',
  FEATURE_FLAGS: 'scp-feature-flags',
} as const

// ─── Simple markdown renderer ───
export function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.*$)/gm, '<h4>$1</h4>')
    .replace(/^## (.*$)/gm, '<h3>$1</h3>')
    .replace(/^# (.*$)/gm, '<h2>$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
    .replace(/<p><(h[234]|blockquote|li)/g, '<$1')
    .replace(/<\/(h[234]|blockquote|li)><\/p>/g, '</$1>')
}
