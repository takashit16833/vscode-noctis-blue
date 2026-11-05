'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const manifest = require('../package.json');
const palette = require('../palette/colors.json');
const { validateOpacity, generateMarkdownCss, generateTemporaryMarkdownScript } =
  require('../src/markdownAppearance');

test('Markdown Editor CSS follows the Emacs document palette', () => {
  const css = generateMarkdownCss(0.65);

  assert.match(css, /\.md-heading \{/);
  assert.match(css, /data-vscode-theme-id="Noctis Blue"/);
  assert.match(css, /data-vscode-theme-id="Noctis Blue Transparent"/);
  for (const theme of manifest.contributes.themes) assert.equal(theme.id, theme.label);
  assert.match(css, new RegExp('color: ' + palette.pale.replace('#', '\\#') + ' !important;', 'i'));

  assert.match(css, /pre\.md-code-block \{/);
  assert.match(css, /border: none !important;/);

  assert.match(css, /blockquote\.md-blockquote \{/);
  assert.match(css, /--vscode-textCodeBlock-background, #0A1A36\)/i);

  assert.match(css, /\.md-document code:not\(pre code\) \{/);
  assert.match(css, /--vscode-editor-foreground, #5EAFFF\)/i);
  assert.match(css, /--vscode-textCodeBlock-background, #0A1A36\)/i);

  assert.match(css, /\.md-document a \{/);
  assert.match(css, /color: #316CBD !important;/i);
  assert.match(css, /font-weight: 700 !important;/);
  assert.match(css, /text-decoration: underline !important;/);

  assert.match(css, /pre\.md-code-block > code\.language-text,/);
  assert.match(css, /code\.language-plaintext \{/);
  assert.match(css, /--vscode-editor-foreground, #5EAFFF\)/i);

  assert.match(css, /\.md-table tr:first-child > td \{/);
  assert.match(css, /\.md-table td \{/);
  assert.match(css, /--vscode-widget-border, #153A75\)/i);
  assert.doesNotMatch(css, /border-width:/);
  assert.doesNotMatch(css, /border-style:/);

  assert.match(css, /--md-block-active-background/);
  assert.match(css, /65%, transparent/);
  assert.match(css, /box-shadow: 0 0 0 8px color-mix/);
  assert.match(css, /\.md-editor:not\(\.md-no-active-block-highlight\) \.md-block-active/);
  assert.doesNotMatch(css, /display:\s*none|opacity:/);
});

test('markdown opacity setting rejects invalid numbers', () => {
  for (const n of [null, undefined, -0.1, 1.1, '0.65', NaN, Infinity, {}]) {
    assert.throws(() => validateOpacity(n), Error);
  }
  assert.equal(validateOpacity(0), 0);
  assert.equal(validateOpacity(1), 1);
  const cfg = manifest.contributes.configuration.properties['noctisBlue.markdownActiveBlockOpacity'];
  assert.equal(cfg.type, 'number');
  assert.equal(cfg.scope, 'application');
  assert.equal(cfg.default, 0.65);
  assert.equal(cfg.minimum, 0);
  assert.equal(cfg.maximum, 1);
});

test('webview test script only toggles a temporary stylesheet', () => {
  const script = generateTemporaryMarkdownScript(0.65);
  assert.ok(script.includes('document.querySelector(".md-editor")'));
  assert.match(script, /noctis-blue-markdown-active-test/);
  assert.match(script, /existing\.remove\(\)/);
  assert.match(script, /document\.head\.appendChild\(style\)/);
  assert.doesNotMatch(script, /workbench\.html|require\(|localStorage|fetch\(|vscode\.workspace/);
});

test('generated JavaScript applies and then removes only its own style node', () => {
  const script = generateTemporaryMarkdownScript(0.65);
  const nodes = new Map();
  const root = { querySelector: () => null };
  const document = {
    querySelector: selector => selector === '.md-editor' ? root : null,
    getElementById: id => nodes.get(id) || null,
    createElement: () => ({
      id: '', textContent: '',
      remove() { nodes.delete(this.id); }
    }),
    head: { appendChild(node) { nodes.set(node.id, node); } }
  };
  const context = {
    document,
    getComputedStyle: () => ({ getPropertyValue: () => '#052A59' }),
    console: { info() {} }
  };
  assert.match(vm.runInNewContext(script, context), /適用/);
  const style = nodes.get('noctis-blue-markdown-active-test');
  assert.ok(style);
  assert.match(style.textContent, /\.md-heading/);
  assert.match(style.textContent, /blockquote\.md-blockquote/);
  assert.match(style.textContent, /code:not\(pre code\)/);
  assert.match(style.textContent, /\.md-document a/);
  assert.match(style.textContent, /code\.language-text/);
  assert.match(style.textContent, /\.md-table tr:first-child > td/);
  assert.match(style.textContent, /\.md-table td/);
  assert.match(style.textContent, /var\(--md-block-active-background/);
  assert.match(vm.runInNewContext(script, context), /解除/);
  assert.equal(nodes.size, 0);
});

test('generated JavaScript refuses non-Markdown context without mutation', () => {
  const script = generateTemporaryMarkdownScript(0.65);
  const context = {
    document: { querySelector: () => null },
    console: { info() {} }
  };
  assert.throws(() => vm.runInNewContext(script, context), /Markdown Editor/);
});
