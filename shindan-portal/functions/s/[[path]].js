// /s/{診断ID}/{タイプID} への共有アクセスに、結果ごとのOGPメタ付きHTMLを返す。
// Xのクローラーにはカードを見せ、人間のアクセスは診断ページへ誘導する。
export async function onRequest(context) {
  const { request, env, params } = context;
  const parts = params.path || [];
  const [quizId, typeId] = parts;
  const origin = new URL(request.url).origin;

  const fallback = () => Response.redirect(origin + "/", 302);
  if (!quizId) return fallback();

  // 静的アセットから診断データを読む
  let quiz;
  try {
    const res = await env.ASSETS.fetch(new URL(`/data/${quizId}.json`, origin));
    if (!res.ok) return fallback();
    quiz = await res.json();
  } catch (e) {
    return fallback();
  }

  const type = typeId && quiz.types && quiz.types[typeId];
  const title = type
    ? `私は「${type.label}」でした！｜${quiz.title}`
    : quiz.title;
  const desc = type ? type.desc : quiz.description;
  const quizUrl = `${origin}/quiz.html?id=${encodeURIComponent(quizId)}`;
  const ogImage = `${origin}/ogp/${quizId}.png`;

  const esc = (s) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(origin)}/s/${esc(quizId)}/${esc(typeId || "")}">
<meta property="og:image" content="${esc(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${esc(quizUrl)}">
</head>
<body>
<p><a href="${esc(quizUrl)}">診断ページへ移動します…</a></p>
</body>
</html>`;

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
