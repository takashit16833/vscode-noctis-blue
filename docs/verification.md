# Noctis Blue 統合版の実機確認手順

この文書はバージョン固定の進捗記録ではなく、更新後に繰り返す検証方法である。

## 1. 設定・拡張の管理場所

- Noctis Blue をローカル UI host にインストールし、`extensionKind: ["ui"]` で選択されることを確認する。
- 旧 `takashit16833.vscode-wallpaper` がインストールされていないことを確認する。
- ユーザー設定では `noctisBlue.wallpaper.*` のみを利用し、古い設定との重複管理を避ける。

## 2. 背景画像と領域透過

- `Noctis Blue Transparent` を選択し、`Developer: Reload Window` 後に画像が見えることを確認する。
- ローカル Developer Tools の `top` コンソールで次を実行する（読み取り専用）。

```js
(() => {
  const selectors = ['.monaco-workbench', '.monaco-grid-view', '.part.editor', '.part.sidebar'];
  console.table(selectors.map(selector => {
    const el = document.querySelector(selector);
    const css = el && getComputedStyle(el);
    return { selector, background: css?.backgroundColor, image: css?.backgroundImage.slice(0, 90) };
  }));
  console.log('layers:',
    document.querySelector('link[href*="vscode-wallpaper-layers-"]')?.sheet?.cssRules?.length);
})();
```

- `.monaco-grid-view` の背景が不透明でないことを確認する。
- 透過テーマの切替・画像の縦横切替・元の通常テーマへの切替で意図した結果になることを確認する。

## 3. Dev Container の Markdown Editor

- Dev Container に接続したウィンドウで Markdown Editor を開き、見出し、引用、コードブロック、編集中ブロックの表示を確認する。
- 見た目の再適用に失敗した場合は `Markdown Editor CSS の書き込み権限` と `VS Code Server の設置場所` を個別に調べる。
- Noctis Blue は自動で `sudo` / `chown` を実行しない。
- Markdown Editor Webview の `document.body.getAttribute('data-vscode-theme-id')` を読み取り専用で確認し、Noctis Blue の2テーマでだけ独自 CSS が効くことを確かめる。
- `/vscode/extensions/markdown-language-features/markdown-editor-out/editor.css` が対象環境で読まれているかを確認する。複数候補があるときは指定せず停止する。
- `Noctis Blue: Disable Markdown Editor Appearance` で管理ブロックが解除され、元 CSS が復元されることを確認する。再度有効化する前に所有者を推測で変更しない。

## 4. VS Code 更新・アンインストール

- VS Code 更新で workbench.html や Markdown Editor CSS が交換された場合、管理対象ファイルの整合性が検証できた場合にのみ修復する。
- `Noctis Blue: Repair Background Loader` は更新後の残骸修復専用で、現在の workbench.html を上書きして復元するコマンドではない。
- 完全にアンインストールする前には `Disable Markdown Editor Appearance` と `Disable Automatic Appearance` を実行する。

自動テストは `npm run build && npm test`。実機と同等であるとは主張しない。
