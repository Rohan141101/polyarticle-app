import cron from 'node-cron'
import { db } from '../lib/db'
import { sendPushNotification } from '../services/firebase.service'
import { logger } from '../utils/logger'

const CRON_SCHEDULE = '0 9 * * *' // 9am UTC daily
const RECENCY_SKIP_HOURS = 3
const AFFINITY_LOOKBACK_DAYS = 14

interface DeviceTokenRow {
  user_id: string
  token: string
  platform: string
}

interface ArticleRow {
  id: string
  title: string
  url: string
  category: string
}

async function wasRecentlyActive(userId: string): Promise<boolean> {
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM user_events
     WHERE user_id = $1
       AND created_at > NOW() - INTERVAL '${RECENCY_SKIP_HOURS} hours'`,
    [userId]
  )
  return parseInt(result.rows[0]?.count ?? '0', 10) > 0
}

async function getTopAffinityCategory(userId: string): Promise<string | null> {
  const result = await db.query<{ category: string }>(
    `SELECT a.category,
            SUM(
              CASE e.event_type
                WHEN 'share'       THEN 1.75
                WHEN 'save'        THEN 1.45
                WHEN 'swipe_right' THEN 1.15
                WHEN 'open_detail' THEN 0.85
                ELSE 0
              END
            ) AS score
     FROM user_events e
     JOIN articles a ON a.id = e.content_id
     WHERE e.user_id = $1
       AND e.created_at > NOW() - INTERVAL '${AFFINITY_LOOKBACK_DAYS} days'
       AND e.event_type IN ('share', 'save', 'swipe_right', 'open_detail')
       AND a.category IS NOT NULL
     GROUP BY a.category
     ORDER BY score DESC
     LIMIT 1`,
    [userId]
  )
  return result.rows[0]?.category ?? null
}

async function getBestArticleForCategory(
  category: string,
  userId: string
): Promise<ArticleRow | null> {
  const result = await db.query<ArticleRow>(
    `SELECT a.id, a.title, a.url, a.category
     FROM articles a
     WHERE a.category = $1
       AND a.published_at IS NOT NULL
       AND a.title IS NOT NULL
       AND NULLIF(TRIM(a.title), '') IS NOT NULL
       AND a.url IS NOT NULL
       AND a.id NOT IN (
         SELECT article_id
         FROM notification_log
         WHERE user_id = $2
           AND sent_at > NOW() - INTERVAL '24 hours'
       )
     ORDER BY a.published_at DESC
     LIMIT 1`,
    [category, userId]
  )
  return result.rows[0] ?? null
}

async function logNotification(userId: string, articleId: string): Promise<void> {
  await db.query(
    `INSERT INTO notification_log (user_id, article_id) VALUES ($1, $2)`,
    [userId, articleId]
  )
}

async function runDailyNotifications(): Promise<void> {
  logger.log('🔔 Daily push notification job started...')
  const start = Date.now()
  let sent = 0
  let skipped = 0
  let failed = 0

  let tokens: DeviceTokenRow[]
  try {
    const result = await db.query<DeviceTokenRow>(
      `SELECT user_id, token, platform FROM device_tokens`
    )
    tokens = result.rows
  } catch (err) {
    logger.error('❌ Failed to load device tokens:', err)
    return
  }

  for (const row of tokens) {
    try {
      if (await wasRecentlyActive(row.user_id)) {
        skipped++
        continue
      }

      const category = await getTopAffinityCategory(row.user_id)
      if (!category) {
        skipped++
        continue
      }

      const article = await getBestArticleForCategory(category, row.user_id)
      if (!article) {
        skipped++
        continue
      }

      await sendPushNotification(row.token, 'Your Daily Read', article.title, {
        articleId: article.id,
        url: article.url,
        category: article.category,
      })

      await logNotification(row.user_id, article.id)
      sent++
    } catch (err) {
      logger.error(`❌ Push notification failed for user ${row.user_id}:`, err)
      failed++
    }
  }

  const duration = Math.round((Date.now() - start) / 1000)
  logger.log('✅ Push notification job completed', {
    sent,
    skipped,
    failed,
    total: tokens.length,
    durationSeconds: duration,
  })
}

export function startNotificationCron(): void {
  logger.log('⏱️ Scheduling daily push notifications (9am UTC)...')
  cron.schedule(CRON_SCHEDULE, runDailyNotifications)
}
