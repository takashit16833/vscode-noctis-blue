'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

test('runtime palette is present and not excluded from the VSIX', () => {
  const palettePath = path.join(root, 'palette', 'colors.json');
  assert.equal(fs.existsSync(palettePath), true);

  const ignore = fs.readFileSync(path.join(root, '.vscodeignore'), 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  assert.equal(ignore.includes('palette/**'), false);
  assert.equal(ignore.includes('palette/colors.json'), false);
});

test('markdownAppearance resolves the packaged runtime palette', () => {
  const source = fs.readFileSync(path.join(root, 'src', 'markdownAppearance.js'), 'utf8');
  assert.match(source, /require\(['"]\.\.\/palette\/colors\.json['"]\)/);
  assert.doesNotThrow(() => require('../src/markdownAppearance'));
});

test('開発用の診断コマンドはコマンドパレットに表示しない', () => {
  const manifest = require('../package.json');
  const hidden = manifest.contributes.menus.commandPalette
    .filter(entry => entry.when === 'false')
    .map(entry => entry.command).sort();
  assert.deepEqual(hidden, [
    'noctisBlue.showCombinedTransparencyTest',
    'noctisBlue.showMarkdownActiveBlockTest',
    'noctisBlue.showOpacityScript'
  ].sort());
  const declared = new Set(manifest.contributes.commands.map(entry => entry.command));
  for (const id of hidden) {
    assert.ok(declared.has(id), '隠すコマンドも登録を維持する: ' + id);
  }
  for (const id of [
    'noctisBlue.enableAutomaticAppearance',
    'noctisBlue.disableAutomaticAppearance',
    'noctisBlue.enableMarkdownEditorAppearance',
    'noctisBlue.disableMarkdownEditorAppearance'
  ]) {
    assert.ok(!hidden.includes(id), '利用者向けコマンドは表示する: ' + id);
  }
});

test('背景管理を内包するため UI host を優先する', () => {
  const manifest = require('../package.json');
  assert.deepEqual(manifest.extensionKind, ['ui']);
});

test('統合した壁紙の実装と設定を同じ VSIX に含む', () => {
  const manifest = require('../package.json');
  assert.equal(manifest.version, '0.12.4');
  assert.equal(manifest.extensionDependencies, undefined);
  for (const name of ['auto-apply', 'renderer-loader', 'wallpaper', 'workspace-id']) {
    assert.ok(fs.existsSync(path.join(root, 'src', 'workbench', name + '.js')));
  }
  for (const key of ['enabled', 'image', 'alternateImage', 'switchMode', 'maxAspectRatio', 'maxWidth', 'tint']) {
    assert.ok(manifest.contributes.configuration.properties['noctisBlue.wallpaper.' + key]);
  }
});
