export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 【1】 個別プロフィールの表示モード (/p/coco-xxxxxx)
    if (path.startsWith("/p/")) {
      const id = path.split("/p/")[1];
      const site = await env.DB.prepare("SELECT * FROM sites WHERE id = ?").bind(id).first();

      if (!site) {
        return new Response("ページが見つかりません", { status: 404 });
      }

      return new Response(`
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${site.name} | ここいろ</title>
    <style>
        body { background: #fffafb; font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; color: #5d5d5d; }
        .card { background: white; padding: 40px 20px; border-radius: 24px; box-shadow: 0 10px 30px rgba(255, 182, 193, 0.2); text-align: center; width: 85%; max-width: 350px; border: 1px solid #ffdae0; animation: fadeIn 0.5s; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        h1 { color: #ffb6c1; margin-bottom: 10px; font-size: 1.5rem; }
        p { line-height: 1.6; white-space: pre-wrap; }
        .back { margin-top: 30px; font-size: 0.8rem; }
        a { color: #ffb6c1; text-decoration: none; }
    </style>
</head>
<body>
    <div class="card">
        <h1>${site.name}</h1>
        <p>${site.bio}</p>
        <div class="back"><a href="/">🌸 わたしも「ここいろ」を作る</a></div>
    </div>
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    // 【2】 フォーム送信 (POST) の処理
    if (request.method === "POST") {
      try {
        const formData = await request.formData();
        const name = formData.get("name") || "ななしさん";
        const bio = formData.get("bio") || "よろしくお願いします。";
        const id = "coco-" + Math.random().toString(36).slice(-6);

        await env.DB.prepare("INSERT INTO sites (id, name, bio) VALUES (?, ?, ?)").bind(id, name, bio).run();

        if (env.DISCORD_WEBHOOK_URL) {
          await fetch(env.DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `🌸 **ここいろ** 新着！\n**${name}** さんのページができました！\n🔗 ${url.origin}/p/${id}`
            }),
          });
        }

        return new Response(`<html><head><meta http-equiv="refresh" content="0;URL='/p/${id}'"></head></html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
      } catch (err) {
        return new Response("エラー: " + err.message, { status: 500 });
      }
    }

    // 【3】 トップページ (GET) - 最近の10件リスト付き
    const { results } = await env.DB.prepare("SELECT * FROM sites ORDER BY created_at DESC LIMIT 10").all();

    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>COCO-IRO</title>
    <style>
        body { background: #fffafb; font-family: sans-serif; color: #5d5d5d; display: flex; flex-direction: column; align-items: center; padding: 20px; }
        .container { width: 100%; max-width: 400px; }
        .header { text-align: center; margin: 20px 0; }
        h1 { color: #ffb6c1; letter-spacing: 2px; }
        .card { background: white; padding: 25px; border-radius: 24px; box-shadow: 0 10px 30px rgba(255, 182, 193, 0.2); margin-bottom: 30px; border: 1px solid #ffdae0; }
        input, textarea { width: 100%; padding: 12px; border: 2px solid #f9f9f9; border-radius: 12px; box-sizing: border-box; margin: 10px 0; background: #f9f9f9; }
        .btn { background: #ffb6c1; color: white; border: none; padding: 15px; border-radius: 50px; width: 100%; font-weight: bold; cursor: pointer; }
        .recent-list { width: 100%; }
        .recent-item { background: rgba(255,255,255,0.7); padding: 12px; border-radius: 12px; margin-bottom: 10px; border: 1px dashed #ffdae0; font-size: 0.85rem; display: block; text-decoration: none; color: inherit; }
        .recent-item b { color: #ffb6c1; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>COCO-IRO</h1><p>わたしをいろどる、インスタントサイト</p></div>
        <div class="card">
            <form method="POST">
                <input type="text" name="name" placeholder="おなまえ" required maxlength="20">
                <textarea name="bio" placeholder="ひとこと" maxlength="100"></textarea>
                <button type="submit" class="btn">この色でつくる</button>
            </form>
        </div>
<div style="text-align: center; margin: 20px 0; font-size: 0.85rem; line-height: 1.6;">
    <p style="color: #ffb6c1; font-weight: bold; margin-bottom: 5px;">
        ✨ ゲストページは2週間でふわりと消えます
    </p>
    <p style="color: #aaa; font-size: 0.75rem; margin: 0;">
        今のきもちを、気軽にいろどって。<br>
        ずっと残したいときは、もうすぐ登場する「星の認証」を待っててね。
    </p>
</div>
        <div class="recent-list">
            <p style="font-size: 0.8rem; color: #aaa; text-align: center;">最近できたページ</p>
            ${results.map(site => `
                <a href="/p/${site.id}" class="recent-item">
                    <b>${site.name}</b>: ${site.bio.substring(0, 20)}${site.bio.length > 20 ? '...' : ''}
                </a>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  },
};
