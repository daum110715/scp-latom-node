import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import type { JwtPayload } from '../types'

const ALG = 'HS256'
const EXPIRY = '24h'
const ISSUER = 'scp-latom'
const AUDIENCE = 'scp-latom-users'

export async function signToken(payload: Omit<JwtPayload, 'exp'>, secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret)
  // JwtPayload.sub is number (user ID); JWTPayload.sub is string (JWT spec).
  // The double assertion bridges this intentional mismatch.
  return new SignJWT({ ...payload } as unknown as JWTPayload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(key)
}

export async function verifyToken(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const key = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, key, {
      algorithms: [ALG],
      issuer: ISSUER,
      audience: AUDIENCE,
    })
    // We trust the payload shape — it was signed by signToken with our JwtPayload fields.
    return payload as unknown as JwtPayload
  } catch {
    return null
  }
}
