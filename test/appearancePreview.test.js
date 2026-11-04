'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { renderPreviewHtml } = require('../src/appearancePreview');
const theme = require('../themes/noctis-blue.json');

const settings = {
  editor: 0.91, sidebar: 0.93, panel: 0.94,
  auxiliaryBar: 0.86, chrome: 0.93, gap: 0.91
};

test('one-command preview shows all seven controls and striped background', () => {
  const html = renderPreviewHtml(settings, 0.65, 'abc123456789');
  for (const area of ['editor', 'sidebar', 'panel', 'auxiliaryBar', 'chrome', 'gap', 'markdown']) {
    assert.ok(html.includes('data-area="' + area + '"'), area);
  }
  assert.match(html, /repeating-linear-gradient\(45deg/);
  assert.ok(html.includes(theme.colors['editor.background']));
  assert.ok(html.includes(theme.colors['panel.background']));
  assert.ok(html.includes('Markdown Editor（見本）'));
  assert.ok(html.includes('実際のMarkdown Editor'));
  assert.ok(html.includes('スライダーの変更はこの画面だけに反映'));
});

test('strict CSP, no external resources, no workspace mutation', () => {
  const html = renderPreviewHtml(settings, 0.65, 'previewNonce123');
  assert.match(html, /default-src &#39;none&#39;/);
  assert.match(html, /script-src &#39;nonce-previewNonce123&#39;/);
  assert.match(html, /connect-src &#39;none&#39;/);
  const extensionSource = require('node:fs').readFileSync(require('node:path').join(__dirname, '../src/extension.js'), 'utf8');
  assert.match(extensionSource, /localResourceRoots: \[\]/);
  assert.doesNotMatch(html, /<img|<iframe|https?:\/\/|fetch\(|postMessage\(|acquireVsCodeApi/);
});

test('invalid settings fail without opening a preview', () => {
  for (const value of [null, -1, 1.1, NaN, '0.65']) {
    assert.throws(() => renderPreviewHtml(settings, value, 'abc123456789'));
  }
  assert.throws(() => renderPreviewHtml({ ...settings, editor: 2 }, 0.65, 'abc123456789'));
  assert.throws(() => renderPreviewHtml(settings, 0.65, 'x'));
});

test('slider updates local preview only; reset restores configured values', () => {
  const html = renderPreviewHtml(settings, 0.65, 'abc123456789');
  const script = html.match(/<script nonce="abc123456789">([\s\S]*?)<\/script>/)[1];
  const values = {};
  const listeners = {};
  const inputs = ['editor', 'sidebar', 'panel', 'auxiliaryBar', 'chrome', 'gap', 'markdown'].map(area => ({
    dataset: { area },
    id: 'nb-' + area,
    value: String(area === 'markdown' ? 0.65 : settings[area]),
    addEventListener(type, fn) { listeners[area + ':' + type] = fn; }
  }));
  const document = {
    querySelectorAll: () => inputs,
    getElementById(id) {
      if(id === 'demo') return { style: { setProperty(k, v) { values[k] = v; } } };
      if(id === 'reset') return { addEventListener(type, fn) { listeners['reset:' + type] = fn; } };
      return { set textContent(x) { values[id] = x; } };
    }
  };
  vm.runInNewContext(script, { document });
  assert.equal(values['--a-editor'], '91%');
  const editor = inputs.find(i => i.dataset.area === 'editor');
  editor.value = '0.5';
  listeners['editor:input']();
  assert.equal(values['--a-editor'], '50%');
  listeners['reset:click']();
  assert.equal(editor.value, 0.91);
  assert.equal(values['--a-editor'], '91%');
});
