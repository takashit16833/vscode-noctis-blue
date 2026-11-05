# Noctis Blue

Emacs版 [Retro Hacker Blue](https://github.com/takashit16833/emacs-retro-hacker-blue-theme) の配色を基準にした VS Code 用テーマである。

通常版と透過版で配色を共有し、背景画像は
[vscode-wallpaper](https://github.com/takashit16833/vscode-wallpaper) に分離する。

## テーマ

- **Noctis Blue**: 通常の不透明テーマ。
- **Noctis Blue Transparent**: 背景画像を見せるための透過テーマ。
- 配色の唯一の管理元は `palette/colors.json`。
- JSON / JSONC / JSON Lines のプロパティ名は基本文字色 `#5EAFFF` に揃える。
- `themes/*.json` は `npm run build` で生成する。

## 責務

### Noctis Blue

- UI の配色
- editor / sidebar / panel / auxiliaryBar / chrome / gap の背景不透明度
- 重複する内部背景の透明化
- Sticky Scroll と補完候補の背景ぼかし

### vscode-wallpaper

- 背景画像
- tint と画像の乗算
- 画面条件による画像切り替え
- workbench CSS の共通ローダー

同じ表示処理を両方へ重複実装しない。

## インストール

先に VS Code Wallpaper v0.10.0 以降をインストールする。

```bash
cd ~/vscode-wallpaper
git switch main
git pull --ff-only
bash ./install.sh

cd ~/vscode-noctis-blue
git switch main
git pull --ff-only
bash ./install.sh
```

Noctis Blue の `install.sh` はテスト、VSIX 作成、インストールまで行う。
Noctis Blue 自身は `workbench.html` を変更しない。Markdown Editor の非公開CSS調整は、利用者が明示的に有効化した場合だけ組み込み Markdown 拡張の `editor.css` へ管理ブロックを追記する。

## 基本設定

```jsonc
{
  "workbench.colorTheme": "Noctis Blue Transparent",

  "vscodeWallpaper.enabled": true,
  "vscodeWallpaper.image": "/path/to/wallpaper.png",
  "vscodeWallpaper.alternateImage": "/path/to/alternate.png",
  "vscodeWallpaper.switchMode": "orientation",
  "vscodeWallpaper.tint": "#FFFFFF",

  "noctisBlue.opacity": {
    "editor": 0.91,
    "sidebar": 0.93,
    "panel": 0.94,
    "auxiliaryBar": 0.86,
    "chrome": 0.93,
    "gap": 0.91
  }
}
```

`noctisBlue.opacity` は背景色の不透明度である。
`0` は完全透明、`1` は不透明。文字やアイコン全体の `opacity` は変更しない。

## 自動適用

Noctis Blue v0.7.0 以降は VS Code Wallpaper v0.10.0 の CSS レイヤー API v3 を使う。

1. `Noctis Blue Transparent` を選ぶ。
2. **Noctis Blue: Enable Automatic Appearance** を実行する。
3. VS Code Wallpaper が表示する本体変更の説明を確認し、許可する。
4. **Developer: Reload Window** を実行する。

設定変更やテーマ切り替えでは次回読み込み用 CSS だけを更新する。
勝手な再読み込みや Reload Window を促す通知は行わない。

通常版 `Noctis Blue` や他テーマへ切り替えると Noctis Blue の CSS レイヤーは外れる。
再び `Noctis Blue Transparent` へ戻した場合は、次回の Reload Window で透過表示へ戻る。

**Noctis Blue: Disable Automatic Appearance** は Noctis Blue の CSS レイヤーだけを解除し、VS Code Wallpaper の背景画像設定や自動ローダー自体は無効化しない。レイヤー削除に失敗した場合は無効状態を保存せず、次回も同期・再試行できる状態を維持する。

Noctis Blue が無効化・アンインストールされた場合は、Wallpaper API v3 に登録した提供元情報を使って孤児レイヤーを整理する。

## 内蔵 Markdown Editor

VS Code 内蔵のリッチ Markdown Editor（`vscode.markdown.editor`）は独立した Webview である。

Noctis Blue の通常本文色は従来どおり `#5EAFFF` を使う。パレット上の `white` は Emacs 版 Retro Hacker Blue の `fg-pale` と同じ `#A6CAFF` に揃える。コードブロック背景は Emacs 版の `org-block-bg` と同じ `#0A1A36` を基準にし、Transparent 版では 75% 不透明（`#0A1A36BF`）で描画する。

公開 API だけでは Webview 本体へ任意 CSS を追加できないため、Noctis Blue は明示的に有効化した場合だけ、VS Code 組み込み Markdown 拡張の `markdown-editor-out/editor.css` 末尾へ管理ブロックを追記する。

**Noctis Blue: Enable Markdown Editor Appearance** を一度実行して確認ダイアログを承認すると、次を自動適用する。

- 見出し `.md-heading`: Emacs `fg-pale` と同じ `#A6CAFF`
- H1/H2: 左外側 `-14px` に `::before` の青い縦線を表示し、文字行の中心に揃える
- H2: 標準の下線を非表示
- `pre.md-code-block`: 枠線なし
- 引用: コードブロックと同じ `textCodeBlock.background`
- インラインコード: 本文色 `#5EAFFF` + コードブロックと同じ `textCodeBlock.background`
- `text` / `plaintext` コードブロック: 通常本文と同じ `#5EAFFF`
- 通常リンク: Emacs版と同じ `fg-muted = #316CBD`、太字、下線
- 表ヘッダー: 先頭行のセルを `#316CBD` + 太字
- 表罫線: 既存の太さ・線種を維持し、`widget.border`（現在 `#153A75`）
- 編集中ブロック: 元の `--md-block-active-background` を維持したまま指定不透明度へ調整

```jsonc
"noctisBlue.markdownActiveBlockOpacity": 0.65
```

元の `editor.css` は隣にバックアップし、**Noctis Blue: Disable Markdown Editor Appearance** で完全復元する。VS Code 更新で元 `editor.css` が入れ替わった場合は、次回起動時に新しい元ファイルへ管理ブロックを再適用する。Noctis Blue 管理外の変更を検出した場合は上書きせず停止する。

変更後は開いている Markdown Editor を閉じて開き直すか、**Developer: Reload Window** を実行する。Noctis Blue をアンインストールする前には Markdown Editor Appearance を無効化する。

詳細は [docs/markdown-editor.md](docs/markdown-editor.md)。

## 開発用診断コマンド

- **Noctis Blue: Show Combined Transparency Test**
- **Noctis Blue: Show Temporary Opacity Script**
- **Noctis Blue: Show Markdown Active Block Test**

これらは正式な自動適用経路ではなく、原因切り分け用である。

## 開発

```bash
npm run build
npm test
```

`themes/*.json` は直接編集せず、
`palette/colors.json` または `scripts/theme.js` を変更する。

## 関連資料

- [docs/wallpaper-spec.md](docs/wallpaper-spec.md)
- [docs/markdown-editor.md](docs/markdown-editor.md)
- [docs/markdown-showcase.md](docs/markdown-showcase.md): Markdown Editor / Preview の見た目確認用ショーケース。
- [VS Code Theme Color](https://code.visualstudio.com/api/references/theme-color)
- [VS Code Markdown Extension API](https://code.visualstudio.com/api/extension-guides/markdown-extension)

## 出典とライセンス

MIT ライセンスの [Emacs版 Retro Hacker Blue](https://github.com/takashit16833/emacs-retro-hacker-blue-theme)
を配色設計の出発点とし、元になった
[Retro Hacker Theme](https://github.com/elmersh/retro-hacker-theme) にも謝意を表する。
著作権表示は `LICENSE` に残す。
