import { Router, Request, Response } from 'express'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware'
import { db } from '../lib/db'

const router = Router()

router.post('/token', requireAuth, async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest
    const { token, platform } = req.body as { token?: string; platform?: string }

    if (!token || !platform) {
      return res.status(400).json({ error: 'token and platform are required' })
    }

    await db.query(
      `INSERT INTO device_tokens (user_id, token, platform, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (user_id, platform) DO UPDATE
         SET token = EXCLUDED.token, updated_at = now()`,
      [user.id, token, platform]
    )

    return res.status(200).json({ success: true })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to register device token' })
  }
})

export default router
