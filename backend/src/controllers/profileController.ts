import { Response } from 'express'
import { db as pool } from '../lib/db'
import { seedUserVector } from '../services/category.service'
import { AuthenticatedRequest } from '../middleware/auth.middleware'

const VALID_LOCATIONS = new Set([
  'USA', 'United Kingdom', 'Australia', 'New Zealand',
  'Canada', 'Singapore', 'Germany', 'France',
  'Switzerland', 'Netherlands', 'Spain', 'Luxembourg',
])

export async function savePreferences(req: AuthenticatedRequest, res: Response) {
  try {
    const { categories } = req.body

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: 'Select at least one category' })
    }

    const seededVector = seedUserVector(categories)

    await pool.query(
      `INSERT INTO user_profiles (user_id, user_vector, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET user_vector = EXCLUDED.user_vector, updated_at = NOW()`,
      [req.user.id, `[${seededVector.join(',')}]`]
    )

    return res.json({ success: true })
  } catch {
    return res.status(500).json({ error: 'Server error' })
  }
}

export async function updateLocation(req: AuthenticatedRequest, res: Response) {
  try {
    const { location } = req.body

    if (!location || typeof location !== 'string') {
      return res.status(400).json({ error: 'Invalid location' })
    }

    if (!VALID_LOCATIONS.has(location)) {
      return res.status(400).json({ error: 'Unsupported location' })
    }

    await pool.query(
      `UPDATE app_users SET location = $1, updated_at = NOW() WHERE id = $2`,
      [location, req.user.id]
    )

    return res.json({ success: true, location })
  } catch {
    return res.status(500).json({ error: 'Server error' })
  }
}