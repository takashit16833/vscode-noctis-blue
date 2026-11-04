# 内蔵 Markdown Editor の CSS 自動適用設計

## 結論

現行 VS Code の公開 API だけを使って、別拡張から内蔵 Markdown Editor
（`vscode.markdown.editor`）の親 Webview へ任意 CSS を追加する方法はない。

Noctis Blue では、VS Code 本体や組み込み Markdown 拡張を改変せず、
編集中ブロックの不透明度変更は開発・診断用の手動 CSS に留める。

## 対象の仕組み

VS Code 本体の
`extensions/markdown-language-features/src/preview/markdownEditorProvider.ts`
では、`MarkdownEditorProvider` が `vscode.CustomTextEditorProvider` として
`vscode.markdown.editor` を登録している。

`#configureWebview()` は組み込み拡張自身が受け取った `Webview` を設定し、
`#getHtml()` が生成した HTML を代入する。

`#getHtml()` が親 Webview に読み込むスタイルは、組み込み拡張自身の

```text
markdown-editor-out/editor.css
```

だけである。

CSP の `style-src` 自体は Webview 内のスタイルを許可しているが、
別拡張へその Webview オブジェクトを渡す公開経路がないため、
CSP が許可していることと「外部拡張が CSS を注入できること」は別問題である。

## Preview 用の拡張点は届かない

VS Code の公開 Markdown 拡張機構には次がある。

- `markdown.previewStyles`
- `markdown.previewScripts`
- `markdown.markdownItPlugins`
- `markdown.codeBlockEditorProviders`

前3つは通常の Markdown Preview 用である。
`MarkdownEditorProvider` の実装には `previewStyles` / `previewScripts` /
`markdownItPlugins` の参照がない。

そのため、通常 Preview へ CSS を追加できても、
同じ CSS が `vscode.markdown.editor` の親 Webview へ入るわけではない。

## codeBlockEditorProviders では代用できない

`markdown.codeBlockEditorProviders` は内蔵 Markdown Editor 内の fenced code block を
個別の iframe エディタへ置き換えるための拡張点である。

これはコードブロック単位の子 iframe を提供する機能であり、

- Markdown Editor 全体の親 DOM
- `.md-editor`
- `.md-block-active`
- `--md-block-active-background`

を変更するための仕組みではない。

## 他拡張から WebviewPanel を取得できない

Custom Editor API では、`WebviewPanel` はその custom editor provider の
`resolveCustomTextEditor()` に渡される。

Noctis Blue は `vscode.markdown.editor` の provider ではないため、
組み込み Markdown Editor が所有する `WebviewPanel` を受け取らない。
既存の他拡張所有 Webview を列挙して HTML/CSS を変更する公開 API もない。

## テーマ色でできること

VS Code のテーマ変数は Webview 側へ渡されるため、
テーマ側で公開 theme color を設定する範囲は Markdown Editor にも反映される。

一方、編集中ブロックは Markdown Editor 内部の CSS 変数
`--md-block-active-background` を使う。
これは VS Code の公開 theme color ID ではないため、
通常の color theme JSON から不透明度だけを差し替えることはできない。

## 診断方法

`src/markdownAppearance.js` は元の
`--md-block-active-background` を保持したまま、
`background` と `box-shadow` だけを
`color-mix(..., transparent)` で半透明にする CSS を生成する。

`Noctis Blue: Show Markdown Active Block Test` で生成したスクリプトを
Developer Tools の Markdown Editor フレームで実行すると、
この CSS を一時的に追加できる。

これは正式な自動適用経路ではなく、CSS の挙動確認と原因切り分けに使う。

## 採用しない方法

### VS Code 本体または組み込み Markdown 拡張の改変

`MarkdownEditorProvider.#getHtml()` へ CSS を追加する方法は、
VS Code 更新ごとに差分管理が必要になり、本プロジェクトの方針に反する。

### 独自 Markdown Editor の再実装

Noctis Blue 自身が `CustomTextEditorProvider` を持てば Webview は制御できるが、
Markdown Editor 本体の編集・保存・カーソル・補完・レンダリングなどを
再実装または追従する必要がある。

テーマの責務を大きく超えるため採用しない。

### `markdown.codeBlockEditorProviders` の悪用

親 Webview の CSS を変更できず、目的を満たさないため採用しない。

## 再検討条件

VS Code に次のいずれかが追加された場合は再調査する。

- `vscode.markdown.editor` 向けの stylesheet contribution point
- Markdown Editor の親 Webview を拡張する公式 API
- active block の背景色・不透明度を公開 theme color / setting として指定する機能

## 参照

- VS Code Markdown Extension API  
  https://code.visualstudio.com/api/extension-guides/markdown-extension
- VS Code Custom Editor API  
  https://code.visualstudio.com/api/extension-guides/custom-editors
- VS Code `MarkdownEditorProvider`  
  https://github.com/microsoft/vscode/blob/main/extensions/markdown-language-features/src/preview/markdownEditorProvider.ts
- VS Code `markdownExtensions.ts`  
  https://github.com/microsoft/vscode/blob/main/extensions/markdown-language-features/src/markdownExtensions.ts
