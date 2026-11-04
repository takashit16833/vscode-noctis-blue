# Noctis Blue

Emacs版 [Retro Hacker Blue](https://github.com/takashit16833/emacs-retro-hacker-blue-theme) の配色を基準として新しく作った、VS Code用のテーマである。既存の壁紙やMarkdown拡張をそのまま統合するものではない。

## 現段階の機能

- **Noctis Blue**：通常の不透明テーマ。
- **Noctis Blue Transparent**：VS Codeの公式配色機能だけを使用して、主要な背景色を透明にするテーマ。
- 色の管理元は `palette/colors.json`。両テーマを `npm run build` で生成する。
- カーソル・エラーは `#FF4DE1`、コメントは `#465082`。Emacs版の色の役割を引き継ぐ。
- Apc、外部のCSS注入拡張、VS Code本体改変は行わない。

**内蔵Markdown Editorの透過は実機未確認**。このエディタはWebviewで描画されるため、テーマの `editor.background` を透明にしても、親の背景などが残る可能性がある。実測するまでは追加のCSS変更を行わない。

壁紙画像そのものの表示・画像切り替えは [vscode-wallpaper](https://github.com/takashit16833/vscode-wallpaper) の責務であり、このテーマでは管理しない。

## インストールと確認

```bash
git clone https://github.com/takashit16833/vscode-noctis-blue.git
cd vscode-noctis-blue
npm test
npx --yes @vscode/vsce package --no-dependencies
code --install-extension noctis-blue-0.1.0.vsix
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
