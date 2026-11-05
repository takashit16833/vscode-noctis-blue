'use strict';

// Shared workbench appearance CSS for the automatic layer and temporary
// renderer-side verification. Use the opaque theme's colors and avoid repainting text.
const theme = require('../themes/noctis-blue.json');
const manifest = require('../package.json');

const OPACITY_KEYS = ['editor', 'minimap', 'tabs', 'sidebar', 'panel', 'auxiliaryBar', 'chrome', 'gap'];
const ROOT = '.monaco-workbench';

function normalizeOpacity(value = {}) {
  const defaults = manifest.contributes.configuration.properties['noctisBlue.opacity'].default;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('noctisBlue.opacity はオブジェクトで指定してください。');
  }
  for (const key of Object.keys(value)) {
    if (!OPACITY_KEYS.includes(key)) throw new Error('未対応の設定項目: ' + key);
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

function buildSurfaceRules(op) {
  const lines = [
    rule(ROOT + ' .part.editor', color('editor.background'), op.editor),
    // The minimap canvas uses a transparent theme background. Paint its own
    // adjustable surface behind the canvas, without dimming content or sliders.
    rule(ROOT + ' .part.editor .monaco-editor .minimap', color('minimap.background'), op.minimap),
    rule(ROOT + ' .part.sidebar, ' + ROOT + '.floating-panels .part.sidebar',
      color('sideBar.background'), op.sidebar),
    rule(ROOT + ' .part.auxiliarybar, ' + ROOT + '.floating-panels .part.auxiliarybar',
      color('auxiliaryBar.background'), op.auxiliaryBar),
    rule(ROOT + ' .part.panel, ' + ROOT + '.floating-panels .part.panel',
      color('panel.background'), op.panel)
  ];

  for (const [part, themeKey] of [
    ['titlebar', 'titleBar.activeBackground'],
    ['statusbar', 'statusBar.background'],
    ['activitybar', 'activityBar.background']
  ]) {
    lines.push(rule(ROOT + ' .part.' + part, color(themeKey), op.chrome));
  }
  return lines;
}

function buildClearBackgroundRules() {
  // These selectors remove only duplicated workbench surfaces. They are
  // intentionally grouped by UI responsibility so a future VS Code DOM change
  // can be traced to the affected feature instead of editing one opaque list.
  const editor = [
    ROOT + ' .monaco-grid-view',
    ROOT + ' .part.editor :is(.content, .editor-group-container, .editor-container, .editor-instance, .monaco-editor, .monaco-editor-background, .margin, .title, .tabs-container)',
    ROOT + ' .part.editor .tabs-and-actions-container'
  ];
  const panel = [
    ROOT + ' .part.panel .pane.expanded.horizontal',
    ROOT + ' .part.panel .terminal-outer-container',
    ROOT + ' .part.panel .terminal.xterm',
    ROOT + ' .part.panel .xterm-scrollable-element',
    ROOT + ' .part.panel .xterm-viewport',
    ROOT + ' .part.panel .monaco-list-rows',
    ROOT + ' .part.panel .pane-body.integrated-terminal :is(.tabs-container, .tabs-list-container, .tabs-list, .monaco-list-rows)'
  ];
  const sidebar = [
    ROOT + ' :is(.part.sidebar, .part.auxiliarybar, .part.panel) > .content',
    ROOT + ' :is(.part.sidebar, .part.auxiliarybar) > .composite.title',
    ROOT + ' :is(.part.sidebar, .part.auxiliarybar) .monaco-list-rows',
    ROOT + '.modern-ui :is(.part.sidebar, .part.auxiliarybar) .monaco-pane-view .pane',
    ROOT + '.modern-ui :is(.part.sidebar, .part.auxiliarybar) .monaco-pane-view .pane > .pane-header:not(:hover)'
  ];
  const breadcrumbs = [
    ROOT + ' .part.editor :is(.breadcrumbs-below-tabs, .breadcrumbs-control, .breadcrumbs-editor-type)',
    ROOT + ' .part.editor .breadcrumbs-below-tabs :is(.breadcrumbs-control, .monaco-breadcrumbs)',
    ROOT + ' .part.editor .breadcrumbs-control.with-editor-type > .breadcrumbs-editor-type'
  ];

  // SCM renders input.background both on .scm-editor and on its inner Monaco.
  // Keep the outer surface and clear only the duplicate editor renderer.
  const scm = [
    ROOT + ' .scm-view .scm-editor-container :is(.monaco-editor, .monaco-editor-background, .margin)'
  ];

  // Sticky Scroll has separate line-number and code layers that otherwise hide
  // the backdrop-filter applied to the sticky container.
  const sticky = [
    ROOT + ' .part.editor .monaco-editor .sticky-widget:not(.peek) .sticky-widget-line-numbers',
    ROOT + ' .part.editor .monaco-editor .sticky-widget:not(.peek) .sticky-widget-lines-scrollable'
  ];

  const selectors = [...editor, ...panel, ...sidebar, ...breadcrumbs, ...scm, ...sticky];
  return [
    selectors.join(',\n') + ' { background-color: transparent !important; }',
    [
      ROOT + '.modern-ui-tabs .part.editor > .content .editor-group-container > .title.tabs',
      ROOT + ' .part.editor :is(.breadcrumbs-below-tabs, .breadcrumbs-control, .breadcrumbs-editor-type)',
      ROOT + ' .part.editor .breadcrumbs-below-tabs :is(.breadcrumbs-control, .monaco-breadcrumbs)'
    ].join(',\n') + ' { background-image: none !important; }',
    ROOT + ' { --vscode-scrollbar-background: transparent !important;' +
      ' --vscode-breadcrumb-background: transparent !important; }',
    ROOT + ' :is(.part.editor, .part.panel) .monaco-scrollable-element > .scrollbar' +
      ' { background: transparent !important; }'
  ];
}

function buildTabRules(op) {
  // Paint the entire tab strip on its outer title only. Its nested
  // tabs-and-actions-container is cleared above to avoid a second layer.
  // Keep the individual active/inactive tab fills independently colored.
  return [
    rule(ROOT + ' .part.editor .editor-group-container > .title.tabs',
      color('editorGroupHeader.tabsBackground'), op.tabs)
  ];
}

function buildConnectedTabRules() {
  // Connected tabs use custom background variables even when the legacy
  // theme colors are defined. Reuse those colors without repainting .tab-fill.
  // Keep lower specificity than explicit VS Code color customizations.
  return [
    ROOT + '.modern-ui-connected-editor-tabs {' +
      ' --modern-ui-editor-tab-custom-active-background: var(--vscode-tab-activeBackground);' +
      ' --modern-ui-editor-tab-custom-inactive-background: var(--vscode-tab-inactiveBackground); }'
  ];
}

function buildStickyRules() {
  return [
    ROOT + ' .part.editor .monaco-editor .sticky-widget:not(.peek)' +
      ' { backdrop-filter: blur(12px) !important; }'
  ];
}

function buildSuggestRules() {
  // The popup itself keeps the theme color. Only list underlays are cleared so
  // the backdrop blur remains visible behind text, selection and hover states.
  return [
    [
      ROOT + ' .monaco-editor .suggest-widget',
      ROOT + ' .monaco-editor .suggest-details',
      ROOT + ' .workbench-suggest-widget',
      ROOT + ' .workbench-suggest-widget .suggest-details'
    ].join(',\n') + ' { backdrop-filter: blur(12px) !important; }',
    [
      ROOT + ' .monaco-editor .suggest-widget .monaco-list',
      ROOT + ' .monaco-editor .suggest-widget .monaco-list-rows',
      ROOT + ' .workbench-suggest-widget .monaco-list',
      ROOT + ' .workbench-suggest-widget .monaco-list-rows'
    ].join(',\n') + ' { background-color: transparent !important; }'
  ];
}

function buildGapRules(op) {
  if (op.gap <= 0) return [];

  // Floating-panel spacing is a margin outside the parts. Paint only those
  // strips with ::before so the editor/sidebar/panel surfaces are not repainted.
  const floating = ROOT + '.floating-panels:not(.modern-ui-compact) ';
  const hasPart = '.split-view-view:has(> .part:is(.editor, .sidebar, .auxiliarybar, .panel))';
  return [
    floating + hasPart + ' {' +
      ' --nb-left: var(--modern-ui-floating-card-margin, 0px);' +
      ' --nb-right: var(--modern-ui-floating-card-inner-margin, 0px);' +
      ' --nb-top: var(--modern-ui-floating-card-inner-margin, 0px);' +
      ' --nb-bottom: var(--modern-ui-floating-card-margin, 0px);' +
      ' --nb-gap-color: ' + mix(color('editor.background'), op.gap) + '; }',
    floating + '.split-view-view:has(> .part.floating-part-outer-right),' +
      floating + '.split-view-view:has(> .part.editor.floating-editor-outer-right) {' +
      ' --nb-right: var(--modern-ui-floating-card-outer-margin, 0px); }',
    ROOT + '.floating-panels:not(.modern-ui-compact):not(.noactivitybar) ' +
      '.split-view-view:has(> .part.sidebar.left) {' +
      ' --nb-left: var(--modern-ui-floating-card-inner-margin, 0px); }',
    ROOT + '.floating-panels.top-window-edge:not(.modern-ui-compact) ' +
      '.split-view-view:has(> .part:is(.editor, .sidebar, .auxiliarybar, .panel.top, .panel.left, .panel.right)),' +
      ROOT + '.floating-panels.panel-position-top:not(.nopanel):not(.modern-ui-compact) ' +
      '.split-view-view:has(> .part.editor),' +
      ROOT + '.floating-panels.panel-position-bottom:not(.nopanel):not(.nomaineditorarea):not(.modern-ui-compact) ' +
      '.split-view-view:has(> .part.panel.bottom) {' +
      ' --nb-top: var(--modern-ui-floating-card-margin, 0px); }',
    floating + hasPart + '::before {' +
      ' content: ""; position: absolute; inset: 0; pointer-events: none;' +
      ' background-image: linear-gradient(var(--nb-gap-color),var(--nb-gap-color)),' +
      ' linear-gradient(var(--nb-gap-color),var(--nb-gap-color)),' +
      ' linear-gradient(var(--nb-gap-color),var(--nb-gap-color)),' +
      ' linear-gradient(var(--nb-gap-color),var(--nb-gap-color));' +
      ' background-position: left top, right top, var(--nb-left) top, var(--nb-left) bottom;' +
      ' background-size: var(--nb-left) 100%, var(--nb-right) 100%,' +
      ' calc(100% - var(--nb-left) - var(--nb-right)) var(--nb-top),' +
      ' calc(100% - var(--nb-left) - var(--nb-right)) var(--nb-bottom);' +
      ' background-repeat: no-repeat; }'
  ];
}

function generateCss(input = {}) {
  const op = normalizeOpacity(input);
  const lines = ['/* Noctis Blue workbench appearance: no wallpaper image or tint. */'];
  lines.push(...buildSurfaceRules(op));
  lines.push(...buildClearBackgroundRules());
  lines.push(...buildTabRules(op));
  lines.push(...buildConnectedTabRules());
  lines.push(...buildStickyRules());
  lines.push(...buildSuggestRules());
  lines.push(...buildGapRules(op));
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

module.exports = {
  normalizeOpacity,
  buildSurfaceRules,
  buildClearBackgroundRules,
  buildTabRules,
  buildConnectedTabRules,
  buildStickyRules,
  buildSuggestRules,
  buildGapRules,
  generateCss,
  generateTemporaryScript
};
