# Maintenance guidelines

## 役割分担

- Noctis Blue は配色・背景透過・ぼかしの正本。既存拡張の単純統合はしない。
- 背景画像、乗算、画像切り替えは `vscode-wallpaper` が担当する。
- `palette/colors.json` を配色の唯一の管理元とする。
- `themes/*.json` は生成物。変更後は `npm run build && npm test` を実行する。
- VS Code 標準のテーマ機能・公開 API を最優先する。Apc への依存や Noctis Blue 独自の `workbench.html` 改変は行わない。
- 本体改変が必要な表示は、既存の `vscode-wallpaper` 共通ローダーを一つだけ使用する。読み込み経路を二重化しない。

## 情報の置き場所

- `AGENTS.md` には長期的に維持する設計・実装ルールだけを書く。
- README には現在の利用方法と公開してよい機能説明だけを書く。
- 「今回どこまで確認したか」「未確認の箇所」「次に何をするか」など、一時的な進捗はこれらへ蓄積しない。
- 実機確認の結果が恒久的な設計判断につながる場合だけ、その判断と根拠を設計資料へ残す。
- 一時的な作業状況は、その作業の引き継ぎ情報で管理する。

## ワークベンチ自動適用

- v0.5.0 以降は `vscode-wallpaper` v0.8.0 以降の CSS レイヤー API を使う。
- Noctis Blue のレイヤー ID は `takashit16833.noctis-blue`。
- 自動レイヤーは `ownsSurfaces: true` として登録し、領域別背景色・透過・ぼかしを Noctis Blue が担当する。
- この間 `vscode-wallpaper` は背景画像・乗算・画像切り替えだけを生成する。
- 通常版 `Noctis Blue` でも空の `ownsSurfaces: true` レイヤーを維持し、wallpaper 側の領域透過が重複しないようにする。
- Noctis Blue 以外のテーマへ切り替えた場合は Noctis のレイヤーを削除し、領域の所有権を wallpaper 側へ戻す。
- 自動適用の有効状態は Noctis Blue 側の `globalState` に保存する。
- 設定・テーマ変更時は次回再読み込み用 CSS だけを更新する。タイマー監視・勝手な再読み込み・再読み込みを促す通知は追加しない。
- テーマ切り替え直後は現在の画面に旧 CSS が残り得るため、反映が必要な場合は利用者が `Developer: Reload Window` を実行する。

## 領域別透過

- `noctisBlue.opacity` は背景色の不透明度（0〜1）。対象は `editor` / `sidebar` / `panel` / `auxiliaryBar` / `chrome` / `gap`。
- 背景色は通常版テーマから取得し、背景色設定を重複させない。
- 文字・アイコン・選択範囲へ要素全体の `opacity` を指定しない。
- `src/appearance.js` は自動適用と手動診断の両方で使う CSS 生成元。領域の外側で一度だけ背景色を混合し、重複する内側の背景だけを透明化する。
- Source Control メッセージ欄は外側 `.scm-editor` の背景を残し、内部 Monaco の重複背景だけを透明化する。通常エディタや他の入力欄まで広げない。
- Sticky Scroll は `.sticky-widget:not(.peek)` に `backdrop-filter: blur(12px)` を適用し、固定コードの文字へ `opacity` を指定しない。
- 補完候補は `.suggest-widget` / `.suggest-details` に `backdrop-filter: blur(12px)` を適用し、一覧の重複下地だけを透明化する。文字・選択・ホバー・枠線は維持する。
- Modern UI、Chat、SCM などで表示上の問題が出た場合は、Computed Style で実際の背景レイヤーを確認してから修正する。推測で CSS を増やさない。

## 内蔵 Markdown Editor

- 対象は `vscode.markdown.editor`。通常の Markdown Preview や外部 Live Preview と混同しない。
- VS Code 本体では `MarkdownEditorProvider` が `CustomTextEditorProvider` として独立 Webview を生成する。
- `MarkdownEditorProvider.#getHtml()` は本体同梱の `markdown-editor-out/editor.css` だけを親 Webview のスタイルとして読み込む。
- `markdown.previewStyles` / `markdown.previewScripts` / `markdown.markdownItPlugins` は通常 Preview 用であり、`MarkdownEditorProvider` は参照しない。
- `markdown.codeBlockEditorProviders` は fenced code block の iframe 置換用で、親 Webview の CSS を変更できない。
- 別拡張から、組み込み Markdown Editor が所有する `WebviewPanel` を取得・書き換える公開 API はない。
- したがって、現行 VS Code の公開 API だけでは編集中ブロックの CSS 常時自動適用はできない。詳細は `docs/markdown-editor.md`。
- VS Code 本体または組み込み Markdown 拡張の改変、独自 Markdown Editor の再実装は行わない。公開 API が追加された場合に再検討する。
- `markdown.editor.highlightActiveBlock=false` で強調表示自体を消すのは要件違反。
- 編集中ブロックの元色は Webview 内部の `--md-block-active-background` を使う。固定色へ置換せず、背景と影の不透明度だけを変更する。
- `noctisBlue.markdownActiveBlockOpacity` と `src/markdownAppearance.js` は開発・診断用。正式な自動適用機能として扱わない。
- `Noctis Blue: Show Markdown Active Block Test` は Markdown Editor フレーム内でだけ実行する。

## 開発用診断

- `Noctis Blue: Show Combined Transparency Test`
- `Noctis Blue: Show Temporary Opacity Script`
- `Noctis Blue: Show Markdown Active Block Test`

上記は正式な適用経路ではなく、DOM/CSS の原因切り分け用として残す。
通常のワークベンチ表示は自動レイヤーを使って確認する。

## 実測ルール

- 環境依存の表示は推測で直さない。
- 問題箇所を Developer Tools の要素・Computed Style で特定してから CSS を変更する。
- 実測と予想が食い違った場合は実測を優先し、仮説を捨てる。
- 一度に複数の未確認修正を入れない。
- 既存の正常な表示を不要な CSS で壊さない。
- 実機でしか確認できない事実は、その作業の引き継ぎ情報に記録する。

## 参考資料

- `docs/wallpaper-spec.md`: 背景画像と領域背景の責務・重複塗りを避ける設計。
- `docs/markdown-editor.md`: 内蔵 Markdown Editor の自動 CSS 適用可否の設計調査。
- VS Code Markdown extension guide:
  https://code.visualstudio.com/api/extension-guides/markdown-extension
- VS Code Custom Editor API:
  https://code.visualstudio.com/api/extension-guides/custom-editors
- VS Code source `MarkdownEditorProvider`:
  https://github.com/microsoft/vscode/blob/main/extensions/markdown-language-features/src/preview/markdownEditorProvider.ts
