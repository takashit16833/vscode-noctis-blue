'use strict';

// The rich Markdown editor is an independent webview. The active block uses
// its own CSS color variable, which is not a VS Code theme color ID.
// Never replace that color: only mix it with transparency.
const CSS_VARIABLE = 'var(--md-block-active-background, #f8f8f8)';
const SELECTOR = '.md-editor:not(.md-no-active-block-highlight) .md-block-active';
const STYLE_ID = 'noctis-blue-markdown-active-test';

function validateOpacity(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error('noctisBlue.markdownActiveBlockOpacity は0～1の数値で指定してください。');
  }
  return value;
}

function generateMarkdownCss(opacity) {
  const percent = Math.round(validateOpacity(opacity) * 10000) / 100;
  const background = 'color-mix(in srgb, ' + CSS_VARIABLE + ' ' + percent + '%, transparent)';
  return [
    '/* Keep the Markdown Editor active-block highlight; change only alpha. */',
    SELECTOR + ' {',
    '  background: ' + background + ' !important;',
    '  box-shadow: 0 0 0 8px ' + background + ' !important;',
    '}',
    ''
  ].join('\n');
}

function generateTemporaryMarkdownScript(opacity) {
  const css = generateMarkdownCss(opacity);
  return [
    '/* Run in Developer Tools Console with the "Markdown Editor" frame selected. */',
    '(() => {',
    '  "use strict";',
    '  const root = document.querySelector(".md-editor");',
    '  if (!root) throw new Error("Markdown Editor のフレームで実行してください。");',
    '  const existing = document.getElementById(' + JSON.stringify(STYLE_ID) + ');',
    '  if (existing) {',
    '    existing.remove();',
    '    return "Noctis Blue: Markdownの一時半透明表示を解除しました";',
    '  }',
    '  const active = root.querySelector(".md-block-active");',
    '  const sourceColor = getComputedStyle(active || root)',
    '    .getPropertyValue("--md-block-active-background").trim() || "(変数未定義: 元CSSの代替色)";',
    '  const style = document.createElement("style");',
    '  style.id = ' + JSON.stringify(STYLE_ID) + ';',
    '  style.textContent = ' + JSON.stringify(css) + ';',
    '  document.head.appendChild(style);',
    '  console.info("Noctis Blue: 元の背景色:", sourceColor);',
    '  return "Noctis Blue: 背景色を保った半透明表示を適用しました";',
    '})();',
    ''
  ].join('\n');
}

module.exports = { validateOpacity, generateMarkdownCss, generateTemporaryMarkdownScript };
