'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const manifest = require('../package.json');
const { validateOpacity, generateMarkdownCss, generateTemporaryMarkdownScript } =
  require('../src/markdownAppearance');

test('Markdown active block translucency preserves theme-supplied color', () => {
  const css = generateMarkdownCss(0.65);
  assert.match(css, /--md-block-active-background/);
  assert.match(css, /65%, transparent/);
  assert.match(css, /background: color-mix\(in srgb, var\(--md-block-active-background, #f8f8f8\) 65%, transparent\) !important;/);
  assert.match(css, /box-shadow: 0 0 0 8px color-mix/);
  assert.match(css, /\.md-editor:not\(\.md-no-active-block-highlight\) \.md-block-active/);
  assert.doesNotMatch(css, /background:\s*transparent\b|display:\s*none|opacity:/);
});

test('markdown opacity setting rejects invalid numbers', () => {
  for (const n of [null, undefined, -0.1, 1.1, '0.65', NaN, Infinity, {}]) {
    assert.throws(() => validateOpacity(n), Error);
  }
  assert.equal(validateOpacity(0), 0);
  assert.equal(validateOpacity(1), 1);
  const cfg = manifest.contributes.configuration.properties['noctisBlue.markdownActiveBlockOpacity'];
  assert.equal(cfg.type, 'number');
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
