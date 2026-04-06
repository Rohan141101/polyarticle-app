import { Router, RequestHandler, Response } from 'express'
import {
  signup,
  login,
  logout,
  me,
  activeSessions,
  revokeOthers,
  revokeSession,
} from '../controllers/auth.controller'
import { requireAuth } from '../middleware/auth.middleware'
import rateLimit from 'express-rate-limit'
import { db as pool } from '../lib/db'

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

const router = Router()

router.post('/signup', authLimiter, signup)
router.post('/login', authLimiter, login)

router.get('/me', requireAuth as unknown as RequestHandler, me as unknown as RequestHandler)
router.get('/sessions', requireAuth as unknown as RequestHandler, activeSessions as unknown as RequestHandler)
router.post('/logout', requireAuth as unknown as RequestHandler, logout as unknown as RequestHandler)
router.post('/revoke-others', requireAuth as unknown as RequestHandler, revokeOthers as unknown as RequestHandler)
router.post('/revoke-session', requireAuth as unknown as RequestHandler, revokeSession as unknown as RequestHandler)

router.delete(
  '/delete-account',
  requireAuth as unknown as RequestHandler,
  (async (req: any, res: Response) => {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    try {
      await pool.query('BEGIN')

      await pool.query('DELETE FROM user_seen WHERE user_id = $1', [userId])
      await pool.query('DELETE FROM user_profiles WHERE user_id = $1', [userId])
      await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId])
      await pool.query('DELETE FROM app_users WHERE id = $1', [userId])

      await pool.query('COMMIT')

      return res.json({ success: true })
    } catch (err) {
      await pool.query('ROLLBACK')
      return res.status(500).json({ error: 'Delete failed' })
    }
  }) as unknown as RequestHandler
)

export default router