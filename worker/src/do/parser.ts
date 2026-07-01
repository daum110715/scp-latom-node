import type { CrawlEntry } from '../types'
import { fetchPageLikeBrowser, humanDelay } from './http-client'

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
  'Safe',
  'Euclid',
  'Keter',
  'Thaumiel',
  'Apollyon',
  'Neutralized',
  'Decommissioned',
  'Uncontained',
  'Esoteric',
  'Pending',
  'Explained',
] as const

const EN_CONFIG: ParserConfig = {
  // Matches: <a href="/scp-173">SCP-173</a>
  // The SCP index page has: <a href="/scp-002">SCP-002</a> - The &quot;Living&quot; Room
  // Link text is just the number; name follows after </a>
  linkPattern:
    /<a\b[^>]*?\bhref="(?:https?:\/\/[^"]*?)?\/(scp-\d+[a-z-]*)"[^>]*?>([\s\S]*?)<\/a>/gi,

  // Index pages don't have Object Class info — only individual pages do
  classPattern:
    /Object\s+Class\s*:\s*(?:<\/?\w[^>]*>)*\s*(Safe|Euclid|Keter|Thaumiel|Apollyon|Neutralized|Decommissioned|Uncontained|Esoteric|Pending|Explained)/gi,

  // Matches name inside link: "SCP-173 - The Sculpture"
  nameFromLinkPattern: /^SCP-\d+[A-Za-z-]*\s*[-–—:]\s*(.+)$/i,

  // Matches name AFTER link: " - The &quot;Living&quot; Room" (stops at < or end)
  nameAfterLinkPattern: /^\s*[-–—:]\s*(.+?)(?:\s*<|$)/i,

  classMap: {},
  knownClasses: EN_KNOWN_CLASSES,
}

// ─── Chinese Configuration ──────────────────────────────────

const CN_KNOWN_CLASSES = [
  'Safe',
  'Euclid',
  'Keter',
  'Thaumiel',
  'Apollyon',
  'Neutralized',
  'Decommissioned',
  'Uncontained',
  'Esoteric',
  'Pending',
  'Explained',
  '已解除',
  '无效化',
  '未收容',
  '待分级',
  '已解释',
] as const

const CN_CLASS_MAP: Record<string, string> = {
  safe: 'Safe',
  euclid: 'Euclid',
  keter: 'Keter',
  thaumiel: 'Thaumiel',
  apollyon: 'Apollyon',
  neutralized: 'Neutralized',
  decommissioned: 'Decommissioned',
  uncontained: 'Uncontained',
  esoteric: 'Esoteric',
  pending: 'Pending',
  explained: 'Explained',
  已解除: 'Neutralized',
  无效化: 'Neutralized',
  未收容: 'Uncontained',
  待分级: 'Pending',
  已解释: 'Explained',
}

const CN_CONFIG: ParserConfig = {
  // Same link pattern — wikidot uses same HTML structure for CN
  linkPattern:
    /<a\b[^>]*?\bhref="(?:https?:\/\/[^"]*?)?\/(scp-\d+[a-z-]*)"[^>]*?>([\s\S]*?)<\/a>/gi,

  // Index pages don't have Object Class info
  classPattern:
    /等级[：:]\s*(?:<\/?\w[^>]*>)*\s*(Safe|Euclid|Keter|Thaumiel|Apollyon|Neutralized|已解除|无效化|未收容|待分级|已解释|Decommissioned|Uncontained|Esoteric|Pending|Explained)/gi,

  // Matches name inside link
  nameFromLinkPattern: /^SCP-\d+[A-Za-z-]*\s*[-–—:]\s*(.+)$/i,

  // Matches name AFTER link, stops at < or end
  nameAfterLinkPattern: /^\s*[-–—:]\s*(.+?)(?:\s*<|$)/i,

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
 * Strip HTML tags and decode entities, collapse whitespace.
 */
