"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logEvent = logEvent;
const db_1 = require("../lib/db");
const logger_1 = require("../utils/logger");
const isDev = process.env.NODE_ENV !== 'production';
const log = (...args) => {
    if (isDev)
        logger_1.logger.log(...args);
};
const errorLog = (...args) => {
    logger_1.logger.error(...args);
};
const VALID_EVENT_TYPES = new Set([
    'impression',
    'swipe_left',
    'swipe_right',
    'save',
    'hide',
    'share',
    'open_detail',
]);
async function logEvent(req, res) {
    try {
        const userId = req.user.id;
        const { events, session_id } = req.body;
        if (!events || !Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ error: 'Invalid events payload' });
        }
        const validEvents = events.filter(event => event &&
            event.content_id &&
            event.event_type &&
            VALID_EVENT_TYPES.has(event.event_type));
        if (!validEvents.length) {
            return res.json({ success: true });
        }
        const values = [];
        const placeholders = validEvents.map((event, index) => {
            const base = index * 7;
            values.push(userId, event.content_id, event.event_type, session_id ?? null, event.position ?? null, event.metadata ? JSON.stringify(event.metadata) : null, event.dwell_time_ms ?? null);
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, NOW(), $${base + 7})`;
        });
        await db_1.db.query(`
      INSERT INTO user_events (
        user_id,
        content_id,
        event_type,
        session_id,
        position,
        metadata,
        created_at,
        dwell_time_ms
      )
      VALUES ${placeholders.join(', ')}
      `, values);
        log(`Inserted ${validEvents.length} events for user ${userId}`);
        return res.json({ success: true });
    }
    catch (err) {
        errorLog('EVENT CONTROLLER ERROR:', err);
        return res.status(500).json({ error: 'Server error' });
    }
}
