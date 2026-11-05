# Noctis Blue

Emacs 版 [Retro Hacker Blue](https://github.com/takashit16833/emacs-retro-hacker-blue-theme) をもとにした VS Code 用の青系テーマです。

- **Noctis Blue**：通常版
- **Noctis Blue Transparent**：背景画像と透過表示に対応する版

## インストール

macOS のターミナルで実行します。VS Code と Node.js（npm）が必要です。

初めて導入する場合：

```bash
git clone git@github.com:takashit16833/vscode-noctis-blue.git ~/vscode-noctis-blue
cd ~/vscode-noctis-blue
bash ./install.sh
```

既に導入している場合：

```bash
cd ~/vscode-noctis-blue
git pull --ff-only
bash ./install.sh
```

インストール後は VS Code で **Developer: Reload Window** を実行してください。

## 有効化

1. VS Code のテーマを **Noctis Blue** または **Noctis Blue Transparent** に変更します。
2. 背景画像・透過・ぼかしを使う場合は、コマンドパレットから **Noctis Blue: Enable Automatic Appearance** を実行し、確認画面を承認します。
3. **Developer: Reload Window** で表示を更新します。

背景画像・透過機能は VS Code 本体のファイルを変更するため、初回の明示的な許可が必要です。テーマを選ぶだけでは自動的に有効になりません。

内蔵 Markdown Editor の装飾を使う場合は、別途 **Noctis Blue: Enable Markdown Editor Appearance** を実行して確認画面を承認してください。Dev Container などの接続先では、その接続先ごとに有効化が必要です。

## 基本設定

VS Code の `settings.json` で設定します。

```json
{
  "workbench.colorTheme": "Noctis Blue Transparent",
  "noctisBlue.wallpaper.enabled": true,
  "noctisBlue.wallpaper.image": "/path/to/wide.png",
  "noctisBlue.wallpaper.alternateImage": "/path/to/tall.png",
  "noctisBlue.wallpaper.switchMode": "orientation",
  "noctisBlue.wallpaper.tint": "#FFFFFF",
  "noctisBlue.opacity": {
    "editor": 0.91,
    "gutter": 0.5,
    "minimap": 0.5,
    "tabs": 0.75,
    "breadcrumbs": 0.75,
    "sidebar": 0.93,
    "panel": 0.94,
    "auxiliaryBar": 0.86,
    "chrome": 0.93,
    "gap": 0.91
  },
  "noctisBlue.markdownActiveBlockOpacity": 0.65,
  "editor.renderLineHighlight": "all"
}
```

### 背景画像

- `noctisBlue.wallpaper.enabled`：背景画像の有効・無効
- `image`：使用する画像
- `alternateImage`：条件に応じて切り替える画像。不要なら空文字
- `switchMode`：切り替え条件。縦長画面なら `orientation`、縦横比なら `aspect-ratio`、画面幅なら `width`
- `maxAspectRatio`：`aspect-ratio` 使用時の境界値（例：`"16/10"`）
- `maxWidth`：`width` 使用時の境界値（例：`1400`）
- `tint`：背景画像に乗算する色。`#FFFFFF` なら元の色を維持

### 不透明度

`noctisBlue.opacity` は 0（透明）から 1（不透明）まで指定できます。

| 項目 | 対象 |
| --- | --- |
| `editor` | エディタ全体 |
| `gutter` | 行番号・折りたたみ記号のある左側 |
| `minimap` | ミニマップ |
| `tabs` | ファイルのタブが並ぶ領域 |
| `breadcrumbs` | パンくずリスト |
| `sidebar` | サイドバー |
| `panel` | ターミナルなどのパネル |
| `auxiliaryBar` | チャットなどの補助サイドバー |
| `chrome` | タイトルバー・ステータスバーなど |
| `gap` | パネル間と外周の隙間 |

`gutter` や `minimap` などはエディタ背景の上に色を重ねるため、指定値が画面全体の最終的な不透明度になるわけではありません。`gutter` の値を上げると行番号の背景が濃くなります。

現在行を行番号の背景も含めて強調する場合は、`"editor.renderLineHighlight": "all"` を使用します。

### Markdown Editor

編集中のブロックの背景は、次の設定で調整できます。

```json
"noctisBlue.markdownActiveBlockOpacity": 0.65
```

この設定は VS Code 全体で共通です。内蔵 Markdown Editor の装飾を有効にしてから使用してください。変更後に表示が更新されない場合は、Markdown Editor を開き直すか **Developer: Reload Window** を実行します。

接続先のファイルに書き込み権限がない場合は、装飾を有効化できません。権限は自動変更されません。

## コマンド

コマンドパレットから利用できます。

| コマンド | 用途 |
| --- | --- |
| **Noctis Blue: Enable Automatic Appearance** | 背景画像・透過・ぼかしの有効化 |
| **Noctis Blue: Disable Automatic Appearance** | 背景画像・透過・ぼかしの解除 |
| **Noctis Blue: Enable Markdown Editor Appearance** | 内蔵 Markdown Editor の装飾を有効化 |
| **Noctis Blue: Disable Markdown Editor Appearance** | 内蔵 Markdown Editor の装飾を解除 |
| **Noctis Blue: Repair Background Loader** | VS Code 更新後、背景が適用されなくなった場合の修復 |

## 更新・アンインストール

VS Code 本体の更新によって背景や Markdown Editor の装飾が反映されなくなる場合があります。問題があるときは、上記の有効化・修復コマンドを使用してください。

**VS Code 本体の読み込み方式が変わる更新を行う場合**は、更新前に **Noctis Blue: Disable Automatic Appearance** を実行し、**Developer: Reload Window** で元に戻ったことを確認してください。更新後に必要に応じて再度有効化します。

**Noctis Blue をアンインストールする前**には、以下の両方を実行し、それぞれ復元が成功したことを確認してください。

1. **Noctis Blue: Disable Markdown Editor Appearance**
2. **Noctis Blue: Disable Automatic Appearance**

復元に失敗した場合は、VS Code 本体のファイルやバックアップを手動で削除せず、エラー内容を確認してください。
