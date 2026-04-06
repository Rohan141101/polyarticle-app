import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth.middleware'
import { db } from '../lib/db'

const router = Router()

router.delete(
  '/delete-account',
  requireAuth as any,
  async (req: Request, res: Response) => {
    const client = await db.connect()

    try {
      const userId = (req as any).user.id

      await client.query('BEGIN')

      await client.query('DELETE FROM user_seen WHERE user_id = $1', [userId])
      await client.query('DELETE FROM sessions WHERE user_id = $1', [userId])
      await client.query('DELETE FROM user_profiles WHERE user_id = $1', [userId])
      await client.query('DELETE FROM app_users WHERE id = $1', [userId])

      await client.query('COMMIT')

      return res.json({ success: true })
    } catch {
      await client.query('ROLLBACK')
      return res.status(500).json({ error: 'Failed to delete account' })
    } finally {
      client.release()
    }
  }
)

export default router