const ITERATIONS = 100_000
const SALT_LEN = 16
const HASH_LEN = 32

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

async function deriveKey(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    HASH_LEN * 8
  )
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN))
  const hash = await deriveKey(password, salt)
  return `${toHex(salt)}.${toHex(hash)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split('.')
  if (!saltHex || !hashHex) return false
  const salt = fromHex(saltHex)
  const expectedHash = fromHex(hashHex)
  const actualHash = new Uint8Array(await deriveKey(password, salt))
  if (actualHash.length !== expectedHash.length) return false
  let diff = 0
  for (let i = 0; i < actualHash.length; i++) {
    diff |= actualHash[i] ^ expectedHash[i]
  }
  return diff === 0
}
