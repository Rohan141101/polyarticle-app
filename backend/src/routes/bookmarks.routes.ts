import { Router, Request, Response } from 'express'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware'
import { addBookmark, removeBookmark, getBookmarks } from '../services/bookmarks.service'

const router = Router()

router.post('/:articleId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest
    const { articleId } = req.params
    await addBookmark(user.id, articleId)
    return res.status(201).json({ success: true })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to add bookmark' })
  }
})

router.delete('/:articleId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest
    const { articleId } = req.params
    await removeBookmark(user.id, articleId)
    return res.status(200).json({ success: true })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to remove bookmark' })
  }
})

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest
    const bookmarks = await getBookmarks(user.id)
    return res.json({ success: true, count: bookmarks.length, data: bookmarks })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch bookmarks' })
  }
})

export default router
