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

        // 送信後の成功メッセージ画面も可愛く
        return new Response(`
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { background: #fffafb; font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; color: #5d5d5d; }
        .card { background: white; padding: 40px 20px; border-radius: 24px; box-shadow: 0 10px 30px rgba(255, 182, 193, 0.2); text-align: center; width: 90%; max-width: 350px; border: 1px solid #ffdae0; }
        h2 { color: #ffb6c1; margin-bottom: 10px; }
        a { color: #ffb6c1; text-decoration: none; font-weight: bold; border-bottom: 2px solid #ffdae0; }
    </style>
</head>
<body>
    <div class="card">
        <h2>🌸 作成完了！</h2>
        <p>Discordに通知が飛んだよ。<br>自分のページを確認してみてね。</p>
        <div style="margin-top: 20px;">
            <a href="${url.origin}">トップに戻る</a>
        </div>
    </div>
</body>
</html>
        `, { headers: { "Content-Type": "text/html; charset=utf-8" } });

      } catch (err) {
        return new Response("保存エラー: " + err.message, { status: 500 });
      }
    }

    // 【2】 入力フォーム 兼 最新表示 (GET)
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
    <title>COCO-IRO | わたしをいろどる</title>
    <style>
        :root {
            --primary: #ffb6c1;
            --bg: #fffafb;
            --text: #5d5d5d;
        }
        body {
            background-color: var(--bg);
            background-image: radial-gradient(#ffe4e1 1px, transparent 1px);
            background-size: 20px 20px;
            font-family: sans-serif;
            color: var(--text);
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        .container { width: 100%; max-width: 400px; animation: fadeIn 0.8s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .header { text-align: center; margin: 30px 0; }
        .header h1 { color: var(--primary); font-size: 1.8rem; letter-spacing: 2px; margin: 0; }
        .header p { font-size: 0.85rem; color: #aaa; margin: 5px 0 0; }
        .card {
            background: white;
            padding: 25px;
            border-radius: 24px;
            box-shadow: 0 10px 30px rgba(255, 182, 193, 0.2);
            border: 1px solid rgba(255, 182, 193, 0.3);
            margin-bottom: 20px;
        }
        .form-group { margin-bottom: 15px; }
        label { display: block; font-size: 0.8rem; font-weight: bold; margin-bottom: 5px; color: var(--primary); }
        input, textarea {
            width: 100%; padding: 12px; border: 2px solid #fcfcfc; border-radius: 12px;
            font-size: 1rem; box-sizing: border-box; background: #f9f9f9; transition: all 0.3s;
        }
        input:focus, textarea:focus { outline: none; border-color: var(--primary); background: white; }
        textarea { height: 80px; resize: none; }
        .btn {
            background: var(--primary); color: white; border: none; padding: 15px;
            border-radius: 50px; width: 100%; font-size: 1rem; font-weight: bold;
            cursor: pointer; margin-top: 10px; transition: 0.2s;
        }
        .btn:active { transform: scale(0.98); }
        .latest-box {
            background: rgba(255, 255, 255, 0.6);
            padding: 15px;
            border-radius: 15px;
            font-size: 0.85rem;
            border: 1px dashed var(--primary);
            text-align: center;
        }
        .footer { margin-top: auto; padding: 20px; font-size: 0.7rem; color: #ccc; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>COCO-IRO</h1>
            <p>名前と一言で、あなたの色を</p>
        </div>

        <div class="card">
            <form method="POST">
                <div class="form-group">
                    <label>おなまえ</label>
                    <input type="text" name="name" placeholder="ここちゃん" required>
                </div>
                <div class="form-group">
                    <label>ひとこと</label>
                    <textarea name="bio" placeholder="スマホからテスト中🌸"></textarea>
                </div>
                <button type="submit" class="btn">この色でつくる</button>
            </form>
        </div>

        <div class="latest-box">
            <span style="color: var(--primary); font-weight: bold;">Latest:</span> 
            ${latest.name} 「${latest.bio}」
        </div>
    </div>
    <div class="footer">© 2026 coco-iro / rtneg.com</div>
</body>
</html>`;

    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  },
};
