import { db as pool } from '../lib/db'
import { hashPassword, verifyPassword } from '../utils/hash'
import { generateSessionToken } from '../utils/token'

type DeviceInfo = {
  deviceName?: string
  deviceOS?: string
  ipAddress?: string
  location?: string
  interests?: string[]
}

type UserRecord = {
  id: string
  email: string
  phone?: string
  location?: string
  is_active: boolean
  is_email_verified: boolean
  password_hash: string
}

const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000

// ================= SIGNUP =================
export async function signup(
  email: string,
  password: string,
  device?: DeviceInfo
) {
  const existing = await pool.query(
    `SELECT id FROM app_users WHERE email = $1 LIMIT 1`,
    [email]
  )

  if (existing.rows.length > 0) {
    throw new Error('User already exists')
  }

  const passwordHash = await hashPassword(password)

  const userResult = await pool.query<UserRecord>(
    `
    INSERT INTO app_users (email, password_hash, location, is_active, is_email_verified)
    VALUES ($1, $2, $3, true, false)
    RETURNING *
    `,
    [email, passwordHash, device?.location ?? null]
  )

  const user = userResult.rows[0]

  await pool.query(
    `
    INSERT INTO user_profiles (user_id, interests, created_at, updated_at)
    VALUES ($1, $2, NOW(), NOW())
    `,
    [user.id, device?.interests ?? []]
  )

  const sessionToken = generateSessionToken()

  await pool.query(
    `
    INSERT INTO sessions (
      user_id, session_token, expires_at,
      device_name, device_os, ip_address
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      user.id,
      sessionToken,
      new Date(Date.now() + SESSION_EXPIRY_MS),
      device?.deviceName ?? null,
      device?.deviceOS ?? null,
      device?.ipAddress ?? null,
    ]
  )

  return {
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone ?? null,
      location: user.location ?? null,
    },
    sessionToken,
  }
}

// ================= LOGIN =================
export async function login(
  email: string,
  password: string,
  device?: DeviceInfo
) {
  const result = await pool.query<UserRecord>(
    `SELECT * FROM app_users WHERE email = $1 AND is_active = true LIMIT 1`,
    [email]
  )

  const user = result.rows[0]

  if (!user) throw new Error('Invalid credentials')

  const isValid = await verifyPassword(password, user.password_hash)
  if (!isValid) throw new Error('Invalid credentials')

  const sessionToken = generateSessionToken()

  await pool.query(
    `
    INSERT INTO sessions (
      user_id, session_token, expires_at,
      device_name, device_os, ip_address
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      user.id,
      sessionToken,
      new Date(Date.now() + SESSION_EXPIRY_MS),
      device?.deviceName ?? null,
      device?.deviceOS ?? null,
      device?.ipAddress ?? null,
    ]
  )

  return {
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone ?? null,
      location: user.location ?? null,
    },
    sessionToken,
  }
}

// ================= VALIDATE SESSION =================
export async function validateSession(token: string) {
  const result = await pool.query(
    `
    SELECT 
      s.session_token,
      s.expires_at,
      u.*
    FROM sessions s
    JOIN app_users u ON s.user_id = u.id
    WHERE s.session_token = $1
    LIMIT 1
    `,
    [token.trim()]
  )

  const session = result.rows[0]

  if (!session) throw new Error('Invalid session')

  if (new Date(session.expires_at) < new Date()) {
    await pool.query(
      `DELETE FROM sessions WHERE session_token = $1`,
      [token]
    )
    throw new Error('Session expired')
  }

  return {
    id: session.id,
    email: session.email,
    phone: session.phone,
    location: session.location,
    is_active: session.is_active,
    is_email_verified: session.is_email_verified,
  }
}

// ================= SESSIONS =================
export async function getActiveSessions(userId: string) {
  const result = await pool.query(
    `
    SELECT id, device_name, device_os, ip_address, created_at, expires_at
    FROM sessions
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [userId]
  )

  return result.rows
}

export async function logout(sessionToken: string) {
  await pool.query(
    `DELETE FROM sessions WHERE session_token = $1`,
    [sessionToken.trim()]
  )
}

export async function revokeOtherSessions(
  userId: string,
  currentToken: string
) {
  await pool.query(
    `
    DELETE FROM sessions
    WHERE user_id = $1 AND session_token != $2
    `,
    [userId, currentToken.trim()]
  )
}

export async function revokeSessionById(userId: string, sessionId: string) {
  await pool.query(
    `
    DELETE FROM sessions
    WHERE id = $1 AND user_id = $2
    `,
    [sessionId, userId]
  )
}