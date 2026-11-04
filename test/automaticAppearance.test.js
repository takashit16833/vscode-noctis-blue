'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  LAYER_ID,
  STATE_KEY,
  TRANSPARENT_THEME,
  syncAutomaticAppearance,
  enableAutomaticAppearance,
  disableAutomaticAppearance
} = require('../src/automaticAppearance');

function fixture(options = {}) {
  const calls = [];
  const state = { [STATE_KEY]: options.stateEnabled ?? false };
  let theme = options.theme ?? TRANSPARENT_THEME;

  const api = {
    apiVersion: options.apiVersion ?? 3,
    setLayer: async (...args) => { calls.push(['setLayer', ...args]); },
    removeLayer: async (...args) => {
      calls.push(['removeLayer', ...args]);
      if (options.removeLayerError) throw options.removeLayerError;
    },
    enableAutomatic: async () => {
      calls.push(['enableAutomatic']);
      return options.wallpaperEnabled ?? true;
    }
  };
  const extension = options.installed === false ? undefined : {
    isActive: true,
    exports: api,
    activate: async () => api
  };

  const vscode = {
    workspace: {
      getConfiguration(section) {
        if (section === 'workbench') {
          return { get: key => key === 'colorTheme' ? theme : undefined };
        }
        if (section === 'noctisBlue') {
          return {
            get: (key, fallback) => key === 'opacity' ? { editor: 0.5 } : fallback
          };
        }
        throw new Error('Unexpected configuration: ' + section);
      }
    },
    extensions: {
      getExtension: id => {
        calls.push(['getExtension', id]);
        return extension;
      }
    }
  };
  const context = {
    globalState: {
      get: (key, fallback) => Object.hasOwn(state, key) ? state[key] : fallback,
      update: async (key, value) => { state[key] = value; }
    }
  };

  return {
    vscode,
    context,
    calls,
    state,
    setTheme: value => { theme = value; }
  };
}

test('自動適用は透過版テーマで提供元付き Noctis CSS レイヤーを登録する', async () => {
  const f = fixture();
  assert.equal(await enableAutomaticAppearance(f.vscode, f.context), true);

  const set = f.calls.find(call => call[0] === 'setLayer');
  assert.equal(set[1], LAYER_ID);
  assert.match(set[2], /\.monaco-workbench \.part\.editor/);
  assert.deepEqual(set[3], { ownerExtensionId: LAYER_ID });
  assert.ok(f.calls.some(call => call[0] === 'enableAutomatic'));
  assert.equal(f.state[STATE_KEY], true);
});

test('初回有効化で wallpaper 側の確認をキャンセルしたら登録レイヤーを戻す', async () => {
  const f = fixture({ wallpaperEnabled: false });
  assert.equal(await enableAutomaticAppearance(f.vscode, f.context), false);
  assert.ok(f.calls.some(call => call[0] === 'removeLayer' && call[1] === LAYER_ID));
  assert.equal(f.state[STATE_KEY], false);
});

test('有効化済み状態で再度 Enable をキャンセルしても既存レイヤーを消さない', async () => {
  const f = fixture({ stateEnabled: true, wallpaperEnabled: false });
  assert.equal(await enableAutomaticAppearance(f.vscode, f.context), false);
  assert.equal(f.calls.some(call => call[0] === 'removeLayer'), false);
  assert.equal(f.state[STATE_KEY], true);
});

test('透過版以外では自動適用の有効化を拒否する', async () => {
  const f = fixture({ theme: 'Noctis Blue' });
  await assert.rejects(
    enableAutomaticAppearance(f.vscode, f.context),
    /Transparent/
  );
  assert.equal(f.calls.some(call => call[0] === 'setLayer'), false);
});

test('起動時同期は透過版だけレイヤーを持ち、他テーマでは削除する', async () => {
  const f = fixture({ stateEnabled: true });
  assert.equal(await syncAutomaticAppearance(f.vscode, f.context), true);
  assert.ok(f.calls.some(call =>
    call[0] === 'setLayer' && call[1] === LAYER_ID &&
    call[2].includes('.part.editor') &&
    call[3].ownerExtensionId === LAYER_ID
  ));

  f.setTheme('Noctis Blue');
  await syncAutomaticAppearance(f.vscode, f.context);
  assert.ok(f.calls.some(call =>
    call[0] === 'removeLayer' && call[1] === LAYER_ID
  ));

  f.setTheme('Dark Modern');
  await syncAutomaticAppearance(f.vscode, f.context);
  assert.ok(f.calls.filter(call =>
    call[0] === 'removeLayer' && call[1] === LAYER_ID
  ).length >= 2);
});

test('自動適用が無効なら wallpaper 拡張を起動しない', async () => {
  const f = fixture({ stateEnabled: false });
  assert.equal(await syncAutomaticAppearance(f.vscode, f.context), false);
  assert.equal(f.calls.length, 0);
});

test('古い wallpaper API は明示的に拒否する', async () => {
  const f = fixture({ apiVersion: 2, stateEnabled: true });
  await assert.rejects(
    syncAutomaticAppearance(f.vscode, f.context),
    /v0\.10\.0/
  );
});

test('解除はレイヤー削除成功後にだけ無効状態を保存する', async () => {
  const f = fixture({ stateEnabled: true });
  assert.equal(await disableAutomaticAppearance(f.vscode, f.context), true);
  assert.equal(f.state[STATE_KEY], false);
  assert.ok(f.calls.some(call => call[0] === 'removeLayer' && call[1] === LAYER_ID));
  assert.equal(f.calls.some(call => call[0] === 'disableAutomatic'), false);
});

test('removeLayer が失敗したら有効状態を維持して次回同期可能にする', async () => {
  const f = fixture({
    stateEnabled: true,
    removeLayerError: new Error('remove failed')
  });
  await assert.rejects(
    disableAutomaticAppearance(f.vscode, f.context),
    /remove failed/
  );
  assert.equal(f.state[STATE_KEY], true);
});

test('wallpaper が未導入なら解除済みと記録しない', async () => {
  const f = fixture({ stateEnabled: true, installed: false });
  await assert.rejects(
    disableAutomaticAppearance(f.vscode, f.context),
    /再インストール/
  );
  assert.equal(f.state[STATE_KEY], true);
});
