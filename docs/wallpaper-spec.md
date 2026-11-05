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
- editor / minimap / sidebar / panel / auxiliaryBar / chrome / gap の背景色と不透明度を管理する。
- 同じ領域の重複下地を透明化する。
- Sticky Scroll や補完候補など、前面の文字を薄くせず背後だけをぼかす。
- 背景画像のパス、乗算、画像切り替えは `src/workbench/wallpaper.js` に任せる。

## 領域の不透明度

`noctisBlue.opacity` は背景色の不透明度であり、文字や要素全体の不透明度ではない。

対象は次の7領域である。

- `editor`
- `minimap`
- `sidebar`
- `panel`
- `auxiliaryBar`
- `chrome`
- `gap`

背景色は Noctis Blue の通常版テーマから取得し、同じ色を利用者設定へ重複させない。

`minimap` はエディタ内部の独立した表示面であり、通常版の `minimap.background` を一度だけ背景として追加する。VS Code がミニマップの Canvas に使う透過版テーマ色は透明のままにして、Canvas 側と CSS 側で背景色を二重に描かない。ただしエディタ領域の背景の上に重なるため、最終的な不透明度は `minimap` の設定値より高くなる。

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

Noctis Blue が `workbench.html` の読み込み口を一元管理する。

`src/automaticAppearance.js` が背景画像 CSS と透過 CSS を組み立て、
`src/workbench/auto-apply.js` が安全検査した `workbench.html` に 1 つのローダーを配置する。
ローダーは画像 CSS を先に、透過 CSS を後に読み込む。

管理 CSS とローダーは現在 `noctis-blue-*.css` / `noctis-blue-layers-*.css` / `noctis-blue-loader.js` という名前で読み書きしている。これらは Noctis Blue が一元管理するファイルである。
VS Code 更新後に古いバックアップを整理するときは、管理 CSS に記録した元 HTML のハッシュ値との一致を確認する。証拠がないバックアップは自動削除しない。
複数ウィンドウ間ではインストール先のロックで書き換えを直列化する。解除中に HTML 復元後の後片付けで失敗した場合は、管理済みローダーなどの所有を再確認してから再試行する。

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
