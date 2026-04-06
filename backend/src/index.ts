import 'dotenv/config'

import app from './app'

const port = Number(process.env.PORT) || 4000

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`)
})

server.on('error', (error: NodeJS.ErrnoException) => {
  console.error('Failed to start server', error)
  process.exit(1)
})

function shutdown() {
  server.close((error) => {
    if (error) {
      console.error('Error while shutting down server', error)
      process.exit(1)
    }

    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
