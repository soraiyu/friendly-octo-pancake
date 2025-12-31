export default {
      async fetch(request, env) {
          // テスト用にデータを1件入れる
              const id = "test-" + Date.now();
                  await env.DB.prepare(
                        "INSERT INTO sites (id, name, bio) VALUES (?, ?, ?)"
                            ).bind(id, "テストユーザー", "スマホからこんにちは！").run();

                                return new Response(`サイトを作成しました！ ID: ${id}`);
                                  },
                                  };