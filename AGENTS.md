# Maintenance guidelines

## 役割分担

- Noctis Blue は配色・背景画像・画像切り替え・背景透過・ぼかしの唯一の拡張とする。
- 役割の分離は拡張機能単位ではなく、内部のモジュールで行う。背景画像用の別拡張を再導入しない。
- `palette/colors.json` を配色の唯一の管理元とする。実行時コードから参照するため VSIX に必ず含め、`.vscodeignore` で除外しない。
- JSON / JSONC / JSON Lines のプロパティ名は `support.type.property-name.json*` を `palette.foreground` に揃える。グローバルな semantic token の `property` 色は変更しない。
- `themes/*.json` は生成物。変更後は `npm run build && npm test` を実行する。
- VS Code 標準のテーマ機能・公開 API を最優先する。
- Apc へ依存しない。公開 API だけでは不可能な workbench 背景 CSS は、利用者の明示許可後に `src/workbench/auto-apply.js` だけが安全に導入する。
- VS Code の組み込み Markdown Editor だけは別の管理対象である。CSS 追記は明示許可が必要で、元ファイルとバックアップを検証する。
- Noctis Blue は `extensionKind: ["ui"]` とし、Mac 側 UI host のみで実行する。workbench とローカル背景画像をコンテナ側から変更しない。
- リモート Markdown Editor CSS は、ローカルの `fs` ではなく `src/markdownEditorRemote.js` の `workspace.fs` を使う。実機で観測された `/vscode/extensions/markdown-language-features/markdown-editor-out/editor.css` と既知の VS Code Server 配置を確認し、候補がゼロ件または複数件なら書き込まず停止する。探索結果だけでは Webview が使用中の CSS と同一であることは保証できない。

## 情報の置き場所

- `AGENTS.md` には長期的に維持する設計・実装ルールだけを書く。
- README.md は利用者向けのインストール・設定・操作・更新・解除の手順に限定する。実装構造、CSS セレクタ、配色管理や生成方法、開発・診断コマンド、設計判断の説明は AGENTS.md または設計資料に置き、重複記載しない。
- 実機確認の途中経過、未確認一覧、次の作業を長期資料へ蓄積しない。
- 実測から恒久的な設計判断が得られた場合だけ、その判断と根拠を設計資料へ残す。

## ワークベンチと画像の自動適用

- `src/workbench/wallpaper.js`: 背景画像パス、画像切替、乗算 CSS の正本。透過の CSS をここへ混ぜない。
- `src/appearance.js`: エディタ・パネル・補完・Sticky Scroll などの透過とぼかしの正本。
- `src/automaticAppearance.js`: 設定を読み、上記2つの CSS を組み合わせ、保存状態と安全な適用を制御する。
- `src/workbench/auto-apply.js`: workbench.html の導入・検証・同期・解除・修復だけを担当。管理外のローダー・バックアップを上書きしない。
- `src/workbench/renderer-loader.js`: CSS を起動時に読み込む。タイマーやポーリングを増やさない。
- `src/workbench/workspace-id.js`: VS Code renderer 側と同一の作業領域 ID を生成する。
- 現在の管理対象 CSS は `noctis-blue-*.css` と `noctis-blue-layers-*.css`、読み込みスクリプトは `noctis-blue-loader.js` という実際のファイル名を使用している。これらのファイルは Noctis Blue が所有する。管理ファイル名の変更は読み込み・検証・解除・復元とテストを含めて整合性を保つ。
- 背景画像設定は `noctisBlue.wallpaper.*` のみ読み取る。存在しない設定や別拡張の設定から値を推測しない。
- `Noctis Blue Transparent` のときだけ領域透過 CSS を追加する。背景画像自体は `noctisBlue.wallpaper.enabled` で制御する。
- 自動適用の保存状態は `noctisBlue.automaticAppearanceEnabled` (`globalState`) だけで判定する。管理ファイルが存在するという理由で、利用者の同意や無効化状態を上書きしない。
- ユーザーの明示的な同意なしに workbench.html を初回変更しない。設定変更時は管理 CSS だけ更新する。
- `Developer: Reload Window` はユーザーが選ぶ。勝手に実行せず、タイマー・通知の連発をしない。
- VS Code の整合性警告は隠さない。所有不明の HTML / loader / CSS は上書きも削除もしない。
- workbench への変更はインストール単位の `.noctis-blue-workbench.lock` で排他制御する。ロックが残っていても勝手に奪わない。解除後の後片付けが失敗した場合、元 HTML とローダーの所有を確認できる限り再実行可能にする。証拠のない単独バックアップは削除しない。
- 一時ファイルの無条件削除、予測可能な固定一時ファイル名、管理外バックアップの自動削除を禁止する。VS Code 本体の更新後、古い HTML バックアップの所有を確認できない場合は修復を停止する。
- CSS の読み込み口は Noctis Blue 内で一元管理し、同じ CSS の二重適用や別拡張との連携機構を増やさない。

