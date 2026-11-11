# 0002. 追加ボタンをコントロールバーの中に入れず、プレイヤールート直下に絶対配置する

- Status: Accepted
- Date: 2026-11-11

## Context

一時停止中にコマ送り・1 秒送り・撮影のボタンを表示したい。SINGULAR LIVE のプレイヤーは
video.js ベース (Uliza Player) で、下部に `.vjs-control-bar` があり、その中に
`.vjs-play-control` や音量ボタンが 48x48 で横並びになっている。既存ボタンと同じ列に
並べれば見た目は最も自然になる。

一方、実地調査で以下が分かっている。

- `.uliza-overlay-button-area` などのオーバーレイが `z-index: 5` でプレイヤー全面を
  覆っている
- プレイヤールート `.ulizahtml5` は `position: relative` を持ち、フルスクリーンの
  対象要素でもある
- `.vjs-control-bar` は flex コンテナで、子要素は `order` で並び順が決まっている
  (シークバーが `order: 3`、ボタン群が `order: 1`)

移植元の z-an 版では、既存 UI の中に入れたせいでクリックが上位レイヤーに吸われ、
ボタンを押しても再生が再開されるだけという不具合を踏んでいる。

## Decision

ボタンバーは `.ulizahtml5` の直下に `position: absolute` で置き、コントロールバーの
すぐ上 (`bottom: 64px`) に表示する。`z-index: 1000` を与えてオーバーレイより前面に出す。
`.vjs-control-bar` の中には入れない。

ポインタ系イベント (`pointerdown` / `mousedown` / `pointerup` / `mouseup` / `click` /
`dblclick`) は `document` の capture フェーズで捕まえ、バーの外へ漏らさない。

## Considered Options

- **プレイヤールート直下に絶対配置 (採用)** — video.js のレイアウトに干渉しない。
  `.ulizahtml5` が `position: relative` かつフルスクリーン対象なので、絶対配置の基準
  としてもフルスクリーン対応としても都合がよい。短所は、既存ボタンと別の塊に見えること
- **`.vjs-control-bar` に append** — 既存ボタンと一体に見える。短所は、flex の
  `order` 指定に巻き込まれて並び順が崩れること、コントロールバーがマウス非アクティブで
  消えるため表示制御が video.js 側の状態に従属すること、そして既存 UI の内部に
  手を入れる形になり、プレイヤー更新で壊れやすいこと

## Consequences

- コントロールバーが自動的に隠れている間も、一時停止中であればバーは表示され続ける。
  表示条件が `video.paused` と設定値だけで決まり、プレイヤーの内部状態に依存しない
- `bottom: 64px` はコントロールバーの高さ 48px を前提にした固定値。プレイヤーの
  スキン変更でバーの高さが変わると重なる可能性がある。その場合は
  `.vjs-control-bar` の実寸から算出する方式に変える
- 既存 DOM への操作が append だけで済み、属性・スタイル・クラスを一切書き換えない
