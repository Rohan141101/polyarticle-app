import crypto from 'crypto'
import { db as pool } from '../lib/db'
import { hashPassword, verifyPassword } from '../utils/hash'
import { generateSessionToken } from '../utils/token'

type DeviceInfo = {
  deviceName?: string
  deviceOS?: string
  ipAddress?: string
  location?: string
  interests?: string[]
  guestToken?: string
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

type GuestSessionRecord = {
  id: string
  interests: string[]
  region: string | null
  expires_at: Date | string
}

const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000

function normalizeStringArray(value?: string[]): string[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean)
}

function normalizeRegion(value?: string): string | null {
  if (typeof value !== 'string') return null

  const region = value.trim()
  return region || null
}

async function getLockedValidGuestByToken(
  client: { query: typeof pool.query },
  token?: string | null
): Promise<GuestSessionRecord | null> {
  if (!token || typeof token !== 'string') return null

  const cleanToken = token.trim()
  if (!cleanToken) return null

  const result = await client.query<GuestSessionRecord>(
    `
    SELECT id, interests, region, expires_at
    FROM guest_sessions
    WHERE session_token = $1
    LIMIT 1
    FOR UPDATE
    `,
    [cleanToken]
  )

  const guest = result.rows[0]

  if (!guest) return null

  if (new Date(guest.expires_at) < new Date()) {
    await client.query(
      `DELETE FROM guest_sessions WHERE session_token = $1`,
      [cleanToken]
    )

    return null
  }

  return {
    ...guest,
    interests: Array.isArray(guest.interests) ? guest.interests : [],
    region: guest.region ?? null,
  }
}

export async function createGuestSession(
  interests?: string[],
  region?: string
) {
  const id = crypto.randomUUID()
  const sessionToken = generateSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS)

  await pool.query(
    `
    INSERT INTO guest_sessions (id, session_token, interests, region, created_at, expires_at)
    VALUES ($1, $2, $3, $4, NOW(), $5)
    `,
    [
      id,
      sessionToken,
      normalizeStringArray(interests),
      normalizeRegion(region),
      expiresAt,
    ]
  )

  return { sessionToken }
}

// ================= SIGNUP =================
export async function signup(
  email: string,
  password: string,
  device?: DeviceInfo
) {
  const passwordHash = await hashPassword(password)
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const guest = await getLockedValidGuestByToken(client, device?.guestToken)
    const providedInterests = normalizeStringArray(device?.interests)
    const providedLocation = normalizeRegion(device?.location)
    const profileInterests = providedInterests.length
      ? providedInterests
      : guest?.interests ?? []
    const signupLocation = providedLocation ?? guest?.region ?? null

    const existing = await client.query(
      `SELECT id FROM app_users WHERE email = $1 LIMIT 1`,
      [email]
    )

    if (existing.rows.length > 0) {
      throw new Error('User already exists')
    }

    const userResult = await client.query<UserRecord>(
      `
      INSERT INTO app_users (email, password_hash, location, is_active, is_email_verified)
      VALUES ($1, $2, $3, true, false)
      RETURNING *
      `,
      [email, passwordHash, signupLocation]
    )

    const user = userResult.rows[0]

    await client.query(
      `
      INSERT INTO user_profiles (user_id, interests, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      `,
      [user.id, profileInterests]
    )

    if (guest) {
      await client.query(
        `
        UPDATE user_events
        SET user_id = $1,
            guest_id = NULL
        WHERE guest_id = $2
        `,
        [user.id, guest.id]
      )

      await client.query(
        `DELETE FROM guest_sessions WHERE id = $1`,
        [guest.id]
      )
    }

    const sessionToken = generateSessionToken()

    await client.query(
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

    await client.query('COMMIT')

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone ?? null,
        location: user.location ?? null,
      },
      sessionToken,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
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
