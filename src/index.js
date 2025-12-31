export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 【1】 フォーム送信 (POST) の処理
    if (request.method === "POST") {
      try {
        const formData = await request.formData();
        const name = formData.get("name") || "ななしさん";
        const bio = formData.get("bio") || "よろしくお願いします。";
        const id = "coco-" + Math.random().toString(36).slice(-6); // ランダムID生成

        // D1に保存
        await env.DB.prepare(
          "INSERT INTO sites (id, name, bio) VALUES (?, ?, ?)"
        ).bind(id, name, bio).run();

        // Discord Webhookへ通知 (環境変数 DISCORD_WEBHOOK_URL を使用)
        if (env.DISCORD_WEBHOOK_URL) {
          await fetch(env.DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `🌸 **ここいろ** 新着情報 🌸\n**${name}** さんが新しいページを作りました！\n「${bio}」\n🔗 https://coco-iro.rtneg.com/p/${id}`
            }),
          });
        }

        return new Response(`作成完了！あなたのURL: /p/${id}`, { status: 200 });
      } catch (err) {
        return new Response("保存に失敗しました: " + err.message, { status: 500 });
      }
    }

    // 【2】 ページ表示 (GET) の処理
    // とりあえず最新の1件を表示するモード
    try {
      const { results } = await env.DB.prepare(
        "SELECT * FROM sites ORDER BY created_at DESC LIMIT 1"
      ).all();

      const site = results[0] || { name: "ここいろ", bio: "まだページがありません。" };

      const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${site.name} | ここいろ</title>
    <style>
        body { background: #fff5f7; font-family: 'Helvetica Neue', Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; color: #555; }
        .card { background: white; padding: 2rem; border-radius: 20px; box-shadow: 0 10px 25px rgba(255, 182, 193, 0.3); text-align: center; max-width: 400px; width: 90%; border: 2px solid #ffdae0; }
        h1 { color: #ff8fa3; margin-bottom: 0.5rem; }
        p { line-height: 1.6; margin-bottom: 2rem; }
        .footer { font-size: 0.8rem; color: #ffb6c1; }
    </style>
</head>
<body>
    <div class="card">
        <h1>${site.name}</h1>
        <p>${site.bio}</p>
        <div class="footer">coco-iro.rtneg.com</div>
    </div>
</body>
</html>`;

      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });

    } catch (err) {
      return new Response("エラーが発生しました: " + err.message, { status: 500 });
    }
  },
};
