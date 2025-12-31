export default {
  async fetch(request, env) {
    // データベースから一番新しい1件を取得
    const { results } = await env.DB.prepare(
      "SELECT * FROM sites ORDER BY created_at DESC LIMIT 1"
    ).all();

    const site = results[0];

    if (!site) {
      return new Response("まだサイトがありません。");
    }

    // HTMLとして返却（ここでパステルカラーのデザインを当てる！）
    return new Response(`
      <html>
        <body style="background: #fff0f5; font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #ff69b4;">${site.name} のページ</h1>
          <p>${site.bio}</p>
          <div style="font-size: 0.8rem; color: #999;">ID: ${site.id}</div>
        </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  },
};
