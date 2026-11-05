# Maintenance guidelines

## 役割分担

- Noctis Blue は配色・背景透過・ぼかしの正本。
- 背景画像、乗算、画像切り替え、workbench CSS の共通ローダーは `vscode-wallpaper` が担当する。
- `palette/colors.json` を配色の唯一の管理元とする。実行時コードから参照するため VSIX に必ず含め、`.vscodeignore` で除外しない。
- JSON / JSONC / JSON Lines のプロパティ名は `support.type.property-name.json*` を `palette.foreground` に揃える。グローバルな semantic token の `property` 色は変更しない。
- `themes/*.json` は生成物。変更後は `npm run build && npm test` を実行する。
- VS Code 標準のテーマ機能・公開 API を最優先する。
- Apc へ依存せず、Noctis Blue 独自の `workbench.html` 改変は行わない。内蔵 Markdown Editor だけは公開 API で届かない要素に限り、組み込み Markdown 拡張の `markdown-editor-out/editor.css` 末尾へ管理ブロックを追記する。
- wallpaper と同じ表示処理を二重実装しない。
- Noctis Blue は `extensionKind: ["workspace", "ui"]` とし、Remote/Dev Container では workspace host を優先する。Markdown Editor の `editor.css` はその host 側で管理し、Wallpaper 連携は `_vscodeWallpaper.*` の内部コマンド経由でローカル UI host へ渡す。

## 情報の置き場所

- `AGENTS.md` には長期的に維持する設計・実装ルールだけを書く。
- README には現在の利用方法を書く。
- 実機確認の途中経過、未確認一覧、次の作業を長期資料へ蓄積しない。
- 実測から恒久的な設計判断が得られた場合だけ、その判断と根拠を設計資料へ残す。

## ワークベンチ自動適用

- v0.7.0 以降は `vscode-wallpaper` v0.10.0 以降の CSS レイヤー API v3 を使う。
- Noctis Blue のレイヤー ID は `takashit16833.noctis-blue`。API v3 では同じ ID を `ownerExtensionId` として登録し、拡張無効化・削除時の孤児レイヤー整理に使う。
- `Noctis Blue Transparent` のときだけ Noctis の CSS レイヤーを登録する。
- 通常版 `Noctis Blue` および他テーマでは Noctis のレイヤーを削除する。
- wallpaper 側は常に背景画像・乗算・画像切り替えだけを生成するため、表示面所有権のフラグは使わない。
- 自動適用の有効状態は Noctis Blue 側の `globalState` に保存する。解除時は Wallpaper のレイヤー削除が成功してから `false` を保存し、失敗時に状態を先行変更しない。
- 設定・テーマ変更時は次回再読み込み用 CSS だけを更新する。
- タイマー監視・勝手な再読み込み・Reload Window を促す通知を追加しない。
- 実画面への反映時期は利用者が `Developer: Reload Window` を選ぶ。

## 領域別透過

- `noctisBlue.opacity` は背景色の不透明度（0〜1）。
- 対象は `editor` / `sidebar` / `panel` / `auxiliaryBar` / `chrome` / `gap`。
- 背景色は通常版テーマから取得し、別設定として重複管理しない。
- 文字・アイコン・選択範囲へ要素全体の `opacity` を指定しない。
- `src/appearance.js` を領域背景・重複下地透明化・ぼかしの CSS 生成元とする。DOM 依存セレクタは editor / panel / sidebar / SCM / Sticky / suggest / gap の機能単位で分け、処理内容ではなく必要理由をコメントする。
- Source Control メッセージ欄は外側 `.scm-editor` の背景を残し、内部 Monaco の重複背景だけを透明化する。
- Sticky Scroll は `.sticky-widget:not(.peek)` の背後だけを `blur(12px)` し、固定文字は薄くしない。
- 補完候補はポップアップ背後だけをぼかし、文字・選択・ホバー・枠線を維持する。
- Modern UI、Chat、SCM 等で問題が出た場合は Computed Style で背景レイヤーを実測してから修正する。

## 内蔵 Markdown Editor

