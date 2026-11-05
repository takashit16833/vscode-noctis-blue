'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const automatic = require('../src/workbench/auto-apply');
const {
  STATE_KEY, enableAutomaticAppearance, syncAutomaticAppearance, disableAutomaticAppearance
} = require('../src/automaticAppearance');

const HTML = '<html><head><link rel="stylesheet" href="../../../workbench/workbench.desktop.main.css"></head></html>';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'noctis-merged-integration-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const files = automatic.pathsFor(root);
  await fs.mkdir(files.dir, { recursive: true });
  await fs.writeFile(files.html, HTML);
  const state = { [STATE_KEY]: false };
  let theme = 'Noctis Blue Transparent';
  const vscode = {
    env: { appRoot: root },
    workspace: {
      workspaceFolders: [{
        uri: { scheme: 'vscode-remote', authority: 'remote+test', toString: () => 'vscode-remote://remote+test/project' }
      }],
      getConfiguration(section) {
        if (section === 'workbench') return { get: () => theme };
        if (section === 'noctisBlue') return { get: () => ({editor: 0.71}) };
        if (section === 'noctisBlue.wallpaper') return {
          inspect: () => ({globalValue: 'configured'}),
          get(key, fallback) {
            return ({
              enabled: true,
              image: 'https://example.org/image.png',
              alternateImage: '',
              tint: '#FFFFFF',
              switchMode: 'orientation'
            })[key] ?? fallback;
          }
        };
        if (section === 'vscodeWallpaper') return { get: (_key, fallback) => fallback };
        throw new Error(section);
      }
    },
    extensions: { getExtension: () => undefined },
    window: { showWarningMessage: async () => '自動適用を有効にする' }
  };
  const context = {
    globalState: {
      get: (key, fallback) => state[key] ?? fallback,
      update: async (key, value) => { state[key] = value; }
    }
  };
  return { vscode, context, state, files, setTheme: value => { theme = value; } };
}

test('単一拡張だけで壁紙・透過を導入し、テーマ変更を反映し、解除時に完全復元する', async t => {
  const f = await fixture(t);
  assert.equal(await enableAutomaticAppearance(f.vscode, f.context), true);
  assert.equal(f.state[STATE_KEY], true);
  assert.equal((await automatic.inspect(f.vscode.env.appRoot)).installed, true);

  const generated = (await fs.readdir(f.files.dir)).find(x => /^vscode-wallpaper-[\da-f]{32}\.css$/.test(x));
  assert.ok(generated, 'workspace CSS was not written');
  const layersName = generated.replace('vscode-wallpaper-', 'vscode-wallpaper-layers-');
  const imageCss = await fs.readFile(path.join(f.files.dir, generated), 'utf8');
  assert.match(imageCss, /example\.org\/image\.png/);
  assert.match(await fs.readFile(path.join(f.files.dir, layersName), 'utf8'), /monaco-grid-view/);

  f.setTheme('Noctis Blue');
  assert.equal(await syncAutomaticAppearance(f.vscode, f.context), true);
  const layers = await fs.readFile(path.join(f.files.dir, layersName), 'utf8');
  assert.doesNotMatch(layers, /monaco-grid-view/);
  assert.match(await fs.readFile(path.join(f.files.dir, generated), 'utf8'), /image\.png/);

  assert.equal(await disableAutomaticAppearance(f.vscode, f.context), true);
  assert.equal(f.state[STATE_KEY], false);
  assert.equal(await fs.readFile(f.files.html, 'utf8'), HTML);
  assert.equal((await automatic.inspect(f.vscode.env.appRoot)).installed, false);
});

test('workbench 自動適用の同意がない場合は管理ファイルを作らない', async t => {
  const f = await fixture(t);
  f.vscode.window.showWarningMessage = async () => undefined;
  assert.equal(await enableAutomaticAppearance(f.vscode, f.context), false);
  assert.equal(f.state[STATE_KEY], false);
  assert.equal(await fs.readFile(f.files.html, 'utf8'), HTML);
  assert.equal((await automatic.inspect(f.vscode.env.appRoot)).installed, false);
});
