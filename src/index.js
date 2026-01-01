export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 【1】 個別プロフィールの表示モード
    if (path.startsWith("/p/")) {
      const id = path.split("/p/")[1];
      const site = await env.DB.prepare("SELECT * FROM sites WHERE id = ?").bind(id).first();

      if (!site) return new Response("ページが見つかりません", { status: 404 });

      // 背景色の設定
      const colors = {
        sakura: "#fff5f7", sora: "#e0f7fa", mint: "#f0fff4", lemon: "#fffde7", lavender: "#f3e5f5"
      };
      const themeColor = colors[site.color] || colors.sakura;

      return new Response(`
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${site.name} | ここいろ</title>
    <style>
        body { background: ${themeColor}; font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; color: #5d5d5d; }
        .card { background: white; padding: 40px 20px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); text-align: center; width: 85%; max-width: 350px; animation: fadeIn 0.5s; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        h1 { color: #5d5d5d; margin-bottom: 10px; font-size: 1.5rem; }
        .links { margin-top: 20px; display: flex; justify-content: center; gap: 15px; }
        .links a { text-decoration: none; font-size: 0.8rem; padding: 8px 15px; border-radius: 20px; border: 1px solid #ddd; color: #888; }
        .back { margin-top: 40px; font-size: 0.7rem; color: #ccc; }
    </style>
</head>
<body>
    <div class="card">
        <h1>${site.name}</h1>
        <p>${site.bio}</p>
        <div class="links">
            ${site.link_x ? `<a href="${site.link_x}" target="_blank">X</a>` : ''}
            ${site.link_instagram ? `<a href="${site.link_instagram}" target="_blank">Instagram</a>` : ''}
        </div>
        <div class="back"><a href="/" style="color:#ccc;">🌸 ここいろで作る</a></div>
    </div>
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    // 【2】 フォーム送信 (POST)
    if (request.method === "POST") {
      try {
        const formData = await request.formData();
        const id = "coco-" + Math.random().toString(36).slice(-6);
        const name = formData.get("name") || "ななしさん";
        const bio = formData.get("bio") || "";
        const color = formData.get("color") || "sakura";
        const link_x = formData.get("link_x") || "";
        const link_instagram = formData.get("link_instagram") || "";

        await env.DB.prepare(
          "INSERT INTO sites (id, name, bio, color, link_x, link_instagram) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(id, name, bio, color, link_x, link_instagram).run();

        return new Response(`<html><head><meta http-equiv="refresh" content="0;URL='/p/${id}'"></head></html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
      } catch (err) {
        return new Response("エラー: " + err.message, { status: 500 });
      }
    }

    // 【3】 トップページ
    const { results } = await env.DB.prepare("SELECT * FROM sites ORDER BY created_at DESC LIMIT 10").all();

    return new Response(`
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>COCO-IRO</title>
    <style>
        body { background: #fffafb; font-family: sans-serif; color: #5d5d5d; display: flex; flex-direction: column; align-items: center; padding: 20px; }
        .container { width: 100%; max-width: 400px; }
        .card { background: white; padding: 25px; border-radius: 24px; box-shadow: 0 10px 30px rgba(255, 182, 193, 0.2); border: 1px solid #ffdae0; }
        input, textarea, select { width: 100%; padding: 12px; border: 2px solid #f9f9f9; border-radius: 12px; box-sizing: border-box; margin: 8px 0; background: #f9f9f9; }
        .btn { background: #ffb6c1; color: white; border: none; padding: 15px; border-radius: 50px; width: 100%; font-weight: bold; margin-top: 10px; }
        .info { text-align: center; margin: 20px 0; font-size: 0.8rem; color: #aaa; line-height: 1.6; }
        .recent-item { background: white; padding: 12px; border-radius: 12px; margin-bottom: 8px; display: block; text-decoration: none; color: #888; font-size: 0.8rem; border: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <h2 style="text-align:center; color:#ffb6c1;">COCO-IRO</h2>
            <form method="POST">
                <input type="text" name="name" placeholder="おなまえ" required>
                <textarea name="bio" placeholder="ひとこと"></textarea>
                <select name="color">
                    <option value="sakura">Sakura (ピンク)</option>
                    <option value="sora">Sora (ブルー)</option>
                    <option value="mint">Mint (グリーン)</option>
                    <option value="lemon">Lemon (イエロー)</option>
                    <option value="lavender">Lavender (パープル)</option>
                </select>
                <input type="url" name="link_x" placeholder="X URL (任意)">
                <input type="url" name="link_instagram" placeholder="Instagram URL (任意)">
                <button type="submit" class="btn">ふわりと作る</button>
            </form>
        </div>
        <div class="info">
            <p>✨ ゲストページは2週間でふわりと消えます<br>ずっと残したい場所には、もうすぐ「星」を灯せるよ</p>
        </div>
        <div style="width:100%">${results.map(s => `<a href="/p/${s.id}" class="recent-item"><b>${s.name}</b>: ${s.bio.slice(0,15)}...</a>`).join('')}</div>
    </div>
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  },
};
