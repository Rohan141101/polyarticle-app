import Parser from 'rss-parser'
import { httpClient } from '../utils/httpClient'
import { db } from '../lib/db'
import https from 'https'

const parser = new Parser({
  timeout: 15000,
  requestOptions: {
    agent: new https.Agent({ family: 4 }),
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
})

type FeedConfig = {
  url: string
  category: string
  country: string | null
  source?: string
}

const RSS_FEEDS: FeedConfig[] = [
  // 🌍 GENERAL
  { url: 'https://feeds.bbci.co.uk/news/rss.xml', category: 'General', country: 'UK' },
  { url: 'https://www.theguardian.com/world/rss', category: 'General', country: 'UK' },
  { url: 'https://feeds.reuters.com/reuters/worldNews', category: 'General', country: 'USA' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', category: 'General', country: 'USA' },
  { url: 'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en', category: 'General', country: null },
  { url: 'https://www.cbc.ca/cmlink/rss-topstories', category: 'General', country: 'Canada' },
  { url: 'https://www.abc.net.au/news/feed/51120/rss.xml', category: 'General', country: 'Australia' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'General', country: null },
  { url: 'https://www.npr.org/rss/rss.php?id=1001', category: 'General', country: 'USA' },

  // 🏛️ POLITICS
  { url: 'https://feeds.bbci.co.uk/news/politics/rss.xml', category: 'Politics', country: 'UK' },
  { url: 'https://www.politico.com/rss/politics08.xml', category: 'Politics', country: 'USA' },
  { url: 'https://apnews.com/hub/politics/rss', category: 'Politics', country: 'USA' },

  // 🧠 HEALTH
  { url: 'https://feeds.bbci.co.uk/news/health/rss.xml', category: 'Health', country: 'UK' },
  { url: 'https://www.medicalnewstoday.com/rss', category: 'Health', country: null },
  { url: 'https://www.webmd.com/rss/rss.aspx', category: 'Health', country: null },
  { url: 'https://www.sciencedaily.com/rss/health_medicine.xml', category: 'Health', country: null },
  { url: 'https://www.healthline.com/rss', category: 'Health', country: null },

  // 💻 TECHNOLOGY
  { url: 'https://techcrunch.com/feed/', category: 'Technology', country: null },
  { url: 'https://www.theverge.com/rss/index.xml', category: 'Technology', country: null },
  { url: 'https://www.engadget.com/rss.xml', category: 'Technology', country: null },
  { url: 'https://arstechnica.com/feed/', category: 'Technology', country: null },
  { url: 'https://www.wired.com/feed/rss', category: 'Technology', country: null },
  { url: 'https://thenextweb.com/feed/', category: 'Technology', country: null },

  // 💰 BUSINESS
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', category: 'Business', country: 'USA' },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', category: 'Business', country: 'USA' },

  // 📈 STOCKS
  { url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml', category: 'Stocks', country: 'USA' },
  { url: 'https://www.investing.com/rss/news_25.rss', category: 'Stocks', country: null },
  { url: 'https://seekingalpha.com/feed.xml', category: 'Stocks', country: 'USA' },

  // 🪙 CRYPTO
  { url: 'https://cointelegraph.com/rss', category: 'Crypto', country: null },
  { url: 'https://decrypt.co/feed', category: 'Crypto', country: null },
  { url: 'https://bitcoinmagazine.com/.rss/full/', category: 'Crypto', country: null },

  // 🏏 SPORTS
  { url: 'https://www.espn.com/espn/rss/news', category: 'Sports', country: null },
  { url: 'https://feeds.bbci.co.uk/sport/rss.xml', category: 'Sports', country: 'UK' },
  { url: 'https://sports.ndtv.com/rss', category: 'Sports', country: 'India' },
  { url: 'https://www.skysports.com/rss/12040', category: 'Sports', country: 'UK' },
  { url: 'https://www.goal.com/feeds/en/news', category: 'Sports', country: null },
  { url: 'https://www.si.com/rss/si_topstories.rss', category: 'Sports', country: null },
  { url: 'https://sports.yahoo.com/rss/', category: 'Sports', country: null },

  // 🎬 ENTERTAINMENT
  { url: 'https://www.tmz.com/rss.xml', category: 'Entertainment', country: 'USA' },
  { url: 'https://variety.com/feed/', category: 'Entertainment', country: 'USA' },
  { url: 'https://www.hollywoodreporter.com/feed/', category: 'Entertainment', country: 'USA' },
  { url: 'https://www.buzzfeed.com/entertainment.xml', category: 'Entertainment', country: 'USA' },
  { url: 'https://www.eonline.com/syndication/feeds/rssfeeds/topstories.xml', category: 'Entertainment', country: 'USA' },
  { url: 'https://www.rollingstone.com/music/music-news/feed/', category: 'Entertainment', country: 'USA' },
]

function cleanUrl(url?: string | null): string | null {
  if (!url) return null
  return url.replace(/&amp;/g, '&')
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function normalize(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
}

function extractImageFromItem(item: any): string | null {
  if (item.enclosure?.url) return cleanUrl(item.enclosure.url)
  if (item.mediaContent?.$?.url) return cleanUrl(item.mediaContent.$.url)
  if (item.mediaThumbnail?.$?.url) return cleanUrl(item.mediaThumbnail.$.url)

  const html = item.contentEncoded || item.content || item.description
  if (html) {
    const match = html.match(/<img[^>]+src="([^">]+)"/i)
    if (match) return cleanUrl(match[1])
  }

  return null
}

async function extractOGImage(url: string): Promise<string | null> {
  try {
    const res = await httpClient.get(url)
    const match = res.data.match(/<meta property="og:image" content="([^"]+)"/i)
    return match ? cleanUrl(match[1]) : null
  } catch {
    return null
  }
}

type ParsedArticle = {
  title: string
  summary: string
  image: string | null
  url: string
  category: string
  source: string
  publishedAt: Date
  country: string | null
}

async function processFeed(feedConfig: FeedConfig): Promise<ParsedArticle[]> {
  try {
    console.log(`➡️ Fetching: ${feedConfig.url}`)

    const res = await httpClient.get(feedConfig.url)
    const feed = await parser.parseString(res.data)

    console.log(`📦 Raw items: ${feed.items.length}`)

    const articles: ParsedArticle[] = []
    let ogCalls = 0

    for (const item of feed.items.slice(0, 100)) {
      if (!item.title || !item.link) continue
      if (item.title.length < 10) continue

      let image = extractImageFromItem(item)

      if (!image && ogCalls < 150) {
        image = await extractOGImage(item.link)
        ogCalls++
      }

      let summary = item.contentSnippet || item.content || ''
      summary = cleanText(summary).slice(0, 280)

      articles.push({
        title: item.title.trim(),
        summary,
        image,
        url: item.link,
        category: feedConfig.category,
        source: feed.title || 'RSS',
        publishedAt: new Date(),
        country: feedConfig.country,
      })
    }

    console.log(`✅ After filter: ${articles.length}`)
    return articles
  } catch (err) {
    console.error(`❌ Failed feed: ${feedConfig.url}`)
    return []
  }
}

async function batchInsert(articles: ParsedArticle[]) {
  console.log(`🧾 Attempting insert: ${articles.length}`)

  let insertedCount = 0

  for (const a of articles) {
    try {
      await db.query(
        `
        INSERT INTO articles (title, summary, image_url, url, category, source, published_at, country)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (url) DO NOTHING
        `,
        [
          a.title,
          a.summary,
          a.image,
          a.url,
          a.category,
          a.source,
          a.publishedAt.toISOString(),
          a.country,
        ]
      )
      insertedCount++
    } catch {}
  }

  console.log(`✅ Inserted: ${insertedCount}`)

  return { inserted: insertedCount, skipped: articles.length - insertedCount }
}

async function backfillMissingImages(articles: ParsedArticle[]): Promise<void> {
  const missing = articles.filter(a => !a.image).slice(0, 100)

  await Promise.allSettled(
    missing.map(async (article) => {
      const image = await extractOGImage(article.url)
      if (image) {
        await db.query(
          `UPDATE articles SET image_url = $1 WHERE url = $2 AND image_url IS NULL`,
          [image, article.url]
        )
      }
    })
  )
}

export async function ingestRSSFeeds() {
  console.log('🚀 RSS ingestion started')

  const allArticles: ParsedArticle[] = []
  const batchSize = 50

  for (let i = 0; i < RSS_FEEDS.length; i += batchSize) {
    const batch = RSS_FEEDS.slice(i, i + batchSize)

    const results = await Promise.allSettled(batch.map(processFeed))

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allArticles.push(...result.value)
      }
    }
  }

  console.log(`📊 Total fetched: ${allArticles.length}`)

  const seen = new Set<string>()
  const unique = allArticles.filter(a => {
    if (seen.has(a.url)) return false
    seen.add(a.url)
    return true
  })

  console.log(`🔍 After dedup: ${unique.length}`)

  const { inserted } = await batchInsert(unique)

  await backfillMissingImages(unique.filter(a => !a.image))

  console.log(`🎯 Final inserted: ${inserted}`)

  return { success: true, inserted }
}