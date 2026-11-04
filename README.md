# Noctis Blue

Emacs版 [Retro Hacker Blue](https://github.com/takashit16833/emacs-retro-hacker-blue-theme) の配色を基準として新しく作った、VS Code用のテーマである。既存の壁紙やMarkdown拡張をそのまま統合するものではない。

## 現段階の機能

- **Noctis Blue**：通常の不透明テーマ。
- **Noctis Blue Transparent**：VS Codeの公式配色機能だけを使用して、主要な背景色を透明にするテーマ。
- 色の管理元は `palette/colors.json`。両テーマを `npm run build` で生成する。
- カーソル・エラーは `#FF4DE1`、コメントは `#465082`。Emacs版の色の役割を引き継ぐ。
- Apc、外部のCSS注入拡張、VS Code本体改変は行わない。

**実機検証済みの範囲:** Noctis Blue Transparentのテーマ色は通常エディタと内蔵Markdown EditorのWebview内まで透明として届いた。さらに、既存 `vscode-wallpaper` の下地透明化処理に相当する一時CSSを追加した結果、両エディタの背後に検証用の縞模様が表示された。Markdown Editorの編集中ブロックも、元の青系の背景色と強調表示を残した半透明化が一時CSSによる実機検証で確認されている。**領域別の不透明度設定は、一時CSSによる手動検証方式として実装済み**。単純に色の末尾を `00` から変更すると複数層の重複塗りが起こり得るため、外側の領域の背景と内側の下地を分ける必要がある。詳しくは [`docs/wallpaper-spec.md`](docs/wallpaper-spec.md) を参照する。

壁紙画像そのものの表示・画像切り替えは [vscode-wallpaper](https://github.com/takashit16833/vscode-wallpaper) の責務であり、このテーマでは管理しない。

## インストールと確認

```bash
git clone https://github.com/takashit16833/vscode-noctis-blue.git
cd vscode-noctis-blue
npm test
npx --yes @vscode/vsce package --no-dependencies
code --install-extension noctis-blue-0.4.3.vsix
```

VS Codeの **Preferences: Color Theme** で `Noctis Blue` または `Noctis Blue Transparent` を選択する。

まず、通常のソースコード編集画面とVS Code内蔵Markdown Editorで、透過版への切り替え結果を比較する。特にMarkdown Editorでは、(1)エディタ内部の背景、(2)壁紙まで透けるか、を別々に観察する。

既存の `workbench.colorCustomizations` や `vscode-wallpaper` のCSSが背景を上書きしている場合は、テーマ単独の結果と切り分ける。既存設定を無断で変更しない。

## 開発

```bash
npm run build
npm test
```

`themes/*.json` は生成物。編集する場合は `palette/colors.json` または `scripts/theme.js` を変更する。

## 出典とライセンス

MITライセンスの[Emacs版](https://github.com/takashit16833/emacs-retro-hacker-blue-theme)を配色設計の出発点とし、元になった [Retro Hacker Theme](https://github.com/elmersh/retro-hacker-theme) にも謝意を表する。著作権表示は `LICENSE` に残す。

## 選択・入力欄などの半透明化（0.4.1）

`Noctis Blue Transparent` に限り、標準の配色設定で次の背景色を**色を残した半透明**に変更した。`Noctis Blue`（通常版）は変更しない。

| 表示箇所 | 透明度の試験値 |
| --- | --- |
| 現在行 | 不透明度50%（非アクティブ40%） |
| 編集範囲の選択 | 不透明度約65%（非アクティブ50%） |
| Explorerの選択ファイル | 不透明度約70%（非アクティブ60%） |
| Explorerのキーボードフォーカス | 不透明度約70%（非アクティブ60%） |
| 入力欄 | 不透明度約70% |
| セレクトボックスの背景 | 不透明度約75% |
| チャットのTip／チャット入力系背景 | 不透明度約70% |

上記は**v0.4.1時点の記録**。入力欄・チャット入力欄の不透明度はv0.4.2で50%に変更した。現在の確認対象は次の節の内容を参照。

配色は `palette/colors.json` の元の色を使用する。文字色や選択自体の表示は維持し、背景色にだけ不透明度を指定する。

**注意:** `dropdown.background` はVS Code公式の説明でmacOSでは使われない場合がある。チャットのTipは実装上 `agentsChatInput.background`（なければ `input.background`）を使用するが、ほかの下地との重複描画もあり得る。この２点を含め、実機の表示はまだ未検証。透明化に成功したと断定しない。実測後に必要な部分だけ追加のCSS対応を検討する。

- [VS Code公式テーマ色一覧](https://code.visualstudio.com/api/references/theme-color)
- [チャットTipの背景指定（VS Code本体）](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/chat/browser/widget/input/media/chatInputNotice.css)
## ホバー・補完・入力欄の透過改善（0.4.2）

以下は **Noctis Blue Transparentのみ** の変更である。元の青系の背景色は残したまま、透明度だけを調整した。通常版やdotfilesは変更しない。

| 対象 | 実装方式 | 試験値 |
| --- | --- | --- |
| Explorerのホバー行 | `list.hoverBackground` | 元色の不透明度約65% |
| Problemsなどのタブのホバー | `modernTab.hoverBackground`、`tab.hoverBackground` | 元色の不透明度約65% |
| 補完候補の一覧 | `editorSuggestWidget.background` | 元色の不透明度約65% |
| 補完候補の選択行 | `editorSuggestWidget.selectedBackground` | 元色の不透明度約70% |
| Chat入力欄（Describe what to build） | `input.background`、`agentsChatInput.background` | 元色の不透明度50% |
| Source Controlのコミットメッセージ欄 | `input.background` と一時CSSで内部の重複背景だけを透明化 | 元色の不透明度50% |

Source ControlはVS Code本体の `scm.css` が外枠 `.scm-editor` と内部のMonaco Editorの両方を `input.background` で描いている。テーマの色だけを半透明にすると背景が重なって濃くなるため、**テスト用CSS内では外枠の色を維持し、内部の重複背景だけを透明にしている**。これは通常の編集領域の下地透明化と同じ方針である。

修正の確認には `Noctis Blue: Show Combined Transparency Test` を使う。最新版のスクリプトを取得し、`top` と `Markdown Editor` の両方で実行する。今回の５か所だけを見る場合は `top` での実行で足りる。

**実機未検証:** 特にChatの入力欄とModern UIタブは、使用しているVS Codeの版や背景の重複状態によって差が出る可能性がある。確認できない場合は開発者ツールで実際の要素と背景色を診断し、推測で追加のCSSを増やさない。

- [VS Codeの補完候補の色定義](https://github.com/microsoft/vscode/blob/main/src/vs/editor/contrib/suggest/browser/suggestWidget.ts)
- [VS CodeのSCM入力欄CSS](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/scm/browser/media/scm.css)
- [VS CodeのModern Tab色定義](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/common/theme.ts)
## Sticky Scrollのぼかしとホバー（0.4.3）

- `vscode-wallpaper` で2026-11-03に実機確認済みの `.sticky-widget:not(.peek)` に対する `backdrop-filter: blur(12px)` を、`Noctis Blue: Show Combined Transparency Test` の `top` 側の一時CSSへ再利用する。固定コードの文字には `opacity` を指定しない。
- 同じ実測で確定した `.sticky-widget-line-numbers` と `.sticky-widget-lines-scrollable` の重複下地を透明化する処理は従来どおり維持する。
- VS Codeの `stickyScroll.css` がホバー時に `--vscode-editorStickyScrollHover-background` を適用するため、透過版テーマのみ `editorStickyScrollHover.background` を `#052A59A6`（Noctisの青、不透明度約65%）にする。ホバーの強調表示は残し、背景色だけを半透明にする。
- これは `vscode-wallpaper` の以前の実機検証を根拠とした変更であり、Noctis Blue v0.4.3での実機表示はまだ未確認。
## 実際のVS Codeで一度に透過を検証する

**`Noctis Blue: Show Combined Transparency Test`** は、別々の検証スクリプトを何回も取得しなくて済むようにしたコマンド。**プレビューではなく実際のVS Codeの画面**に対して、一時的なCSSを適用する。

1. `Noctis Blue Transparent` を選び、**Developer: Reload Window** で古い検証用CSSを解除する。
2. 内蔵 **Markdown Editor** でMarkdownファイルを開く。
3. コマンドパレットから **Noctis Blue: Show Combined Transparency Test** を実行し、表示されたJavaScriptを一度だけコピーする。
4. **Developer: Toggle Developer Tools** を開き、Consoleの実行対象を `top` にして貼り付け実行する。
5. 実行対象を `Markdown Editor` に変更し、**まったく同じJavaScript** を貼り付け実行する。

以上で、元の配色を残したまま、縞模様の背景・ワークベンチ各領域・内蔵Markdown Editorの編集中ブロックをまとめて確認できる。編集対象のブロックは角丸と強調表示を残したまま半透明にする。

**見やすさを優先した固定の検証値**として、領域別背景色の不透明度は50%、編集中ブロックの背景と影は65%で生成する。これは `noctisBlue.opacity` の保存値を上書きしない。背景画像の代わりに一時的な縞模様を描く。通常の壁紙の画像切替・乗算を試験するものではない。

**解除:** VS Codeを再読み込みすれば両方解除される。あるいは同じコードを同じ実行対象で再実行すると、対象側のCSSだけを解除できる。ユーザー設定・本体ファイルへの書き込みは行わない。

統合コマンドは従来の個別テスト用コマンドと併存している。**通常の透過確認は統合コマンドだけでよい。** 個別コマンドは、設定した不透明度を対象領域だけで検証したい場合に使う。
## 領域別の不透明度（試験機能）

`Noctis Blue Transparent` で、Noctis Blueの背景色を保ったまま、６つの領域の背景色の不透明度を調整できるようにした。色の個別指定は増やしていない。以下の設定は `dotfiles/.config/vscode/settings.json` などに記述する。

```jsonc
"noctisBlue.opacity": {
  "editor": 0.91,
  "sidebar": 0.93,
  "panel": 0.94,
  "auxiliaryBar": 0.86,
  "chrome": 0.93,
  "gap": 0.91
}
```

`0` は完全透明、`1` は不透明。背景色の透明度だけを変更し、文字や選択行全体の透明度は変更しない。`chrome` はタイトル・ステータス・アクティビティバーの３か所で、それぞれのテーマ色を保持する。`gap` は浮動パネルの余白のみを対象とする。

**現時点の反映方法は安全な一時適用のみ。設定を書いただけでは画面へ自動反映されない。**

1. `Noctis Blue Transparent` を選択する。
2. コマンドパレットで `Noctis Blue: Show Temporary Opacity Script` を実行する。
3. 開いたJavaScriptを全選択してコピーする。
4. `Developer: Toggle Developer Tools` で開発者ツールを開き、Consoleの実行対象を `top` にして貼り付け、実行する。
5. 同じコードをもう一度実行すると解除される。ウィンドウ再読み込みでも解除される。設定を変えたら、一度解除して新しいスクリプトを生成する。

この検証では、VS Code本体の変更、外部通信、ユーザー設定の自動書き換えは行わない。壁紙画像の表示や乗算は従来どおり `vscode-wallpaper` が担当し、今回のコードは画像を扱わない。

現在の `vscode-wallpaper` も独自の領域別不透明度CSSを出力するため、**両方を同時適用すると競合する**。壁紙との自動連携および起動時自動適用はまだ実装していない。CSSの適用方法を二重化せず、一つの表示経路を共有する設計が決まってから行う。

内蔵Markdown EditorのWebview内の背景は、既存の透過テーマ色に従っている。今回のCSSが塗るのはWebviewの**外側**の編集領域。編集中ブロックは **強調表示を維持しつつ背景色と周囲の影を半透明化する**。VS Code標準の `markdown.editor.highlightActiveBlock` は `true` のままにする。`false` にすると強調表示そのものが消えるため、今回の要件を満たさない。

実機で確認したCSSは `:where(.md-editor:not(.md-no-active-block-highlight)) .md-block-active` で、`background` と `box-shadow` の両方が `--md-block-active-background` を参照する。色を消したり別の色に置き換えるのではなく、**現在のCSS変数の色をそのまま使って不透明度だけを調整する**。

### Markdown Editorの編集中ブロック（試験機能）

```jsonc
"noctisBlue.markdownActiveBlockOpacity": 0.65
```

背景と周囲の影の色を維持して、それぞれの不透明度を65%にする。編集中の強調表示は有効のままにする。この設定だけでWebviewのCSSが自動更新されるわけではない。

1. `Noctis Blue Transparent` を選択する。
2. コマンドパレットの `Noctis Blue: Show Markdown Active Block Test` を実行する。
3. 表示されたJavaScriptをコピーし、`AGENTS.md` 等を **内蔵Markdown Editor** で開く。
4. 開発者ツールのConsoleで実行対象を `Markdown Editor` のフレームに切り替え、コピーしたコードを実行する。
5. Markdown内の箇条書きなどを編集状態にし、元の背景色を維持したまま壁紙が透けるか確認する。同じコードを再実行すると解除できる。

このスクリプトはWebview内に試験用のスタイル要素を追加・解除するだけで、テーマ設定やVS Code本体ファイルを変更しない。**編集中ブロックの半透明表示は実機で確認済み**。ただし、拡張による常時適用は未実装であり、公式テーマ設定だけで `--md-block-active-background` の不透明度を制御できることも確認できていない。

背景色の下地が重なって不透明になるのを避けるため、既存 `vscode-wallpaper` で確認済みの内側の背景透明化処理を参考にしている。調査記録は [`docs/wallpaper-spec.md`](docs/wallpaper-spec.md) を参照する。
