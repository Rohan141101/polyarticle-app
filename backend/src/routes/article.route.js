"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../lib/db");
const router = (0, express_1.Router)();
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db_1.db.query(`SELECT id, title, summary, image_url, url, source, published_at, category
       FROM articles WHERE id = $1 LIMIT 1`, [id]);
        const article = result.rows[0];
        if (!article) {
            return res.status(404).send('<h1>Article not found</h1>');
        }
        const title = article.title || 'PolyArticle';
        const description = article.summary || '';
        const image = article.image_url || 'https://polyarticle.com/og-default.png';
        const sourceUrl = article.url || 'https://polyarticle.com';
        const source = article.source || '';
        const category = article.category || '';
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="https://polyarticle-backend.onrender.com/article/${id}" />
  <meta property="og:site_name" content="PolyArticle" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f7f7f7; color: #111; }
    .container { max-width: 720px; margin: 0 auto; padding: 24px 16px 60px; }
    .badge { display: inline-block; background: #111; color: #fff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; letter-spacing: 1px; margin-bottom: 16px; text-transform: uppercase; }
    .hero { width: 100%; border-radius: 16px; object-fit: cover; max-height: 400px; margin-bottom: 24px; }
    h1 { font-size: 26px; font-weight: 800; line-height: 1.3; margin-bottom: 12px; }
    .meta { font-size: 13px; color: #888; margin-bottom: 20px; }
    .summary { font-size: 17px; line-height: 1.75; color: #333; margin-bottom: 32px; }
    .read-btn { display: block; background: #111; color: #fff; text-align: center; padding: 16px; border-radius: 12px; font-size: 16px; font-weight: 700; text-decoration: none; }
    .read-btn:hover { background: #333; }
    .brand { text-align: center; margin-top: 40px; font-size: 13px; color: #aaa; }
    .brand a { color: #111; font-weight: 600; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    ${category ? `<span class="badge">${category}</span>` : ''}
    <img class="hero" src="${image}" alt="${title}" onerror="this.style.display='none'" />
    <h1>${title}</h1>
    ${source ? `<p class="meta">${source}</p>` : ''}
    <p class="summary">${description}</p>
    <a class="read-btn" href="${sourceUrl}" target="_blank" rel="noopener noreferrer">Read Full Article →</a>
    <p class="brand">Shared via <a href="https://polyarticle.com">PolyArticle</a></p>
  </div>
</body>
</html>`;
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
    }
    catch (err) {
        return res.status(500).send('<h1>Something went wrong</h1>');
    }
});
exports.default = router;
