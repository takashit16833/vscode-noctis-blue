'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const manifest = require('../package.json');
const opaque = require('../themes/noctis-blue.json');
const transparent = require('../themes/noctis-blue-transparent.json');
const { normalizeOpacity, generateCss, generateTemporaryScript } = require('../src/appearance');

test('configuration includes a separately adjustable minimap surface', () => {
  const properties = manifest.contributes.configuration.properties['noctisBlue.opacity'];
  const keys = ['editor', 'minimap', 'sidebar', 'panel', 'auxiliaryBar', 'chrome', 'gap'];
  assert.deepEqual(Object.keys(properties.properties), keys);
  assert.deepEqual(Object.keys(normalizeOpacity()), keys);
  assert.deepEqual(normalizeOpacity({ editor: 0 }).editor, 0);
  assert.deepEqual(normalizeOpacity({ editor: 1 }).editor, 1);
  assert.equal(normalizeOpacity().minimap, 0.5);
  assert.equal(normalizeOpacity({ minimap: 0 }).minimap, 0);
  assert.equal(normalizeOpacity({ minimap: 1 }).minimap, 1);
  for (const item of Object.values(properties.properties)) {
    assert.equal(item.minimum, 0);
    assert.equal(item.maximum, 1);
  }
});

test('bad settings fail without emitting CSS', () => {
  for (const invalid of [null, [], 5, { editor: '0.9' }, { editor: NaN },
    { editor: Infinity }, { panel: -0.1 }, { panel: 1.1 },
    { minimap: '0.5' }, { minimap: -0.1 }, { minimap: 1.1 }, { unknown: 0.5 }]) {
    assert.throws(() => generateCss(invalid), Error);
  }
});

test('area CSS uses actual opaque Noctis colors, without any wallpaper image', () => {
  const css = generateCss({
    editor: 0.5, minimap: 0.25, sidebar: 0.8, panel: 1, auxiliaryBar: 0.4, chrome: 0.9, gap: 0
  });
  for (const [key, percent] of [
    ['editor.background', '50%'],
    ['minimap.background', '25%'],
    ['sideBar.background', '80%'],
    ['panel.background', '100%'],
    ['auxiliaryBar.background', '40%'],
    ['titleBar.activeBackground', '90%'],
    ['statusBar.background', '90%'],
    ['activityBar.background', '90%']
  ]) {
    assert.ok(css.includes('color-mix(in srgb, ' + opaque.colors[key] + ' ' + percent + ', transparent)'), key);
  }
  assert.equal(transparent.colors['editor.background'], opaque.colors['editor.background'] + '00');
  assert.equal(transparent.colors['minimap.background'], opaque.colors['minimap.background'] + '00');
  assert.ok(css.includes('.monaco-grid-view'));
  assert.ok(css.includes('.part.editor .tabs-and-actions-container'));
  assert.ok(css.includes('background-color: transparent !important'));
  assert.ok(!css.includes('--nb-gap-color'));
  assert.ok(!css.includes('background-blend-mode'));
  assert.ok(!css.includes('vscodeWallpaper'));
  assert.ok(!css.includes('url('));
});

test('minimap paints only its own background, without changing canvas or slider', () => {
  for (const [opacity, percent] of [[0, '0%'], [0.5, '50%'], [1, '100%']]) {
    const css = generateCss({ editor: 0.88, minimap: opacity });
    assert.ok(css.includes(
      '.part.editor .monaco-editor .minimap { background-color: color-mix(in srgb, ' +
      opaque.colors['minimap.background'] + ' ' + percent + ', transparent) !important; }'
    ));
    assert.ok(!css.includes('.minimap canvas {'));
    assert.ok(!css.includes('.minimap-slider {'));
  }
});

test('SCM input keeps its outer blue surface but clears duplicated inner Monaco background', () => {
  const css = generateCss({ panel: 0.5 });
  assert.match(css, /\.scm-view \.scm-editor-container :is\(\.monaco-editor, \.monaco-editor-background, \.margin\)/);
  assert.doesNotMatch(css, /\.scm-view \.scm-editor\s*\{\s*background-color:\s*transparent/);
  assert.ok(css.includes('color-mix(in srgb, ' + opaque.colors['panel.background'] + ' 50%, transparent)'));
});

test('Sticky Scroll uses wallpaper-proven backdrop blur without dimming pinned text', () => {
  const css = generateCss({ editor: 0.5 });
  assert.match(css, /\.sticky-widget:not\(\.peek\) \{ backdrop-filter: blur\(12px\) !important; \}/);
  assert.match(css, /\.sticky-widget:not\(\.peek\) \.sticky-widget-line-numbers/);
  assert.match(css, /\.sticky-widget:not\(\.peek\) \.sticky-widget-lines-scrollable/);
  assert.doesNotMatch(css, /\.sticky-widget:not\(\.peek\).*opacity:/);
});

test('suggest popup blurs the background and clears list layers without fading rows', () => {
  const css = generateCss({ editor: 0.5 });
  assert.match(css, /\.monaco-editor \.suggest-widget/);
  assert.match(css, /\.monaco-editor \.suggest-details/);
  assert.match(css, /\.workbench-suggest-widget \.suggest-details/);
  assert.match(css, /backdrop-filter: blur\(12px\) !important/);
  assert.match(css, /\.suggest-widget \.monaco-list-rows/);
  assert.match(css, /\.workbench-suggest-widget \.monaco-list-rows/);
  const widgetRule = css.match(/\.monaco-editor \.suggest-widget,[\s\S]*?\{ backdrop-filter: blur\(12px\) !important; \}/);
  assert.ok(widgetRule);
  assert.doesNotMatch(widgetRule[0], /opacity:|background-color:/);
  assert.doesNotMatch(css, /\.suggest-widget \.monaco-list-row\s*\{\s*opacity:/);
});
test('floating gap uses its own painted strips and excludes regular layout', () => {
  const css = generateCss({ gap: 0.65 });
  assert.ok(css.includes('.floating-panels:not(.modern-ui-compact)'));
  assert.ok(css.includes('--nb-gap-color: color-mix(in srgb, ' + opaque.colors['editor.background'] + ' 65%, transparent)'));
  assert.ok(css.includes('pointer-events: none'));
  assert.ok(css.includes('background-size:'));
});

test('temporary script toggles off; never edits user settings or VS Code files', () => {
  const script = generateTemporaryScript();
  assert.ok(script.includes('document.querySelector(".monaco-workbench")'));
  assert.ok(script.includes('document.getElementById("noctis-blue-opacity-test")'));
  assert.ok(script.includes('previous.remove()'));
  assert.ok(script.includes('document.head.appendChild(node)'));
  assert.ok(!script.includes('workbench.html'));
  assert.ok(!script.includes('vscode.workspace.getConfiguration'));
  assert.ok(!script.includes('require('));
});
