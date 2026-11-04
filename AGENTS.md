# Maintenance guidelines

- Noctis Blueの外観の正本。既存の拡張機能を無条件に統合しない。
- 配色はEmacs版Retro Hacker Blueを基準にし、`palette/colors.json` を唯一の色定義元とする。
- `themes/*.json` は生成物。変更したら `npm run build && npm test` を実行する。
- 公式テーマ設定だけで実現できる範囲を先に検証する。Apc、本体改変、CSS注入は実機検証で必要と判明するまで導入しない。
- Markdown Live Previewは移植しない。内蔵Markdown Editorの透過を最優先で検証する。
- 背景画像表示は別リポジトリ `vscode-wallpaper` が担当し、テーマは配色・透過を担当する。
- 読みやすさが損なわれないよう、補完候補やメニューの背景は当面不透明にする。
- 元テーマのMITライセンスと著作権表記を保持する。
- 領域別の背景不透明度（0〜1）を Noctis Blue 側で設定できるようにする。色は `palette/colors.json` を用い、背景色の個別設定は増やさない。
- **旧 `vscode-wallpaper` の仕様と実測結果は `docs/wallpaper-spec.md` を参照する。** 領域単位で一度だけ色を重ね、内側の下地を透明にする。テーマ色を単純に半透明へ変えるだけでは重複塗りの恐れがある。
- 壁紙画像と `tint` の乗算と、領域の背景色の透明度は別の処理。旧wallpaperとNoctisの不透明度を重複適用しない。本体への読み込み処理も二重導入しない。
