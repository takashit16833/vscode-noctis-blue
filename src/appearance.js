'use strict';

// This is a temporary renderer-side test, not a replacement for the VS Code
// theme engine. Use the opaque theme's colors and avoid repainting text.
const theme = require('../themes/noctis-blue.json');
const manifest = require('../package.json');
const keys = ['editor', 'sidebar', 'panel', 'auxiliaryBar', 'chrome', 'gap'];

function normalizeOpacity(value = {}) {
  const defaults = manifest.contributes.configuration.properties['noctisBlue.opacity'].default;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('noctisBlue.opacity はオブジェクトで指定してください。');
  }
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) throw new Error('未対応の設定項目: ' + key);
  }
  const result = { ...defaults, ...value };
  for (const [key, opacity] of Object.entries(result)) {
    if (typeof opacity !== 'number' || !Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
      throw new Error('noctisBlue.opacity.' + key + ' は0から1の数値で指定してください。');
    }
  }
  return result;
}

function color(key) {
  const value = theme.colors[key];
  if (!/^#[0-9a-f]{6}$/i.test(value || '')) {
    throw new Error('通常版テーマに有効な背景色がありません: ' + key);
  }
  return value;
}
function mix(value, opacity) {
  const percent = Math.round(opacity * 10000) / 100;
  return 'color-mix(in srgb, ' + value + ' ' + percent + '%, transparent)';
}
function rule(selectors, value, opacity) {
  return selectors + ' { background-color: ' + mix(value, opacity) + ' !important; }';
}

