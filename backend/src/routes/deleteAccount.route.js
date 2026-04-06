"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const db_1 = require("../lib/db");
const router = (0, express_1.Router)();
router.delete('/delete-account', auth_middleware_1.requireAuth, async (req, res) => {
    const client = await db_1.db.connect();
    try {
        const userId = req.user.id;
        await client.query('BEGIN');
        await client.query('DELETE FROM user_seen WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM user_profiles WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM app_users WHERE id = $1', [userId]);
        await client.query('COMMIT');
        return res.json({ success: true });
    }
    catch {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: 'Failed to delete account' });
    }
    finally {
        client.release();
    }
});
exports.default = router;
