import { Router, RequestHandler } from 'express'
import { logEvent } from '../controllers/eventsController'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()
const auth = requireAuth as unknown as RequestHandler

router.post('/', auth, logEvent as unknown as RequestHandler)

export default router