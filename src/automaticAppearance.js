'use strict';

const { generateCss } = require('./appearance');

const WALLPAPER_BRIDGE_VERSION = 2;
const WALLPAPER_BRIDGE_COMMANDS = Object.freeze({
  version: '_vscodeWallpaper.bridgeVersion',
  setLayer: '_vscodeWallpaper.setLayer',
  removeLayer: '_vscodeWallpaper.removeLayer',
  enableAutomatic: '_vscodeWallpaper.enableAutomatic'
});
const LAYER_ID = 'takashit16833.noctis-blue';
// Registered in package.json, and discoverable from the local UI host even
// when Noctis Blue runs in a remote workspace extension host.
const OWNER_COMMAND_ID = 'noctisBlue.enableAutomaticAppearance';
const STATE_KEY = 'noctisBlue.automaticAppearanceEnabled';
const TRANSPARENT_THEME = 'Noctis Blue Transparent';

function currentTheme(vscode) {
  return vscode.workspace.getConfiguration('workbench').get('colorTheme');
}

function isTransparentTheme(vscode) {
  return currentTheme(vscode) === TRANSPARENT_THEME;
}

function currentCss(vscode) {
  const opacity = vscode.workspace.getConfiguration('noctisBlue').get('opacity', {});
  return generateCss(opacity);
}

async function wallpaperBridge(vscode, optional = false) {
  try {
    const version = await vscode.commands.executeCommand(WALLPAPER_BRIDGE_COMMANDS.version);
    if (version !== WALLPAPER_BRIDGE_VERSION) {
      throw new Error('VS Code Wallpaper v0.11.1 以降が必要です。');
    }

    return {
      setLayer: (id, css, options) =>
        vscode.commands.executeCommand(WALLPAPER_BRIDGE_COMMANDS.setLayer, id, css, options),
      removeLayer: id =>
        vscode.commands.executeCommand(WALLPAPER_BRIDGE_COMMANDS.removeLayer, id),
      enableAutomatic: () =>
        vscode.commands.executeCommand(WALLPAPER_BRIDGE_COMMANDS.enableAutomatic)
    };
  } catch (error) {
    if (optional) return null;
    if (/v0\.11\.1/.test(error?.message ?? '')) throw error;
    throw new Error('VS Code Wallpaper v0.11.1 以降をローカル側にインストールしてください。');
  }
}

async function syncAutomaticAppearance(vscode, context) {
  if (!context.globalState.get(STATE_KEY, false)) return false;

  const api = await wallpaperBridge(vscode);
  if (isTransparentTheme(vscode)) {
    await api.setLayer(LAYER_ID, currentCss(vscode), {
      ownerExtensionId: LAYER_ID,
      ownerCommandId: OWNER_COMMAND_ID
    });
  } else {
    await api.removeLayer(LAYER_ID);
  }
  return true;
}

async function enableAutomaticAppearance(vscode, context) {
  if (!isTransparentTheme(vscode)) {
    throw new Error('Noctis Blue Transparent を選択してから自動適用を有効にしてください。');
  }

  const api = await wallpaperBridge(vscode);
  const wasEnabled = context.globalState.get(STATE_KEY, false);
  let registered = false;
  try {
    await api.setLayer(LAYER_ID, currentCss(vscode), {
      ownerExtensionId: LAYER_ID,
      ownerCommandId: OWNER_COMMAND_ID
    });
    registered = true;

    const enabled = await api.enableAutomatic();
    if (!enabled) {
      if (!wasEnabled) await api.removeLayer(LAYER_ID);
      return false;
    }

    await context.globalState.update(STATE_KEY, true);
    return true;
  } catch (error) {
    if (registered && !wasEnabled) {
      try {
        await api.removeLayer(LAYER_ID);
      } catch {}
    }
    throw error;
  }
}

async function disableAutomaticAppearance(vscode, context) {
  const api = await wallpaperBridge(vscode, true);
  if (!api) {
    throw new Error(
      'VS Code Wallpaper が見つからないため CSS レイヤーを解除できません。' +
      'Wallpaper を再インストールしてからもう一度解除してください。'
    );
  }

  await api.removeLayer(LAYER_ID);
  await context.globalState.update(STATE_KEY, false);
  return true;
}

module.exports = {
  WALLPAPER_BRIDGE_VERSION,
  WALLPAPER_BRIDGE_COMMANDS,
  LAYER_ID,
  OWNER_COMMAND_ID,
  STATE_KEY,
  TRANSPARENT_THEME,
  currentTheme,
  isTransparentTheme,
  currentCss,
  wallpaperBridge,
  syncAutomaticAppearance,
  enableAutomaticAppearance,
  disableAutomaticAppearance
};
