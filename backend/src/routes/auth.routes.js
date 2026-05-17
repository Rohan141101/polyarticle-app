"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const db_1 = require("../lib/db");
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});
const router = (0, express_1.Router)();
router.post('/signup', authLimiter, auth_controller_1.signup);
router.post('/login', authLimiter, auth_controller_1.login);
router.get('/me', auth_middleware_1.requireAuth, auth_controller_1.me);
router.get('/sessions', auth_middleware_1.requireAuth, auth_controller_1.activeSessions);
router.post('/logout', auth_middleware_1.requireAuth, auth_controller_1.logout);
router.post('/revoke-others', auth_middleware_1.requireAuth, auth_controller_1.revokeOthers);
router.post('/revoke-session', auth_middleware_1.requireAuth, auth_controller_1.revokeSession);
router.delete('/delete-account', auth_middleware_1.requireAuth, (async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        await db_1.db.query('BEGIN');
        await db_1.db.query('DELETE FROM user_events WHERE user_id = $1', [userId]);
        await db_1.db.query('DELETE FROM user_seen WHERE user_id = $1', [userId]);
        await db_1.db.query('DELETE FROM user_profiles WHERE user_id = $1', [userId]);
        await db_1.db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
        await db_1.db.query('DELETE FROM app_users WHERE id = $1', [userId]);
        await db_1.db.query('COMMIT');
        return res.json({ success: true });
    }
    catch (err) {
        await db_1.db.query('ROLLBACK');
        return res.status(500).json({ error: 'Delete failed' });
    }
}));
exports.default = router;
