# 背景画像と領域背景の設計

## この文書の位置付け

この文書は進捗管理ではなく、Noctis Blue と `vscode-wallpaper` の責務分担、
背景の重複塗りを避けるための設計原則を記録する。

現在の確認状況、未確認項目、次の作業はここでは管理しない。

## 役割分担

### vscode-wallpaper

- 画面全体の背景画像を描画する。
- 代替画像と画面条件による切り替えを担当する。
- tint と画像の乗算を担当する。
- Noctis Blue を含む外部 CSS レイヤーの共通読み込み口を管理する。

### Noctis Blue

- 通常版と透過版の配色を管理する。
- editor / sidebar / panel / auxiliaryBar / chrome / gap の背景色と不透明度を管理する。
- Sticky Scroll や補完候補など、前面の文字を薄くせず背後だけをぼかす処理を管理する。
- 背景画像のパス、乗算、画像切り替えは管理しない。

## 領域の不透明度

`noctisBlue.opacity` は背景色の不透明度であり、文字や要素全体の不透明度ではない。

対象は次の6領域である。

- `editor`
- `sidebar`
- `panel`
- `auxiliaryBar`
- `chrome`
- `gap`

背景色は Noctis Blue の通常版テーマから取得し、利用者に同じ色を別設定として重複管理させない。

## 背景色は一度だけ描く

VS Code では、同じ見た目の領域でも外側と内側の複数要素が背景色を描くことがある。

半透明色を複数層に同時適用すると、指定した不透明度より濃く見える。
そのため Noctis Blue では次の原則を使う。

1. 領域の外側で背景色を一度だけ描く。
2. 同じ領域内で重複する下地だけを透明にする。
3. 文字、アイコン、選択行、ホバー、罫線など意味を持つ前景表現は維持する。

Source Control のコミットメッセージ欄のように、
外側と内部 Monaco Editor が同じ `input.background` を描く場所では、
外側を残して内側の重複背景だけを透明化する。

## 乗算と領域透過を分ける

背景画像の tint と乗算は wallpaper 側の処理である。

領域背景の半透明化は Noctis Blue 側の通常の重ね合わせであり、
画像と領域色を直接 multiply する処理ではない。

この2つを同じ設定や CSS として扱わない。

## 適用経路を一つにする

Noctis Blue 自身は `workbench.html` を変更しない。

自動適用では `vscode-wallpaper` の CSS レイヤー API を使い、
本体への読み込み処理は wallpaper 側だけが所有する。

Noctis Blue のレイヤーが `ownsSurfaces: true` の間は、
wallpaper 側が同じ editor / sidebar / panel などの不透明度を重ねて適用しない。

## テーマJSONだけでは完結しない理由

公式テーマ色では `#RRGGBBAA` のような半透明色を指定できるが、
同じ色を複数の DOM レイヤーが描く場合、そのままでは重複塗りを制御できない。

また、`gap` や `backdrop-filter` のようにテーマ色だけでは表現できない箇所もある。

そのため、

- 配色そのものはテーマ JSON
- 領域の一度塗りと内部下地の透明化、ぼかしは Noctis Blue の CSS
- 背景画像と乗算は vscode-wallpaper

という分担にする。

## 内蔵 Markdown Editor

内蔵 Markdown Editor は通常のワークベンチとは別 Webview である。

ワークベンチ用 CSS ローダーから Webview 内部の DOM へ直接 CSS を適用することはできない。
詳細は [markdown-editor.md](markdown-editor.md) を参照する。

## 実測の扱い

環境依存の表示問題は、Developer Tools の要素と Computed Style を使って確認する。

その結果から恒久的な設計ルールが得られた場合だけ、この文書へ設計判断として反映する。
単発の確認結果や作業途中の状態は、設計資料へ蓄積しない。
