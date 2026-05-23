import { Request, Response, NextFunction } from 'express'
import { db as pool } from '../lib/db'
import { User } from '../types/user'

export type GuestSession = {
  id: string
  interests: string[]
  region?: string | null
}

export interface AuthenticatedRequest extends Request {
  user: User
  sessionToken: string
}

export interface AuthOrGuestRequest extends Request {
  user?: User
  guest?: GuestSession
  sessionToken: string
  authType: 'user' | 'guest'
}

type UserSessionResult =
  | { status: 'valid'; user: User }
  | { status: 'missing' }
  | { status: 'expired' }
  | { status: 'inactive' }

type GuestSessionResult =
  | { status: 'valid'; guest: GuestSession }
  | { status: 'missing' }
  | { status: 'expired' }

function getBearerToken(req: Request): string | null {
  const headers = req.headers as Record<string, string | string[] | undefined>
  const rawHeader = headers.authorization ?? headers.Authorization
  const headerValue = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader

  if (!headerValue) return null

  const token = headerValue.replace(/Bearer\s+/i, '').trim()
  return token || null
}

async function getUserSession(token: string): Promise<UserSessionResult> {
  const result = await pool.query(
    `
    SELECT
      s.session_token,
      s.expires_at,
      u.id,
      u.email,
      u.phone,
      u.location,
      u.is_email_verified,
      u.is_active
    FROM sessions s
    JOIN app_users u ON s.user_id = u.id
    WHERE s.session_token = $1
    LIMIT 1
    `,
    [token]
  )

  const session = result.rows[0]

  if (!session) return { status: 'missing' }

  if (new Date(session.expires_at) < new Date()) {
    await pool.query(
      `DELETE FROM sessions WHERE session_token = $1`,
      [token]
    )

    return { status: 'expired' }
  }

  if (!session.is_active) return { status: 'inactive' }

  return {
    status: 'valid',
    user: {
      id: session.id,
      email: session.email,
      phone: session.phone,
      location: session.location,
      is_email_verified: session.is_email_verified,
      is_active: session.is_active,
    },
  }
}

async function getGuestSession(token: string): Promise<GuestSessionResult> {
  const result = await pool.query(
    `
    SELECT id, interests, region, expires_at
    FROM guest_sessions
    WHERE session_token = $1
    LIMIT 1
    `,
    [token]
  )

  const session = result.rows[0]

  if (!session) return { status: 'missing' }

  if (new Date(session.expires_at) < new Date()) {
    await pool.query(
      `DELETE FROM guest_sessions WHERE session_token = $1`,
      [token]
    )

    return { status: 'expired' }
  }

  return {
    status: 'valid',
    guest: {
      id: session.id,
      interests: Array.isArray(session.interests) ? session.interests : [],
      region: session.region ?? null,
    },
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as Request & { user?: User; sessionToken?: string }
    const token = getBearerToken(req)

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - no header' })
    }

    const session = await getUserSession(token)

    if (session.status === 'missing') {
      return res.status(401).json({ error: 'Invalid session' })
    }

    if (session.status === 'expired') {
      return res.status(401).json({ error: 'Session expired' })
    }

    if (session.status === 'inactive') {
      return res.status(403).json({ error: 'Account is inactive' })
    }

    authReq.user = session.user
    authReq.sessionToken = token

    next()
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Authentication failed' })
  }
}

export async function requireAuthOrGuest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as AuthOrGuestRequest
    const token = getBearerToken(req)

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - no header' })
    }

    const userSession = await getUserSession(token)

    if (userSession.status === 'valid') {
      authReq.user = userSession.user
      authReq.sessionToken = token
      authReq.authType = 'user'
      return next()
    }

    if (userSession.status === 'expired') {
      return res.status(401).json({ error: 'Session expired' })
    }

    if (userSession.status === 'inactive') {
      return res.status(403).json({ error: 'Account is inactive' })
    }

    const guestSession = await getGuestSession(token)

    if (guestSession.status === 'valid') {
      authReq.guest = guestSession.guest
      authReq.sessionToken = token
      authReq.authType = 'guest'
      return next()
    }

    if (guestSession.status === 'expired') {
      return res.status(401).json({ error: 'Guest session expired' })
    }

    return res.status(401).json({ error: 'Invalid session' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Authentication failed' })
  }
}
