import { Router, Request, Response, RequestHandler } from 'express'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware'

const router = Router()

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