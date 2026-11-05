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

test('Noctis Blue prefers the workspace host and falls back to the UI host', () => {
  const manifest = require('../package.json');
  assert.deepEqual(manifest.extensionKind, ['workspace', 'ui']);
});