## 領域別透過

- `noctisBlue.opacity` は背景色の不透明度（0〜1）。
- 対象は `editor` / `gutter` / `minimap` / `tabs` / `breadcrumbs` / `sidebar` / `panel` / `auxiliaryBar` / `chrome` / `gap`。
- 背景色は通常版テーマから取得し、別設定として重複管理しない。
- 行番号領域は VS Code の `.margin` を背景の一度塗り箇所とし、通常版 `editorGutter.background` と `gutter` の不透明度を使用する。現在行は VS Code の `editor.lineHighlightBackground` / `editorLineNumber.activeForeground` の色を維持し、公式 `editor.renderLineHighlight: "all"` で背景強調する。現在行要素や番号文字を独自 CSS で一律に塗り直さない。親のエディタ背景上の追加描画である点に留意する。
- ミニマップは通常版 `minimap.background` を基準にし、透過版の Canvas 背景は透明のまま保持する。ミニマップ自身の半透明背景だけを CSS で描き、文字・スクロール位置の表示を薄くしない。エディタ背景の上に重なる追加背景なので、最終的な不透明度と `minimap` の設定値を混同しない。
- `tabs` と `breadcrumbs` は親要素 `.title.tabs` の背景ではなく、別々の子要素（`.tabs-and-actions-container` と `.breadcrumbs-below-tabs`）をそれぞれ一度だけ描く。同じ通常版 `editorGroupHeader.tabsBackground` を参照し、色を二重管理しない。内部のタブ一覧とパンくずリストの部品に背景を重ねない。エディタ背景上の追加背景なので、単独のアルファ値と最終表示の不透明度を区別する。
- Transparent 版のタブでは、通常版の `tab.activeBackground` / `tab.inactiveBackground` の色を半透明で維持する。Modern UI でも VS Code 標準の色指定を使い、`.tab-fill` を一律に透明化する独自 CSS を追加しない。Connected タブは通常テーマ色を独自背景変数に反映しないため、`src/appearance.js` で `--vscode-tab-activeBackground` / `--vscode-tab-inactiveBackground` を `--modern-ui-editor-tab-custom-*-background` へ橋渡しする。利用者が明示指定した色を優先できるよう、VS Code の色カスタマイズ規則より詳細度を上げない。タブはエディタ背景の上に追加描画されるので、設定したアルファ値と最終的な不透明度を混同しない。
- ウィンドウが非アクティブのとき、VS Code は `.part.titlebar.inactive` を付与する。CSS では `titleBar.inactiveBackground` と `chrome` の不透明度を使い、アクティブ時の色で上書きしない。状態監視のタイマーは追加しない。
- ステータスバーの状態別背景は VS Code がインラインの色として選ぶので、未確認の状態クラスを推測して CSS に追加しない。
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
- 引用は実機で `BLOCKQUOTE.md-block.md-blockquote` を確認済み。背景・前景・枠色は Obsidian の配色に揃え、コードブロックとは分ける。
- インラインコードは実機で `CODE`、fenced code は `PRE.md-code-block > CODE` と確認済み。非 `PRE` 配下の `CODE` に Obsidian と同じ文字・背景色を適用し、左右の余白を確保する。
- `language-text` / `language-plaintext` の fenced code は通常本文と同じ `editor.foreground` を使う。
- 通常リンクは実機でクラスなしの `A` 要素と確認済み。Markdown Editor 文書内だけ `fg-muted = #316CBD`、太字、下線へ揃える。
- 表は実DOM確認済み。見出しは `#316CBD` + 太字、罫線は太さと線種を変えず `widget.border` を使う。
- 公開 API で届かない Markdown Editor 固有の CSS は、利用者が明示的に有効化した場合だけ `markdown-editor-out/editor.css` に追記する。
- 元 `editor.css` は `.noctis-blue.backup` として排他的に保存し、解除時は内容一致を確認して復元する。未加工 CSS の横に既存バックアップがあれば、同一内容でも由来不明として削除・上書きせず停止する。
- 書き込みは操作ごとにランダムな一時ファイルを使い、作成したものだけ後始末する。リモート `workspace.fs.writeFile` は排他的作成を保証しないため、乱数名の事前存在検査に依存する制限を明記する。
- 管理ブロック以外の変更、壊れたマーカー、バックアップ欠落を検出した場合は上書き・解除せず停止する。
- VS Code 更新で未加工の `editor.css` と既存バックアップが併存する場合は、自動で削除・再適用しない。対象を確認してから対処する。
- provider の JavaScript、package.json、Webview HTML は変更しない。
- `markdown.editor.highlightActiveBlock=false` で強調表示自体を消さない。
- `--md-block-active-background` の色を固定色へ置き換えず、背景と影の不透明度だけを変更する。
- `noctisBlue.markdownActiveBlockOpacity` は複数ウィンドウが共有する `editor.css` の設定なので `scope: application` とする。ウィンドウごとに異なる値を共有 CSS へ上書きさせない。
- Markdown Editor CSS は `body[data-vscode-theme-id]` で Noctis Blue 2テーマに限定し、ウィンドウのテーマ切替だけで共有 CSS を削除しない。テーマの識別子は `package.json` の themes[].id と一致させる。
- 内蔵 Markdown CSS の有効化は `noctisBlue.markdownEditorAppearanceEnabledTargets` に接続先ごと保存する。許可が確認できない接続先では適用せず、利用者の明示的な有効化を求める。
- Noctis Blue のアンインストール前には Markdown Editor Appearance を解除する。

