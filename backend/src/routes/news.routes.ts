import { Router, Request, Response, RequestHandler, NextFunction } from 'express'
import { getNews, getRegionalNews } from '../services/news.service'
import { ingestRSSFeeds } from '../services/rssIngest.service'
import { repairMissingImages } from '../services/imageRepair.service'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware'
import { inferCategory } from '../services/category.service'
import { db as pool } from '../lib/db'

const router = Router()

const auth = requireAuth as unknown as RequestHandler

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const adminSecret = req.headers['x-admin-secret']
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  next()
}

router.get('/admin/rss-ingest', async (_req: Request, res: Response) => {
  try {
    const result = await ingestRSSFeeds()
    return res.json(result)
  } catch (err: any) {
    return res.status(500).json({
      error:
        err?.message ||
        err?.detail ||
        JSON.stringify(err) ||
        'RSS ingestion failed'
    })
  }
})

router.get('/admin/repair-images', auth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await repairMissingImages()
    return res.json(result)
  } catch (err: any) {
    return res.status(500).json({
      error:
        err?.message ||
        err?.detail ||
        JSON.stringify(err) ||
        'Image repair failed'
    })
  }
})

router.get('/admin/backfill-categories', auth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, title, source, url
      FROM articles
      WHERE category IS NULL
    `)

    const articles = result.rows
    let updated = 0

    for (const article of articles) {
      const category = inferCategory(article)

      await pool.query(
        `UPDATE articles SET category = $1 WHERE id = $2`,
        [category, article.id]
      )

      updated++
    }

    return res.json({ success: true, processed: articles.length, updated })
  } catch (err: any) {
    return res.status(500).json({
      error:
        err?.message ||
        err?.detail ||
        JSON.stringify(err) ||
        'Backfill failed'
    })
  }
})

router.get('/regional', auth, async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest

    let news = await getRegionalNews(user.id, 10)

    if (!news.length) {
      news = await getNews(user.id, 1, 10, 'World')
    }

    return res.json({ success: true, count: news.length, data: news })
  } catch (err: any) {
    return res.status(500).json({
      error:
        err?.message ||
        err?.detail ||
        JSON.stringify(err) ||
        'Failed to fetch regional news'
    })
  }
})

router.get('/', auth, async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest

    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 10), 20)
    const category = req.query.category as string | undefined
    const fresh = req.query.fresh === 'true'

    const news = await getNews(user.id, page, limit, category, fresh)

    return res.json({
      success: true,
      page,
      limit,
      category: category || 'For You',
      fresh,
      count: news.length,
      data: news
    })
  } catch (err: any) {
    return res.status(500).json({
      error:
        err?.message ||
        err?.detail ||
        JSON.stringify(err) ||
        'Failed to fetch news'
    })
  }
})

router.get('/health', (_req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    service: 'news',
    timestamp: new Date().toISOString()
  })
})

export default router