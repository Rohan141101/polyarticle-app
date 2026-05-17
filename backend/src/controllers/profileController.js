"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePreferences = savePreferences;
exports.updateLocation = updateLocation;
const db_1 = require("../lib/db");
const category_service_1 = require("../services/category.service");
const VALID_LOCATIONS = new Set([
    'USA', 'United Kingdom', 'Australia', 'New Zealand',
    'Canada', 'Singapore', 'Germany', 'France',
    'Switzerland', 'Netherlands', 'Spain', 'Luxembourg',
]);
async function savePreferences(req, res) {
    try {
        const { categories } = req.body;
        if (!categories || !Array.isArray(categories) || categories.length === 0) {
            return res.status(400).json({ error: 'Select at least one category' });
        }
        const seededVector = (0, category_service_1.seedUserVector)(categories);
        await db_1.db.query(`INSERT INTO user_profiles (user_id, interests, user_vector, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         interests = EXCLUDED.interests,
         user_vector = EXCLUDED.user_vector,
         updated_at = NOW()`, [req.user.id, categories, `[${seededVector.join(',')}]`]);
        return res.json({ success: true });
    }
    catch {
        return res.status(500).json({ error: 'Server error' });
    }
}
async function updateLocation(req, res) {
    try {
        const { location } = req.body;
        if (!location || typeof location !== 'string') {
            return res.status(400).json({ error: 'Invalid location' });
        }
        if (!VALID_LOCATIONS.has(location)) {
            return res.status(400).json({ error: 'Unsupported location' });
        }
        await db_1.db.query(`UPDATE app_users SET location = $1, updated_at = NOW() WHERE id = $2`, [location, req.user.id]);
        return res.json({ success: true, location });
    }
    catch {
        return res.status(500).json({ error: 'Server error' });
    }
}
