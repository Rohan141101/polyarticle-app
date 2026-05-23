import { Router, RequestHandler } from 'express'
import { logEvent } from '../controllers/eventsController'
import { requireAuthOrGuest } from '../middleware/auth.middleware'

const router = Router()
const auth = requireAuthOrGuest as unknown as RequestHandler

router.post('/', auth, logEvent as unknown as RequestHandler)

export default router
