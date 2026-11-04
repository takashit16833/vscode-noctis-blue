'use strict';

const { generateCss } = require('./appearance');

const WALLPAPER_EXTENSION_ID = 'takashit16833.vscode-wallpaper';
const LAYER_ID = 'takashit16833.noctis-blue';
const STATE_KEY = 'noctisBlue.automaticAppearanceEnabled';
const TRANSPARENT_THEME = 'Noctis Blue Transparent';

function isTransparentTheme(vscode) {
  return vscode.workspace.getConfiguration('workbench').get('colorTheme') === TRANSPARENT_THEME;
}

function currentCss(vscode) {
  const opacity = vscode.workspace.getConfiguration('noctisBlue').get('opacity', {});
  return generateCss(opacity);
}

async function wallpaperApi(vscode, optional = false) {
  const extension = vscode.extensions.getExtension(WALLPAPER_EXTENSION_ID);
  if (!extension) {
    if (optional) return null;
    throw new Error('VS Code Wallpaper v0.8.0 以降をインストールしてください。');
  }
  const api = extension.isActive ? extension.exports : await extension.activate();
  if (!api || api.apiVersion !== 1 ||
      typeof api.setLayer !== 'function' ||
      typeof api.removeLayer !== 'function' ||
      typeof api.enableAutomatic !== 'function') {
    throw new Error('VS Code Wallpaper v0.8.0 以降が必要です。');
  }
  return api;
}

async function syncAutomaticAppearance(vscode, context) {
  if (!context.globalState.get(STATE_KEY, false)) return false;
  const api = await wallpaperApi(vscode);
  if (isTransparentTheme(vscode)) {
    await api.setLayer(LAYER_ID, currentCss(vscode), { ownsSurfaces: true });
  } else {
    await api.removeLayer(LAYER_ID);
  }
  return true;
}

async function enableAutomaticAppearance(vscode, context) {
  if (!isTransparentTheme(vscode)) {
    throw new Error('Noctis Blue Transparent を選択してから自動適用を有効にしてください。');
  }
  const api = await wallpaperApi(vscode);
  let registered = false;
  try {
    await api.setLayer(LAYER_ID, currentCss(vscode), { ownsSurfaces: true });
    registered = true;
    const enabled = await api.enableAutomatic();
    if (!enabled) {
      await api.removeLayer(LAYER_ID);
      return false;
    }
    await context.globalState.update(STATE_KEY, true);
    return true;
  } catch (error) {
    if (registered) {
      try { await api.removeLayer(LAYER_ID); } catch {}
    }
    throw error;
  }
}

async function disableAutomaticAppearance(vscode, context) {
  await context.globalState.update(STATE_KEY, false);
  const api = await wallpaperApi(vscode, true);
  if (api) await api.removeLayer(LAYER_ID);
  return Boolean(api);
}

module.exports = {
  WALLPAPER_EXTENSION_ID, LAYER_ID, STATE_KEY, TRANSPARENT_THEME,
  isTransparentTheme, currentCss, wallpaperApi,
  syncAutomaticAppearance, enableAutomaticAppearance, disableAutomaticAppearance
};
