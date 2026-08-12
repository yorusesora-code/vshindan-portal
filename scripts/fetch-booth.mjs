// BOOTHショップの公開ページから商品一覧を取得し、data/goods.json を更新する。
// GitHub Actions(.github/workflows/update-booth.yml)から数時間おきに実行される。
//
// 取得方法: まず BOOTH に直接アクセス。403等で弾かれたら公開リーダー r.jina.ai 経由で再取得する。
// BOOTH は各商品を <li ... data-item="{HTMLエンティティ化JSON}"> に埋め込んでいるので、それを抽出する。
import { readFile, writeFile } from "node:fs/promises";

const shop = process.env.BOOTH_SHOP || "v-palette";
const target = `https://${shop}.booth.pm/`;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

async function getDirect() {
  const r = await fetch(target, {
    headers: {
      "user-agent": UA,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "ja,en;q=0.8",
    },
  });
  if (!r.ok) throw new Error("direct " + r.status);
  return r.text();
}

async function getViaJina() {
  const headers = { "x-return-format": "html", accept: "text/html" };
  if (process.env.JINA_KEY) headers.authorization = `Bearer ${process.env.JINA_KEY}`;
  const r = await fetch("https://r.jina.ai/" + target, { headers });
  if (!r.ok) throw new Error("jina " + r.status);
  return r.text();
}

const decode = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

function parse(html) {
  const seen = new Set();
  const items = [];
  const re = /data-item="([^"]*)"/g;
  let m;
  while ((m = re.exec(html))) {
    let o;
    try {
      o = JSON.parse(decode(m[1]));
    } catch {
      continue;
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
  return items;
}

let html, via;
try {
  html = await getDirect();
  via = "direct";
} catch (e1) {
  console.log(`direct fetch failed (${e1.message}); trying Jina Reader…`);
  html = await getViaJina();
  via = "jina";
}

const items = parse(html);
console.log(`fetched via ${via}; parsed ${items.length} item(s)`);

if (!items.length) {
  // 取得はできたが解析0件。BOOTH側のHTML変更の可能性。既存を上書きしない。
  console.log("No items parsed — keeping existing data/goods.json untouched.");
  process.exit(0);
}

const json = JSON.stringify({ items }, null, 2) + "\n";
let prev = "";
try {
  prev = await readFile("data/goods.json", "utf8");
} catch {}
if (prev.trim() === json.trim()) {
  console.log("data/goods.json is already up to date.");
} else {
  await writeFile("data/goods.json", json);
  console.log(`data/goods.json updated with ${items.length} item(s).`);
}
