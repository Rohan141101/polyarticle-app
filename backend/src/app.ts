import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'

import authRoutes from './routes/auth.routes'
import feedRoutes from './routes/feed.routes'
import newsRoutes from './routes/news.routes'
import eventsRoutes from './routes/events.routes'
import profileRoutes from './routes/profile.route'
import deleteAccountRoutes from './routes/deleteAccount.route'
import articleRoutes from './routes/article.route'

const app = express()

app.set('trust proxy', 1)

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
)

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

app.use(express.json({ limit: '10kb' }))

// Routes
app.use('/auth', authRoutes)
app.use('/auth', deleteAccountRoutes)
app.use('/feed', feedRoutes)
app.use('/news', newsRoutes)
app.use('/events', eventsRoutes)
app.use('/profile', profileRoutes)
app.use('/article', articleRoutes)

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handler
app.use(
  (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err) // helpful for debugging
    res.status(500).json({ error: 'Internal server error' })
  }
)

export default app