'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  STATE_KEY, currentWallpaperCss, styles, ensureNoLegacyExtension,
  syncAutomaticAppearance, enableAutomaticAppearance, disableAutomaticAppearance
} = require('../src/automaticAppearance');

function fixture(options = {}) {
  const state = { [STATE_KEY]: options.enabled ?? true };
  const events = [];
  const vscode = {
    env: { appRoot: '/app' },
    workspace: {
      workspaceFolders: [{ uri: { scheme: 'vscode-remote', toString: () => 'vscode-remote://host/workspace' } }],
      getConfiguration(section) {
        if (section === 'workbench') return { get: () => options.theme || 'Noctis Blue Transparent' };
        if (section === 'noctisBlue') return { get: () => ({ editor: 0.91 }) };
        if (section === 'noctisBlue.wallpaper') return {
          inspect: key => options.modernSettings ? { globalValue: options.modernSettings[key] } : undefined,
          get: (key, fallback) => options.modernSettings?.[key] ?? ({
            enabled: true, image: 'https://example.org/blue.png'
          })[key] ?? fallback
        };
        if (section === 'vscodeWallpaper') return {
          get: (key, fallback) => options.legacySettings?.[key] ?? fallback
        };
        throw new Error('unexpected config: ' + section);
      }
    },
    extensions: { getExtension: () => options.legacy ? { id: 'old' } : undefined },
    window: { showWarningMessage: async () => options.agreed ? '自動適用を有効にする' : undefined }
  };
  const context = {
    globalState: {
      get: (key, fallback) => Object.hasOwn(state, key) ? state[key] : fallback,
      update: async (key, value) => { state[key] = value; events.push([key, value]); }
    }
  };
  return { vscode, context, state, events };
}

test('同じ拡張の内部で壁紙 CSS と透過 CSS を生成する', async () => {
  const f = fixture();
  const s = await styles(f.vscode);
  assert.match(s.wallpaper, /background-image/);
  assert.match(s.layers['takashit16833.noctis-blue'], /monaco-grid-view/);
  assert.ok(s.workspaceId);
});

test('不透明テーマでは壁紙と透過を別に扱い透過 CSS は生成しない', async () => {
  const f = fixture({ theme: 'Noctis Blue' });
  const s = await styles(f.vscode);
  assert.deepEqual(s.layers, {});
});

test('リモートワークスペースの URI を Mac の画像パスとして扱わない', () => {
  const f = fixture();
  assert.match(currentWallpaperCss(f.vscode), /https:\/\/example\.org\/blue\.png/);
});

test('移行前の wallpaper 設定を読み、移行後は新しい設定を優先する', () => {
  const old = fixture({ legacySettings: {
    enabled: true, image: 'https://example.org/old.png'
  } });
  assert.ok(currentWallpaperCss(old.vscode).includes('old.png'));
  const modern = fixture({
    legacySettings: { enabled: true, image: 'https://example.org/old.png' },
    modernSettings: { enabled: true, image: 'https://example.org/new.png' }
  });
  assert.ok(currentWallpaperCss(modern.vscode).includes('new.png'));
  assert.ok(!currentWallpaperCss(modern.vscode).includes('old.png'));
});

test('旧拡張のインストール中は二重に workbench を管理しない', () => {
  assert.throws(() => ensureNoLegacyExtension(fixture({ legacy: true }).vscode), /旧 VS Code Wallpaper/);
});

test('自動適用が無効なら VS Code 本体には触れない', async () => {
  const f = fixture({ enabled: false });
  assert.equal(await syncAutomaticAppearance(f.vscode, f.context), false);
});

test('利用者が同意しなかった場合は有効状態を変更しない', async () => {
  const f = fixture({ agreed: false, enabled: false });
  assert.equal(await enableAutomaticAppearance(f.vscode, f.context), false);
  assert.equal(f.state[STATE_KEY], false);
});

test('旧 Wallpaper が残っている場合は無効状態に変更しない', async () => {
  const f = fixture({ legacy: true });
  await assert.rejects(disableAutomaticAppearance(f.vscode, f.context), /旧 VS Code Wallpaper/);
  assert.equal(f.state[STATE_KEY], true);
});
