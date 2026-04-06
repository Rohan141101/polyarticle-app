import { logger } from '../utils/logger'

type EventType =
  | 'impression'
  | 'swipe_left'
  | 'swipe_right'
  | 'save'
  | 'hide'
  | 'share'
  | 'open_detail'

interface FeedEvent {
  content_id: string
  event_type: EventType
  position?: number
  dwell_time_ms?: number | null
  metadata?: Record<string, unknown>
}

class EventLogger {
  private queue: FeedEvent[] = []
  private MAX_BATCH_SIZE = 5
  private FLUSH_INTERVAL = 5000
  private API_URL = "https://render.com/events"
  private sessionId: string
  private token: string | null = null
  private isFlushing = false
  private flushTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.sessionId = this.generateSessionId()
    this.startAutoFlush()
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
  }

  private startAutoFlush() {
    if (this.flushTimer) return

    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.FLUSH_INTERVAL)
  }

  setToken(token: string | null) {
    this.token = token

    if (!token) {
      this.queue = []
      this.sessionId = this.generateSessionId()
    }
  }

  log(event: FeedEvent) {
    if (!event.content_id || !event.event_type) return

    if (
      event.event_type === 'impression' &&
      event.dwell_time_ms !== undefined &&
      event.dwell_time_ms !== null &&
      event.dwell_time_ms < 300
    ) {
      return
    }

    this.queue.push(event)

    if (this.queue.length >= this.MAX_BATCH_SIZE) {
      this.flush()
    }
  }

  async flush() {
    if (this.isFlushing) return
    if (this.queue.length === 0) return
    if (!this.token) return

    this.isFlushing = true

    const batch = [...this.queue]
    this.queue = []

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 8000)

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          session_id: this.sessionId,
          events: batch,
        }),
        signal: controller.signal,
      })

      clearTimeout(timer)

      if (!response.ok) {
        this.queue = [...batch, ...this.queue]
        logger.error('Event API failed')
      }
    } catch {
      this.queue = [...batch, ...this.queue]
      logger.error('Event network error')
    } finally {
      this.isFlushing = false
    }
  }

  async forceFlush() {
    await this.flush()
  }
}

export const eventLogger = new EventLogger()
