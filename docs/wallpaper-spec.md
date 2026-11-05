# 背景画像と領域背景の設計

## 1つの拡張内での役割分担

### `src/workbench/wallpaper.js`

- 画面全体の背景画像を描画する。
- 代替画像と画面条件による切り替えを担当する。
- tint と背景画像の乗算を担当する。
- 共通 CSS 読み込みは `src/workbench/auto-apply.js` と `renderer-loader.js` が担当する。
- editor / sidebar / panel 等の領域背景やぼかしは管理しない。

### `src/appearance.js` と配色テーマ

- 通常版と透過版の配色を管理する。
- editor / sidebar / panel / auxiliaryBar / chrome / gap の背景色と不透明度を管理する。
- 同じ領域の重複下地を透明化する。
- Sticky Scroll や補完候補など、前面の文字を薄くせず背後だけをぼかす。
- 背景画像のパス、乗算、画像切り替えは `src/workbench/wallpaper.js` に任せる。

## 領域の不透明度

`noctisBlue.opacity` は背景色の不透明度であり、文字や要素全体の不透明度ではない。

対象は次の6領域である。

- `editor`
- `sidebar`
- `panel`
- `auxiliaryBar`
- `chrome`
- `gap`

背景色は Noctis Blue の通常版テーマから取得し、同じ色を利用者設定へ重複させない。

## 背景色は一度だけ描く

VS Code では、同じ見た目の領域でも外側と内側の複数要素が背景色を描くことがある。

半透明色を複数層へ同時適用すると、指定値より濃く見える。
そのため Noctis Blue は次の原則を使う。

1. 領域の外側で背景色を一度だけ描く。
2. 同じ領域内で重複する下地だけを透明にする。
3. 文字、アイコン、選択行、ホバー、罫線など意味を持つ前景表現は維持する。

Source Control のコミットメッセージ欄のように、
外側と内部 Monaco Editor が同じ `input.background` を描く場所では、
外側を残して内側の重複背景だけを透明化する。

## 乗算と領域透過を分ける

背景画像の tint と乗算は `src/workbench/wallpaper.js` の処理である。

領域背景の半透明化は Noctis Blue 側の通常の重ね合わせであり、
画像と領域色を直接 multiply する処理ではない。

この2つを同じ設定や CSS として扱わない。

## 適用経路を一つにする

Noctis Blue だけが `workbench.html` の読み込み口を管理する。外部の Wallpaper 拡張には依存しない。

`src/automaticAppearance.js` が背景画像 CSS と透過 CSS を組み立て、
`src/workbench/auto-apply.js` が安全検査した `workbench.html` に 1 つのローダーを配置する。
ローダーは画像 CSS を先に、透過 CSS を後に読み込む。

旧 `vscode-wallpaper` の管理済み HTML / CSS / ローダー名は移行の互換性のため維持する。
旧拡張と新拡張が同時に書き換えることは禁止し、旧拡張が残っていたら動作を止める。

リモート接続中も壁紙の処理はローカル UI host で実行する。
リモート内蔵 Markdown Editor は `workspace.fs` による個別の経路を使う。

## テーマJSONだけでは完結しない理由

公式テーマ色では `#RRGGBBAA` のような半透明色を指定できるが、
同じ色を複数の DOM レイヤーが描く場合、そのままでは重複塗りを制御できない。

また、`gap` や `backdrop-filter` のようにテーマ色だけでは表現できない箇所もある。

そのため、

- 配色そのものはテーマ JSON
- 領域の一度塗り、内部下地の透明化、ぼかしは Noctis Blue の CSS
- 背景画像と乗算は `src/workbench/wallpaper.js`

という分担にする。

## 内蔵 Markdown Editor

内蔵 Markdown Editor は通常のワークベンチとは別 Webview である。

ワークベンチ用 CSS ローダーから Webview 内部の DOM へ直接 CSS を適用することはできない。
詳細は [markdown-editor.md](markdown-editor.md) を参照する。

## 実測の扱い

環境依存の表示問題は Developer Tools の要素と Computed Style を使って確認する。

恒久的な設計ルールが得られた場合だけこの文書へ反映し、
単発の確認結果や作業途中の状態は蓄積しない。
