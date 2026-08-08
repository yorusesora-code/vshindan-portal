# VTuber診断ポータル — プロジェクト引き継ぎ

## これは何か

VTuber・配信者・活動者向けの診断ポータルサイト。
- 本番URL: https://vshindan-portal.pages.dev/
- ホスティング: Cloudflare Pages(GitHubのmainブランチへのpushで自動デプロイ、反映まで1〜2分)
- リポジトリ: yorusesora-code/vshindan-portal
- ビルド工程なし(素のHTML/JS/JSON)。Framework preset: None

## 設計思想(最重要)

**「エンジン共通・データ分離」**。診断のロジックと見た目は quiz.html(1ファイル)に集約し、
診断ごとの内容はすべて data/*.json に持つ。
**新しい診断の追加 = JSONを1個作り、data/list.json に1件追記するだけ。**
エンジンのコードは診断追加のたびに触らない。

## ファイル構成

```
├─ index.html            ポータル(診断カード一覧)。data/list.json から動的生成
├─ quiz.html             診断エンジン(全診断共通)。?id=◯◯ で data/◯◯.json を読み込む
├─ data/
│   ├─ list.json         診断の目次。トップのカードはここから生成される
│   ├─ vtuber-type.json  診断1本目「あなたはどんなVTuber？診断」(18問・6軸・12タイプ)
│   └─ listener-type.json 診断2本目「あなたのリスナータイプ診断」(18問・6軸・12タイプ)
├─ functions/
│   └─ s/[[path]].js     Cloudflare Pages Function。/s/{診断ID}/{タイプID} で
│                        結果ごとのOGPメタ付きHTMLを返す(Xシェアカード用)。
│                        env.ASSETS で静的アセットのJSONを読む
└─ ogp/
    ├─ site.png          サイト共通OGP画像(1200x630)
    └─ {診断ID}.png      診断ごとのOGP画像(1200x630)。Xシェアカードに使われる
```

## 診断JSONのスキーマ

```jsonc
{
  "id": "診断ID(ファイル名と一致・半角英数ハイフン)",
  "emoji": "🎙️",
  "title": "診断タイトル",
  "shortTitle": "短縮タイトル",
  "description": "説明文(スタート画面とmeta descriptionに使用)",
  "hashtags": ["Xシェア時のハッシュタグ(#不要)"],
  "tipsTitle": "結果画面の补足欄の見出し(省略可。省略時は tipLabels を / で連結)",
  "tipLabels": ["補足1のラベル", "補足2のラベル"],  // 省略時 ["配信者として","推すなら"]
  "axes": ["レーダーチャートの軸名(3〜8軸)"],
  "scoreMap": [4, 3, 2, 1],  // 選択肢の並び順に対する得点
  "questions": [
    { "text": "質問文", "axis": 0, "opts": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"] }
  ],
  "logic": {
    "spreadThreshold": 15,     // 最高軸と最低軸の差がこれ未満なら spreadType になる
    "spreadType": "balanced型のタイプID",
    "rules": [
      // 上から順に評価。first=1位の軸index、second=2位の軸index(省略可)
      { "first": 0, "second": 5, "type": "タイプID" },
      { "first": 0, "type": "タイプID" }
    ],
    "default": "どのルールにも該当しない場合のタイプID"
  },
  "types": {
    "タイプID": {
      "name": "バッジ表示名",
      "label": "◯◯型リスナー等のフルネーム",
      "desc": "結果の説明文",
      "streamer": "補足1(tipLabels[0]に対応)",
      "fan": "補足2(tipLabels[1]に対応)"
    }
  }
}
```

## 診断を1本追加する手順

1. `data/{新ID}.json` を作成(既存JSONをコピーして書き換えるのが早い)
2. `data/list.json` の quizzes 配列に {id, emoji, title, description, questionsCount, minutes} を追記
3. `ogp/{新ID}.png` (1200x630) を作成。既存OGPと同じデザイントーン
   (背景#F5F2FF、白カード、紫#7F77DD/#3C3489、Noto Sans CJK Bold相当)
4. 追加後に必ず検証すること:
   - JSONが有効か
   - logic.rules で first=0〜軸数-1 のすべてがカバーされているか
   - 全タイプに到達可能か(到達不能タイプがないか)
   - 各質問の opts が scoreMap と同じ要素数か
5. mainにpush → 自動デプロイ。/quiz.html?id={新ID} で動作確認

## デザイントークン

- 背景 #F5F2FF / カード #FFFFFF / 文字 #2A2740 / サブ文字 #6B6685
- メイン紫 #7F77DD / 濃紫 #3C3489 / 薄紫 #EEEDFE / 罫線 #E4E0F5 / ピンク #F4A0C6
- フォント: M PLUS Rounded 1c (Google Fonts)
- レーダーチャート: Chart.js 4.4.1 (cdnjs)

## 注意事項

- quiz.html を変更すると全診断に影響する。変更時は既存2診断の動作確認をすること
- functions/ は Pages Functions。リポジトリルート直下にある必要がある
- 判定ロジックを変えるときは、既存診断の判定結果が変わらないことを確認する
- 結果シェアのURLは /s/{診断ID}/{タイプID} 形式。ここがXシェアカードのOGPを担う
- オーナーは非エンジニア。説明は平易に、Git操作はClaude Code側で完結させること

## 今後のロードマップ(オーナーの意向)

- 診断を定期的に追加していく(週1本ペースが理想)
- ある程度診断が溜まったらGoogle AdSenseを導入予定
  (審査対策として結果ページに解説テキストを持つ構成にしてある)
- BOOTHで販売中の配信者向け素材への導線を貼る構想もあり
- 独自ドメインは未取得(検討中)
