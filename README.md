# Noctis Blue

Emacs版 [Retro Hacker Blue](https://github.com/takashit16833/emacs-retro-hacker-blue-theme) の配色を基準にした VS Code 用テーマである。

通常版と透過版で配色を共有し、背景画像の処理は [vscode-wallpaper](https://github.com/takashit16833/vscode-wallpaper) に分離している。

## テーマ

- **Noctis Blue**：通常の不透明テーマ。
- **Noctis Blue Transparent**：背景透過を前提にしたテーマ。
- 配色の唯一の管理元は `palette/colors.json`。
- `themes/*.json` は `npm run build` で生成する。

## 自動適用

Noctis Blue v0.5.0 以降では、ワークベンチ側の領域別透過とぼかしを
`vscode-wallpaper` v0.8.0 以降の共通 CSS ローダー経由で自動適用できる。

責務は次のように分ける。

- **Noctis Blue**：背景色、領域別不透明度、Sticky Scroll と補完候補のぼかし。
- **vscode-wallpaper**：背景画像、乗算、画像切り替え、共通 CSS ローダー。

Noctis Blue 自身は `workbench.html` を変更しない。

### 有効化

1. `vscode-wallpaper` v0.8.0 以降と Noctis Blue v0.5.0 以降をインストールする。
2. `Noctis Blue Transparent` を選ぶ。
3. コマンドパレットから **Noctis Blue: Enable Automatic Appearance** を実行する。
4. `vscode-wallpaper` の本体変更確認を承認する。
5. **Developer: Reload Window** を実行する。

設定変更や `Noctis Blue Transparent` / `Noctis Blue` の切り替え時は、
次回読み込み用 CSS を更新する。現在の画面へは即時反映しないので、
表示を切り替えた後は必要に応じて **Developer: Reload Window** を実行する。

## 領域別不透明度

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

`0` は完全透明、`1` は不透明である。

文字や選択範囲全体へ `opacity` を指定せず、背景色だけを混合する。
内側で重複して背景を描く要素は透明化し、同じ領域の背景色を複数回重ねない。

2026-11-05 の実機確認では、次を確認済みである。

- editor / sidebar / auxiliaryBar / panel / titlebar / statusbar の不透明度が設定値どおり適用される。
- `vscode-wallpaper-layers-<workspace-id>.css` が読み込まれる。
- Sticky Scroll の `backdrop-filter: blur(12px)` が適用される。
- 補完候補の背景ぼかしが適用される。
- 通常版 `Noctis Blue` へ切り替え、Reload Window 後に透過・ぼかしが解除される。

## 内蔵 Markdown Editor

VS Code 内蔵のリッチ Markdown Editor（`vscode.markdown.editor`）は独立した Webview である。

テーマ色は Webview まで届くため、`Noctis Blue Transparent` の背景透過自体は利用できる。
一方、編集中ブロックの背景は Webview 内部の `--md-block-active-background` で描画されており、
現行 VS Code の公開 API には、別拡張からこの Webview 本体へ CSS を追加する拡張点がない。

そのため、次の設定は現在も開発・実機検証用である。

```jsonc
"noctisBlue.markdownActiveBlockOpacity": 0.65
```

**Noctis Blue: Show Markdown Active Block Test** で生成したスクリプトを
Markdown Editor の開発者ツール上で実行すると、元の背景色・角丸・強調表示を維持したまま、
背景と影の不透明度だけを変更できる。

この制約と調査根拠は [docs/markdown-editor.md](docs/markdown-editor.md) を参照する。

## 開発用診断コマンド

通常利用では自動適用を使用する。次のコマンドは原因切り分けや実機確認用として残している。

- **Noctis Blue: Show Combined Transparency Test**
- **Noctis Blue: Show Temporary Opacity Script**
- **Noctis Blue: Show Markdown Active Block Test**

いずれも通常設定を置き換える正式な適用経路ではない。

## インストール

```bash
git clone https://github.com/takashit16833/vscode-noctis-blue.git
cd vscode-noctis-blue

npm test
npx --yes @vscode/vsce package --no-dependencies
code --install-extension ./noctis-blue-0.5.0.vsix --force
```

インストール後の確認:

```bash
code --list-extensions --show-versions \
  | grep '^takashit16833\.noctis-blue@'
```

## 開発

```bash
npm run build
npm test
```

`themes/*.json` は生成物なので直接編集しない。
配色は `palette/colors.json`、テーマ生成処理は `scripts/theme.js` を変更する。

## 関連資料

- [docs/wallpaper-spec.md](docs/wallpaper-spec.md)
- [docs/markdown-editor.md](docs/markdown-editor.md)
- [VS Code Theme Color](https://code.visualstudio.com/api/references/theme-color)
- [VS Code Markdown Extension API](https://code.visualstudio.com/api/extension-guides/markdown-extension)

## 出典とライセンス

MIT ライセンスの [Emacs版 Retro Hacker Blue](https://github.com/takashit16833/emacs-retro-hacker-blue-theme)
を配色設計の出発点とし、元になった
[Retro Hacker Theme](https://github.com/elmersh/retro-hacker-theme) にも謝意を表する。
著作権表示は `LICENSE` に残す。
