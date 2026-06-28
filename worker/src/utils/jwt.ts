import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import type { JwtPayload } from '../types'

const ALG = 'HS256'
const EXPIRY = '24h'

export async function signToken(payload: Omit<JwtPayload, 'exp'>, secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret)
  return new SignJWT({ ...payload } as unknown as JWTPayload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(key)
}

export async function verifyToken(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const key = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, key, { algorithms: [ALG] })
    return payload as unknown as JwtPayload
  } catch {
    return null
  }
}
