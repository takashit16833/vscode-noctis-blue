'use strict';

// The rich Markdown editor is an independent webview. Keep all Markdown-only
// overrides here so they cannot leak into the VS Code workbench.
const palette = require('../palette/colors.json');

const CSS_VARIABLE = 'var(--md-block-active-background, #f8f8f8)';
const SELECTOR = '.md-editor:not(.md-no-active-block-highlight) .md-block-active';
const STYLE_ID = 'noctis-blue-markdown-active-test';
const THEME_ROOT = 'body:is([data-vscode-theme-id="Noctis Blue"], ' +
  '[data-vscode-theme-id="Noctis Blue Transparent"])';
const scoped = selector => THEME_ROOT + ' ' + selector;
const TRANSPARENT_THEME_ROOT = 'body[data-vscode-theme-id="Noctis Blue Transparent"]';

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
    scoped('.md-heading') + ' {',
    '  color: ' + palette.pale + ' !important;',
    '}',
    '',
    scoped('h1.md-heading') + ',',
    scoped('h2.md-heading') + ',',
    scoped('h3.md-heading') + ' {',
    '  position: relative;',
    '}',
    '',
    scoped('h1.md-heading::before') + ',',
    scoped('h2.md-heading::before') + ',',
    scoped('h3.md-heading::before') + ' {',
    '  content: "";',
    '  position: absolute;',
    '  left: -14px;',
    '  top: 0.6em;',
    '  width: 3px;',
    '  height: 1em;',
    '  transform: translateY(-50%);',
    '  background: var(--vscode-editor-foreground, ' + palette.foreground + ');',
    '  border-radius: 999px;',
    '}',
    '',
    // Keep H1's underline thickness; use the next brighter blue in the palette.
    scoped('h1.md-heading') + ' {',
    '  border-bottom-color: ' + palette.muted + ' !important;',
    '}',
    '',
    // H2 regains its original underline. H3 takes over H2's stripe-only style.
    scoped('h3.md-heading') + ' {',
    '  border-bottom: none !important;',
    '}',
    '',
    scoped('pre.md-code-block') + ' {',
    '  border: none !important;',
    '}',
    '',
    '/* Match Obsidian quote colors and its default 2px left border. */',
    scoped('blockquote.md-blockquote') + ' {',
    '  color: ' + palette.dim + ' !important;',
    '  background-color: ' + palette.markdownQuoteBackground + ' !important;',
    '  border-color: ' + palette.foreground + ' !important;',
    '  border-left-width: 2px !important;',
    '}',
    '',
    '/* Inline code is CODE outside PRE; fenced blocks keep their own styling. */',
    scoped('.md-document code:not(pre code)') + ' {',
    '  color: ' + palette.light + ' !important;',
    '  background-color: ' + palette.focus + ' !important;',
    '  border: none !important;',
    '  padding: 0.15em 0.35em !important;',
    '}',
    '',
    '/* Obsidian uses 45% block opacity when its wallpaper is visible. */',
    TRANSPARENT_THEME_ROOT + ' blockquote.md-blockquote {',
    '  background-color: color-mix(in srgb, ' + palette.markdownQuoteBackground + ' 45%, transparent) !important;',
    '}',
    TRANSPARENT_THEME_ROOT + ' .md-document code:not(pre code) {',
    '  background-color: color-mix(in srgb, ' + palette.focus + ' 45%, transparent) !important;',
    '}',
    '',
    '/* Observed: normal Markdown links are plain A elements. */',
    scoped('.md-document a') + ' {',
    '  color: ' + palette.muted + ' !important;',
    '  font-weight: 700 !important;',
    '  text-decoration: underline !important;',
    '  text-decoration-color: ' + palette.muted + ' !important;',
    '}',
    '',
    '/* Plain text fenced blocks should use the normal editor foreground. */',
    scoped('pre.md-code-block > code.language-text') + ',',
    scoped('pre.md-code-block > code.language-plaintext') + ' {',
    '  color: var(--vscode-editor-foreground, ' + palette.foreground + ') !important;',
    '}',
    '',
    '/* Observed: Markdown tables use TD cells; the first TR is the visual header. */',
    scoped('.md-table tr:first-child > td') + ' {',
    '  color: ' + palette.muted + ' !important;',
    '  font-weight: 700 !important;',
    '}',
    '',
    '/* Preserve the existing border width/style; use the subdued theme border. */',
    scoped('.md-table td') + ' {',
    '  border-color: var(--vscode-widget-border, ' + palette.border + ') !important;',
    '}',
    '',
    '/* Keep the active-block highlight; change only alpha. */',
    scoped(SELECTOR) + ' {',
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
