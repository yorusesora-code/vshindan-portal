// /api/note?user={noteユーザー名}
// noteの公式RSSをサーバー側で取得し、記事一覧JSONを返す。
// 記事を投稿すると自動でHPに反映される(約10分キャッシュ)。
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const user = url.searchParams.get("user") || "yoruse_su";
  const json = (o, s = 200) =>
    new Response(JSON.stringify(o), {
      status: s,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=600",
        "access-control-allow-origin": "*",
      },
    });
  if (!/^[\w-]+$/.test(user)) return json({ error: "bad user" }, 400);

  const res = await fetch(`https://note.com/${user}/rss`, {
    cf: { cacheTtl: 600, cacheEverything: true },
  });
  if (!res.ok) return json({ error: "upstream " + res.status }, 502);
  const xml = await res.text();

  const unesc = (t) => (t || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map((m) => {
      const e = m[1];
      const title = unesc((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1]);
      const link = unesc((e.match(/<link>([\s\S]*?)<\/link>/) || [])[1]);
      const thumb = (e.match(/<media:thumbnail>([\s\S]*?)<\/media:thumbnail>/) || [])[1]
        || (e.match(/thumbnail[^>]*url="([^"]+)"/) || [])[1] || "";
      const pub = (e.match(/<pubDate>([^<]+)/) || [])[1] || "";
      const d = pub ? new Date(pub) : null;
      const date = d && !isNaN(d) ?
        `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}` : "";
      if (!title || !link) return null;
      return { title, url: link, thumb: unesc(thumb), date };
    })
    .filter(Boolean)
    .slice(0, 10);

  return json({ items });
}
