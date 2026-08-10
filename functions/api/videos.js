// /api/videos?list={再生リストID}
// YouTubeの再生リスト公式RSSをサーバー側で取得し、動画一覧JSONを返す。
// ブラウザから直接YouTubeは読めない(CORS)ため、このFunctionが橋渡しする。
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const list = url.searchParams.get("list");
  const json = (o, s = 200) =>
    new Response(JSON.stringify(o), {
      status: s,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=600", // 10分キャッシュ
        "access-control-allow-origin": "*",
      },
    });
  if (!list || !/^[\w-]+$/.test(list)) return json({ error: "bad list" }, 400);

  const res = await fetch(
    `https://www.youtube.com/feeds/videos.xml?playlist_id=${list}`,
    { cf: { cacheTtl: 600, cacheEverything: true } }
  );
  if (!res.ok) return json({ error: "upstream " + res.status }, 502);
  const xml = await res.text();

  const items = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map((m) => {
      const e = m[1];
      const id = (e.match(/<yt:videoId>([^<]+)/) || [])[1];
      const title = ((e.match(/<title>([^<]*)/) || [])[1] || "")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      const published = (e.match(/<published>([^<]+)/) || [])[1] || "";
      if (!id) return null;
      return {
        id, title,
        date: published.slice(0, 10).replace(/-/g, "."),
        url: `https://www.youtube.com/watch?v=${id}&list=${list}`,
        thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      };
    })
    .filter(Boolean);

  return json({ items });
}
