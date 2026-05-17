"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNews = getNews;
exports.getRegionalNews = getRegionalNews;
const db_1 = require("../lib/db");
const READY_ARTICLE_WHERE = `
  published_at IS NOT NULL
  AND url IS NOT NULL
  AND NULLIF(TRIM(url), '') IS NOT NULL
  AND title IS NOT NULL
  AND NULLIF(TRIM(title), '') IS NOT NULL
`;
const READY_ARTICLE_WHERE_WITH_ALIAS = `
  a.published_at IS NOT NULL
  AND a.url IS NOT NULL
  AND NULLIF(TRIM(a.url), '') IS NOT NULL
  AND a.title IS NOT NULL
  AND NULLIF(TRIM(a.title), '') IS NOT NULL
`;
const CANDIDATE_POOL_MIN = 140;
const CANDIDATE_POOL_MAX = 320;
const INTERACTION_LOOKBACK_DAYS = 14;
const TRENDING_LOOKBACK_HOURS = 24;
const CATEGORY_FATIGUE_LOOKBACK_HOURS = 36;
const REGION_MAP = {
    USA: ['USA', 'US', 'United States'],
    UK: ['UK', 'United Kingdom', 'GB'],
    'United Kingdom': ['United Kingdom', 'UK', 'GB'],
    Australia: ['Australia', 'AU'],
    Canada: ['Canada', 'CA'],
    India: ['India', 'IN'],
    Germany: ['Germany', 'DE'],
    France: ['France', 'FR'],
    Singapore: ['Singapore', 'SG'],
    'New Zealand': ['New Zealand', 'NZ'],
    Switzerland: ['Switzerland', 'CH'],
    Netherlands: ['Netherlands', 'NL'],
    Spain: ['Spain', 'ES'],
    Luxembourg: ['Luxembourg', 'LU'],
    EU: ['EU'],
};
function recencyScore(publishedAt) {
    const published = new Date(publishedAt).getTime();
    if (Number.isNaN(published))
        return 0;
    const hoursAgo = Math.max(0, (Date.now() - published) / 3600000);
    return Math.exp(-hoursAgo / 42);
}
function preferenceScore(raw) {
    return 0.5 + Math.tanh(raw / 3) / 2;
}
function candidatePoolSize(limit) {
    return Math.min(CANDIDATE_POOL_MAX, Math.max(CANDIDATE_POOL_MIN, limit * 18));
}
function getImpressionWeight(dwellTimeMs) {
    if (!dwellTimeMs)
        return 0;
    if (dwellTimeMs < 1200)
        return -0.2;
    if (dwellTimeMs < 3000)
        return 0;
    if (dwellTimeMs < 6000)
        return 0.18;
    if (dwellTimeMs < 12000)
        return 0.32;
    return 0.45;
}
function getEventWeight(eventType, dwellTimeMs) {
    switch (eventType) {
        case 'swipe_right':
            return 1.15;
        case 'save':
            return 1.45;
        case 'share':
            return 1.75;
        case 'open_detail':
            return 0.85;
        case 'swipe_left':
            return -1.1;
        case 'hide':
            return -1.35;
        case 'impression':
            return getImpressionWeight(dwellTimeMs);
        default:
            return 0;
    }
}
function interleaveUnique(groups) {
    const result = [];
    const usedIds = new Set();
    let index = 0;
    let hasMore = true;
    while (hasMore) {
        hasMore = false;
        for (const group of groups) {
            const article = group[index];
            if (!article)
                continue;
            hasMore = true;
            if (!usedIds.has(article.id)) {
                usedIds.add(article.id);
                result.push(article);
            }
        }
        index++;
    }
    return result;
}
function applyDiversity(feed, limit = feed.length) {
    const result = [];
    const usedIds = new Set();
    const categoryCounts = {};
    const sourceCounts = {};
    const maxPerCategory = Math.max(3, Math.ceil(limit * 0.25));
    const maxPerSource = Math.max(2, Math.ceil(limit * 0.2));
    const pushArticle = (article) => {
        const category = article.category || 'General';
        const source = article.source || 'Unknown';
        result.push(article);
        usedIds.add(article.id);
        categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
        sourceCounts[source] = (sourceCounts[source] ?? 0) + 1;
    };
    while (result.length < limit && usedIds.size < feed.length) {
        let added = false;
        for (const article of feed) {
            if (usedIds.has(article.id))
                continue;
            const category = article.category || 'General';
            const source = article.source || 'Unknown';
            const lastTwoCategories = result.slice(-2).map(item => item.category || 'General');
            const wouldMakeTripleCategory = lastTwoCategories.length === 2 &&
                lastTwoCategories.every(itemCategory => itemCategory === category);
            if (wouldMakeTripleCategory)
                continue;
            if ((categoryCounts[category] ?? 0) >= maxPerCategory)
                continue;
            if ((sourceCounts[source] ?? 0) >= maxPerSource)
                continue;
            pushArticle(article);
            added = true;
            break;
        }
        if (!added) {
            for (const article of feed) {
                if (usedIds.has(article.id))
                    continue;
                pushArticle(article);
                added = true;
                break;
            }
        }
        if (!added)
            break;
    }
    return result;
}
async function markArticlesSeen(userId, articles) {
    if (!articles.length)
        return;
    const values = articles.map((_, i) => `($1, $${i + 2})`).join(', ');
    const ids = articles.map(article => article.id);
    await db_1.db.query(`INSERT INTO user_seen (user_id, article_id)
     VALUES ${values}
     ON CONFLICT DO NOTHING`, [userId, ...ids]);
}
async function getUserProfile(userId) {
    const result = await db_1.db.query(`SELECT interests FROM user_profiles WHERE user_id = $1`, [userId]);
    return {
        interests: result.rows[0]?.interests ?? [],
    };
}
async function getUserLocation(userId) {
    const result = await db_1.db.query(`SELECT location FROM app_users WHERE id = $1 LIMIT 1`, [userId]);
    return result.rows[0]?.location ?? null;
}
async function getInteractionSignals(userId) {
    const result = await db_1.db.query(`
    SELECT a.category, a.source, e.event_type, e.dwell_time_ms, e.created_at
    FROM user_events e
    JOIN articles a ON a.id = e.content_id
    WHERE e.user_id = $1
      AND e.created_at > NOW() - INTERVAL '${INTERACTION_LOOKBACK_DAYS} days'
    `, [userId]);
    const categoryScores = {};
    const sourceScores = {};
    let totalEvents = 0;
    for (const row of result.rows) {
        const baseWeight = getEventWeight(row.event_type, row.dwell_time_ms);
        if (baseWeight === 0)
            continue;
        const ageHours = Math.max(0, (Date.now() - new Date(row.created_at).getTime()) / 3600000);
        const decay = Math.exp(-ageHours / 120);
        const weight = baseWeight * decay;
        if (row.category) {
            categoryScores[row.category] = (categoryScores[row.category] ?? 0) + weight;
        }
        if (row.source) {
            sourceScores[row.source] = (sourceScores[row.source] ?? 0) + weight * 0.7;
        }
        totalEvents++;
    }
    return {
        categoryScores,
        sourceScores,
        totalEvents,
    };
}
async function getTrendingScores(articleIds) {
    if (!articleIds.length)
        return {};
    const result = await db_1.db.query(`
    SELECT
      content_id,
      SUM(
        CASE
          WHEN event_type = 'share' THEN 3.0
          WHEN event_type = 'save' THEN 2.4
          WHEN event_type = 'open_detail' THEN 1.5
          WHEN event_type = 'swipe_right' THEN 1.2
          WHEN event_type = 'impression' AND dwell_time_ms >= 4000 THEN 0.5
          ELSE 0
        END
      ) AS weighted_score
    FROM user_events
    WHERE content_id = ANY($1)
      AND created_at > NOW() - INTERVAL '${TRENDING_LOOKBACK_HOURS} hours'
    GROUP BY content_id
    `, [articleIds]);
    const scores = {};
    let maxScore = 1;
    for (const row of result.rows) {
        const numericScore = parseFloat(row.weighted_score);
        scores[row.content_id] = numericScore;
        if (numericScore > maxScore) {
            maxScore = numericScore;
        }
    }
    for (const articleId of Object.keys(scores)) {
        scores[articleId] = scores[articleId] / maxScore;
    }
    return scores;
}
async function getRecentSeenCategoryCounts(userId) {
    const result = await db_1.db.query(`
    SELECT a.category, COUNT(*)::text AS count
    FROM user_seen us
    JOIN articles a ON a.id = us.article_id
    WHERE us.user_id = $1
      AND us.seen_at > NOW() - INTERVAL '${CATEGORY_FATIGUE_LOOKBACK_HOURS} hours'
    GROUP BY a.category
    `, [userId]);
    const counts = {};
    for (const row of result.rows) {
        if (!row.category)
            continue;
        counts[row.category] = parseInt(row.count, 10);
    }
    return counts;
}
async function resetSeenIfNeeded(userId) {
    const result = await db_1.db.query(`
    SELECT COUNT(*)::text AS count
    FROM articles a
    WHERE ${READY_ARTICLE_WHERE_WITH_ALIAS}
      AND a.id NOT IN (
        SELECT article_id FROM user_seen WHERE user_id = $1
      )
    `, [userId]);
    const unseenCount = parseInt(result.rows[0]?.count ?? '0', 10);
    if (unseenCount < 20) {
        await db_1.db.query(`
      DELETE FROM user_seen
      WHERE user_id = $1
        AND seen_at < NOW() - INTERVAL '3 days'
      `, [userId]);
    }
}
function computeAdaptiveScore(article, interests, interactionSignals, recentSeenCounts, trendingScores) {
    const category = article.category || 'General';
    const source = article.source || 'Unknown';
    const interactionDepth = Math.min(interactionSignals.totalEvents, 30);
    const categoryPreference = preferenceScore(interactionSignals.categoryScores[category] ?? 0);
    const sourcePreference = preferenceScore(interactionSignals.sourceScores[source] ?? 0);
    const freshness = recencyScore(article.published_at);
    const trending = trendingScores[article.id] ?? 0;
    const recentSeenCount = recentSeenCounts[category] ?? 0;
    const exploration = 1 / (1 + recentSeenCount);
    const interestWeight = interactionDepth < 6 ? 0.18 :
        interactionDepth < 14 ? 0.1 :
            0.04;
    const interestBoost = interests.has(category) ? 1 : 0;
    const fatiguePenalty = Math.min(0.18, Math.max(0, recentSeenCount - 1) * 0.04);
    return (freshness * 0.28 +
        categoryPreference * 0.31 +
        sourcePreference * 0.12 +
        trending * 0.15 +
        exploration * 0.1 +
        interestBoost * interestWeight -
        fatiguePenalty);
}
function finalizeFeed(scored, limit, recentSeenCounts, trendingScores) {
    const primaryPool = scored.slice(0, Math.max(limit * 4, 28));
    const trendingPool = scored
        .filter(article => (trendingScores[article.id] ?? 0) > 0)
        .sort((a, b) => (trendingScores[b.id] ?? 0) - (trendingScores[a.id] ?? 0))
        .slice(0, Math.max(3, Math.ceil(limit * 0.4)));
    const explorePool = [...scored]
        .sort((a, b) => {
        const aSeen = recentSeenCounts[a.category || 'General'] ?? 0;
        const bSeen = recentSeenCounts[b.category || 'General'] ?? 0;
        if (aSeen !== bSeen) {
            return aSeen - bSeen;
        }
        return (b.score ?? 0) - (a.score ?? 0);
    })
        .slice(0, Math.max(3, Math.ceil(limit * 0.4)));
    const merged = interleaveUnique([primaryPool, trendingPool, explorePool, scored]);
    const diversified = applyDiversity(merged, limit);
    if (diversified.length >= limit) {
        return diversified.slice(0, limit);
    }
    const usedIds = new Set(diversified.map(article => article.id));
    const filled = [...diversified];
    for (const article of scored) {
        if (filled.length >= limit)
            break;
        if (usedIds.has(article.id))
            continue;
        usedIds.add(article.id);
        filled.push(article);
    }
    return filled.slice(0, limit);
}
async function getNews(userId, page = 1, limit = 10, category, fresh = false) {
    const categoryOffset = category && category !== 'For You' ? (page - 1) * limit : 0;
    if (category && category !== 'For You') {
        const result = await db_1.db.query(`
      SELECT id, title, summary, image_url, url, source, published_at, category
      FROM articles
      WHERE category = $1
        AND ${READY_ARTICLE_WHERE}
      ORDER BY published_at DESC
      LIMIT $2 OFFSET $3
      `, [category, limit, categoryOffset]);
        return result.rows;
    }
    if (fresh) {
        const result = await db_1.db.query(`
      SELECT id, title, summary, image_url, url, source, published_at, category
      FROM articles
      WHERE ${READY_ARTICLE_WHERE}
        AND id NOT IN (
          SELECT article_id FROM user_seen WHERE user_id = $1
        )
      ORDER BY published_at DESC
      LIMIT $2
      `, [userId, limit * 2]);
        const freshFeed = applyDiversity(result.rows, limit);
        await markArticlesSeen(userId, freshFeed);
        return freshFeed;
    }
    await resetSeenIfNeeded(userId);
    const [profile, interactionSignals, recentSeenCounts] = await Promise.all([
        getUserProfile(userId),
        getInteractionSignals(userId),
        getRecentSeenCategoryCounts(userId),
    ]);
    const interests = new Set(profile.interests || []);
    const poolSize = candidatePoolSize(limit);
    const unseenCandidatesResult = await db_1.db.query(`
    SELECT id, title, summary, image_url, url, source, published_at, category, country
    FROM articles
    WHERE ${READY_ARTICLE_WHERE}
      AND id NOT IN (
        SELECT article_id FROM user_seen WHERE user_id = $1
      )
    ORDER BY published_at DESC
    LIMIT $2
    `, [userId, poolSize]);
    let candidates = unseenCandidatesResult.rows;
    if (!candidates.length) {
        const fallbackResult = await db_1.db.query(`
      SELECT id, title, summary, image_url, url, source, published_at, category, country
      FROM articles
      WHERE ${READY_ARTICLE_WHERE}
      ORDER BY published_at DESC
      LIMIT $1
      `, [poolSize]);
        candidates = fallbackResult.rows;
    }
    if (!candidates.length) {
        return [];
    }
    const trendingScores = await getTrendingScores(candidates.map(article => article.id));
    const scored = candidates
        .map(article => ({
        ...article,
        score: computeAdaptiveScore(article, interests, interactionSignals, recentSeenCounts, trendingScores),
    }))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const finalFeed = finalizeFeed(scored, limit, recentSeenCounts, trendingScores);
    await markArticlesSeen(userId, finalFeed);
    return finalFeed;
}
async function getRegionalNews(userId, limit = 10) {
    const userLocation = await getUserLocation(userId);
    const allowedRegions = userLocation
        ? (REGION_MAP[userLocation] ?? [userLocation])
        : ['USA', 'UK', 'Canada', 'Australia', 'EU'];
    const result = await db_1.db.query(`
    SELECT id, title, summary, image_url, url, source, published_at, category, country
    FROM articles
    WHERE country = ANY($1)
      AND ${READY_ARTICLE_WHERE}
    ORDER BY published_at DESC
    LIMIT $2
    `, [allowedRegions, limit * 2]);
    return applyDiversity(result.rows, limit);
}
