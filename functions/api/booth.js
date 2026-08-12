// /api/booth?shop={ショップのサブドメイン}
// BOOTHショップの公開ページをサーバー側で取得し、商品一覧JSONに変換する。
// BOOTHは各商品を <li ... data-item="{HTMLエンティティ化されたJSON}"> に埋め込んでいるので、
// それをデコードして {url, img, name, price} に整形する。
// 商品を出品・削除・並べ替えすると、約10分以内にHPへ自動反映される(10分キャッシュ)。
// ブラウザから直接BOOTHは読めない(CORS)ため、このFunctionが橋渡しする。
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const shop = url.searchParams.get("shop") || "v-palette";
  const json = (o, s = 200) =>
    new Response(JSON.stringify(o), {
      status: s,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=600", // 10分キャッシュ
        "access-control-allow-origin": "*",
      },
    });
  if (!/^[\w-]+$/.test(shop)) return json({ error: "bad shop" }, 400);

  const res = await fetch(`https://${shop}.booth.pm/`, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "accept-language": "ja,en-US;q=0.9,en;q=0.8",
      referer: "https://booth.pm/",
      "sec-ch-ua": '"Chromium";v="125", "Not.A/Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      cookie: "adult=t",
    },
    cf: { cacheTtl: 600, cacheEverything: true },
  });
  if (!res.ok) return json({ error: "upstream " + res.status }, 502);
  const html = await res.text();

  // HTMLエンティティを戻す。&amp; を最後に戻すのが肝(二重デコード防止)。
  const decode = (s) =>
    s
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");

  const seen = new Set();
  const items = [];
  const re = /data-item="([^"]*)"/g;
  let m;
  while ((m = re.exec(html))) {
    let o;
    try {
      o = JSON.parse(decode(m[1]));
    } catch (e) {
      continue; // 商品カード以外の data-item は無視
    }
    if (!o || !o.id || seen.has(o.id)) continue;
    if (o.is_end_of_sale || o.is_sold_out || o.is_placeholder) continue;
    seen.add(o.id);

    const name = String(o.name || "").trim();
    let price = String(o.price || "").replace(/\s+/g, "").replace(/~/g, "〜");
    if (/無料/.test(name)) price += " <small>無料版あり</small>";

    items.push({
      url: `https://${shop}.booth.pm/items/${o.id}`,
      img: (o.thumbnail_image_urls && o.thumbnail_image_urls[0]) || "",
      name,
      price,
    });
  }

  return json({ items });
}
