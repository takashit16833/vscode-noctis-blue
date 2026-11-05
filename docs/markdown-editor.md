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

生成元は `src/markdownAppearance.js` の `generateMarkdownCss` である。
ここに CSS 全文を重複掲載せず、意図と実機確認済みの対象だけを記載する。

- 見出し：H1/H2 の左側に縦線を付け、H2 の下線は非表示にする。H1/H3 以降の下線は維持する。
- コードブロック：枠線を消し、背景は `textCodeBlock.background` を使用する。
- 引用：Obsidian と同じ `#001947` の背景、`#4C9EEB` の文字、`#5EAFFF` の枠色を使用する。枠の太さは維持する。
- インラインコード：Obsidian と同じ `#052A59` の背景、`#7CBEFF` の文字色を使用し、読みやすい余白を付ける。コードブロックには適用しない。
- Transparent 版は引用・インラインコードの背景を45%不透明にする。
- 通常リンク：`#316CBD`、太字、下線。見出し：`#A6CAFF`。
- 表：先頭行の `td` は見出しとして強調し、罫線は既存の線種・太さを維持する。
- 編集中ブロック：`--md-block-active-background` の色を維持し、不透明度だけ変更する。

対象 DOM は実機で `BLOCKQUOTE.md-block.md-blockquote`、
`PRE.md-code-block > CODE`、通常リンクの `A`、表の `TD` を確認済みである。

**共有 CSS はウィンドウのテーマ切替で書き換えない。**
すべての独自規則に `body[data-vscode-theme-id]` の Noctis Blue 2テーマ条件を付ける。
テーマ識別子は `package.json` の `themes[].id` と一致させ、Webview の実機でも確認する。
この仕組みは VS Code の公式 Webview テーマ属性に基づく。

## 安全策

`src/markdownEditorPatch.js` が変更を管理する。

- ローカル CSS は組み込み拡張の `extensionUri` から解決する。
- Remote/Dev Container では `src/markdownEditorRemote.js` が観測済みパスと既知のサーバー配置を `workspace.fs` で調べる。複数あるときは書き込まない。
- 初回適用は `editor.css.noctis-blue.backup` を排他的に作成する。既存バックアップがある場合、現在の CSS と同一内容でも由来不明のため触らず停止する。
- 一時ファイルは操作ごとに乱数名を付け、実際に作成したファイルだけ後始末する。
- 元 CSS を検証できない、マーカーが壊れている、バックアップが欠落した場合は変更しない。
- 解除は元 CSS の内容とバックアップの対応を確認してから復元する。
- `workspace.fs.writeFile` は排他的な新規作成に対応しない。リモートでの一時ファイル作成は乱数名と事前の存在検査を使うが、他プロセスとの競合を完全に排除できるわけではない。
- `workspace.fs.copy(overwrite: false)` を使い、リモートで既存バックアップを上書きしない。
- 同じ拡張ホスト内の更新・有効化・解除は接続先ごとに直列化する。ローカルでは複数ウィンドウの操作もファイルロックで排他する。リモートの別ウィンドウ間での排他は保証できないため、同じ接続先で操作を同時実行しない。

## Dev Container の権限と制約

Noctis Blue は、ローカル Mac 側 UI host で背景処理を担当する。
リモート側 Markdown Editor の `editor.css` は VS Code リモートファイル操作 API 経由で読み書きする。

`workspace.fs` は `chmod` を提供しない。root 所有ディレクトリでファイルを新規作成できない場合、
自動の `sudo` / `chown` や VS Code Server の改変は行わず、明確な権限エラーで停止する。
ユーザー環境での所有者・書き込み権限を実測してから、セットアップ方法を選ぶ。

リモートのパスやバージョンを実測せずに増やすことを禁止する。
VS Code Server の配置が異なれば、対応方法を調査する。

## 有効化と解除

`Noctis Blue: Enable Markdown Editor Appearance` は実行するたびに
組み込み CSS を変更する説明を表示し、利用者の確認後に適用する。

有効化状態は `noctisBlue.markdownEditorAppearanceEnabledTargets` で
ローカル・リモートの接続先別に保存する。以前の単一真偽値が `true` で、ローカルの `editor.css` に既存の管理ブロックと検証可能なバックアップが残っている場合だけ、既存 CSS を更新してローカルの有効化状態を引き継ぐ。未加工の CSS や新しい Dev Container への許可には流用しない。検証に失敗すれば安全のため停止する。

`Noctis Blue: Disable Markdown Editor Appearance` は対象の CSS をバックアップから復元する。
他のウィンドウが別テーマへ切り替わっただけでは共有 CSS を解除しない。

`noctisBlue.markdownActiveBlockOpacity` は VS Code 全体で共有する設定
(`scope: application`) であり、ウィンドウ別には設定できない。

## VS Code 更新

VS Code 更新によって `editor.css` が新しい未加工ファイルへ交換され、
旧バックアップだけが残った場合は、そのバックアップの由来を確実に証明できないため、
**自動で削除・置換・再適用しない**。状況と対象ファイルを実測してから対処する。

## アンインストール

Noctis Blue 自体が削除された後は管理コードを実行できない。
そのためアンインストール前に

```text
Noctis Blue: Disable Markdown Editor Appearance
```

を実行して元 CSS へ戻す。加えて `Noctis Blue: Disable Automatic Appearance` で workbench の読み込みも解除する。

## 参照

- VS Code Markdown Extension API
  https://code.visualstudio.com/api/extension-guides/markdown-extension
- VS Code Custom Editor API
  https://code.visualstudio.com/api/extension-guides/custom-editors
- VS Code `MarkdownEditorProvider`
  https://github.com/microsoft/vscode/blob/main/extensions/markdown-language-features/src/preview/markdownEditorProvider.ts
