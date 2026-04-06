import { Router, RequestHandler } from 'express'
import { requireAuth } from '../middleware/auth.middleware'
import { savePreferences, updateLocation } from '../controllers/profileController'

const router = Router()
const auth = requireAuth as unknown as RequestHandler

router.post('/preferences', auth, savePreferences as unknown as RequestHandler)
router.patch('/location', auth, updateLocation as unknown as RequestHandler)

export default router