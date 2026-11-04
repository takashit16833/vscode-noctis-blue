# vscode-wallpaper 0.7.3 の仕様確認と Noctis Blue の透過設計

確認日: 2026-11-04

関連ソース:
- [vscode-wallpaper/wallpaper.js](https://github.com/takashit16833/vscode-wallpaper/blob/main/wallpaper.js)
- [vscode-wallpaper/package.json](https://github.com/takashit16833/vscode-wallpaper/blob/main/package.json)
- [vscode-wallpaper/auto-apply.js](https://github.com/takashit16833/vscode-wallpaper/blob/main/auto-apply.js)
- [vscode-wallpaper/AGENTS.md](https://github.com/takashit16833/vscode-wallpaper/blob/main/AGENTS.md)
- [dotfiles/.config/vscode/settings.json](https://github.com/takashit16833/dotfiles/blob/main/.config/vscode/settings.json)
- [VS Code テーマ色の公式仕様](https://code.visualstudio.com/api/references/theme-color)

## この文書の位置付け

既存拡張の機能を全部移植するための一覧ではない。Noctis Blue の外観設計に必要な **確認済みの仕様** と **未決定の実装方針** を分けて記録する。

## 現行 vscode-wallpaper の仕様（ソース確認済み）

### 壁紙

- 画面全体の `.monaco-workbench` へ一枚の背景画像を描画する。
- `image` は `https://`、ローカル絶対パス、`file://`、`~/`、作業フォルダー相対パスなどに対応する。
- `alternateImage` は `switchMode` の `orientation`・`aspect-ratio`・`width` で切り替える。
- `tint`（既定 `#FFFFFF`）と背景画像を `background-blend-mode: multiply, normal` で**乗算**する。白なら画像色を変えない。
- 壁紙の上に重ねる各領域の背景色は、乗算ではなく **不透明度を持つ通常の重ね合わせ**。画像と領域色の直接乗算ではない。
- `enabled=false` または `image` が未設定なら、`generateCss()` は空文字を返す。壁紙がないときは、旧拡張の領域別透過処理も出力しない。

### 領域の背景色・不透明度

`vscodeWallpaper.backgroundColors` は各領域について `theme` または `#RRGGBB` を許す。既定値はすべて `theme`。`vscodeWallpaper.opacity` は 0〜1 の数値。数値が表すのは**背景色の不透明度**であり、文字や要素全体の不透明度ではない。

| 領域 | 意味 | 旧拡張の既定不透明度 | 2026-11-04確認時のdotfiles設定 |
| --- | --- | ---: | ---: |
| `editor` | 中央の編集領域 | 0.70 | 0.91 |
| `sidebar` | Explorer・検索など | 0.85 | 0.93 |
| `panel` | ターミナル・問題一覧など | 0.85 | 0.94 |
| `auxiliaryBar` | チャットなどの補助サイドバー | 0.85 | 0.86 |
| `chrome` | タイトルバー・ステータスバー・アクティビティバー | 0.92 | 0.93 |
| `gap` | 浮動パネル間・外周の余白（通常配置では対象外） | 0 | 0.91 |

現行 `backgroundColors.panel` は `#0A1A36`、他の領域は概ね `theme`。したがって **旧 wallpaper のパネル色と Noctis Blue の `panel` 色 `#001E4A` は同一ではない**。新テーマでは旧ユーザー設定の背景色をコピーせず、パレットに基づく色を使う。

`chrome` の３箇所はそれぞれのテーマ色（titleBar / statusBar / activityBar）を参照している。単一の背景色を使っているわけではない。

旧拡張の生成CSSは領域ごとに `color-mix(in srgb, <色> <割合>%, transparent)` を使う。`theme` の場合は `--vscode-...-background` を参照する。

### 画面内部の例外処理

領域の背景だけを半透明にすると内部の不透明な要素が壁紙を隠すため、旧拡張では確認された要素だけ透明にしている。例:

- `.monaco-grid-view`、編集領域の `.content`・`.editor-container`・`.monaco-editor-background` など
- サイドバーの Pane / 見出し・Explorer のリスト背景、編集タブ帯
- ターミナルの内側の容器、パンくず、スクロールバーの下地
- Sticky Scroll の下地。背後の文字と重ならないよう必要な場合は `backdrop-filter: blur(...)`
- 補完候補と説明欄は独自の `suggestWidget.backgroundColor`（`theme` または色）、`opacity`（0〜1）、`blur`（0〜30px）を持つ。**候補文字や選択行全体を薄くするものではない**。
- `minimapOpacity` は Canvas 全体を薄くするため、縮小表示のコードも薄くなる。既定 `null` は変更しない。
- Overview Ruler は Canvas 描画のため、`editorOverviewRuler.background` を公式のテーマ色で透明にする方法を実測済み。
- ターミナル内側の透明化について、旧実装の記録では `terminal.integrated.enableImages=true` および `terminal.background='#00000000'` を併用した実機結果がある。テーマは利用者のこの設定を無断変更しない。
- 編集画面の選択・ホバー・罫線など意味のある強調は原則維持する。

上記はすべての VS Code 表示要素の透過を保証するものではない。とくに内蔵 Markdown Editor の編集対象ブロックは、通常のワークベンチとは別のWebview内の描画である。

### 適用の仕組み

- 一時適用: DevTools Console から、そのウィンドウのDOMへCSSを挿入する。VS Code本体ファイルを変えない。
- 自動適用: 利用者が明示的に許可した場合だけ `workbench.html` に読み込みスクリプトの参照を追加する。元HTMLをバックアップする。拡張機能のインストールだけでは本体を変更しない。
- 自動適用の設定変更ではCSSファイルが更新されるが、画面側の再読込は手動。VS Code本体の整合性警告や更新による失効の可能性がある。
- 設定はユーザー共通とプロジェクト別を使い分けられる。既存の初期化処理は本体変更と独立する。

## Noctis Blue の現在地（実機の観測）

- `Noctis Blue Transparent` は、`scripts/theme.js` で背景色に末尾 `00` を付けた **完全透明色** を20個生成する。その上に `noctisBlue.opacity` の６領域を個別に重ねる **一時CSS生成・手動適用機能** を追加した（0.2.0）。ただし設定の自動適用はまだ実装していない。
- 通常のエディタで `--vscode-editor-background`、`.part.editor`、`.monaco-editor-background` が透明と観測された。
- 内蔵 Markdown Editor のWebview内でも `html`、`body`、`#editor` が透明と観測された。
- しかしテーマだけでは背後の縞模様が見えず、旧 wallpaper の透明化CSSに相当する一時CSSを追加したら、**通常のエディタと内蔵Markdown Editorの両方に縞模様が表示された**。
- Markdown Editorの編集中ブロックの元の背景は `.md-block-active` と `--md-block-active-background` に由来することを実機のStylesで確認した。その後、元の色と強調表示を保ちながら背景と影を半透明にする一時CSSも実機で確認済み（常時適用は未実装）。

## 透過設計で避けるべき誤り

1. **「完全透明」と「背景色付きの半透明」を混同しない。** `#01011100` は濃紺を混ぜない。希望するのは各領域でNoctisの背景色を残した0〜1の不透明度設定である。
2. **単純なテーマ色のアルファ値変更だけで領域不透明度を保証しない。** 同じテーマ背景色を外側と内側の複数層が描画すると、色が重ね塗りされ、指定した不透明度と見た目が異なる。旧拡張は「領域に色を一度描く＋内側の下地を透明化」の考え方を採用した。
3. **既存の `vscodeWallpaper.opacity` と、新テーマの透過設定を二重に適用しない。** 透過版テーマの `--vscode-editor-background` が `alpha=0` なら、旧拡張の `color-mix(..., var(--vscode-editor-background), transparent)` は色を復元できない。単に現在のwallpaperを有効にしても期待する結果にはならない。
4. **乗算合成と背景色の不透明度を混同しない。** `tint` と画像の乗算はwallpaper側で維持し、各領域の色と不透明度はNoctis Blueに移すのが目標。
5. **CSS適用の仕組みを二重に本体へ追加しない。** 旧wallpaperにも自動適用のためのHTML変更機構がある。Noctisとwallpaperがそれぞれ同じファイルを変更する設計は避ける。
6. **テーマJSONに任意の「小数設定から色を動的生成する機能」があると仮定しない。** 公式の `workbench.colorCustomizations` では `#RRGGBBAA` を指定できるが、小数の領域設定から複数の背景レイヤーを制御するには別途処理が必要になる。

## 今後の実装要件

- Noctis Blueが配色を所有し、**領域別の不透明度（0〜1）** を設定できるようにする。`editor`、`sidebar`、`panel`、`auxiliaryBar`、`chrome`、`gap` を候補とし、`gap` は公式のテーマ色だけでは直接塗れないため別途扱う。
- 背景色を設定項目として重複させない。`palette/colors.json` から領域の色を決める。Chromeは三箇所それぞれのテーマ色を保つ。
- 同一領域の複数層による重複塗りを避け、文字・選択・ホバー表示を不用意に半透明にしない。
- 設定変更で各領域の不透明度が変わることを実機で確認する。たとえば `editor:0.5` のとき編集画面と Markdown Editor で同じ背景画像に対して意図した透過率になるか検証する。
- 配色が完成してから壁紙拡張を「画像・乗算・表示切替」に整理する。Noctisが使うCSS読み込み経路との責務分担も合わせて設計する。
- **現時点では、実機検証で成功した一時CSSを最終的な本体変更方式と同一視しない。** Apc採用や本体改変は別途、理由・影響・復元方法を確認してから判断する。

## 内蔵Markdown Editorの編集中ブロック（2026-11-04 追加調査）

- 実機の開発者ツールで `:where(.md-editor:not(.md-no-active-block-highlight)) .md-block-active` により背景が付くことを確認。`background` と `box-shadow` は両方とも `--md-block-active-background` を参照する。
- 利用者が開発者ツールで該当２宣言を無効化すると、編集中ブロックの不透明な背景が消えることを確認。
- **背景色は消さない。強調表示を維持する。** `markdown.editor.highlightActiveBlock=false` は強調表示を無効化してしまうため、この目的には採用しない。
- 付属のCSSは背景と周囲の影に `--md-block-active-background` を使っている。両者の色を残して透明度だけを変更するよう、`color-mix(in srgb, var(--md-block-active-background, #f8f8f8) 65%, transparent)` を適用する一時試験用のコードを用意した。
- `noctisBlue.markdownActiveBlockOpacity`（0〜1、既定0.65）で一時CSSを生成。コマンド `Noctis Blue: Show Markdown Active Block Test` からコードを表示できる。実行対象は通常のワークベンチではなく **Markdown EditorのWebview**。
- **確認済み:** 元の色と強調表示を残したまま、背景と影を半透明にできた。次の課題は、安全な常時適用方式の選定と、それを実機で検証することである。VS Code本体の改変やdotfiles変更は行っていない。
※ `noctisBlue.opacity` の設定項目と一時CSS生成は実装済み。`Noctis Blue: Show Combined Transparency Test` でワークベンチの縞模様・領域別不透明度・Markdown編集中ブロックをまとめて一時検証できる。設定の起動時自動反映、wallpaperとの自動連携、Markdown Editorへの常時適用は未実装である。
