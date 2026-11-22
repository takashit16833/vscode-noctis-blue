'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const palette = require('../palette/colors.json');
const { buildOneDarkSyntax } = require('../scripts/one-dark-syntax');
const { buildTheme } = require('../scripts/theme');

const oneDark = { ...palette, ...palette.oneDark };
const { tokenColors, semanticTokenColors } = buildOneDarkSyntax(oneDark);
const named = name => {
  const rule = tokenColors.find(item => item.name === name);
  assert.ok(rule, 'missing One Dark role: ' + name);
  return rule;
};

test('One Dark uses its original syntax roles with Noctis Blue colors', () => {
  for (const [name, expected] of [
    ['Variables', palette.cursor],
    ['Parameters', palette.pale],
    ['Python parameters', palette.orange],
    ['Properties', palette.pale],
    ['JSON properties', palette.cursor],
    ['Strings', palette.green],
    ['Regular expressions', palette.cyanDim],
    ['Escape sequences', palette.cyanDim],
    ['Constants', palette.orange],
    ['JSON constants', palette.cyanDim],
    ['Keywords', palette.typeBright],
    ['Operators', palette.pale],
    ['JavaScript operators', palette.cyanDim],
    ['JavaScript word operators', palette.typeBright],
    ['C-family operators', palette.typeBright],
    ['Functions', palette.oneDark.function],
    ['Built-in functions', palette.cyanDim],
    ['Types and classes', palette.gold],
    ['Inherited classes', palette.green],
    ['HTML tags', palette.cursor],
    ['HTML attributes', palette.orange],
    ['HTML ID attributes', palette.oneDark.function],
    ['CSS properties', palette.oneDark.dim],
    ['CSS supported properties', palette.pale],
    ['CSS selectors', palette.typeBright],
    ['Markdown heading', palette.cursor],
    ['Markdown heading punctuation', palette.oneDark.function],
    ['Markdown links', palette.cyanDim],
    ['Markdown raw', palette.green]
  ]) {
    assert.equal(named(name).settings.foreground, expected, name);
  }
  assert.equal(named('Comments').settings.fontStyle, 'italic');
  assert.equal(named('Markdown bold').settings.fontStyle, 'bold');
  assert.equal(named('Markdown italic').settings.fontStyle, 'italic');
});

test('language-specific TextMate rules stay separate from the global role', () => {
  assert.ok(named('JSON properties').scope.includes('support.type.property-name.json'));
  assert.ok(named('JSON properties').scope.includes('support.type.property-name.json.comments'));
  assert.ok(named('JSON properties').scope.includes('support.type.property-name.json.lines'));
  assert.ok(named('JavaScript operators').scope.includes('source.js keyword.operator'));
  assert.ok(named('C-family operators').scope.includes('source.cpp keyword.operator'));
  assert.ok(named('Python parameters').scope.includes('source.python variable.parameter'));
  assert.ok(named('Java types and imports').scope.includes('source.java storage.type'));
  assert.ok(named('Built-in methods').scope.includes('support.function.any-method'));
  assert.ok(named('Markdown heading punctuation').scope.includes('punctuation.definition.heading'));
});

test('semantic highlighting cannot turn One Dark variables and JSON keys pale', () => {
  for (const [role, color] of [
    ['variable', palette.cursor],
    ['parameter', palette.pale],
    ['parameter:python', palette.orange],
    ['property', palette.pale],
    ['property:json', palette.cursor],
    ['property:jsonc', palette.cursor],
    ['property:jsonl', palette.cursor],
    ['class', palette.gold],
    ['type', palette.gold],
    ['type.defaultLibrary', palette.cyanDim],
    ['function', palette.oneDark.function],
    ['function.defaultLibrary', palette.cyanDim],
    ['keyword', palette.typeBright],
    ['string', palette.green],
    ['number', palette.orange],
    ['regexp', palette.cyanDim]
  ]) {
    assert.equal(semanticTokenColors[role], color, role);
  }
  assert.equal(semanticTokenColors['variable.readonly'], undefined);
  assert.deepEqual(semanticTokenColors.comment,
    { foreground: palette.oneDark.comment, italic: true });
});

test('One Dark normal and transparent themes share syntax but not surfaces', () => {
  const normal = buildTheme(palette, false, 'one-dark');
  const transparent = buildTheme(palette, true, 'one-dark');
  assert.deepEqual(normal.tokenColors, transparent.tokenColors);
  assert.deepEqual(normal.semanticTokenColors, transparent.semanticTokenColors);
  assert.equal(normal.colors['editor.background'], '#161C28');
  assert.equal(transparent.colors['editor.background'], '#161C2800');
  assert.equal(normal.colors['editor.foreground'], palette.pale);
  assert.equal(normal.colors['editorCursor.foreground'], palette.oneDark.function);
  assert.equal(transparent.colors['editorCursor.foreground'], palette.oneDark.function);
  assert.equal(normal.colors['terminalCursor.foreground'], palette.oneDark.function);
  assert.equal(normal.colors['editorBracketMatch.border'], palette.oneDark.function);
  assert.equal(normal.colors['editor.findMatchBorder'], palette.oneDark.function);
  assert.equal(normal.colors['editor.findMatchBackground'], palette.oneDark.function + '3D');
  assert.equal(normal.colors['editorError.foreground'], palette.cursor);
  assert.equal(normal.colors['terminal.ansiRed'], palette.cursor);
});

test('original Noctis Blue syntax remains unchanged by the One Dark rules', () => {
  const classic = buildTheme(palette, false, 'classic');
  assert.equal(classic.tokenColors.find(rule => rule.name === 'Variables')
    .settings.foreground, palette.pale);
  assert.equal(classic.tokenColors.find(rule => rule.name === 'JSON properties')
    .settings.foreground, palette.foreground);
  assert.equal(classic.semanticTokenColors.variable, palette.light);
  assert.equal(classic.colors['editor.background'], palette.background);
});
