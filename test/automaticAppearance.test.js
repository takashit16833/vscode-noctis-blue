'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  LAYER_ID,
  STATE_KEY,
  TRANSPARENT_THEME,
  WALLPAPER_BRIDGE_COMMANDS,
  syncAutomaticAppearance,
  enableAutomaticAppearance,
  disableAutomaticAppearance
} = require('../src/automaticAppearance');

function fixture(options = {}) {
  const calls = [];
  const state = { [STATE_KEY]: options.stateEnabled ?? false };
  let theme = options.theme ?? TRANSPARENT_THEME;

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
    commands: {
      async executeCommand(id, ...args) {
        calls.push([id, ...args]);

        if (options.installed === false) {
          throw new Error('command not found: ' + id);
        }
        if (id === WALLPAPER_BRIDGE_COMMANDS.version) {
          return options.bridgeVersion ?? 1;
        }
        if (id === WALLPAPER_BRIDGE_COMMANDS.setLayer) {
          return true;
        }
        if (id === WALLPAPER_BRIDGE_COMMANDS.removeLayer) {
          if (options.removeLayerError) throw options.removeLayerError;
          return true;
        }
        if (id === WALLPAPER_BRIDGE_COMMANDS.enableAutomatic) {
          return options.wallpaperEnabled ?? true;
        }
        throw new Error('Unexpected command: ' + id);
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

function callsFor(fixture, command) {
  return fixture.calls.filter(call => call[0] === command);
}

test('自動適用はコマンド橋渡しで提供元付き Noctis CSS レイヤーを登録する', async () => {
  const f = fixture();
  assert.equal(await enableAutomaticAppearance(f.vscode, f.context), true);

  const set = callsFor(f, WALLPAPER_BRIDGE_COMMANDS.setLayer)[0];
  assert.equal(set[1], LAYER_ID);
  assert.match(set[2], /\.monaco-workbench \.part\.editor/);
  assert.deepEqual(set[3], { ownerExtensionId: LAYER_ID });
  assert.equal(callsFor(f, WALLPAPER_BRIDGE_COMMANDS.enableAutomatic).length, 1);
  assert.equal(f.state[STATE_KEY], true);
});

test('初回有効化で wallpaper 側の確認をキャンセルしたら登録レイヤーを戻す', async () => {
  const f = fixture({ wallpaperEnabled: false });
  assert.equal(await enableAutomaticAppearance(f.vscode, f.context), false);
  assert.equal(
    callsFor(f, WALLPAPER_BRIDGE_COMMANDS.removeLayer)
      .some(call => call[1] === LAYER_ID),
    true
  );
  assert.equal(f.state[STATE_KEY], false);
});

test('有効化済み状態で再度 Enable をキャンセルしても既存レイヤーを消さない', async () => {
  const f = fixture({ stateEnabled: true, wallpaperEnabled: false });
  assert.equal(await enableAutomaticAppearance(f.vscode, f.context), false);
  assert.equal(callsFor(f, WALLPAPER_BRIDGE_COMMANDS.removeLayer).length, 0);
  assert.equal(f.state[STATE_KEY], true);
});

test('透過版以外では自動適用の有効化を拒否する', async () => {
  const f = fixture({ theme: 'Noctis Blue' });
  await assert.rejects(
    enableAutomaticAppearance(f.vscode, f.context),
    /Transparent/
  );
  assert.equal(callsFor(f, WALLPAPER_BRIDGE_COMMANDS.setLayer).length, 0);
});

test('起動時同期は透過版だけレイヤーを持ち、他テーマでは削除する', async () => {
  const f = fixture({ stateEnabled: true });
  assert.equal(await syncAutomaticAppearance(f.vscode, f.context), true);

  const set = callsFor(f, WALLPAPER_BRIDGE_COMMANDS.setLayer)[0];
  assert.equal(set[1], LAYER_ID);
  assert.match(set[2], /\.part\.editor/);
  assert.equal(set[3].ownerExtensionId, LAYER_ID);

  f.setTheme('Noctis Blue');
  await syncAutomaticAppearance(f.vscode, f.context);

  f.setTheme('Dark Modern');
  await syncAutomaticAppearance(f.vscode, f.context);

  assert.ok(
    callsFor(f, WALLPAPER_BRIDGE_COMMANDS.removeLayer)
      .filter(call => call[1] === LAYER_ID).length >= 2
  );
});

test('自動適用が無効なら Wallpaper のコマンドを呼ばない', async () => {
  const f = fixture({ stateEnabled: false });
  assert.equal(await syncAutomaticAppearance(f.vscode, f.context), false);
  assert.equal(f.calls.length, 0);
});

test('古い command bridge は明示的に拒否する', async () => {
  const f = fixture({ bridgeVersion: 0, stateEnabled: true });
  await assert.rejects(
    syncAutomaticAppearance(f.vscode, f.context),
    /v0\.11\.0/
  );
});

test('解除はレイヤー削除成功後にだけ無効状態を保存する', async () => {
  const f = fixture({ stateEnabled: true });
  assert.equal(await disableAutomaticAppearance(f.vscode, f.context), true);
  assert.equal(f.state[STATE_KEY], false);
  assert.equal(
    callsFor(f, WALLPAPER_BRIDGE_COMMANDS.removeLayer)
      .some(call => call[1] === LAYER_ID),
    true
  );
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

test('Wallpaper の command bridge が未導入なら解除済みと記録しない', async () => {
  const f = fixture({ stateEnabled: true, installed: false });
  await assert.rejects(
    disableAutomaticAppearance(f.vscode, f.context),
    /再インストール/
  );
  assert.equal(f.state[STATE_KEY], true);
});
