import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// 1. 誰からのアクセスも受け入れる設定（Forkサイト対応）
app.use('*', cors())

// --- [API 1] サイト情報の取得 ---
app.get('/api/site/:id', async (c) => {
  const id = c.req.param('id')
  
  // sitesテーブルから取得
  const site = await c.env.DB.prepare(
    'SELECT * FROM sites WHERE id = ?'
  ).bind(id).first()

  if (!site) return c.json({ error: 'Not Found' }, 404)

  // 14日経過チェック（儚さのロジック）
  const createdAt = new Date(site.created_at).getTime()
  const now = new Date().getTime()
  if (!site.owner_id && (now - createdAt) > 14 * 24 * 60 * 60 * 1000) {
    return c.json({ error: 'Expired', message: 'このページはお星様になりました' }, 410)
  }

  // linksテーブルから取得
  const { results: links } = await c.env.DB.prepare(
    'SELECT platform, url FROM links WHERE site_id = ?'
  ).bind(id).all()

  return c.json({ ...site, links })
})

// --- [API 2] サイトの新規作成・更新 ---
app.post('/api/site', async (c) => {
  const body = await c.req.json()
  const { id, name, bio, color, links, webhook_url } = body

  // トランザクション的に処理（まずsite、次にlinks）
  // ※実際はD1のbatchを使うのが「しっかり」した作りです
  const siteId = id || `coco-${crypto.randomUUID().split('-')[0]}`

  await c.env.DB.prepare(`
    INSERT OR REPLACE INTO sites (id, name, bio, color, webhook_url)
    VALUES (?, ?, ?, ?, ?)
  `).bind(siteId, name, bio, color, webhook_url).run()

  // linksはいったん消して再登録（更新を簡単にするため）
  await c.env.DB.prepare('DELETE FROM links WHERE site_id = ?').bind(siteId).run()
  for (const link of links) {
    await c.env.DB.prepare('INSERT INTO links (site_id, platform, url) VALUES (?, ?, ?)')
      .bind(siteId, link.platform, link.url).run()
  }

  return c.json({ success: true, id: siteId })
})

// --- [API 3] いいね & Discord通知 ---
app.post('/api/site/:id/like', async (c) => {
  const id = c.req.param('id')

  // 1. いいね数を増やす
  await c.env.DB.prepare('UPDATE sites SET likes = likes + 1 WHERE id = ?').bind(id).run()

  // 2. Webhookを取得してDiscordへ飛ばす
  const site = await c.env.DB.prepare('SELECT name, webhook_url FROM sites WHERE id = ?').bind(id).first()
  
  if (site?.webhook_url) {
    await fetch(site.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `🌸 **${site.name}** さんに「いいね」が届きました！`
      })
    })
  }

  return c.json({ success: true })
})

export default app
