# Noctis Blue

Emacs版 [Retro Hacker Blue](https://github.com/takashit16833/emacs-retro-hacker-blue-theme) の配色を基準として新しく作った、VS Code用のテーマである。既存の壁紙やMarkdown拡張をそのまま統合するものではない。

## 現段階の機能

- **Noctis Blue**：通常の不透明テーマ。
- **Noctis Blue Transparent**：VS Codeの公式配色機能だけを使用して、主要な背景色を透明にするテーマ。
- 色の管理元は `palette/colors.json`。両テーマを `npm run build` で生成する。
- カーソル・エラーは `#FF4DE1`、コメントは `#465082`。Emacs版の色の役割を引き継ぐ。
- Apc、外部のCSS注入拡張、VS Code本体改変は行わない。

**実機検証済みの範囲:** Noctis Blue Transparentのテーマ色は通常エディタと内蔵Markdown EditorのWebview内まで透明として届いた。さらに、既存 `vscode-wallpaper` の下地透明化処理に相当する一時CSSを追加した結果、両エディタの背後に検証用の縞模様が表示された。ただし、Markdown Editorの編集中ブロックには不透明な背景が残る。**領域別の不透明度設定は、一時CSSによる手動検証方式として実装済み**。単純に色の末尾を `00` から変更すると複数層の重複塗りが起こり得るため、外側の領域の背景と内側の下地を分ける必要がある。詳しくは [`docs/wallpaper-spec.md`](docs/wallpaper-spec.md) を参照する。

壁紙画像そのものの表示・画像切り替えは [vscode-wallpaper](https://github.com/takashit16833/vscode-wallpaper) の責務であり、このテーマでは管理しない。

## インストールと確認

```bash
git clone https://github.com/takashit16833/vscode-noctis-blue.git
cd vscode-noctis-blue
npm test
npx --yes @vscode/vsce package --no-dependencies
code --install-extension noctis-blue-0.3.1.vsix
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

このスクリプトはWebview内に試験用のスタイル要素を追加・解除するだけで、テーマ設定やVS Code本体ファイルを変更しない。**実機の反映結果は未確認**。公式テーマ設定のみで `--md-block-active-background` の透明度を指定できることも確認できていないため、常時適用の方法は別途検討する。

背景色の下地が重なって不透明になるのを避けるため、既存 `vscode-wallpaper` で確認済みの内側の背景透明化処理を参考にしている。調査記録は [`docs/wallpaper-spec.md`](docs/wallpaper-spec.md) を参照する。
