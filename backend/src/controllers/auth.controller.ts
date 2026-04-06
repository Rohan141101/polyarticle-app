import { Request, Response } from 'express'
import * as AuthService from '../services/auth.service'
import { AuthenticatedRequest } from '../middleware/auth.middleware'

type SignupBody = {
  email: string
  password: string
  deviceName?: string
  deviceOS?: string
  location?: string
  interests?: string[]
}

function safeError(err: unknown): string {
  if (err instanceof Error) return err.message
  return 'An unexpected error occurred'
}

export async function signup(req: Request, res: Response) {
  try {
    const { email, password, deviceName, deviceOS, location, interests } = req.body as SignupBody
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }
    const data = await AuthService.signup(email, password, {
      deviceName,
      deviceOS,
      ipAddress: req.ip,
      location,
      interests,
    })
    res.json(data)
  } catch (err: any) {
  console.error("💥 FULL SIGNUP ERROR:", err)

  return res.status(400).json({
    error:
      err?.message ||
      err?.details ||
      err?.hint ||
      JSON.stringify(err) ||
      'Signup failed'
  })
}
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password, deviceName, deviceOS } = req.body as SignupBody
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }
    const data = await AuthService.login(email, password, {
      deviceName,
      deviceOS,
      ipAddress: req.ip,
    })
    res.json(data)
  } catch (err) {
    console.error('LOGIN FAILED:', err)
    res.status(401).json({ error: 'Invalid email or password' })
  }
}

export async function me(req: AuthenticatedRequest, res: Response) {
  const user = req.user
  res.json({ user })
}

export async function activeSessions(req: AuthenticatedRequest, res: Response) {
  try {
    const sessions = await AuthService.getActiveSessions(req.user.id)
    res.json({ sessions })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' })
  }
}

export async function logout(req: AuthenticatedRequest, res: Response) {
  try {
    await AuthService.logout(req.sessionToken)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' })
  }
}

export async function revokeOthers(req: AuthenticatedRequest, res: Response) {
  try {
    await AuthService.revokeOtherSessions(req.user.id, req.sessionToken)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke sessions' })
  }
}

export async function revokeSession(req: AuthenticatedRequest, res: Response) {
  try {
    const { sessionId } = req.body
    if (!sessionId) return res.status(400).json({ error: 'Session ID required' })
    await AuthService.revokeSessionById(req.user.id, sessionId)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke session' })
  }
}