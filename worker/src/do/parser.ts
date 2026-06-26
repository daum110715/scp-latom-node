import type { CrawlEntry } from '../types'

// ─── Parser Configuration ───────────────────────────────────

/**
 * Per-language parser configuration.
 * Each language defines its own regex patterns, class mappings,
 * and name extraction strategies.
 */
interface ParserConfig {
  /** Regex to match SCP links and capture slug + inner text */
  linkPattern: RegExp
  /** Regex to extract object class from context after a link */
  classPattern: RegExp
  /** Regex to extract name from inside the link text */
  nameFromLinkPattern: RegExp
  /** Regex to extract name from text after the link */
  nameAfterLinkPattern: RegExp
  /** Map raw class strings to normalized English names */
  classMap: Record<string, string>
  /** Ordered list of known class names (used as fallback match) */
  knownClasses: readonly string[]
}

// ─── English Configuration ──────────────────────────────────

const EN_KNOWN_CLASSES = [
  'Safe', 'Euclid', 'Keter', 'Thaumiel', 'Apollyon',
  'Neutralized', 'Decommissioned', 'Uncontained', 'Esoteric', 'Pending', 'Explained',
] as const

const EN_CONFIG: ParserConfig = {
  // Matches: <a href="/scp-173">SCP-173</a> or <a href="http://.../scp-173">SCP-173 - The Sculpture</a>
  linkPattern: /<a\b[^>]*?\bhref="(?:https?:\/\/[^"]*?)?\/(scp-\d+[a-z\-]*)"[^>]*?>([\s\S]*?)<\/a>/gi,

  // Matches: Object Class: Safe  /  Object Class: <span style="...">Keter</span>
  classPattern: /Object\s+Class\s*:\s*(?:<\/?\w[^>]*>)*\s*(Safe|Euclid|Keter|Thaumiel|Apollyon|Neutralized|Decommissioned|Uncontained|Esoteric|Pending|Explained)/gi,

  // Matches: "SCP-173 - The Sculpture" inside link text
  nameFromLinkPattern: /^SCP-\d+[A-Za-z\-]*\s*[-–—:]\s*(.+)$/i,

  // Matches name in text after link, stops at "Object Class" or end
  nameAfterLinkPattern: /^\s*[-–—:]\s*(.+?)(?:\s*[-–—]\s*Object\s+Class|$)/i,

  classMap: {}, // EN classes are already canonical
  knownClasses: EN_KNOWN_CLASSES,
}

// ─── Chinese Configuration ──────────────────────────────────

const CN_KNOWN_CLASSES = [
  'Safe', 'Euclid', 'Keter', 'Thaumiel', 'Apollyon',
  'Neutralized', 'Decommissioned', 'Uncontained', 'Esoteric', 'Pending', 'Explained',
  '已解除', '无效化', '未收容', '待分级', '已解释',
] as const

const CN_CLASS_MAP: Record<string, string> = {
  'safe': 'Safe',
  'euclid': 'Euclid',
  'keter': 'Keter',
  'thaumiel': 'Thaumiel',
  'apollyon': 'Apollyon',
  'neutralized': 'Neutralized',
  'decommissioned': 'Decommissioned',
  'uncontained': 'Uncontained',
  'esoteric': 'Esoteric',
  'pending': 'Pending',
  'explained': 'Explained',
  '已解除': 'Neutralized',
  '无效化': 'Neutralized',
  '未收容': 'Uncontained',
  '待分级': 'Pending',
  '已解释': 'Explained',
}

const CN_CONFIG: ParserConfig = {
  // Same link pattern — wikidot uses same HTML structure for CN
  linkPattern: /<a\b[^>]*?\bhref="(?:https?:\/\/[^"]*?)?\/(scp-\d+[a-z\-]*)"[^>]*?>([\s\S]*?)<\/a>/gi,

  // Matches: 等级: Safe  /  等级：Keter  /  等级: <span>Euclid</span>
  classPattern: /等级[：:]\s*(?:<\/?\w[^>]*>)*\s*(Safe|Euclid|Keter|Thaumiel|Apollyon|Neutralized|已解除|无效化|未收容|待分级|已解释|Decommissioned|Uncontained|Esoteric|Pending|Explained)/gi,

  // Same name extraction — SCP numbers are universal
  nameFromLinkPattern: /^SCP-\d+[A-Za-z\-]*\s*[-–—:]\s*(.+)$/i,

  // Stops at "等级" (Chinese for Object Class)
  nameAfterLinkPattern: /^\s*[-–—:]\s*(.+?)(?:\s*[-–—]\s*等级|$)/i,

  classMap: CN_CLASS_MAP,
  knownClasses: CN_KNOWN_CLASSES,
}

// ─── Config Registry ────────────────────────────────────────

const PARSER_CONFIGS: Record<'en' | 'cn', ParserConfig> = {
  en: EN_CONFIG,
  cn: CN_CONFIG,
}

// ─── Shared Helpers ─────────────────────────────────────────

/**
 * Extract the SCP number from a slug like "scp-173" or "scp-500-j".
 */
