# Noctis Blue

Emacs版 [Retro Hacker Blue](https://github.com/takashit16833/emacs-retro-hacker-blue-theme) の配色を基準にした VS Code 用テーマである。

通常版と透過版で配色を共有し、背景画像・透過・ぼかしも同じ拡張に含める。

## テーマ

- **Noctis Blue**: 通常の不透明テーマ。
- **Noctis Blue Transparent**: 背景画像を見せるための透過テーマ。
- 配色の唯一の管理元は `palette/colors.json`。
- JSON / JSONC / JSON Lines のプロパティ名は基本文字色 `#5EAFFF` に揃える。
- `themes/*.json` は `npm run build` で生成する。

## 構成

利用者が導入する拡張機能は **Noctis Blue ひとつ**。
内部では配色、壁紙、透過・ぼかし、Markdown Editor の処理を分けて保守する。

## インストール

Mac 側で実行する。

```bash
cd ~/vscode-noctis-blue
git switch main
git pull --ff-only
bash ./install.sh
```

`install.sh` はテスト・VSIX 作成・ローカル VS Code への導入を行う。ほかの拡張のインストール状態は変更しない。

**VS Code 本体の読み込み方式が変わる版へ更新するときは、更新前の Noctis Blue で `Disable Automatic Appearance` を実行し、`Developer: Reload Window` で復元を確認してからインストールする。** 更新後は `Enable Automatic Appearance` で再度有効化する。すでに更新して解除できない場合、管理していた版を一時的に再導入して解除する。管理ファイルを手動削除しない。
workbench の管理ファイルは、バックアップと読み込みスクリプトを検証できた場合だけ変更する。検証できない場合は停止し、無断で修正・削除しない。

## 基本設定

```jsonc
{
  "workbench.colorTheme": "Noctis Blue Transparent",
  "noctisBlue.wallpaper.enabled": true,
  "noctisBlue.wallpaper.image": "/path/to/wide.png",
  "noctisBlue.wallpaper.alternateImage": "/path/to/tall.png",
  "noctisBlue.wallpaper.switchMode": "orientation",
  "noctisBlue.wallpaper.tint": "#FFFFFF",
  "noctisBlue.opacity": {
    "editor": 0.91,
    "minimap": 0.5,
    "sidebar": 0.93,
    "panel": 0.94,
    "auxiliaryBar": 0.86,
    "chrome": 0.93,
    "gap": 0.91
  }
}
```

背景画像の設定は `noctisBlue.wallpaper.*` を使用する。
`minimap` はミニマップ自身の背景色（通常版の `minimap.background`）に追加する不透明度であり、文字やスクロール位置の表示は薄くしない。エディタ全体の背景色の上に重なるため、`minimap: 0.5` が画面上で50%の不透明度になるわけではない。0にすると従来と同様にミニマップ固有の背景は透明になる。

Transparent 版のタブは、通常版の選択中・非選択の背景色をそれぞれ50%不透明で残す。エディタ領域の半透明背景の上に重なるため、最終表示が50%不透明になるわけではない。追加の設定項目を増やさず、VS Code 標準テーマ色によって描画する。

## 自動適用

初回は **Noctis Blue: Enable Automatic Appearance** を実行して本体変更への同意を確認する。明示的に有効化していない場合、ファイルが存在するだけでは自動適用を開始しない。
その後は `Developer: Reload Window` で反映する。

設定変更は生成 CSS だけを更新し、勝手にウィンドウを再読み込みしない。
通常の Noctis Blue に切り替えると透過 CSS がなくなり、背景画像の有効設定は維持する。

**Noctis Blue: Disable Automatic Appearance** は背景画像と透過の自動適用をまとめて解除する。
**Noctis Blue: Repair Background Loader** は VS Code 更新後の修復用。

## 内蔵 Markdown Editor

VS Code 内蔵のリッチ Markdown Editor（`vscode.markdown.editor`）は独立した Webview である。

Noctis Blue の通常本文色は従来どおり `#5EAFFF` を使う。パレット上の `white` は Emacs 版 Retro Hacker Blue の `fg-pale` と同じ `#A6CAFF` に揃える。コードブロック背景は Emacs 版の `org-block-bg` と同じ `#0A1A36` を基準にし、Transparent 版では 75% 不透明（`#0A1A36BF`）で描画する。

公開 API だけでは Webview 本体へ任意 CSS を追加できないため、Noctis Blue は明示的に有効化した場合だけ、VS Code 組み込み Markdown 拡張の `markdown-editor-out/editor.css` 末尾へ管理ブロックを追記する。

**Noctis Blue: Enable Markdown Editor Appearance** を一度実行して確認ダイアログを承認すると、次を自動適用する。
Dev Container ではリモートサーバー上の CSS を VS Code のファイル操作 API で探し、対象を確認してから変更する。書き込み権限がない場合はエラーになり、権限は自動変更しない。実機での再検証が必要。

- 見出し `.md-heading`: Emacs `fg-pale` と同じ `#A6CAFF`
- H1/H2: 左外側 `-14px` に `::before` の青い縦線を表示し、文字行の中心に揃える
- H2: 標準の下線を非表示
- `pre.md-code-block`: 枠線なし
- 引用: Obsidian と同じ青系の背景 `#001947`、文字 `#4C9EEB`、枠 `#5EAFFF`、左罫線 `2px`
- インラインコード: 文字 `#7CBEFF`、背景 `#052A59`、上下左右の余白を調整
- 引用・インラインコードの背景は Transparent 版で45%不透明（Obsidian の背景画像表示に合わせる）
- `text` / `plaintext` コードブロック: 通常本文と同じ `#5EAFFF`
- 通常リンク: Emacs版と同じ `fg-muted = #316CBD`、太字、下線
- 表ヘッダー: 先頭行のセルを `#316CBD` + 太字
- 表罫線: 既存の太さ・線種を維持し、`widget.border`（現在 `#153A75`）
- 編集中ブロック: 元の `--md-block-active-background` を維持したまま指定不透明度へ調整

```jsonc
"noctisBlue.markdownActiveBlockOpacity": 0.65
```

元の `editor.css` は隣にバックアップし、**Noctis Blue: Disable Markdown Editor Appearance** で内容を検証して復元する。VS Code 更新後に未加工の CSS と古いバックアップが残った場合、由来を確認できないため自動削除・再適用せず停止する。Markdown の有効化は接続先ごとの許可で管理し、更新後の新しい接続先では再有効化が必要となる。

Markdown の CSS は Noctis Blue のテーマでだけ効き、不透明度はアプリ全体で共通設定とする。拡張機能の更新後は **Developer: Reload Window** を実行して新しいコードを読み込む。CSS 変更後は Markdown Editor を開き直すかウィンドウを再読み込みして表示を反映する。

旧バージョンで有効にしたローカルの Markdown Editor CSS は、旧形式の有効化記録に加え、既存の Noctis Blue 管理ブロックと検証可能なバックアップがある場合だけ接続先別の記録へ引き継ぐ。旧形式の記録だけでは新規の CSS や Dev Container へ適用しない。引き継げない接続先では **Enable Markdown Editor Appearance** で個別に有効化する。

**Noctis Blue をアンインストールする前には、次の両方を解除する。**

1. **Noctis Blue: Disable Markdown Editor Appearance**
2. **Noctis Blue: Disable Automatic Appearance**

それぞれ対象ファイルの復元が成功したことを確認する。

詳細は [docs/markdown-editor.md](docs/markdown-editor.md)。

## コマンドの使い分け

コマンドパレットには、利用者向けの次の5つを表示する。

- **Noctis Blue: Enable Automatic Appearance** — 壁紙・透過・ぼかしをまとめて有効にする。
- **Noctis Blue: Disable Automatic Appearance** — 壁紙・透過・ぼかしの自動適用を解除する。
- **Noctis Blue: Enable Markdown Editor Appearance** — 組み込み Markdown Editor の装飾を有効にする。組み込み CSS を変更するため、権限が必要。
- **Noctis Blue: Disable Markdown Editor Appearance** — 組み込み Markdown Editor の装飾を解除する。
- **Noctis Blue: Repair Background Loader** — VS Code 更新後の修復用（通常操作では不要）。

開発・原因切り分け用の以下3つは、コマンドパレットに表示しない。
コマンド自体は廃止せず、拡張 API 等から呼び出せる。

- `noctisBlue.showCombinedTransparencyTest`
- `noctisBlue.showOpacityScript`
- `noctisBlue.showMarkdownActiveBlockTest`

日常操作で診断コマンドを実行する必要はない。

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
