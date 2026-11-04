# Maintenance guidelines

- Noctis Blueの外観の正本。既存の拡張機能を無条件に統合しない。
- 配色はEmacs版Retro Hacker Blueを基準にし、`palette/colors.json` を唯一の色定義元とする。
- `themes/*.json` は生成物。変更したら `npm run build && npm test` を実行する。
- 公式テーマ設定だけで実現できる範囲を先に検証する。Apc、本体改変、CSS注入は実機検証で必要と判明するまで導入しない。
- Markdown Live Previewは移植しない。内蔵Markdown Editorの透過を最優先で検証する。
- 背景画像表示は別リポジトリ `vscode-wallpaper` が担当し、テーマは配色・透過を担当する。
- 読みやすさが損なわれないよう、補完候補やメニューの背景は当面不透明にする。
- 元テーマのMITライセンスと著作権表記を保持する。
