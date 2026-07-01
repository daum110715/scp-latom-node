// ─── Auto-Tagger ────────────────────────────────────────────
// Uses GLM-4-flash to automatically select tags from the tag pool
// for an SCP entry based on its content.

import { glmChat } from './glm-client'
import { Logger } from './logger'
import type { Tag } from '../types'

const TAG_MODEL = 'glm-4-flash'
const TAG_TEMPERATURE = 0.3 // Low temperature for consistent, deterministic tagging
const TAG_MAX_TOKENS = 1024

/** Maximum characters of entry content to send to the model (truncated to fit context). */
const MAX_CONTENT_CHARS = 6000

// ─── Types ──────────────────────────────────────────────────

interface TagCandidate {
  id: string
  category: string
  name: string
  nameZh: string
  description: string
  keywords: string[]
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Strip HTML tags and collapse whitespace to get plain text from entry content.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Build the system prompt that instructs the model how to tag entries.
 */
function buildSystemPrompt(): string {
  return `You are an SCP Foundation entry classifier. Your task is to analyze an SCP entry and select appropriate tags from the provided tag pool.

Rules:
1. Only select tags from the provided list. Never invent new tags.
2. For the "object_class" category, select EXACTLY ONE tag that matches the entry's containment class.
3. For other categories, select all applicable tags (zero or more).
4. Base your analysis on the entry's actual content, not just its title or number.
5. Return ONLY a JSON array of tag IDs. No explanation, no markdown, no extra text.

Response format: ["OC002", "AN001", "AN007", "TH002"]`
}

/**
 * Build the user message with entry info and available tags.
 */
function buildUserMessage(
  scpNumber: number,
  language: string,
  name: string,
  objectClass: string,
  content: string,
  tags: TagCandidate[],
): string {
  const truncated =
    content.length > MAX_CONTENT_CHARS
      ? content.slice(0, MAX_CONTENT_CHARS) + '\n...[truncated]'
      : content

  // Group tags by category for clearer presentation
  const byCategory = new Map<string, TagCandidate[]>()
  for (const tag of tags) {
    const list = byCategory.get(tag.category) ?? []
    list.push(tag)
    byCategory.set(tag.category, list)
  }

  let tagList = ''
  for (const [category, categoryTags] of byCategory) {
    tagList += `\n[${category}]\n`
    for (const t of categoryTags) {
      tagList += `  ${t.id}: ${t.name} (${t.nameZh}) — ${t.description}`
      if (t.keywords.length > 0) {
        tagList += ` [keywords: ${t.keywords.join(', ')}]`
      }
      tagList += '\n'
    }
  }

  return `Analyze the following SCP entry and select tags from the pool.

Entry: SCP-${String(scpNumber).padStart(3, '0')}
Language: ${language}
Name: ${name || 'Unknown'}
Object Class: ${objectClass || 'Unknown'}

--- BEGIN ENTRY CONTENT ---
${truncated}
--- END ENTRY CONTENT ---

Available Tags:${tagList}

Select the appropriate tags for this entry. Return ONLY a JSON array of tag IDs.`
}

// ─── Main Function ──────────────────────────────────────────

/**
 * Automatically tag an SCP entry using GLM-4-flash.
 *
 * Fetches available tags from D1, sends entry content to the model,
 * and stores the resulting tag assignments.
 *
 * @returns The tag IDs that were assigned, or null if tagging failed.
 */
export async function autoTagEntry(
  db: D1Database,
  apiKey: string,
  scpNumber: number,
  language: 'en' | 'cn',
  logger: Logger,
): Promise<string[] | null> {
  try {
    // 1. Check if entry already has tags — skip if so
    const existingTags = await db
      .prepare('SELECT COUNT(*) as count FROM entry_tags WHERE scp_number = ? AND language = ?')
      .bind(scpNumber, language)
      .first<{ count: number }>()

    if (existingTags && existingTags.count > 0) {
      logger.debug(
        `Entry SCP-${scpNumber} (${language}) already has ${existingTags.count} tags, skipping auto-tag`,
      )
      return null
    }

    // 2. Fetch entry content from D1
    const entry = await db
      .prepare(
        'SELECT name, object_class, content FROM scp_entries WHERE scp_number = ? AND language = ?',
      )
      .bind(scpNumber, language)
      .first<{
        name: string
        object_class: string
        content: string | null
      }>()

    if (!entry || !entry.content) {
      logger.warn(`Cannot auto-tag SCP-${scpNumber} (${language}): entry or content not found`)
      return null
    }

    // 3. Fetch all available tags from the tag pool
    const tagRows = await db
      .prepare(
        `SELECT t.id, t.category_id, t.name, t.name_zh, t.description, t.ai_keywords
       FROM tags t
       ORDER BY t.category_id ASC, t.sort_order ASC`,
      )
      .all<Tag>()

    if (tagRows.results.length === 0) {
      logger.warn('Cannot auto-tag: no tags in the tag pool')
      return null
    }

    const candidates: TagCandidate[] = tagRows.results.map((t) => {
      let keywords: string[] = []
      try {
        keywords = JSON.parse(t.ai_keywords)
      } catch {
        logger.warn(`Corrupted ai_keywords for tag ${t.id} — using empty keywords`)
      }
      return {
        id: t.id,
        category: t.category_id,
        name: t.name,
        nameZh: t.name_zh,
        description: t.description,
        keywords,
      }
    })

    // 4. Build prompt and call GLM-4-flash
    const plainText = stripHtml(entry.content)
    const systemPrompt = buildSystemPrompt()
    const userMessage = buildUserMessage(
      scpNumber,
      language,
      entry.name,
      entry.object_class,
      plainText,
      candidates,
    )

    logger.info(`Auto-tagging SCP-${scpNumber} (${language}) with GLM-4-flash`, {
      scpNumber,
      language,
      contentLength: plainText.length,
      tagPoolSize: candidates.length,
    })

    const result = await glmChat({
      apiKey,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      model: TAG_MODEL,
      temperature: TAG_TEMPERATURE,
      maxTokens: TAG_MAX_TOKENS,
    })

    // 5. Parse the response — expect a JSON array of tag IDs
    const tagIds = parseTagIds(result.content, candidates)

    if (tagIds.length === 0) {
      logger.warn(`Auto-tagging returned no valid tags for SCP-${scpNumber} (${language})`, {
        rawResponse: result.content.slice(0, 200),
      })
      return null
    }

    // 6. Store tags in entry_tags table
    await storeTags(db, scpNumber, language, tagIds)

    logger.info(`Auto-tagged SCP-${scpNumber} (${language}) with ${tagIds.length} tags`, {
      scpNumber,
      language,
      tagIds,
      tokenUsage: result.tokenUsage,
    })

    return tagIds
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error(`Auto-tagging failed for SCP-${scpNumber} (${language})`, {
      error: message,
      scpNumber,
      language,
    })
    return null
  }
}

// ─── Response Parsing ───────────────────────────────────────

/**
 * Parse tag IDs from the model's response text.
 * Handles raw JSON arrays, markdown-wrapped arrays, and partial responses.
 */
function parseTagIds(response: string, candidates: TagCandidate[]): string[] {
  const validIds = new Set(candidates.map((t) => t.id))

  // Try to extract a JSON array from the response
  const jsonMatch = response.match(/\[[\s\S]*?\]/)
  if (!jsonMatch) return []

  try {
    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed)) return []