function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
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
        matchIndex + fullMatch.length + 300,
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
  'scp-series', // Series 1: 001-999
  'scp-series-2', // Series 2: 1000-1999
  'scp-series-3', // Series 3: 2000-2999
  'scp-series-4', // Series 4: 3000-3999
  'scp-series-5', // Series 5: 4000-4999
  'scp-series-6', // Series 6: 5000-5999
  'scp-series-7', // Series 7: 6000-6999
  'scp-series-8', // Series 8: 7000-7999
] as const

// ─── Object Class Map ───────────────────────────────────────

/** Containment classes to fetch from wiki tag pages */
const OBJECT_CLASSES = ['safe', 'euclid', 'keter', 'thaumiel', 'apollyon', 'neutralized'] as const

/** Map of tag slug → normalized class name */
const TAG_CLASS_MAP: Record<string, string> = {
  safe: 'Safe',
  euclid: 'Euclid',
  keter: 'Keter',
  thaumiel: 'Thaumiel',
  apollyon: 'Apollyon',
  neutralized: 'Neutralized',
}

/** Base fetch options shared across class map requests */
const CLASS_MAP_FETCH_TIMEOUT_MS = 15_000
const CLASS_MAP_CRAWL_DELAY_MS = 1200
/** Absolute max pages to fetch per class — safety limit to prevent infinite loops */
const CLASS_MAP_ABSOLUTE_MAX_PAGES = 50

/**
 * Parse a single tag page HTML and extract all SCP numbers found in links.
 */
function extractScpNumbersFromPage(html: string): number[] {
  const config = EN_CONFIG // Tag pages use the same link format for all languages
  const numbers: number[] = []
  const seen = new Set<number>()

  const matches = [...html.matchAll(config.linkPattern)]
  for (const match of matches) {
    const slug = match[1]
    const num = extractScpNumber(slug)
    if (num !== null && !seen.has(num)) {
      seen.add(num)
      numbers.push(num)
    }
  }
  return numbers
}

export interface BuildClassMapOptions {
  language: 'en' | 'cn'
  fetcher?: typeof fetch
  timeoutMs?: number
}

/**
 * Build a mapping of SCP number → object class by fetching wiki tag pages.
 *
 * The SCP wiki tags pages by containment class (safe, euclid, keter, etc.).
 * Each tag page lists all SCPs of that class as standard wiki links.
 * This function fetches all pages (handling pagination) and builds the map.
 *
 * Errors are non-fatal — partial results are returned.
 */
export async function buildClassMap(options: BuildClassMapOptions): Promise<Map<number, string>> {
  const { language, fetcher, timeoutMs = CLASS_MAP_FETCH_TIMEOUT_MS } = options
  const baseUrl = getWikiBaseUrl(language)
  const classMap = new Map<number, string>()

  for (const cls of OBJECT_CLASSES) {
    const tagUrl = `${baseUrl}/system:page-tags/tag/${cls}`

    try {
      // Fetch first page to detect pagination
      const firstPage = await fetchPageLikeBrowser(tagUrl, {
        baseUrl,
        language,
        fetcher,
        timeoutMs,
      })

      if (!firstPage.ok || !firstPage.html) continue

      // Extract SCP numbers from first page
      const firstPageNumbers = extractScpNumbersFromPage(firstPage.html)
      for (const num of firstPageNumbers) {
        if (!classMap.has(num)) {
          classMap.set(num, TAG_CLASS_MAP[cls])
        }
      }

      // Fetch subsequent pages dynamically until empty result or 404
      for (let p = 2; p <= CLASS_MAP_ABSOLUTE_MAX_PAGES; p++) {
        await new Promise((r) => setTimeout(r, humanDelay(CLASS_MAP_CRAWL_DELAY_MS)))

        const page = await fetchPageLikeBrowser(`${tagUrl}/p/${p}`, {
          baseUrl,
          language,
          fetcher,
          timeoutMs,
        })

        // Stop if the page returns a non-OK status (e.g. 404) or has no content
        if (!page.ok || !page.html) break

        const numbers = extractScpNumbersFromPage(page.html)
        // Stop if no SCP numbers found — end of pagination
        if (numbers.length === 0) break

        for (const num of numbers) {
          if (!classMap.has(num)) {
            classMap.set(num, TAG_CLASS_MAP[cls])
          }
        }
      }
    } catch (err) {
      // Non-fatal — skip this class and continue with partial results
      console.warn(
        `[buildClassMap] Failed to fetch ${cls} pages:`,
        err instanceof Error ? err.message : err,
      )
    }

    // Delay between classes to avoid hammering the server
    await new Promise((r) => setTimeout(r, humanDelay(CLASS_MAP_CRAWL_DELAY_MS)))
  }

  return classMap
}

