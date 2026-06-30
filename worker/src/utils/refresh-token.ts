import type { D1Database } from '@cloudflare/workers-types'

const REFRESH_TOKEN_EXPIRY_DAYS = 30

/**
 * Hash a refresh token for storage using SHA-256.
 * We store hashes, not raw tokens, so a DB leak doesn't expose active tokens.
 */
async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Generate a new refresh token and store its hash in D1.
 * Returns the raw token (to send to the client) and the family ID.
 */
export async function createRefreshToken(
  db: D1Database,
  userId: number,
  family?: string,
): Promise<{ token: string; family: string }> {
  const token = crypto.randomUUID() + '.' + crypto.randomUUID()
  const tokenHash = await hashToken(token)
  const tokenFamily = family ?? crypto.randomUUID()
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 86400_000).toISOString()

  await db
    .prepare(
      'INSERT INTO refresh_tokens (user_id, token_hash, family, expires_at) VALUES (?, ?, ?, ?)',
    )
    .bind(userId, tokenHash, tokenFamily, expiresAt)
    .run()

  return { token, family: tokenFamily }
}

/**
 * Validate a refresh token. Returns the user_id and family if valid, null otherwise.
 * A token is valid if:
 *   - it hashes to a row in the DB
 *   - that row is not revoked
 *   - that row has not expired
 *
 * IMPORTANT: if the token is revoked (replay detection), the entire family is
 * invalidated and null is returned. This catches stolen-token attacks.
 */
export async function validateRefreshToken(
  db: D1Database,
  token: string,
): Promise<{ userId: number; family: string } | null> {
  const tokenHash = await hashToken(token)

  const row = await db
    .prepare('SELECT user_id, family, revoked, expires_at FROM refresh_tokens WHERE token_hash = ?')
    .bind(tokenHash)
    .first<{ user_id: number; family: string; revoked: number; expires_at: string }>()

  if (!row) return null

  // Replay detection: if this token was already revoked, someone is reusing it.
  // Revoke the entire family to invalidate the legitimate session too.
  if (row.revoked) {
    await db
      .prepare('UPDATE refresh_tokens SET revoked = 1 WHERE family = ?')
      .bind(row.family)
      .run()
    return null
  }

  // Expiry check
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return null
  }

  return { userId: row.user_id, family: row.family }
}

/**
 * Rotate a refresh token: revoke the old one and issue a new one in the same family.
 * This is called on successful /refresh — the old single-use token is burned.
 */
export async function rotateRefreshToken(
  db: D1Database,
  oldToken: string,
): Promise<{ token: string; userId: number } | null> {
  const oldHash = await hashToken(oldToken)

  const row = await db
    .prepare(
      'SELECT id, user_id, family, revoked, expires_at FROM refresh_tokens WHERE token_hash = ?',
    )
    .bind(oldHash)
    .first<{ id: number; user_id: number; family: string; revoked: number; expires_at: string }>()

  if (!row) return null

  // Replay detection
  if (row.revoked) {
    await db
      .prepare('UPDATE refresh_tokens SET revoked = 1 WHERE family = ?')
      .bind(row.family)
      .run()
    return null
  }

  // Expiry check
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return null
  }

  // Revoke the old token
  await db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?').bind(row.id).run()

  // Issue a new token in the same family
  const { token } = await createRefreshToken(db, row.user_id, row.family)
  return { token, userId: row.user_id }
}

/**
 * Revoke all refresh tokens for a user (logout everywhere).
 */
export async function revokeAllUserTokens(db: D1Database, userId: number): Promise<void> {
  await db
    .prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ? AND revoked = 0')
    .bind(userId)
    .run()
}

/**
 * Revoke a specific refresh token family (logout one session).
 */
export async function revokeTokenFamily(db: D1Database, family: string): Promise<void> {
  await db
    .prepare('UPDATE refresh_tokens SET revoked = 1 WHERE family = ? AND revoked = 0')
    .bind(family)
    .run()
}

/**
 * Clean up expired tokens. Call periodically or inline.
 */
export async function cleanupExpiredTokens(db: D1Database): Promise<void> {
  await db.prepare("DELETE FROM refresh_tokens WHERE expires_at < datetime('now')").run()
}
