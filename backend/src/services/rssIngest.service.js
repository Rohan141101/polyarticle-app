"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestRSSFeeds = ingestRSSFeeds;
const rss_parser_1 = __importDefault(require("rss-parser"));
const httpClient_1 = require("../utils/httpClient");
const db_1 = require("../lib/db");
const https_1 = __importDefault(require("https"));
const parser = new rss_parser_1.default({
    timeout: 15000,
    requestOptions: {
        agent: new https_1.default.Agent({ family: 4 }),
    },
    customFields: {
        item: [
            ['media:content', 'mediaContent'],
            ['media:thumbnail', 'mediaThumbnail'],
            ['content:encoded', 'contentEncoded'],
        ],
    },
});
const RSS_FEEDS = [
    { url: 'https://feeds.bbci.co.uk/news/rss.xml', category: 'General', country: 'UK' },
    { url: 'https://www.theguardian.com/world/rss', category: 'General', country: 'UK' },
    { url: 'https://feeds.reuters.com/reuters/worldNews', category: 'General', country: 'USA' },
    { url: 'https://feeds.bbci.co.uk/news/politics/rss.xml', category: 'Politics', country: 'UK' },
    { url: 'https://www.politico.com/rss/politics08.xml', category: 'Politics', country: 'USA' },
    { url: 'https://apnews.com/hub/politics/rss', category: 'Politics', country: 'USA' },
    { url: 'https://feeds.bbci.co.uk/news/health/rss.xml', category: 'Health', country: 'UK' },
    { url: 'https://www.medicalnewstoday.com/rss', category: 'Health', country: null },
    { url: 'https://www.who.int/rss-feeds/news-english.xml', category: 'Health', country: null },
    { url: 'https://techcrunch.com/feed/', category: 'Technology', country: null },
    { url: 'https://www.theverge.com/rss/index.xml', category: 'Technology', country: null },
    { url: 'https://www.engadget.com/rss.xml', category: 'Technology', country: null },
    { url: 'https://arstechnica.com/feed/', category: 'Technology', country: null },
    { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', category: 'Business', country: 'USA' },
    { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', category: 'Business', country: 'USA' },
    { url: 'https://www.ft.com/rss/home', category: 'Business', country: 'UK' },
    { url: 'https://cointelegraph.com/rss', category: 'Crypto', country: null },
    { url: 'https://decrypt.co/feed', category: 'Crypto', country: null },
    { url: 'https://www.cbc.ca/cmlink/rss-topstories', category: 'General', country: 'Canada' },
    { url: 'https://www.abc.net.au/news/feed/51120/rss.xml', category: 'General', country: 'Australia' },
];
function cleanUrl(url) {
    if (!url)
        return null;
    return url.replace(/&amp;/g, '&');
}
function cleanText(text) {
    return text
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .trim();
}
function isLowQuality(title) {
    const bad = ['click here', 'you won’t believe', 'shocking', 'watch'];
    return bad.some(w => title.toLowerCase().includes(w));
}
function extractImageFromItem(item) {
    if (item.enclosure?.url)
        return cleanUrl(item.enclosure.url);
    if (item.mediaContent?.$?.url)
        return cleanUrl(item.mediaContent.$.url);
    if (item.mediaThumbnail?.$?.url)
        return cleanUrl(item.mediaThumbnail.$.url);
    const html = item.contentEncoded || item.content || item.description;
    if (html) {
        const match = html.match(/<img[^>]+src="([^">]+)"/i);
        if (match)
            return cleanUrl(match[1]);
    }
    return null;
}
async function extractOGImage(url) {
    try {
        const res = await httpClient_1.httpClient.get(url);
        const match = res.data.match(/<meta property="og:image" content="([^"]+)"/i);
        return match ? cleanUrl(match[1]) : null;
    }
    catch {
        return null;
    }
}
async function extractFullContent(url) {
    try {
        const res = await httpClient_1.httpClient.get(url);
        const html = res.data;
        const match = html.match(/<p>(.*?)<\/p>/gi);
        if (!match)
            return '';
        return cleanText(match.join(' ')).slice(0, 600);
    }
    catch {
        return '';
    }
}
async function processFeed(feedConfig) {
    try {
        const res = await httpClient_1.httpClient.get(feedConfig.url);
        const feed = await parser.parseString(res.data);
        const articles = [];
        let ogCalls = 0;
        for (const item of feed.items) {
            if (!item.title || !item.link)
                continue;
            if (item.title.length < 30)
                continue;
            if (item.title.split(' ').length < 5)
                continue;
            if (isLowQuality(item.title))
                continue;
            let image = extractImageFromItem(item);
            if (!image && ogCalls < 40 && Math.random() < 0.4) {
                image = await extractOGImage(item.link);
                ogCalls++;
            }
            let summary = item.contentSnippet || item.content || '';
            summary = cleanText(summary);
            if ((!summary || summary.length < 60) && Math.random() < 0.3) {
                summary = await extractFullContent(item.link);
            }
            summary = summary.slice(0, 280);
            articles.push({
                title: item.title.trim(),
                summary,
                image,
                url: item.link,
                category: feedConfig.category,
                source: feedConfig.source || feed.title || 'RSS',
                publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
                country: feedConfig.country,
            });
        }
        return articles;
    }
    catch {
        return [];
    }
}
async function batchInsert(articles) {
    for (const a of articles) {
        try {
            await db_1.db.query(`
        INSERT INTO articles (title, summary, image_url, url, category, source, published_at, country)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (title, source) DO NOTHING
        `, [
                a.title,
                a.summary,
                a.image,
                a.url,
                a.category,
                a.source,
                a.publishedAt.toISOString(),
                a.country,
            ]);
        }
        catch { }
    }
    return { inserted: articles.length, skipped: 0 };
}
async function backfillMissingImages(articles) {
    const missing = articles.filter(a => !a.image).slice(0, 60);
    await Promise.allSettled(missing.map(async (article) => {
        const image = await extractOGImage(article.url);
        if (image) {
            await db_1.db.query(`
          UPDATE articles
          SET image_url = $1
          WHERE url = $2 AND image_url IS NULL
          `, [image, article.url]);
        }
    }));
}
async function deleteOldArticles() {
    const res = await db_1.db.query(`
    DELETE FROM articles
    WHERE published_at < NOW() - INTERVAL '3 days'
    RETURNING *
    `);
    return res.rowCount || 0;
}
async function ingestRSSFeeds() {
    const startTime = Date.now();
    const deleted = await deleteOldArticles();
    const allArticles = [];
    const batchSize = 20;
    for (let i = 0; i < RSS_FEEDS.length; i += batchSize) {
        const batch = RSS_FEEDS.slice(i, i + batchSize);
        const results = await Promise.allSettled(batch.map(processFeed));
        for (const result of results) {
            if (result.status === 'fulfilled') {
                allArticles.push(...result.value);
            }
        }
    }
    const seen = new Set();
    const seenTitles = new Set();
    const unique = allArticles.filter(a => {
        if (seen.has(a.url))
            return false;
        const key = a.title.toLowerCase().slice(0, 80);
        if (seenTitles.has(key))
            return false;
        seen.add(a.url);
        seenTitles.add(key);
        return true;
    });
    const { inserted, skipped } = await batchInsert(unique);
    await backfillMissingImages(unique.filter(a => !a.image));
    const duration = Math.round((Date.now() - startTime) / 1000);
    return {
        success: true,
        inserted,
        skipped,
        deleted,
        totalFetched: unique.length,
        durationSeconds: duration,
    };
}