## 開発用診断

- `Noctis Blue: Show Combined Transparency Test`
- `Noctis Blue: Show Temporary Opacity Script`
- `Noctis Blue: Show Markdown Active Block Test`

上記は正式な適用経路ではない。
通常のワークベンチ表示は Noctis Blue 内部の共通ローダー経由の CSS で確認する。

## リモート Markdown Editor と権限

- Noctis Blue は Mac 側 UI host で実行する。VS Code Server 側の内蔵 Markdown Editor CSS は別の場所にある。
- `src/markdownEditorRemote.js` は観測済みの `/vscode/` 配置を優先し、見つからない場合だけ既知の `~/.vscode-server/bin/` 配置を調べる。両者が同じファイルへの別名パスである実測例があるため、別の優先度の候補を同時に数えない。各優先度内に複数の候補があれば書き込まず止める。Webview が実際に読み込んだ URI との照合は実機で行う。
- `src/markdownEditorPatch.js` は CSS のバックアップ・検証・復元ロジックを共通化する。ローカルでは同じ CSS に対する操作を排他し、リモートでは `workspace.fs` を使用する。リモートの別ウィンドウ間の排他は保証しない。
- `workspace.fs` に `chmod` も排他的 `writeFile` もない。バックアップ作成は `workspace.fs.copy(overwrite: false)` を使う。自動 `chown` / `sudo` / 権限緩和を追加しない。コンテナで書き込み権限がない場合はエラーで停止し、所有者や設定を勝手に変更しない。
- VS Code 更新・違う remote server 配置は実機の場所と権限を調査してから候補を増やす。検証していない環境に動くと断定しない。
- 内蔵 Markdown Editor は組み込み Webview。標準 Markdown Preview や外部 Live Preview と混同しない。

## テストとリリース

- `npm run build && npm test`。画像・画面切替・ローダー・作業領域 ID・バックアップ安全性テストを維持する。
- Mac 実機背景、Dev Container の Markdown Editor、workbench 管理ファイルの解除・再適用を検証する。実機を利用できない場合は、未検証項目と確認方法を明記し、テスト成功を実機成功と混同しない。
- dotfiles の設定の正本は `takashit16833/dotfiles` の `.config/vscode/settings.json`。初期導入と `AGENTS.md` も同時変更する。
- 現時点で確認できない環境依存の項目は、必ず未検証と明記する。

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
