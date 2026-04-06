"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const news_service_1 = require("../services/news.service");
const rssIngest_service_1 = require("../services/rssIngest.service");
const imageRepair_service_1 = require("../services/imageRepair.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const category_service_1 = require("../services/category.service");
const db_1 = require("../lib/db");
const router = (0, express_1.Router)();
const auth = auth_middleware_1.requireAuth;
function requireAdmin(req, res, next) {
    const adminSecret = req.headers['x-admin-secret'];
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
}
router.get('/admin/rss-ingest', async (_req, res) => {
    try {
        const result = await (0, rssIngest_service_1.ingestRSSFeeds)();
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({
            error: err?.message ||
                err?.detail ||
                JSON.stringify(err) ||
                'RSS ingestion failed'
        });
    }
});
router.get('/admin/repair-images', auth, requireAdmin, async (_req, res) => {
    try {
        const result = await (0, imageRepair_service_1.repairMissingImages)();
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({
            error: err?.message ||
                err?.detail ||
                JSON.stringify(err) ||
                'Image repair failed'
        });
    }
});
router.get('/admin/backfill-categories', auth, requireAdmin, async (_req, res) => {
    try {
        const result = await db_1.db.query(`
      SELECT id, title, source, url
      FROM articles
      WHERE category IS NULL
    `);
        const articles = result.rows;
        let updated = 0;
        for (const article of articles) {
            const category = (0, category_service_1.inferCategory)(article);
            await db_1.db.query(`UPDATE articles SET category = $1 WHERE id = $2`, [category, article.id]);
            updated++;
        }
        return res.json({ success: true, processed: articles.length, updated });
    }
    catch (err) {
        return res.status(500).json({
            error: err?.message ||
                err?.detail ||
                JSON.stringify(err) ||
                'Backfill failed'
        });
    }
});
router.get('/regional', auth, async (req, res) => {
    try {
        const { user } = req;
        let news = await (0, news_service_1.getRegionalNews)(user.id, 10);
        if (!news.length) {
            news = await (0, news_service_1.getNews)(user.id, 1, 10, 'World');
        }
        return res.json({ success: true, count: news.length, data: news });
    }
    catch (err) {
        return res.status(500).json({
            error: err?.message ||
                err?.detail ||
                JSON.stringify(err) ||
                'Failed to fetch regional news'
        });
    }
});
router.get('/', auth, async (req, res) => {
    try {
        const { user } = req;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 10), 20);
        const category = req.query.category;
        const fresh = req.query.fresh === 'true';
        const news = await (0, news_service_1.getNews)(user.id, page, limit, category, fresh);
        return res.json({
            success: true,
            page,
            limit,
            category: category || 'For You',
            fresh,
            count: news.length,
            data: news
        });
    }
    catch (err) {
        return res.status(500).json({
            error: err?.message ||
                err?.detail ||
                JSON.stringify(err) ||
                'Failed to fetch news'
        });
    }
});
router.get('/health', (_req, res) => {
    return res.json({
        status: 'ok',
        service: 'news',
        timestamp: new Date().toISOString()
    });
});
exports.default = router;
