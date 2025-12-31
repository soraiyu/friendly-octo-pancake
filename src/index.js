export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 【1】 フォーム送信 (POST) の処理
    if (request.method === "POST") {
      try {
        const formData = await request.formData();
        const name = formData.get("name") || "ななしさん";
        const bio = formData.get("bio") || "よろしくお願いします。";
        const id = "coco-" + Math.random().toString(36).slice(-6);

        // D1に保存
        await env.DB.prepare(
          "INSERT INTO sites (id, name, bio) VALUES (?, ?, ?)"
        ).bind(id, name, bio).run();

        // Discord Webhookへ通知
        if (env.DISCORD_WEBHOOK_URL) {
          await fetch(env.DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `🌸 **ここいろ** 新着情報 🌸\n**${name}** さんが新しいページを作りました！\n「${bio}」\n🔗 https://coco-iro.rtneg.com/p/${id}`
            }),
          });
        }

        // 送信後は成功メッセージを表示
        return new Response(`
          <html>
            <body style="background: #fff5f7; font-family: sans-serif; text-align: center; padding-top: 50px;">
              <h2 style="color: #ff8fa3;">作成完了！</h2>
              <p>Discordを確認してみてね！</p>
              <a href="${url.origin}" style="color: #ffb6c1;">戻る</a>
            </body>
          </html>
        `, { headers: { "Content-Type": "text/html; charset=utf-8" } });

      } catch (err) {
        return new Response("保存エラー: " + err.message, { status: 500 });
      }
    }

    // 【2】 簡易入力フォーム 兼 表示 (GET)
    const { results } = await env.DB.prepare(
      "SELECT * FROM sites ORDER BY created_at DESC LIMIT 1"
    ).all();
    const latest = results[0] || { name: "（まだありません）", bio: "-" };

    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ここいろ 疎通テスト</title>
    <style>
        body { background: #fff5f7; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 20px; color: #555; }
        .box { background: white; padding: 20px; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); width: 100%; max-width: 350px; margin-bottom: 20px; border: 1px solid #ffdae0; }
        h2 { color: #ff8fa3; font-size: 1.2rem; margin-top: 0; }
        input, textarea { width: 100%; padding: 10px; margin: 5px 0 15px 0; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; }
        button { background: #ff8fa3; color: white; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; width: 100%; font-weight: bold; }
        .latest { font-size: 0.9rem; color: #888; }
    </style>
</head>
<body>
    <div class="box">
        <h2>🌸 テスト送信</h2>
        <form method="POST">
            <label>なまえ</label>
            <input type="text" name="name" placeholder="例：ここちゃん" required>
            <label>ひとこと</label>
            <textarea name="bio" placeholder="例：スマホからテスト中！"></textarea>
            <button type="submit">送信してDiscordを鳴らす</button>
        </form>
    </div>

    <div class="box latest">
        <h2>最新の1件</h2>
        <strong>${latest.name}</strong><br>
        ${latest.bio}
    </div>
</body>
</html>`;

    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  },
};
