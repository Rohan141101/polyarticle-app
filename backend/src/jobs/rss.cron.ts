import cron from 'node-cron'
import { ingestRSSFeeds } from '../services/rssIngest.service'
import { logger } from '../utils/logger'

let isRunning = false

async function runIngestion() {
  if (isRunning) {
    logger.log('⚠️ RSS ingestion skipped (already running)')
    return
  }

  isRunning = true
  const start = Date.now()

  try {
    logger.log('🚀 RSS ingestion started...')

    const result = await ingestRSSFeeds()

    const duration = Math.round((Date.now() - start) / 1000)

    logger.log('✅ RSS ingestion completed', {
      inserted: result?.inserted,
      skipped: result?.skipped,
      deleted: result?.deleted,
      totalFetched: result?.totalFetched,
      durationSeconds: duration,
    })
  } catch (err) {
    logger.error('❌ RSS ingestion failed:', err)
  } finally {
    isRunning = false
  }
}

export function startRSSCron() {
  logger.log('⏱️ Starting RSS cron (every 2 hours)...')

  cron.schedule('0 */2 * * *', runIngestion)

  runIngestion()
}