- 対象は `vscode.markdown.editor`。通常の Markdown Preview や外部 Live Preview と混同しない。
- 組み込み Markdown Editor は `CustomTextEditorProvider` が所有する独立 Webview である。
- `markdown.previewStyles` / `markdown.previewScripts` / `markdown.markdownItPlugins` は通常 Preview 用である。
- `markdown.codeBlockEditorProviders` は fenced code block 用で、親 Webview の CSS を変更できない。
- 別拡張から組み込み Markdown Editor の `WebviewPanel` を取得・変更する公開 API はない。
- 内蔵 Markdown Editor の本文基準色は標準テーマ色 `editor.foreground` を通じて通常の `palette.foreground` を使う。見出しだけを `palette.pale`（Emacs 版 `fg-pale`）へ分離できる公開テーマ色があるかは、推測せず実機と上流 CSS で確認する。
- コードブロック背景は標準テーマ色 `textCodeBlock.background` を使う。基準色は Emacs 版 `org-block-bg` と揃え、Transparent 版ではアルファ値だけを下げる。
- コードブロック枠線は Markdown Editor 側が汎用 `widget.border` を使うため、テーマ色 `widget.border` は変更せず `pre.md-code-block` だけ CSS で枠線を消す。
- H1/H2 は文字位置を動かさず、`::before` を `left: -14px` に絶対配置して左縦線を付ける。縦線は `top: 0.6em` / `height: 1em` / `translateY(-50%)` で文字行の中心に合わせる。H2 の下線だけは非表示にし、H1 と H3 以下の既存下線は変更しない。
- 引用・インラインコード・リンク・表など Markdown Editor 固有要素は、実DOMと Computed Style を確認してから個別に上書きする。推測したクラス名や `background: transparent` のような色を消す指定を入れない。
- 引用は実機で `BLOCKQUOTE.md-block.md-blockquote` を確認済み。背景はコードブロックと同じ `textCodeBlock.background` に統一する。
- インラインコードは実機で `CODE`、fenced code は `PRE.md-code-block > CODE` と確認済み。非 `PRE` 配下の `CODE` だけを `editor.foreground` + `textCodeBlock.background` へ揃える。
- `language-text` / `language-plaintext` の fenced code は通常本文と同じ `editor.foreground` を使う。
- 通常リンクは実機でクラスなしの `A` 要素と確認済み。Markdown Editor 文書内だけ `fg-muted = #316CBD`、太字、下線へ揃える。
- 表は実DOM確認済み。見出しは `#316CBD` + 太字、罫線は太さと線種を変えず `widget.border` を使う。
- 公開 API で届かない Markdown Editor 固有の CSS は、利用者が明示的に有効化した場合だけ `markdown-editor-out/editor.css` に追記する。
- 元 `editor.css` は `.noctis-blue.backup` として完全保存し、解除時は内容一致を確認して復元する。
- 管理ブロック以外の変更、壊れたマーカー、バックアップ欠落を検出した場合は上書き・解除せず停止する。
- VS Code 更新で管理ブロックのない新しい `editor.css` に置き換わった場合は、それを新しい元ファイルとしてバックアップし直して再適用する。
- provider の JavaScript、package.json、Webview HTML は変更しない。
- `markdown.editor.highlightActiveBlock=false` で強調表示自体を消さない。
- `--md-block-active-background` の色を固定色へ置き換えず、背景と影の不透明度だけを変更する。
- `noctisBlue.markdownActiveBlockOpacity` は自動適用する Markdown Editor CSS の設定として扱う。
- Noctis Blue のアンインストール前には Markdown Editor Appearance を解除する。

## 開発用診断

- `Noctis Blue: Show Combined Transparency Test`
- `Noctis Blue: Show Temporary Opacity Script`
- `Noctis Blue: Show Markdown Active Block Test`

上記は正式な適用経路ではない。
通常のワークベンチ表示は wallpaper の共通ローダー経由の Noctis CSS レイヤーで確認する。

## 実測ルール

- 環境依存の表示は推測で直さない。
- Developer Tools の要素・Computed Style で描画元を特定してから CSS を変更する。
- 実測と予想が食い違った場合は実測を優先する。
- 一度に複数の未確認修正を入れない。
- 既存の正常な表示を不要な CSS で壊さない。

## 参考資料

- `docs/wallpaper-spec.md`: 背景画像と領域背景の責務分担。
- `docs/markdown-editor.md`: 内蔵 Markdown Editor の自動 CSS 適用可否。
- VS Code Markdown extension guide:
  https://code.visualstudio.com/api/extension-guides/markdown-extension
- VS Code Custom Editor API:
  https://code.visualstudio.com/api/extension-guides/custom-editors
