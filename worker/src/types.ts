export interface Env {
  DB: D1Database
  JWT_SECRET: string
  CORS_ORIGINS: string
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