/**
 * Apply a class map to crawl entries, filling in 'Unknown' object classes.
 * Entries that already have a known class are left unchanged.
 */
export function applyClassMap(entries: CrawlEntry[], classMap: Map<number, string>): void {
  for (const entry of entries) {
    if (entry.objectClass === 'Unknown' && classMap.has(entry.scpNumber)) {
      entry.objectClass = classMap.get(entry.scpNumber)!
    }
  }
}

/**
 * Extract the object class from an individual SCP entry page HTML.
 *
 * Individual pages contain a structured "Object Class:" label followed by
 * the class name (e.g., "Object Class: Euclid"). This is more reliable than
 * index page parsing, which has no class data at all.
 */
export function extractObjectClassFromEntryPage(
  html: string,
  language: 'en' | 'cn',
): string | null {
  const config = PARSER_CONFIGS[language]

  // Search the full page for the class declaration
  config.classPattern.lastIndex = 0
  const match = config.classPattern.exec(html)
  if (match) {
    return normalizeClass(match[1], config)
  }

  return null
}

/**
 * Get the base URL for a wiki language.
 */
export function getWikiBaseUrl(language: 'en' | 'cn'): string {
  return language === 'cn' ? 'https://scp-wiki-cn.wikidot.com' : 'https://scp-wiki.wikidot.com'
}

// ─── Entry Page HTML Cleaning ───────────────────────────────

/** CSS classes of elements to remove from entry page content */
const REMOVE_CLASSES = [
  'page-rate-widget-box',
  'edit-info',
  'page-tags',
  'comment_thread',
  'comments-box',
  'page-options-bottom',
  'footer-wikiwalk-nav',
  'licensebox',
  'credits',
  'pager',
  'scp-image-block',
  'collapsible-block-link', // collapse toggle links (content kept)
  'yui-navset',
  'wiesel',
  'page-info',
  'buttons',
  'creditRate',
  'rate-box-with-credit-button',
] as const

/**
 * Build a regex that matches an opening tag with a class attribute containing one of the given class names.
 * Matches: <div class="page-rate-widget-box ..."> or <span class='edit-info'>
 */
function buildRemoveClassPattern(): RegExp {
  const classAlternation = REMOVE_CLASSES.join('|')
  // Match opening tags with class= containing any of the remove classes
  return new RegExp(`<\\w+[^>]*?\\bclass="[^"]*(?:${classAlternation})[^"]*"[^>]*>`, 'gi')
}

/**
 * Extract the content of a specific div by id.
 * Returns the inner HTML between the opening <div id="page-content"> and its matching closing </div>.
 * Handles one level of nested divs.
 */
