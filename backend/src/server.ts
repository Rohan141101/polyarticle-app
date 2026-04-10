import "dotenv/config"
import dns from "dns"
dns.setDefaultResultOrder("ipv4first")

import app from "./app"
import { startRSSCron } from "./jobs/rss.cron"
import cron from 'node-cron'
import { ingestRSSFeeds } from './services/rssIngest.service'

const PORT = Number(process.env.PORT) || 4000

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 NewsDeck server running on port ${PORT}`)

 // startRSSCron()
})

function shutdown() {
  console.log("🛑 Shutting down gracefully...")

  server.close(() => {
    console.log("✅ Server closed")
    process.exit(0)
  })
}

process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)
