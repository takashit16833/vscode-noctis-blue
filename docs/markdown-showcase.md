# Markdown Showcase

Noctis Blue の Markdown Editor / Markdown Preview の見た目を確認するためのショーケース。
色、背景、余白、行間、境界線、強調表示、折り返しなどを一枚で確認する。

> このファイルは見た目確認用であり、説明資料ではない。表示調整時は内容をなるべく維持する。

---

## 見出し

# Heading 1 / 見出し1

## Heading 2 / 見出し2

### Heading 3 / 見出し3

#### Heading 4 / 見出し4

##### Heading 5 / 見出し5

###### Heading 6 / 見出し6

通常本文。Noctis Blue の基本文字色、行間、段落間隔を確認する。

---

## 本文と文字装飾

通常テキスト / English text / 日本語テキスト / 1234567890 / !?()[]{}:;,.。

**太字**、*斜体*、***太字 + 斜体***、~~取り消し線~~。

文章の途中に **太字**、*斜体*、~~取り消し線~~、`inline code`、[リンク](https://code.visualstudio.com/) を混在させる。

`npm test` や `Noctis Blue: Enable Markdown Editor Appearance` のような長めのインラインコードも確認する。

記号の確認: \*asterisk\*、\_underscore\_、\# hash、\[bracket\]、\`backtick\`。

URL の確認: <https://github.com/takashit16833/vscode-noctis-blue>

---

## 段落と折り返し

短い段落。

これは幅の狭いウィンドウでの折り返しを確認するための少し長い段落である。日本語と English words と `inline-code` と **bold text** と [link text](https://example.com/) を混ぜ、行末付近で装飾がどのように折り返されるかを確認する。背景透過時には文字の視認性も同時に確認する。

very-long-token-without-natural-breakpoints-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-very-long-token-without-natural-breakpoints

---

## 引用

> これは通常の引用。
>
> 複数行の引用では、背景・左線・本文色・行間を確認する。

> 親の引用
>
> > 入れ子の引用
> >
> > **太字**、*斜体*、`inline code` を含む。

---

## 箇条書き

- 第一項目
- 第二項目
  - 子項目 A
  - 子項目 B
    - 孫項目
- 第三項目

1. Ordered item 1
2. Ordered item 2
   1. Nested ordered item
   2. Nested ordered item
3. Ordered item 3

- 箇条書きの中に段落を含める。

  2行目の文章。インデントと段落間隔を確認する。

  ```text
  list item 内の code block
  second line
  ```

---

## チェックボックス

- [x] 完了したタスク
- [ ] 未完了のタスク
- [x] **太字**を含むタスク
- [ ] `inline code` を含むタスク
  - [x] 子タスク
  - [ ] 子タスク

---

## 表

| 種別 | 表示例 | 備考 |
| --- | --- | --- |
| 通常 | Noctis Blue | 通常テキスト |
| 太字 | **Bold** | 強調 |
| 斜体 | *Italic* | 強調 |
| コード | `inline code` | コード表示 |
| リンク | [VS Code](https://code.visualstudio.com/) | リンク色 |
| 日本語 | こんにちは世界 | 行高確認 |

| Left | Center | Right |
| :--- | :---: | ---: |
| left | center | right |
| 100 | 200 | 300 |
| long long long text | `code` | **bold** |

---

## インラインコード

`const answer = 42;`

`/Users/example/project/src/index.ts`

`takashit16833.noctis-blue@0.9.1`

文章中の `background-color: #0A1A36` と `color: #A6CAFF` の表示を確認する。

---

## コードブロック — Shell

```bash
cd ~/vscode-noctis-blue
git switch main
git pull --ff-only
npm test
bash ./install.sh
```

## コードブロック — JSON

```json
{
  "workbench.colorTheme": "Noctis Blue Transparent",
  "vscodeWallpaper.enabled": true,
  "noctisBlue.markdownActiveBlockOpacity": 0.65
}
```

## コードブロック — JavaScript

```javascript
function greet(name) {
  const message = `Hello, ${name}!`;
  console.log(message);
  return { ok: true, message };
}

greet("Noctis Blue");
```

## コードブロック — Haskell

```haskell
{-# LANGUAGE OverloadedStrings #-}

module Main where

import Web.Scotty (get, scotty, text)

main :: IO ()
main = scotty 3000 $ do
  get "/health/live" $ text "OK"
```

## コードブロック — CSS

```css
.md-heading {
  color: #A6CAFF !important;
}

pre.md-code-block {
  border: none !important;
  background: #0A1A36;
}
```

## コードブロック — Diff

```diff
- old foreground: #5EAFFF
+ heading foreground: #A6CAFF
+ code block background: #0A1A36
```

## コードブロック — 長い行

```text
0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz
```

---

## リンク

[Noctis Blue repository](https://github.com/takashit16833/vscode-noctis-blue)

[VS Code Theme Color reference](https://code.visualstudio.com/api/references/theme-color)

<https://github.com/>

---

## 区切り線

上の段落。

---

中央の段落。

***

下の段落。

---

## 装飾の組み合わせ

> **重要そうな引用**の中に `inline code` と [link](https://example.com/) を置く。

- **Bold item**
- *Italic item*
- ~~Deleted item~~
- `Code item`
- [Linked item](https://example.com/)

| Combination | Example |
| --- | --- |
| Bold + code | **run `npm test` now** |
| Italic + link | *see [documentation](https://code.visualstudio.com/)* |
| Strike + code | ~~old `setting.name`~~ |

---

## Markdown 記法そのもの

以下は Markdown のソース表示確認用。

````markdown
# Heading

**bold** *italic* ~~strike~~ `inline code`

> blockquote

- item
- [x] task

```javascript
console.log("code block");
```
````

---

## 最終確認用

通常本文の色、見出しの `fg-pale`、リンク、インラインコード、引用、表、リスト、チェックボックス、コードブロック背景、コードブロック枠線、折り返しを上から順に確認する。

**Bold** / *Italic* / ~~Strike~~ / `Code` / [Link](https://example.com/) / 通常本文
