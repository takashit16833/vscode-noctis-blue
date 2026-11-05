# 内蔵 Markdown Editor の CSS 自動適用設計

## 結論

VS Code の公開 API だけでは、別拡張から内蔵 Markdown Editor
（`vscode.markdown.editor`）の親 Webview へ任意 CSS を追加できない。

Noctis Blue では、公開テーマ色で表現できない要素に限り、
利用者が明示的に有効化した場合だけ組み込み Markdown 拡張の

```text
markdown-editor-out/editor.css
```

末尾へ Noctis Blue 管理ブロックを追記する。

`workbench.html`、Markdown Editor provider の JavaScript、
Webview HTML、組み込み拡張の package.json は変更しない。

## 根拠

VS Code の
`extensions/markdown-language-features/src/preview/markdownEditorProvider.ts`
では、`MarkdownEditorProvider` が `vscode.markdown.editor` を所有する。

`#getHtml()` は `markdown-editor-out/editor.css` を唯一の親 Webview
スタイルシートとして読み込む。

通常 Preview 用の

- `markdown.previewStyles`
- `markdown.previewScripts`
- `markdown.markdownItPlugins`

はこの親 Webview には適用されない。
`markdown.codeBlockEditorProviders` も fenced code block の子 editor 用であり、
親 DOM の `.md-heading` や `.md-code-block` は変更できない。

## 適用する CSS

実機で確認済みの DOM に対して次を適用する。

```css
.md-heading {
  color: #A6CAFF !important;
}

pre.md-code-block {
  border: none !important;
}

blockquote.md-blockquote {
  background: var(--vscode-textCodeBlock-background, #0A1A36) !important;
}

.md-document code:not(pre code) {
  color: var(--vscode-editor-foreground, #5EAFFF) !important;
  background: var(--vscode-textCodeBlock-background, #0A1A36) !important;
}

.md-document a {
  color: #316CBD !important;
  font-weight: 700 !important;
  text-decoration: underline !important;
  text-decoration-color: #316CBD !important;
}

.md-table tr:first-child > td {
  color: #316CBD !important;
  font-weight: 700 !important;
}

pre.md-code-block > code.language-text,
pre.md-code-block > code.language-plaintext {
  color: var(--vscode-editor-foreground, #5EAFFF) !important;
}

.md-table td {
  border-color: var(--vscode-widget-border, #153A75) !important;
}
```

見出し下線は Markdown Editor 標準の色・太さを維持する。

コードブロック背景は公開テーマ色 `textCodeBlock.background` で管理し、
Emacs 版の `org-block-bg` と同じ `#0A1A36` を使う。
インラインコードも同じテーマ色を参照するため、Transparent 版ではコードブロックと同じ半透明背景になる。
`text` / `plaintext` の fenced code は構文色を使わず、通常本文と同じ `editor.foreground` を使う。

引用は実機で `BLOCKQUOTE.md-block.md-blockquote` と確認済みである。
背景はコードブロックと同じ `textCodeBlock.background` に統一する。

通常リンクは実機でクラスなしの `A` 要素として確認済みであり、
Emacs版の `fg-muted = #316CBD`、太字、下線に揃える。

表は実機で先頭行の `TD` が見出し、通常セルも `TD` と確認済みである。
見出しは `#316CBD` + 太字、罫線は既存の太さ・線種を維持して `widget.border`（現在 `#153A75`）を使う。

編集中ブロックは `--md-block-active-background` の元色を保持し、
`noctisBlue.markdownActiveBlockOpacity` で背景と影のアルファ値だけを調整する。

## 安全策

`src/markdownEditorPatch.js` が変更を管理する。

- 対象パスは VS Code 組み込み `vscode.markdown-language-features` の
  `extensionUri` から解決する。固定パスを推測しない。
- 初回適用時に元 `editor.css` を
  `editor.css.noctis-blue.backup` へ完全保存する。
- Noctis Blue の CSS は開始・終了マーカーで囲んでファイル末尾へ追記する。
- 設定変更時は元CSSとバックアップが一致することを確認して管理ブロックだけ更新する。
- 解除時は元CSS部分がバックアップと一致することを確認して完全復元する。
- 管理マーカー破損、バックアップ欠落、管理外変更を検出した場合は安全側で中止する。
- VS Code 更新で `editor.css` 自体が新しい未加工ファイルへ置き換わった場合は、
  古いバックアップを破棄し、新しいファイルをバックアップして再適用する。

## 有効化と解除

有効化:

```text
Noctis Blue: Enable Markdown Editor Appearance
```

初回だけ、組み込み Markdown 拡張の CSS を変更することを説明する
モーダル確認を表示する。

解除:

```text
Noctis Blue: Disable Markdown Editor Appearance
```

管理ブロックを削除するのではなく、保存した元 `editor.css` を完全復元する。

有効状態は Noctis Blue の `globalState` に保存する。
Noctis Blue / Noctis Blue Transparent のときだけ管理 CSS を適用し、
他テーマでは一時的に元CSSへ戻す。Noctis Blue に戻すと再適用する。

## VS Code 更新

VS Code 更新で組み込み Markdown 拡張が更新されると、
`editor.css` も置き換わる可能性がある。

有効状態が保存されていれば次回起動時に新しい `editor.css` を検出し、
その新しいファイルを元として再適用する。

## アンインストール

Noctis Blue 自体が削除された後は管理コードを実行できない。
そのためアンインストール前に

```text
Noctis Blue: Disable Markdown Editor Appearance
```

を実行して元CSSへ戻す。

## 参照

- VS Code Markdown Extension API
  https://code.visualstudio.com/api/extension-guides/markdown-extension
- VS Code Custom Editor API
  https://code.visualstudio.com/api/extension-guides/custom-editors
- VS Code `MarkdownEditorProvider`
  https://github.com/microsoft/vscode/blob/main/extensions/markdown-language-features/src/preview/markdownEditorProvider.ts
