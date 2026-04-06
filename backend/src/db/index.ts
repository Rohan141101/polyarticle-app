import dotenv from 'dotenv'
import { db } from '../lib/db'

dotenv.config()

if (!process.env.DATABASE_URL) {
  process.exit(1)
}

export const pool = db