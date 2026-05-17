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
    // General
    { url: 'https://feeds.bbci.co.uk/news/rss.xml', category: 'General', country: 'UK', source: 'BBC' },
    { url: 'https://www.cbc.ca/cmlink/rss-topstories', category: 'General', country: 'Canada', source: 'CBC' },
    { url: 'https://www.abc.net.au/news/feed/51120/rss.xml', category: 'General', country: 'Australia', source: 'ABC Australia' },
    { url: 'https://apnews.com/hub/ap-top-news/rss', category: 'General', country: 'USA', source: 'Associated Press' },
    { url: 'https://feeds.skynews.com/feeds/rss/home.xml', category: 'General', country: 'UK', source: 'Sky News' },
    // World
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'World', country: null, source: 'BBC' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', category: 'World', country: null, source: 'New York Times' },
    { url: 'https://apnews.com/hub/world-news/rss', category: 'World', country: null, source: 'Associated Press' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'World', country: null, source: 'Al Jazeera' },
    { url: 'https://feeds.reuters.com/reuters/worldNews', category: 'World', country: null, source: 'Reuters' },
    // Politics
    { url: 'https://feeds.bbci.co.uk/news/politics/rss.xml', category: 'Politics', country: 'UK', source: 'BBC' },
    { url: 'https://www.politico.com/rss/politics08.xml', category: 'Politics', country: 'USA', source: 'Politico' },
    { url: 'https://apnews.com/hub/politics/rss', category: 'Politics', country: 'USA', source: 'Associated Press' },
    { url: 'https://thehill.com/rss/syndicator/19110', category: 'Politics', country: 'USA', source: 'The Hill' },
    // Health
    { url: 'https://feeds.bbci.co.uk/news/health/rss.xml', category: 'Health', country: 'UK', source: 'BBC' },
    { url: 'https://www.medicalnewstoday.com/rss', category: 'Health', country: null, source: 'Medical News Today' },
    { url: 'https://www.who.int/rss-feeds/news-english.xml', category: 'Health', country: null, source: 'WHO' },
    { url: 'https://www.webmd.com/rss/rss.aspx?rss=topstories', category: 'Health', country: null, source: 'WebMD' },
    // Technology
    { url: 'https://techcrunch.com/feed/', category: 'Technology', country: null, source: 'TechCrunch' },
    { url: 'https://www.theverge.com/rss/index.xml', category: 'Technology', country: null, source: 'The Verge' },
    { url: 'https://www.engadget.com/rss.xml', category: 'Technology', country: null, source: 'Engadget' },
    { url: 'https://arstechnica.com/feed/', category: 'Technology', country: null, source: 'Ars Technica' },
    { url: 'https://feeds.wired.com/wired/index', category: 'Technology', country: null, source: 'Wired' },
    // Business
    { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', category: 'Business', country: 'USA', source: 'CNBC' },
    { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', category: 'Business', country: 'USA', source: 'MarketWatch' },
    { url: 'https://www.ft.com/rss/home', category: 'Business', country: 'UK', source: 'Financial Times' },
    { url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'Business', country: 'USA', source: 'Bloomberg' },
    // Stocks
    { url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US', category: 'Stocks', country: 'USA', source: 'Yahoo Finance' },
    { url: 'https://www.cnbc.com/id/100000187/device/rss/rss.html', category: 'Stocks', country: 'USA', source: 'CNBC Markets' },
    { url: 'https://feeds.marketwatch.com/marketwatch/marketpulse/', category: 'Stocks', country: 'USA', source: 'MarketWatch Market Pulse' },
    { url: 'https://seekingalpha.com/feed.xml', category: 'Stocks', country: 'USA', source: 'Seeking Alpha' },
    // Crypto
    { url: 'https://cointelegraph.com/rss', category: 'Crypto', country: null, source: 'Cointelegraph' },
    { url: 'https://decrypt.co/feed', category: 'Crypto', country: null, source: 'Decrypt' },
    { url: 'https://coindesk.com/arc/outboundfeeds/rss/', category: 'Crypto', country: null, source: 'CoinDesk' },
    // Sports
    { url: 'https://feeds.bbci.co.uk/sport/rss.xml', category: 'Sports', country: 'UK', source: 'BBC Sport' },
    { url: 'https://www.espn.com/espn/rss/news', category: 'Sports', country: 'USA', source: 'ESPN' },
    { url: 'https://api.foxsports.com/v1/rss', category: 'Sports', country: 'USA', source: 'Fox Sports' },
    // Entertainment
    { url: 'https://variety.com/feed/', category: 'Entertainment', country: null, source: 'Variety' },
    { url: 'https://deadline.com/feed/', category: 'Entertainment', country: null, source: 'Deadline' },
    { url: 'https://www.hollywoodreporter.com/feed/', category: 'Entertainment', country: null, source: 'Hollywood Reporter' },
];
const MAX_ARTICLE_AGE_MS = 3 * 24 * 60 * 60 * 1000;
function normalizeUrl(url) {
    return url.split('?')[0];
}
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
    const bad = ["click here", "you won't believe", 'shocking', 'watch'];
    return bad.some(word => title.toLowerCase().includes(word));
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
        for (const item of feed.items.slice(0, 100)) {
            if (!item.title || !item.link)
                continue;
            if (item.title.length < 30)
                continue;
            if (item.title.split(' ').length < 5)
                continue;
            if (isLowQuality(item.title))
                continue;
            const description = item.description;
            let publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();
            if (Number.isNaN(publishedAt.getTime())) {
                publishedAt = new Date();
            }
            if (Date.now() - publishedAt.getTime() > MAX_ARTICLE_AGE_MS)
                continue;
            let image = extractImageFromItem(item);
            if (!image && ogCalls < 40 && Math.random() < 0.4) {
                image = await extractOGImage(item.link);
                ogCalls++;
            }
            let summary = item.contentSnippet || item.content || description || '';
            summary = cleanText(summary);
            if ((!summary || summary.length < 60) && Math.random() < 0.3) {
                summary = await extractFullContent(item.link);
            }
            summary = summary.slice(0, 280);
            articles.push({
                title: item.title.trim(),
                summary,
                image,
                url: normalizeUrl(item.link),
                category: feedConfig.category,
                source: feedConfig.source || feed.title || 'RSS',
                publishedAt,
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
    let inserted = 0;
    let skipped = 0;
    for (const article of articles) {
        try {
            const res = await db_1.db.query(`
        INSERT INTO articles (title, summary, image_url, url, category, source, published_at, country)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (url) DO NOTHING
        `, [
                article.title,
                article.summary,
                article.image,
                article.url,
                article.category,
                article.source,
                article.publishedAt.toISOString(),
                article.country,
            ]);
            if (res.rowCount && res.rowCount > 0) {
                inserted++;
            }
            else {
                skipped++;
            }
        }
        catch {
            skipped++;
        }
    }
    return { inserted, skipped };
}
async function backfillMissingImages(articles) {
    const missing = articles.slice(0, 60);
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
    const seenUrls = new Set();
    const seenTitles = new Set();
    const unique = allArticles.filter(article => {
        if (seenUrls.has(article.url))
            return false;
        const titleKey = article.title.toLowerCase().slice(0, 80);
        if (seenTitles.has(titleKey))
            return false;
        seenUrls.add(article.url);
        seenTitles.add(titleKey);
        return true;
    });
    const { inserted, skipped } = await batchInsert(unique);
    await backfillMissingImages(unique.filter(article => !article.image));
    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    return {
        success: true,
        inserted,
        skipped,
        deleted,
        totalFetched: unique.length,
        durationSeconds,
    };
}