    // Filter to only valid tag IDs
    return parsed.filter((id: unknown): id is string => typeof id === 'string' && validIds.has(id))
  } catch {
    // Malformed JSON — try to extract IDs manually via regex fallback
    console.warn('[auto-tagger] Malformed tag JSON, falling back to regex extraction')
    const idPattern = /"[A-Z]{2}\d{3}"/g
    const matches = jsonMatch[0].match(idPattern)
    if (!matches) return []

    return matches.map((m) => m.replace(/"/g, '')).filter((id) => validIds.has(id))
  }
}

// ─── Storage ────────────────────────────────────────────────

/**
 * Store auto-generated tag associations in the entry_tags table.
 * Uses INSERT OR IGNORE to handle duplicates gracefully.
 */
async function storeTags(
  db: D1Database,
  scpNumber: number,
  language: string,
  tagIds: string[],
): Promise<number> {
  if (tagIds.length === 0) return 0

  const stmt = db.prepare(
    'INSERT OR IGNORE INTO entry_tags (scp_number, language, tag_id) VALUES (?, ?, ?)',
  )

  const results = await db.batch(tagIds.map((tagId) => stmt.bind(scpNumber, language, tagId)))

  return results.reduce((sum, r) => sum + (r.meta?.changes ?? 0), 0)
}
