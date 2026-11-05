'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const palette = require('../palette/colors.json');
const { withAlpha, buildTheme } = require('../scripts/theme');
const pkg = require('../package.json');

const opaque = buildTheme(palette, false);
const transparent = buildTheme(palette, true);

test('alpha variants are derived from palette colors', () => {
  assert.equal(opaque.colors['editor.inactiveSelectionBackground'],
    withAlpha(palette.selection, '88'));
  assert.equal(opaque.colors['editor.selectionHighlightBackground'],
    withAlpha(palette.focus, '50'));
  assert.equal(opaque.colors['editor.wordHighlightStrongBackground'],
    withAlpha(palette.focus, '80'));
  assert.equal(opaque.colors['editor.findMatchBackground'],
    withAlpha(palette.gold, '55'));
  assert.equal(opaque.colors['scrollbarSlider.background'],
    withAlpha(palette.foreground, '40'));
  assert.equal(opaque.colors['minimapSlider.background'],
    withAlpha(palette.foreground, '20'));
});

test('sidebar uses the Obsidian background without changing other surfaces', () => {
  assert.equal(palette.sidebar, '#010114');
  assert.equal(opaque.colors['sideBar.background'], palette.sidebar);
  assert.equal(transparent.colors['sideBar.background'], palette.sidebar + '00');
  assert.equal(opaque.colors['editor.background'], palette.background);
  assert.equal(opaque.colors['panel.background'], palette.panel);
});

test('transparent variant changes only workbench surfaces and declared translucent details', () => {
  const detailColors = {
    'editor.lineHighlightBackground': withAlpha(palette.line, '80'),
    'editor.inactiveLineHighlightBackground': withAlpha(palette.line, '66'),
    'editor.selectionBackground': withAlpha(palette.selection, 'A6'),
    'editor.inactiveSelectionBackground': withAlpha(palette.selection, '80'),
    'list.activeSelectionBackground': withAlpha(palette.focus, 'B3'),
    'list.inactiveSelectionBackground': withAlpha(palette.match, '99'),
    'list.focusBackground': withAlpha(palette.focus, 'B3'),
    'list.inactiveFocusBackground': withAlpha(palette.match, '99'),
    'input.background': withAlpha(palette.backgroundDeep, '80'),
    'dropdown.background': withAlpha(palette.backgroundDeep, 'BF'),
    'agentsChatInput.background': withAlpha(palette.panel, '80'),
    'list.hoverBackground': withAlpha(palette.hover, 'A6'),
    'modernTab.hoverBackground': withAlpha(palette.hover, 'A6'),
    'tab.hoverBackground': withAlpha(palette.focus, 'A6'),
    'editorSuggestWidget.background': withAlpha(palette.panel, 'A6'),
    'editorSuggestWidget.selectedBackground': withAlpha(palette.focus, 'B3'),
    'editorStickyScrollHover.background': withAlpha(palette.focus, 'A6'),
    'textCodeBlock.background': withAlpha(palette.markdownCodeBlockBackground, 'BF')
  };

  const changed = [...new Set([
    ...Object.keys(opaque.colors),
    ...Object.keys(transparent.colors)
  ])].filter(key => opaque.colors[key] !== transparent.colors[key]);

  for (const key of changed) {
    if (Object.hasOwn(detailColors, key)) {
      assert.equal(transparent.colors[key], detailColors[key], key);
      continue;
    }
    assert.equal(transparent.colors[key], opaque.colors[key] + '00', key);
  }

  for (const [key, value] of Object.entries(detailColors)) {
    assert.equal(transparent.colors[key], value, key);
  }

  assert.deepEqual(opaque.tokenColors, transparent.tokenColors);
  assert.deepEqual(opaque.semanticTokenColors, transparent.semanticTokenColors);
  assert.equal(opaque.colors['editor.lineHighlightBackground'], palette.line);
  assert.equal(opaque.colors['editor.selectionBackground'], palette.selection);
  assert.equal(opaque.colors['input.background'], palette.backgroundDeep);
  assert.equal(opaque.colors['agentsChatInput.background'], undefined);
});

test('palette white aliases fg-pale while editor text keeps the base blue', () => {
  assert.equal(palette.white, palette.pale);
  assert.equal(opaque.colors['editor.foreground'], palette.foreground);
  assert.equal(transparent.colors['editor.foreground'], palette.foreground);
  assert.equal(opaque.colors['textCodeBlock.background'], palette.markdownCodeBlockBackground);
  assert.equal(transparent.colors['textCodeBlock.background'],
    withAlpha(palette.markdownCodeBlockBackground, 'BF'));
});

test('functions use the base blue and types use the subdued purple', () => {
  for (const theme of [opaque, transparent]) {
    const functions = theme.tokenColors.find(rule => rule.name === 'Functions');
    const types = theme.tokenColors.find(rule => rule.name === 'Types');
    assert.equal(functions.settings.foreground, palette.foreground);
    assert.equal(types.settings.foreground, palette.type);
    for (const role of ['function', 'method']) {
      assert.equal(theme.semanticTokenColors[role], palette.foreground, role);
    }
    for (const role of ['namespace', 'type', 'class', 'enum',
      'interface', 'struct', 'typeParameter']) {
      assert.equal(theme.semanticTokenColors[role], palette.type, role);
    }
  }
});

test('JSON property names use the base editor blue without changing global property semantics', () => {
  const jsonRule = opaque.tokenColors.find(rule => rule.name === 'JSON properties');
  assert.ok(jsonRule);
  assert.deepEqual(jsonRule.scope, [
    'support.type.property-name.json',
    'support.type.property-name.json.comments',
    'support.type.property-name.json.lines'
  ]);
  assert.equal(jsonRule.settings.foreground, palette.foreground);
  assert.equal(opaque.semanticTokenColors.property, palette.pale);
});

test('colors are valid and cursor / errors use palette pink', () => {
  assert.equal(opaque.colors['editorCursor.foreground'], palette.cursor);
  assert.equal(opaque.colors['editorError.foreground'], palette.cursor);
  for (const theme of [opaque, transparent]) {
    for (const [key, value] of Object.entries(theme.colors)) {
      assert.match(value, /^#[0-9a-f]{6}([0-9a-f]{2})?$/i, key);
    }
  }
});

test('all contributed theme files match generator', () => {
  for (const contribution of pkg.contributes.themes) {
    const theme = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '..', contribution.path), 'utf8')
    );
    assert.equal(theme.name, contribution.label);
    assert.deepEqual(
      theme,
      buildTheme(palette, contribution.label.endsWith('Transparent'))
    );
  }
});