function generateCss(input = {}) {
  const op = normalizeOpacity(input);
  const root = '.monaco-workbench';
  const lines = ['/* Temporary Noctis Blue opacity test: no wallpaper image or tint. */'];

  lines.push(rule(root + ' .part.editor', color('editor.background'), op.editor));
  lines.push(rule(root + ' .part.sidebar, ' + root + '.floating-panels .part.sidebar',
    color('sideBar.background'), op.sidebar));
  lines.push(rule(root + ' .part.auxiliarybar, ' + root + '.floating-panels .part.auxiliarybar',
    color('auxiliaryBar.background'), op.auxiliaryBar));
  lines.push(rule(root + ' .part.panel, ' + root + '.floating-panels .part.panel',
    color('panel.background'), op.panel));
  for (const [part, themeKey] of [
    ['titlebar', 'titleBar.activeBackground'],
    ['statusbar', 'statusBar.background'],
    ['activitybar', 'activityBar.background']
  ]) {
    lines.push(rule(root + ' .part.' + part, color(themeKey), op.chrome));
  }

  // Identified in vscode-wallpaper: redundant child backgrounds must be clear
  // so each part's surface is blended once, without fading text/selection.
  const clear = [
    root + ' .monaco-grid-view',
    root + ' .part.panel .pane.expanded.horizontal',
    root + ' .part.panel .terminal-outer-container',
    root + ' .part.panel .terminal.xterm',
    root + ' .part.panel .xterm-scrollable-element',
    root + ' .part.panel .xterm-viewport',
    root + ' .part.editor :is(.content, .editor-group-container, .editor-container, .editor-instance, .monaco-editor, .monaco-editor-background, .margin, .title, .tabs-container)',
    // SCM has two layers using input.background; keep the outer .scm-editor
    // translucent, and clear only its redundant inner Monaco renderer.
    root + ' .scm-view .scm-editor-container :is(.monaco-editor, .monaco-editor-background, .margin)',
    root + ' :is(.part.sidebar, .part.auxiliarybar, .part.panel) > .content',
    root + ' .part.editor .tabs-and-actions-container',
    root + ' .part.panel .monaco-list-rows',
    root + ' .part.panel .pane-body.integrated-terminal :is(.tabs-container, .tabs-list-container, .tabs-list, .monaco-list-rows)',
    root + ' .part.editor :is(.breadcrumbs-below-tabs, .breadcrumbs-control, .breadcrumbs-editor-type)',
    root + ' .part.editor .breadcrumbs-below-tabs :is(.breadcrumbs-control, .monaco-breadcrumbs)',
    root + ' .part.editor .breadcrumbs-control.with-editor-type > .breadcrumbs-editor-type',
    root + ' :is(.part.sidebar, .part.auxiliarybar) > .composite.title',
    root + ' :is(.part.sidebar, .part.auxiliarybar) .monaco-list-rows',
    root + '.modern-ui :is(.part.sidebar, .part.auxiliarybar) .monaco-pane-view .pane',
    root + '.modern-ui :is(.part.sidebar, .part.auxiliarybar) .monaco-pane-view .pane > .pane-header:not(:hover)',
    root + ' .part.editor .monaco-editor .sticky-widget:not(.peek) .sticky-widget-line-numbers',
    root + ' .part.editor .monaco-editor .sticky-widget:not(.peek) .sticky-widget-lines-scrollable'
  ];
  lines.push(clear.join(',\n') + ' { background-color: transparent !important; }');
  lines.push([
    root + '.modern-ui-tabs .part.editor > .content .editor-group-container > .title.tabs',
    root + ' .part.editor :is(.breadcrumbs-below-tabs, .breadcrumbs-control, .breadcrumbs-editor-type)',
    root + ' .part.editor .breadcrumbs-below-tabs :is(.breadcrumbs-control, .monaco-breadcrumbs)'
  ].join(',\n') + ' { background-image: none !important; }');
  // Proven in vscode-wallpaper: blur only the sticky backdrop, not the pinned text.
  // Its two opaque gutter/code layers are cleared by the `clear` selectors above.
  lines.push(root + ' .part.editor .monaco-editor .sticky-widget:not(.peek)' +
    ' { backdrop-filter: blur(12px) !important; }');
  lines.push(root + '.modern-ui-tabs .part.editor .tabs-container > .tab > .tab-fill' +
    ' { background-color: transparent !important; }');
  lines.push(root + ' { --vscode-scrollbar-background: transparent !important;' +
    ' --vscode-breadcrumb-background: transparent !important; }');
  lines.push(root + ' :is(.part.editor, .part.panel) .monaco-scrollable-element > .scrollbar' +
    ' { background: transparent !important; }');

  // The floating-panel gap is a margin: don't fill the panels themselves.
  if (op.gap > 0) {
    const floating = root + '.floating-panels:not(.modern-ui-compact) ';
    const hasPart = '.split-view-view:has(> .part:is(.editor, .sidebar, .auxiliarybar, .panel))';
    lines.push(floating + hasPart + ' {' +
      ' --nb-left: var(--modern-ui-floating-card-margin, 0px);' +
      ' --nb-right: var(--modern-ui-floating-card-inner-margin, 0px);' +
      ' --nb-top: var(--modern-ui-floating-card-inner-margin, 0px);' +
      ' --nb-bottom: var(--modern-ui-floating-card-margin, 0px);' +
      ' --nb-gap-color: ' + mix(color('editor.background'), op.gap) + '; }');
    lines.push(floating + '.split-view-view:has(> .part.floating-part-outer-right),' +
      floating + '.split-view-view:has(> .part.editor.floating-editor-outer-right) {' +
      ' --nb-right: var(--modern-ui-floating-card-outer-margin, 0px); }');
    lines.push(root + '.floating-panels:not(.modern-ui-compact):not(.noactivitybar) ' +
      '.split-view-view:has(> .part.sidebar.left) {' +
      ' --nb-left: var(--modern-ui-floating-card-inner-margin, 0px); }');
    lines.push(root + '.floating-panels.top-window-edge:not(.modern-ui-compact) ' +
      '.split-view-view:has(> .part:is(.editor, .sidebar, .auxiliarybar, .panel.top, .panel.left, .panel.right)),' +
      root + '.floating-panels.panel-position-top:not(.nopanel):not(.modern-ui-compact) ' +
      '.split-view-view:has(> .part.editor),' +
      root + '.floating-panels.panel-position-bottom:not(.nopanel):not(.nomaineditorarea):not(.modern-ui-compact) ' +
      '.split-view-view:has(> .part.panel.bottom) {' +
      ' --nb-top: var(--modern-ui-floating-card-margin, 0px); }');
    lines.push(floating + hasPart + '::before {' +
      ' content: ""; position: absolute; inset: 0; pointer-events: none;' +
      ' background-image: linear-gradient(var(--nb-gap-color),var(--nb-gap-color)),' +
      ' linear-gradient(var(--nb-gap-color),var(--nb-gap-color)),' +
      ' linear-gradient(var(--nb-gap-color),var(--nb-gap-color)),' +
      ' linear-gradient(var(--nb-gap-color),var(--nb-gap-color));' +
      ' background-position: left top, right top, var(--nb-left) top, var(--nb-left) bottom;' +
      ' background-size: var(--nb-left) 100%, var(--nb-right) 100%,' +
      ' calc(100% - var(--nb-left) - var(--nb-right)) var(--nb-top),' +
      ' calc(100% - var(--nb-left) - var(--nb-right)) var(--nb-bottom);' +
      ' background-repeat: no-repeat; }');
  }
  return lines.join('\n') + '\n';
}

function generateTemporaryScript(input = {}) {
  const css = generateCss(input);
  return [
    '/* Run in Developer Tools Console with top as the execution context. */',
    '(() => {',
    '  "use strict";',
    '  if (!document.querySelector(".monaco-workbench")) throw Error("topフレームで実行してください。");',
    '  const previous = document.getElementById("noctis-blue-opacity-test");',
    '  if (previous) {',
    '    previous.remove();',
    '    return "Noctis Blueの一時CSSを解除しました";',
    '  }',
    '  const node = document.createElement("style");',
    '  node.id = "noctis-blue-opacity-test";',
    '  node.textContent = ' + JSON.stringify(css) + ';',
    '  document.head.appendChild(node);',
    '  return "Noctis Blueの一時CSSを適用しました";',
    '})();',
    ''
  ].join('\n');
}

module.exports = { normalizeOpacity, generateCss, generateTemporaryScript };