function extractPageContent(html: string): string | null {
  const openTag = '<div id="page-content"'
  const startIdx = html.indexOf(openTag)
  if (startIdx === -1) return null

  // Find the end of the opening tag (the >)
  const openTagEnd = html.indexOf('>', startIdx)
  if (openTagEnd === -1) return null
  const contentStart = openTagEnd + 1

  // Count nested divs to find the matching closing tag
  let depth = 1
  let pos = contentStart
  while (pos < html.length && depth > 0) {
    const nextOpen = html.indexOf('<div', pos)
    const nextClose = html.indexOf('</div>', pos)

    if (nextClose === -1) break // malformed HTML

    if (nextOpen !== -1 && nextOpen < nextClose) {
      // Check it's actually an opening tag (not inside an attribute)
      const afterOpen = html.indexOf('>', nextOpen)
      if (afterOpen !== -1 && afterOpen < nextClose) {
        // Only count if it's not self-closing
        if (html[afterOpen - 1] !== '/') {
          depth++
        }
        pos = afterOpen + 1
      } else {
        pos = nextOpen + 4
      }
    } else {
      depth--
      if (depth === 0) {
        return html.slice(contentStart, nextClose)
      }
      pos = nextClose + 6
    }
  }

  // Fallback: return everything after the opening tag
  return html.slice(contentStart)
}

/**
 * Extract footer sections (licensebox, credits) from page content.
 * Returns the combined inner HTML of all matching sections.
 * Uses depth-counting to handle nested elements correctly.
 */
function extractFooterSections(html: string): string {
  const sections: string[] = []
  // Match opening tags with licensebox or credits classes
  const openPattern =
    /<(div|span|section|aside)[^>]*?\bclass="[^"]*(?:licensebox|credits)[^"]*"[^>]*/gi
  let match: RegExpExecArray | null

  while ((match = openPattern.exec(html)) !== null) {
    const tag = match[1].toLowerCase()
    const startIdx = match.index

    // Find the end of the opening tag
    const openTagEnd = html.indexOf('>', startIdx)
    if (openTagEnd === -1) continue

    // Check for self-closing
    if (html[openTagEnd - 1] === '/') {
      continue // self-closing, skip
    }

    const contentStart = openTagEnd + 1
    const closeTag = `</${tag}>`

    // Count nested same-type tags to find the matching closing tag
    let depth = 1
    let pos = contentStart
    while (pos < html.length && depth > 0) {
      const nextOpen = html.indexOf(`<${tag}`, pos)
      const nextClose = html.indexOf(closeTag, pos)

      if (nextClose === -1) break // malformed HTML

      if (nextOpen !== -1 && nextOpen < nextClose) {
        const afterOpen = html.indexOf('>', nextOpen)
        if (afterOpen !== -1 && afterOpen < nextClose) {
          if (html[afterOpen - 1] !== '/') {
            depth++
          }
          pos = afterOpen + 1
        } else {
          pos = nextOpen + tag.length + 1
        }
      } else {
        depth--
        if (depth === 0) {
          sections.push(html.slice(contentStart, nextClose).trim())
          // Move past this match so outer while loop doesn't re-process
          openPattern.lastIndex = nextClose + closeTag.length
          break
        }
        pos = nextClose + closeTag.length
      }
    }
  }

  return sections.join('\n')
}

/**
 * Clean an SCP wiki entry page HTML for storage and rendering.
 *
 * Steps:
 * 1. Extract #page-content div (main article body)
 * 2. Remove <script>, <style>, <noscript> tags
 * 3. Remove elements with known non-content classes (rate widgets, edit buttons, etc.)
 * 4. Remove on* event handler attributes
 * 5. Remove style="..." attributes
 * 6. Convert relative URLs to absolute
 * 7. Convert Wikidot SCP entry links to in-platform links
 * 8. Wrap in .scp-content container
 */
