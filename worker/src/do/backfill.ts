import { getWikiBaseUrl, extractObjectClassFromEntryPage } from './parser'
import { fetchPageLikeBrowser } from './http-client'
import { Logger } from '../utils/logger'

// ─── Constants ──────────────────────────────────────────────

const STORAGE_KEY_BACKFILL_CHECKPOINT = 'backfill_checkpoint'
const FETCH_TIMEOUT_MS = 15_000
const BACKFILL_BATCH_SIZE = 500
const BACKFILL_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes

// ─── Types ──────────────────────────────────────────────────

/** Checkpoint for resuming backfill across alarm invocations */
export interface BackfillCheckpoint {
  language: 'en' | 'cn'
  offset: number
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Run one batch of backfill: fetch individual wiki pages for entries
 * that still have "Unknown" object class, extract the class, and update D1.
 *
 * Uses checkpoint-resume: reads the offset from DO storage, processes
 * BACKFILL_BATCH_SIZE entries, then saves a new checkpoint and schedules
 * an alarm to continue after BACKFILL_INTERVAL_MS.
 *
 * @returns true if a new alarm was scheduled (more work remains), false if done
 */
export async function runBackfillBatch(
  state: DurableObjectState,
  db: D1Database,
  fetcher: typeof fetch,
  logger: Logger,
): Promise<boolean> {
  const checkpoint = await state.storage.get<BackfillCheckpoint>(STORAGE_KEY_BACKFILL_CHECKPOINT)
  if (!checkpoint) return false

  const { language, offset } = checkpoint
  const baseUrl = getWikiBaseUrl(language)

  // Find entries still marked Unknown, starting from the checkpoint offset
  const rows = await db
    .prepare(
      'SELECT scp_number FROM scp_entries WHERE language = ? AND object_class = ? ORDER BY scp_number ASC LIMIT ? OFFSET ?',
    )
    .bind(language, 'Unknown', BACKFILL_BATCH_SIZE, offset)
    .all<{ scp_number: number }>()

  if (rows.results.length === 0) {
    // No more entries to backfill — clear checkpoint
    await state.storage.delete(STORAGE_KEY_BACKFILL_CHECKPOINT)
    logger.info(`Backfill ${language}: complete (no more Unknown entries)`, { language })
    return false
  }

  const entries = rows.results

  // Process entries in parallel
  const results = await Promise.allSettled(
    entries.map(async (row) => {
      const scpNumber = row.scp_number
      const padded = String(scpNumber).padStart(3, '0')
      const url = `${baseUrl}/scp-${padded}`

      const result = await fetchPageLikeBrowser(url, {
        baseUrl,
        language,
        fetcher,
        timeoutMs: FETCH_TIMEOUT_MS,
      })

      if (!result.ok || !result.html) return null

      const objectClass = extractObjectClassFromEntryPage(result.html, language)
      if (objectClass && objectClass !== 'Unknown') {
        return { scpNumber, objectClass }
      }
      return null
    }),
  )

  // Batch update D1 with resolved classes
  const updates: { scpNumber: number; objectClass: string }[] = []
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      updates.push(r.value)
    }
  }

  if (updates.length > 0) {
    const stmt = db.prepare(
      `UPDATE scp_entries SET object_class = ?, updated_at = datetime('now') WHERE scp_number = ? AND language = ?`,
    )
    await db.batch(updates.map((u) => stmt.bind(u.objectClass, u.scpNumber, language)))
  }

  logger.info(
    `Backfill ${language}: ${updates.length}/${entries.length} resolved (offset=${offset})`,
    {
      language,
      resolved: updates.length,
      batchLength: entries.length,
      offset,
    },
  )

  // If we got a full batch, there may be more entries — save checkpoint and schedule next alarm
  if (rows.results.length === BACKFILL_BATCH_SIZE) {
    const nextOffset = offset + BACKFILL_BATCH_SIZE
    await state.storage.put(STORAGE_KEY_BACKFILL_CHECKPOINT, {
      language,
      offset: nextOffset,
    } satisfies BackfillCheckpoint)
    await state.storage.setAlarm(Date.now() + BACKFILL_INTERVAL_MS)
    logger.info(`Backfill ${language}: scheduling next batch at offset ${nextOffset}`, {
      language,
      nextOffset,
      nextAlarmMs: BACKFILL_INTERVAL_MS,
    })
    return true
  }

  // Partial batch means we've reached the end — clear checkpoint
  await state.storage.delete(STORAGE_KEY_BACKFILL_CHECKPOINT)
  logger.info(`Backfill ${language}: complete`, { language, resolved: updates.length })
  return false
}
