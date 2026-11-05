'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'extension.js'),
  'utf8'
);

test('自動適用の Enable/Disable は Reload Window を促さない', () => {
  assert.doesNotMatch(source, /workbench\.action\.reloadWindow/);
  assert.doesNotMatch(source, /['"]Reload Window['"]/);
  assert.doesNotMatch(source, /offerReload/);
});

test('コマンドの JavaScript 文書表示は共通 helper を使う', () => {
  assert.match(source, /async function showScript\(content\)/);
  assert.match(source, /function registerCommand\(context, id, handler\)/);
});


test('Markdown Editor automatic appearance commands are registered without forced reload', () => {
  assert.match(source, /noctisBlue\.enableMarkdownEditorAppearance/);
  assert.match(source, /noctisBlue\.disableMarkdownEditorAppearance/);
  assert.match(source, /syncMarkdownEditorAppearance/);
  assert.doesNotMatch(source, /executeCommand\(['"]workbench\.action\.reloadWindow/);
});
