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
// --- [API 2] サイトの新規作成・更新 (修正版) ---
app.post('/api/site', async (c) => {
  try {
    const body = await c.req.json()
    const { id, name, bio, color, links, webhook_url } = body

    // 1. IDの確定（送られてきたら更新、なければ新規生成）
    const siteId = id || `coco-${crypto.randomUUID().split('-')[0]}`

    // 2. sitesテーブルへの保存 (await を確実に)
    await c.env.DB.prepare(`
      INSERT OR REPLACE INTO sites (id, name, bio, color, webhook_url, created_at)
      VALUES (?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM sites WHERE id = ?), CURRENT_TIMESTAMP))
    `).bind(siteId, name, bio, color, webhook_url, siteId).run()

    // 3. linksテーブルの更新 (いったん削除して再登録)
    await c.env.DB.prepare('DELETE FROM links WHERE site_id = ?').bind(siteId).run()
    
    if (links && links.length > 0) {
      // 複数のリンクをまとめて保存（batchを使うとより「しっかり」します）
      const statements = links.map(link => 
        c.env.DB.prepare('INSERT INTO links (site_id, platform, url) VALUES (?, ?, ?)')
          .bind(siteId, link.platform, link.url)
      )
      await c.env.DB.batch(statements)
    }

    return c.json({ success: true, id: siteId })

  } catch (err) {
    console.error('Save Error:', err)
    return c.json({ error: 'Internal Server Error', message: err.message }, 500)
  }
})

// --- [API 3] いいね & Discord通知 (強化版) ---
app.post('/api/site/:id/like', async (c) => {
  const id = c.req.param('id')

  // 1. いいね数を増やす
  await c.env.DB.prepare('UPDATE sites SET likes = likes + 1 WHERE id = ?').bind(id).run()

  // 2. データを取得
  const site = await c.env.DB.prepare('SELECT name, webhook_url FROM sites WHERE id = ?').bind(id).first()
  
  // 3. Webhook送信
  if (site?.webhook_url && site.webhook_url.startsWith('https://discord.com')) {
    try {
      const response = await fetch(site.webhook_url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Cloudflare-Worker-Coco-Iro' // おまじない
        },
        body: JSON.stringify({
          content: `🌸 **${site.name}** さんに「いいね」が届きました！`
        })
      })
      console.log('Discord Status:', response.status) // コンソールで結果を確認できる
    } catch (e) {
      console.error('Webhook Fetch Error:', e)
    }
  }

  return c.json({ success: true })
})

export default app
