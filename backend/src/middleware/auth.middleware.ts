import { Request, Response, NextFunction } from 'express'
import { db as pool } from '../lib/db'
import { User } from '../types/user'

export interface AuthenticatedRequest extends Request {
  user: User
  sessionToken: string
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as Request & {
      user?: User
      sessionToken?: string
    }
    const headers = authReq.headers as Record<string, string | string[] | undefined>
    const rawHeader = headers.authorization ?? headers.Authorization
    const headerValue = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader

    if (!headerValue) {
      return res.status(401).json({ error: 'Unauthorized - no header' })
    }

    const token = headerValue.replace(/Bearer\s+/i, '').trim()

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - no token' })
    }

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

    if (!session) {
      return res.status(401).json({ error: 'Invalid session' })
    }

    if (new Date(session.expires_at) < new Date()) {
      await pool.query(
        `DELETE FROM sessions WHERE session_token = $1`,
        [token]
      )

      return res.status(401).json({ error: 'Session expired' })
    }

    if (!session.is_active) {
      return res.status(403).json({ error: 'Account is inactive' })
    }

    authReq.user = {
      id: session.id,
      email: session.email,
      phone: session.phone,
      location: session.location,
      is_email_verified: session.is_email_verified,
      is_active: session.is_active,
    }

    authReq.sessionToken = token

    next()
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Authentication failed' })
  }
}
