"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const auth = auth_middleware_1.requireAuth;
router.use(auth);
router.get('/', async (req, res) => {
    try {
        const { user } = req;
        if (!user?.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return res.json({
            success: true,
            message: 'Feed route working',
            userId: user.id
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});
router.get('/health', (_req, res) => {
    return res.json({
        status: 'ok',
        service: 'feed',
        timestamp: new Date().toISOString()
    });
});
exports.default = router;
