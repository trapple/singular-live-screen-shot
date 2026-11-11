# 開発

ビルドは不要。

```bash
git clone git@github.com:trapple/singular-live-screen-shot.git
```

クローンしたディレクトリをそのまま「パッケージ化されていない拡張機能を読み込む」で
選べば動く。コードを変更したら拡張機能ページで再読み込みし、SINGULAR LIVE のページも
リロードする。

## リリース

`manifest.json` の `version` を上げてからタグを push すると、GitHub Actions が
配布用 ZIP を作って Release に添付する。

```bash
git tag -a v0.2.0 -m "..."
git push origin v0.2.0
```

タグと `manifest.json` の `version` が食い違っているとワークフローが失敗する
(ユーザーの手元の拡張のバージョン表示と Release がずれると、更新すべきか判断できなく
なるため)。

ZIP をローカルで作るだけなら:

```bash
./scripts/build-zip.sh
```

## アイコン

`assets/icon.svg` が原本。PNG を作り直すには:

```bash
./scripts/build-icons.sh
```

macOS 標準の `qlmanage` (SVG のレンダリング) と `sips` (縮小) だけで完結する。
rsvg-convert や ImageMagick を入れる必要はない。

## テスト

```bash
node --test
```

DOM 操作・キー入力・ダウンロードは自動テストの費用対効果が低いため、純粋関数だけを
`node:test` で検証し、残りは手動確認で担保している。

## 構成

| パス | 責務 |
|---|---|
| `src/content/player.js` | サイト固有の DOM セレクタとタイトル整形。**構造が変わったらここだけ直す** |
| `src/content/capture.js` | canvas 撮影 → data URL |
| `src/content/stepper.js` | fps 実測、コマ送り、1 秒送り |
| `src/content/ui.js` | ボタンバーとトースト |
| `src/content/index.js` | キー待受と配線 |
| `src/background/index.js` | `chrome.downloads` での保存 |
| `src/shared/format.js` | タイムコード・ファイル名・fps・ホットキーの純粋関数 |
| `assets/icon.svg` | アイコンの原本。`scripts/build-icons.sh` で PNG を生成する |
| `docs/store-listing.md` | Chrome ウェブストアに申請するときの掲載情報の原稿 |
| `PRIVACY.md` | プライバシーポリシー。ストア申請で URL を求められる |

設計判断の記録は `docs/adr/` にある。

## 実装上の注意

- **ボタンバーはプレイヤールート (`.ulizahtml5`) の直下に置き、`z-index: 1000` を
  与えている。** Uliza のオーバーレイ (`.uliza-overlay-button-area` など) が
  `z-index: 5` でプレイヤー全面を覆っているため、その下に置くとクリックが吸われる。
  コントロールバー (`.vjs-control-bar`) の中に入れないのは、video.js の flex
  レイアウト (`order` 指定) に巻き込まれて既存ボタンの並びが崩れるため
- **ポインタ系イベントは `document` の capture フェーズで握り潰している。**
  動画領域のクリックは再生/一時停止に使われ、しかも `pointerdown` 段階で処理される
  ことがあるため、`click` だけを止めても間に合わない
- **プレイヤー要素の id は動的** (`UlizaPlayer-upc-content-<日時>-<ハッシュ>`) なので、
  セレクタは必ずクラスで書く
- content script は **isolated world** で動くため、DevTools の Console から `SLS` を
  直接叩くと `ReferenceError` になる。Console 上部の実行コンテキストを
  `Singular Live Screenshot` に切り替える必要がある
