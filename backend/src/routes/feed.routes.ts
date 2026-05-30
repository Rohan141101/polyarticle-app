import { Router, Request, Response, RequestHandler } from 'express'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware'
import { db } from '../lib/db'

const router = Router()

router.get('/widget', async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT id, title, source, url, image_url
       FROM articles
       WHERE published_at IS NOT NULL
         AND url IS NOT NULL
         AND NULLIF(TRIM(url), '') IS NOT NULL
         AND title IS NOT NULL
         AND NULLIF(TRIM(title), '') IS NOT NULL
       ORDER BY published_at DESC
       LIMIT 12`
    )
    return res.json({ articles: result.rows })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch widget articles' })
  }
})

const auth = requireAuth as unknown as RequestHandler

router.use(auth)

router.get('/', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest
    if (!user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    return res.json({
      success: true,
      message: 'Feed route working',
      userId: user.id
    })
  } catch (error) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.get('/health', (_req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    service: 'feed',
    timestamp: new Date().toISOString()
  })
})

export default router