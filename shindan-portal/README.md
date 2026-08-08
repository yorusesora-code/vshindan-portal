# VTuber診断ポータル

VTuber・配信者・活動者向けの診断ポータルサイト。
「エンジン共通・データ分離」構成で、**JSONを1個追加すれば診断が1本増える**設計です。

## 構成

```
├─ index.html          ポータル(診断カード一覧)。data/list.json から自動生成
├─ quiz.html           診断エンジン(全診断共通)。?id=◯◯ でJSONを読み込んで動く
├─ data/
│   ├─ list.json       診断の目次(トップのカードはここから生成)
│   └─ vtuber-type.json 診断1本ぶんのデータ(質問・タイプ・判定ルール)
├─ functions/
│   └─ s/[[path]].js   共有URL(/s/診断ID/タイプID)用。結果ごとのOGPを出す
└─ ogp/
    ├─ site.png        サイト共通のOGP画像
    └─ vtuber-type.png 診断ごとのOGP画像(1200x630)
```

## 公開手順(初回のみ・約10分)

GitHub連携でのデプロイを推奨します(以後はpushするだけで自動反映)。

1. GitHubに新しいリポジトリを作成し、このフォルダの中身をすべてpushする
2. Cloudflareダッシュボード → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. リポジトリを選択。ビルド設定は以下の通り
   - Framework preset: **None**
   - Build command: (空欄)
   - Build output directory: **/** (ルート)
4. **Save and Deploy** → 1〜2分で `https://プロジェクト名.pages.dev` が発行される
5. 独自ドメインを使う場合は Pages の **Custom domains** から追加

※ ダッシュボードへのドラッグ&ドロップ(Direct Upload)でも公開できますが、
その場合 `functions/`(共有OGP機能)が動かないため、GitHub連携を推奨します。

## 診断を1本追加する手順(2ステップ)

1. `data/` に新しいJSONを作る(`vtuber-type.json` をコピーして中身を書き換えるのが早い)
2. `data/list.json` の `quizzes` 配列に1件追加する

```json
{
  "id": "新しい診断のID",
  "emoji": "🎮",
  "title": "診断タイトル",
  "description": "カードに表示される説明文",
  "questionsCount": 10,
  "minutes": 2
}
```

pushすれば自動でデプロイされ、トップにカードが1枚増えます。
OGP画像(`ogp/診断ID.png`、1200x630)も用意するとXでのシェア時にカードが出ます。

## 診断JSONの仕様(かんたん版)

- `axes` : レーダーチャートの軸名。数は自由(3〜8軸程度推奨)
- `questions[].axis` : その質問がどの軸に加点するか(axesのインデックス)
- `scoreMap` : 選択肢の並び順に対する点数(例: [4,3,2,1] は上の選択肢ほど高得点)
- `logic.rules` : 「1位の軸(first)と2位の軸(second)の組み合わせ→タイプID」の判定表。
  上から順に評価され、`second` を省略すると1位だけで判定
- `logic.spreadThreshold` : 最高点と最低点の差がこれ未満なら `spreadType`(バランス型)になる
- `types` : タイプID→結果の内容(name/label/desc/streamer/fan)

## 広告(AdSense)を入れるとき

`quiz.html` と `index.html` にタグを貼れば全ページに反映されます。
審査対策として、各診断の結果ページに解説テキストがある構成にしてあります。
