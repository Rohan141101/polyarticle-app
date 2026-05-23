import { Response } from 'express'
import { db as pool } from '../lib/db'
import { AuthOrGuestRequest } from '../middleware/auth.middleware'
import { logger } from '../utils/logger'

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

export async function logEvent(req: AuthOrGuestRequest, res: Response) {
  try {
    const userId = req.user?.id ?? null
    const guestId = req.guest?.id ?? null
    const { events, session_id } = req.body as {
      events?: FeedEvent[]
      session_id?: string
    }

    if (!userId && !guestId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'Invalid events payload' })
    }

    const validEvents = events.filter(
      event =>
        event &&
        event.content_id &&
        event.event_type &&
        VALID_EVENT_TYPES.has(event.event_type)
    )

    if (!validEvents.length) {
      return res.json({ success: true })
    }

    const values: unknown[] = []
    const placeholders = validEvents.map((event, index) => {
      const base = index * 8

      values.push(
        userId,
        guestId,
        event.content_id,
        event.event_type,
        session_id ?? null,
        event.position ?? null,
        event.metadata ? JSON.stringify(event.metadata) : null,
        event.dwell_time_ms ?? null
      )

      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, NOW(), $${base + 8})`
    })

    await pool.query(
      `
      INSERT INTO user_events (
        user_id,
        guest_id,
        content_id,
        event_type,
        session_id,
        position,
        metadata,
        created_at,
        dwell_time_ms
      )
      VALUES ${placeholders.join(', ')}
      `,
      values
    )

    log(`Inserted ${validEvents.length} events for ${userId ? `user ${userId}` : `guest ${guestId}`}`)

    return res.json({ success: true })
  } catch (err) {
    errorLog('EVENT CONTROLLER ERROR:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
