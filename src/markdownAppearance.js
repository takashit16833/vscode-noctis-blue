'use strict';

// The rich Markdown editor is an independent webview. Keep all Markdown-only
// overrides here so they cannot leak into the VS Code workbench.
const palette = require('../palette/colors.json');

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
  const activeBackground =
    'color-mix(in srgb, ' + CSS_VARIABLE + ' ' + percent + '%, transparent)';
  return [
    '/* Noctis Blue Markdown Editor appearance. */',
    '.md-heading {',
    '  color: ' + palette.pale + ' !important;',
    '}',
    '',
    'pre.md-code-block {',
    '  border: none !important;',
    '}',
    '',
    '/* Observed: BLOCKQUOTE.md-block.md-blockquote uses textBlockQuote.background. */',
    'blockquote.md-blockquote {',
    '  background: color-mix(in srgb, var(--vscode-textBlockQuote-background, #222222) 65%, transparent) !important;',
    '}',
    '',
    '/* Observed: inline code is CODE outside PRE; keep fenced code unchanged. */',
    '.md-document code:not(pre code) {',
    '  color: var(--vscode-editor-foreground, ' + palette.foreground + ') !important;',
    '  background: var(--vscode-textCodeBlock-background, ' + palette.markdownCodeBlockBackground + ') !important;',
    '}',
    '',
    '/* Observed: normal Markdown links are plain A elements. */',
    '.md-document a {',
    '  color: ' + palette.muted + ' !important;',
    '  font-weight: 700 !important;',
    '  text-decoration: underline !important;',
    '  text-decoration-color: ' + palette.muted + ' !important;',
    '}',
    '',
    '/* Keep the active-block highlight; change only alpha. */',
    SELECTOR + ' {',
    '  background: ' + activeBackground + ' !important;',
    '  box-shadow: 0 0 0 8px ' + activeBackground + ' !important;',
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
    '  return "Noctis Blue: Markdown表示調整を一時適用しました";',
    '})();',
    ''
  ].join('\n');
}

module.exports = { validateOpacity, generateMarkdownCss, generateTemporaryMarkdownScript };