export function cleanEntryHtml(
  html: string,
  baseUrl: string,
  language: 'en' | 'cn' = 'en',
): string {
  // 1. Extract page content
  let content = extractPageContent(html)
  if (!content) {
    // Fallback: try to find any main content area
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    content = bodyMatch ? bodyMatch[1] : html
  }

  // 2. Remove script, style, noscript tags (including content)
  content = content.replace(/<script[\s\S]*?<\/script>/gi, '')
  content = content.replace(/<style[\s\S]*?<\/style>/gi, '')
  content = content.replace(/<noscript[\s\S]*?<\/noscript>/gi, '')

  // 3. Extract licensebox/credits content before removal (for collapsible copyright notice)
  const footerHtml = extractFooterSections(content)

  // 4. Remove elements with known non-content classes
  //    We do this by matching opening+content+closing tags for divs/spans with those classes.
  //    This is a best-effort regex approach (no DOM parser in Workers).
  const _removePattern = buildRemoveClassPattern()
  // Remove self-closing or simple elements with those classes
  content = content.replace(
    /<\w+[^>]*?\bclass="[^"]*(?:page-rate-widget-box|edit-info|page-tags|comment_thread|comments-box|page-options-bottom|footer-wikiwalk-nav|licensebox|credits|pager|creditRate|rate-box-with-credit-button|page-info|buttons)[^"]*"[^>]*\/>/gi,
    '',
  )
  // Remove block-level elements with those classes (greedy removal up to next matching close tag)
  content = content.replace(
    /<(?:div|span|section|aside|nav)[^>]*?\bclass="[^"]*(?:page-rate-widget-box|edit-info|page-tags|comment_thread|comments-box|page-options-bottom|footer-wikiwalk-nav|licensebox|credits|pager|creditRate|rate-box-with-credit-button|page-info|buttons)[^"]*"[^>]*>[\s\S]*?<\/(?:div|span|section|aside|nav)>/gi,
    '',
  )

  // 5. Remove on* event handler attributes
  content = content.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')

  // 6. Remove style="..." attributes
  content = content.replace(/\s+style\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')

  // 7. Neutralize dangerous URL protocols in href/src/action attributes
  //    Prevents javascript:, data:, and vbscript: XSS vectors
  content = content.replace(
    /\b(href|src|action)\s*=\s*(?:"(javascript|data|vbscript):[^"]*"|'(javascript|data|vbscript):[^']*')/gi,
    (_match, attr) => `${attr}=""`,
  )
  // Also handle unquoted values (rare but possible in malformed HTML)
  content = content.replace(
    /\b(href|src|action)\s*=\s*((?:javascript|data|vbscript):[^\s>]+)/gi,
    (_match, attr) => `${attr}=""`,
  )

  // 8. Convert relative URLs to absolute
  content = content.replace(/\bhref="\/(?!\/)/g, `href="${baseUrl}/`)
  content = content.replace(/\bsrc="\/(?!\/)/g, `src="${baseUrl}/`)

  // 9. Convert Wikidot SCP entry links to in-platform links
  //    Matches: href="https://scp-wiki.wikidot.com/scp-173"
  //         and href="https://scp-wiki-cn.wikidot.com/scp-500-j"
  //    Converts to: href="/entry/en/173" or href="/entry/cn/500"
  const wikiDomain = language === 'cn' ? 'scp-wiki-cn\\.wikidot\\.com' : 'scp-wiki\\.wikidot\\.com'
  const scpLinkPattern = new RegExp(`href="https?://${wikiDomain}/scp-(\\d+)[a-z\\-]*"`, 'gi')
  content = content.replace(scpLinkPattern, (_match, scpNum) => {
    return `href="/entry/${language}/${scpNum}"`
  })

  // 10. Append collapsible copyright notice if footer sections were found
  if (footerHtml) {
    // Clean the footer HTML with the same URL conversion
    let cleanedFooter = footerHtml.replace(/\bhref="\/(?!\/)/g, `href="${baseUrl}/`)
    cleanedFooter = cleanedFooter.replace(/\bsrc="\/(?!\/)/g, `src="${baseUrl}/`)
    // Also convert SCP links in footer
    cleanedFooter = cleanedFooter.replace(scpLinkPattern, (_match: string, scpNum: string) => {
      return `href="/entry/${language}/${scpNum}"`
    })
    content += `\n<details class="scp-copyright"><summary>Copyright / Attribution</summary><div class="scp-copyright-body">${cleanedFooter}</div></details>`
  }

  // 11. Wrap in container
  return `<div class="scp-content">${content}</div>`
}