function extractScpNumber(slug: string): number | null {
  const match = slug.match(/scp-(\d+)/i)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Determine which series an SCP number belongs to.
 * Series 1: 001-999, Series 2: 1000-1999, etc.
 */
function scpSeries(num: number): number {
  return Math.floor((num - 1) / 999) + 1
}

/**
 * Build the full wiki URL from a relative path.
 */
function buildUrl(path: string, baseUrl: string): string {
  if (path.startsWith('http')) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalized}`
}

/**
 * Strip HTML tags from a string, collapse whitespace.
 */
function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normalize a raw class string using the config's classMap,
 * then fall back to case-insensitive match against knownClasses.
 */
function normalizeClass(raw: string, config: ParserConfig): string {
  const trimmed = raw.trim()
  const lower = trimmed.toLowerCase()

  // Check classMap first (handles CN → EN mappings)
  if (config.classMap[lower]) return config.classMap[lower]
  if (config.classMap[trimmed]) return config.classMap[trimmed]

  // Case-insensitive match against known classes
  for (const cls of config.knownClasses) {
    if (cls.toLowerCase() === lower) return cls
  }

  return trimmed
}

// ─── Public API ─────────────────────────────────────────────

export interface ParserOptions {
  /** Base URL for building full links (e.g., "https://scp-wiki.wikidot.com") */
  baseUrl: string
  /** Language — selects the parser configuration */
  language: 'en' | 'cn'
  /** Which series this page represents (1-based). If 0, auto-detect from SCP numbers. */
  seriesHint?: number
}

export interface ParseResult {
  entries: CrawlEntry[]
  errors: string[]
}

/**
 * Parse an SCP wiki index page HTML and extract all SCP entries.
 *
 * Selects the appropriate parser configuration based on language:
 * - EN: Matches "Object Class: <class>" patterns
 * - CN: Matches "等级: <class>" patterns with Chinese class names
 *
 * The parser is designed to be resilient:
 * - It handles variations in HTML structure across different series pages
 * - It extracts data from both link text and surrounding context
 * - It normalizes object classes to standard English forms
 * - It reports parse errors without failing the entire batch
 */
export function parseScpIndexPage(html: string, options: ParserOptions): ParseResult {
  const { baseUrl, language, seriesHint } = options
  const config = PARSER_CONFIGS[language]
  const entries: CrawlEntry[] = []
  const errors: string[] = []
  const seen = new Set<number>()

  // Extract all SCP links using language-specific pattern
  const linkMatches = [...html.matchAll(config.linkPattern)]

  for (const match of linkMatches) {
    const fullMatch = match[0]
    const slug = match[1]
    const linkText = stripTags(match[2])

    const scpNumber = extractScpNumber(slug)
    if (scpNumber === null) {
      errors.push(`Could not parse SCP number from slug: ${slug}`)
      continue
    }

    // Deduplicate
    if (seen.has(scpNumber)) continue
    seen.add(scpNumber)

    // ── Extract object class ──
    // Look forward from the link to find the class declaration
    const matchIndex = match.index!
    const contextEnd = Math.min(html.length, matchIndex + fullMatch.length + 300)
    const context = html.slice(matchIndex, contextEnd)

    let objectClass = 'Unknown'
    config.classPattern.lastIndex = 0
    const classMatch = config.classPattern.exec(context)
    if (classMatch) {
      objectClass = normalizeClass(classMatch[1], config)
    }

    // ── Extract name ──
    let name = linkText

    // Try extracting from link text (e.g., "SCP-173 - The Sculpture")
    const nameFromLink = linkText.match(config.nameFromLinkPattern)
    if (nameFromLink) {
      name = nameFromLink[1].trim()
    } else if (linkText.match(/^SCP-/i) || linkText === '') {
      // Link text is just the number — try text after the link
      const afterLink = html.slice(
        matchIndex + fullMatch.length,
        matchIndex + fullMatch.length + 300
      )
      const nameAfterLink = afterLink.match(config.nameAfterLinkPattern)
      if (nameAfterLink) {
        const extracted = stripTags(nameAfterLink[1].trim())
        if (extracted) name = extracted
      }
    }

    const series = seriesHint !== undefined && seriesHint > 0 ? seriesHint : scpSeries(scpNumber)

    entries.push({
      scpNumber,
      name,
      objectClass,
      url: buildUrl(`/${slug}`, baseUrl),
      series,
    })
  }

  return { entries, errors }
}

/**
 * List of known SCP index page slugs for each series.
 */
export const SERIES_PAGES = [
  'scp-series',      // Series 1: 001-999
  'scp-series-2',    // Series 2: 1000-1999
  'scp-series-3',    // Series 3: 2000-2999
  'scp-series-4',    // Series 4: 3000-3999
  'scp-series-5',    // Series 5: 4000-4999
  'scp-series-6',    // Series 6: 5000-5999
  'scp-series-7',    // Series 7: 6000-6999
  'scp-series-8',    // Series 8: 7000-7999
] as const

/**
 * Get the base URL for a wiki language.
 */
export function getWikiBaseUrl(language: 'en' | 'cn'): string {
  return language === 'cn'
    ? 'https://scp-wiki-cn.wikidot.com'
    : 'https://scp-wiki.wikidot.com'
}
