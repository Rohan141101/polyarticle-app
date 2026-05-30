import { db } from '../lib/db'

export async function addBookmark(userId: string, articleId: string): Promise<void> {
  await db.query(
    `INSERT INTO bookmarks (user_id, article_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, articleId]
  )
}

export async function removeBookmark(userId: string, articleId: string): Promise<void> {
  await db.query(
    `DELETE FROM bookmarks WHERE user_id = $1 AND article_id = $2`,
    [userId, articleId]
  )
}

export async function getBookmarks(userId: string) {
  const result = await db.query(
    `SELECT b.article_id, a.title, a.summary, a.image_url, a.url, a.source, a.published_at, a.category
     FROM bookmarks b
     JOIN articles a ON b.article_id = a.id
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC`,
    [userId]
  )
  return result.rows
}
