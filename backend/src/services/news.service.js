"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNews = getNews;
exports.getRegionalNews = getRegionalNews;
const db_1 = require("../lib/db");
function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function shuffle(array) {
    return [...array].sort(() => Math.random() - 0.5);
}
function applyDiversity(feed) {
    const result = [];
    const used = new Set();
    while (result.length < feed.length) {
        let added = false;
        for (let i = 0; i < feed.length; i++) {
            if (used.has(i))
                continue;
            const last = result[result.length - 1];
            if (!last || last.category !== feed[i].category) {
                result.push(feed[i]);
                used.add(i);
                added = true;
                break;
            }
        }
        if (!added) {
            for (let i = 0; i < feed.length; i++) {
                if (!used.has(i)) {
                    result.push(feed[i]);
                    used.add(i);
                    break;
                }
            }
        }
    }
    return result;
}
async function markArticlesSeen(userId, articles) {
    if (!articles.length)
        return;
    const values = articles.map((_, i) => `($1, $${i + 2})`).join(', ');
    const ids = articles.map(a => a.id);
    await db_1.db.query(`INSERT INTO user_seen (user_id, article_id)
     VALUES ${values}
     ON CONFLICT DO NOTHING`, [userId, ...ids]);
}
async function getUserProfile(userId) {
    const result = await db_1.db.query(`SELECT user_vector, interests FROM user_profiles WHERE user_id = $1`, [userId]);
    return {
        user_vector: result.rows[0]?.user_vector ?? null,
        interests: result.rows[0]?.interests ?? [],
    };
}
async function getNews(userId, page = 1, limit = 10, category, fresh = false) {
    const offset = (page - 1) * limit;
    if (category && category !== 'For You') {
        const result = await db_1.db.query(`SELECT id, title, summary, image_url, url, source, published_at, category
       FROM articles
       WHERE category = $1
       ORDER BY published_at DESC
       LIMIT $2 OFFSET $3`, [category, limit, offset]);
        return result.rows;
    }
    if (fresh) {
        const result = await db_1.db.query(`SELECT id, title, summary, image_url, url, source, published_at, category
       FROM articles
       WHERE id NOT IN (
         SELECT article_id FROM user_seen WHERE user_id = $1
       )
       ORDER BY published_at DESC
       LIMIT $2`, [userId, limit]);
        await markArticlesSeen(userId, result.rows);
        return result.rows;
    }
    const unseenCountResult = await db_1.db.query(`SELECT COUNT(*) FROM articles a
     WHERE a.id NOT IN (
       SELECT article_id FROM user_seen WHERE user_id = $1
     )`, [userId]);
    const unseenCount = parseInt(unseenCountResult.rows[0].count);
    if (unseenCount < 8) {
        await db_1.db.query(`DELETE FROM user_seen
       WHERE user_id = $1
       AND seen_at < NOW() - INTERVAL '2 days'`, [userId]);
    }
    const { user_vector, interests } = await getUserProfile(userId);
    if (!user_vector) {
        let fallback = [];
        if (interests.length > 0) {
            const res = await db_1.db.query(`SELECT id, title, summary, image_url, url, published_at, source, category
         FROM articles
         WHERE category = ANY($1)
         ORDER BY published_at DESC
         LIMIT $2 OFFSET $3`, [interests, limit * 2, offset]);
            fallback = shuffle(res.rows).slice(0, limit);
        }
        else {
            const res = await db_1.db.query(`SELECT id, title, summary, image_url, url, published_at, source, category
         FROM articles
         ORDER BY published_at DESC
         LIMIT $1 OFFSET $2`, [limit * 2, offset]);
            fallback = shuffle(res.rows).slice(0, limit);
        }
        fallback = applyDiversity(fallback);
        await markArticlesSeen(userId, fallback);
        return fallback;
    }
    let rankedResult = await db_1.db.query(`SELECT
       a.id, a.title, a.summary, a.image_url, a.url,
       a.source, a.published_at, a.category,
       (
         0.6 +
         (CASE WHEN a.category = ANY($3) THEN 0.2 ELSE 0 END) +
         (EXTRACT(EPOCH FROM (NOW() - a.published_at)) / 3600 * -0.015)
       ) AS score
     FROM articles a
     WHERE a.id NOT IN (
         SELECT article_id FROM user_seen WHERE user_id = $1
       )
     ORDER BY score DESC
     LIMIT 120 OFFSET $2`, [userId, offset, interests]);
    let ranked = rankedResult.rows;
    if (!ranked.length) {
        rankedResult = await db_1.db.query(`SELECT
         a.id, a.title, a.summary, a.image_url, a.url,
         a.source, a.published_at, a.category,
         (
           0.6 +
           (CASE WHEN a.category = ANY($3) THEN 0.2 ELSE 0 END) +
           (EXTRACT(EPOCH FROM (NOW() - a.published_at)) / 3600 * -0.015)
         ) AS score
       FROM articles a
       ORDER BY score DESC
       LIMIT 120 OFFSET $2`, [userId, offset, interests]);
        ranked = rankedResult.rows;
    }
    if (!ranked.length) {
        const fallback = await db_1.db.query(`SELECT id, title, summary, image_url, url, published_at, source, category
       FROM articles
       ORDER BY published_at DESC
       LIMIT $1 OFFSET $2`, [limit, offset]);
        await markArticlesSeen(userId, fallback.rows);
        return applyDiversity(fallback.rows);
    }
    const freshPool = ranked.slice(0, 20);
    const personalized = ranked.slice(0, randomBetween(4, 6));
    const trending = shuffle(ranked.slice(0, 40)).slice(0, randomBetween(3, 4));
    const explorationStart = randomBetween(15, 50);
    const exploration = shuffle(ranked.slice(explorationStart, explorationStart + 40)).slice(0, randomBetween(2, 3));
    const surprise = ranked[randomBetween(0, ranked.length - 1)];
    let finalFeed = shuffle([
        ...shuffle(freshPool).slice(0, 3),
        ...personalized,
        ...trending,
        ...exploration,
        surprise,
    ]).slice(0, limit);
    if (finalFeed.length < limit) {
        finalFeed = ranked.slice(0, limit);
    }
    finalFeed = applyDiversity(finalFeed);
    await markArticlesSeen(userId, finalFeed);
    return finalFeed;
}
async function getRegionalNews(userId, limit = 10) {
    const allowedRegions = ['USA', 'UK', 'Canada', 'Australia', 'EU'];
    const result = await db_1.db.query(`SELECT id, title, summary, image_url, url, source, published_at, category, country
     FROM articles
     WHERE country = ANY($1)
     ORDER BY published_at DESC
     LIMIT $2`, [allowedRegions, limit]);
    return result.rows;
}
