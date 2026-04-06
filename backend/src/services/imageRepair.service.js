"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.repairMissingImages = repairMissingImages;
const axios_1 = __importDefault(require("axios"));
const db_1 = require("../lib/db");
function extractImageFromHTML(html) {
    // 1️⃣ Try og:image
    const ogMatch = html.match(/<meta\s+(?:property|name)=["']og:image["'][^>]*content=["'](.*?)["']/i);
    if (ogMatch && ogMatch[1]) {
        return ogMatch[1].replace(/&amp;/g, "&").trim();
    }
    // 2️⃣ Try twitter:image
    const twitterMatch = html.match(/<meta\s+(?:property|name)=["']twitter:image["'][^>]*content=["'](.*?)["']/i);
    if (twitterMatch && twitterMatch[1]) {
        return twitterMatch[1].replace(/&amp;/g, "&").trim();
    }
    // 3️⃣ First <img> tag
    const imgMatch = html.match(/<img[^>]+src="([^">]+)"/i);
    if (imgMatch && imgMatch[1]) {
        return imgMatch[1].replace(/&amp;/g, "&").trim();
    }
    return null;
}
async function repairMissingImages() {
    console.log("🔎 Searching for articles without images...");
    const result = await db_1.db.query(`
    SELECT id, url
    FROM articles
    WHERE image_url IS NULL
      AND url IS NOT NULL
  `);
    const articles = result.rows;
    let updated = 0;
    for (const article of articles) {
        try {
            const response = await axios_1.default.get(article.url, {
                timeout: 10000,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                }
            });
            const image = extractImageFromHTML(response.data);
            if (!image) {
                continue; // leave untouched
            }
            await db_1.db.query(`
        UPDATE articles
        SET image_url = $1
        WHERE id = $2
        `, [image, article.id]);
            updated++;
        }
        catch {
            continue;
        }
    }
    console.log(`✅ Real image repair done. Updated: ${updated}`);
    return {
        checked: articles.length,
        updated
    };
}
