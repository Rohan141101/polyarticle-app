import { Response } from 'express'
import { db as pool } from '../lib/db'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import { logger } from '../utils/logger'

const DECAY_FACTOR = 0.98

const isDev = process.env.NODE_ENV !== 'production'

const log = (...args: any[]) => {
  if (isDev) logger.log(...args)
}

const errorLog = (...args: any[]) => {
  logger.error(...args)
}

const VALID_EVENT_TYPES = new Set([
  'impression',
  'swipe_left',
  'swipe_right',
  'save',
  'hide',
  'share',
  'open_detail',
])

type FeedEvent = {
  content_id: string
  event_type: string
  dwell_time_ms?: number | null
  position?: number
  metadata?: Record<string, unknown>
}

export async function logEvent(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user.id
    const { events } = req.body

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'Invalid events payload' })
    }

    const validEvents: FeedEvent[] = events.filter(
      e =>
        e &&
        e.content_id &&
        e.event_type &&
        VALID_EVENT_TYPES.has(e.event_type)
    )

    if (!validEvents.length) {
      return res.json({ success: true })
    }

    const values: unknown[] = []
    const placeholders = validEvents.map((e, i) => {
      const base = i * 4
      values.push(
        userId,
        e.content_id,
        e.event_type,
        e.dwell_time_ms ?? null
      )
      return `($${base + 1}, $${base + 2}, $${base + 3}, NOW(), $${base + 4})`
    })

    await pool.query(
      `INSERT INTO user_events (user_id, content_id, event_type, created_at, dwell_time_ms)
       VALUES ${placeholders.join(', ')}`,
      values
    )

    logger.log(`✅ Inserted ${validEvents.length} events for user: ${userId}`)

    const swipeEvents = validEvents.filter(
      e =>
        e.event_type === 'swipe_right' ||
        e.event_type === 'swipe_left'
    )

    if (!swipeEvents.length) {
      return res.json({ success: true })
    }

    const userResult = await pool.query(
      `SELECT user_vector FROM user_profiles WHERE user_id = $1`,
      [userId]
    )

    if (!userResult.rows.length || !userResult.rows[0].user_vector) {
      return res.json({ success: true })
    }

    let userVector: number[] = userResult.rows[0].user_vector

    const contentIds = swipeEvents.map(e => e.content_id)

    const articlesResult = await pool.query(
      `SELECT id, embedding FROM articles WHERE id = ANY($1) AND embedding IS NOT NULL`,
      [contentIds]
    )

    if (!articlesResult.rows.length) {
      return res.json({ success: true })
    }

    const embeddingMap = new Map<string, number[]>()

    for (const row of articlesResult.rows) {
      if (row.embedding && Array.isArray(row.embedding)) {
        embeddingMap.set(row.id, row.embedding)
      }
    }

    // ✅ Update vector
    for (const event of swipeEvents) {
      const articleEmbedding = embeddingMap.get(event.content_id)
      if (!articleEmbedding) continue

      let baseWeight = event.event_type === 'swipe_right' ? 0.6 : -0.4
      let dwellBoost = 1

      if (event.dwell_time_ms) {
        if (event.dwell_time_ms > 8000) dwellBoost = 1.5
        else if (event.dwell_time_ms > 4000) dwellBoost = 1.2
        else if (event.dwell_time_ms < 1500) dwellBoost = 0.7
      }

      const weight = baseWeight * dwellBoost

      userVector = userVector.map(
        (val, i) =>
          val * DECAY_FACTOR +
          (articleEmbedding[i] || 0) * weight
      )
    }

    const norm = Math.sqrt(
      userVector.reduce((sum, val) => sum + val * val, 0)
    )

    const normalizedVector =
      norm > 0
        ? userVector.map(val => val / norm)
        : userVector

        await pool.query(
      `UPDATE user_profiles
       SET user_vector = $1, updated_at = NOW()
       WHERE user_id = $2`,
      [`[${normalizedVector.join(',')}]`, userId]
    )

    return res.json({ success: true })
  } catch (err) {
    errorLog('❌ EVENT CONTROLLER ERROR:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}