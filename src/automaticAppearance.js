'use strict';

const { generateCss: generateAppearanceCss } = require('./appearance');
const automatic = require('./workbench/auto-apply');
const { currentWorkspaceId } = require('./workbench/workspace-id');
const { readSettings, generateCss: generateWallpaperCss } = require('./workbench/wallpaper');

const STATE_KEY = 'noctisBlue.automaticAppearanceEnabled';
const MIGRATION_KEY = 'noctisBlue.workbenchMigrationChecked';
const TRANSPARENT_THEME = 'Noctis Blue Transparent';
const LEGACY_WALLPAPER_ID = 'takashit16833.vscode-wallpaper';
const LAYER_ID = 'takashit16833.noctis-blue';

function currentTheme(vscode) {
  return vscode.workspace.getConfiguration('workbench').get('colorTheme');
}

function isTransparentTheme(vscode) {
  return currentTheme(vscode) === TRANSPARENT_THEME;
}

function ensureNoLegacyExtension(vscode) {
  if (vscode.extensions.getExtension(LEGACY_WALLPAPER_ID)) {
    throw new Error('旧 VS Code Wallpaper がインストールされています。旧拡張をアンインストールして Reload Window を実行してください。');
  }
}

function currentCss(vscode) {
  const opacity = vscode.workspace.getConfiguration('noctisBlue').get('opacity', {});
  return generateAppearanceCss(opacity);
}

function currentWallpaperCss(vscode) {
  const modern = vscode.workspace.getConfiguration('noctisBlue.wallpaper');
  const legacy = vscode.workspace.getConfiguration('vscodeWallpaper');
  // Keep existing installations working until the user's settings are migrated.
  // inspect() distinguishes an explicit empty value from the default empty value.
  const settings = readSettings({
    get(key, fallback) {
      const inspect = modern.inspect?.(key);
      const explicitlyConfigured = inspect &&
        ['globalValue', 'workspaceValue', 'workspaceFolderValue'].some(name =>
          inspect[name] !== undefined);
      const modernValue = modern.get(key, fallback);
      return modernValue;
    }
  });
  const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
  // A remote workspace folder is not a local macOS path.
  const workspaceDirectory = folder?.scheme === 'file' ? folder.fsPath : undefined;
  return generateWallpaperCss(settings, { workspaceDirectory });
}

async function styles(vscode) {
  const workspaceId = await currentWorkspaceId(vscode.workspace);
  const layers = isTransparentTheme(vscode) ? { [LAYER_ID]: currentCss(vscode) } : {};
  return { workspaceId, layers, wallpaper: currentWallpaperCss(vscode) };
}

// Adopt the previous extension's existing workbench patch only after checking
// that its loader, backup and HTML are intact. Never infer prior consent from
// the presence of a similarly named file alone.
async function adoptInstalledWallpaper(vscode, context) {
  if (context.globalState.get(MIGRATION_KEY, false)) return false;
  ensureNoLegacyExtension(vscode);
  const existing = await automatic.inspect(vscode.env.appRoot);
  if (existing.installed && !context.globalState.get(STATE_KEY, false)) {
    await context.globalState.update(STATE_KEY, true);
  }
  await context.globalState.update(MIGRATION_KEY, true);
  return existing.installed;
}

async function syncAutomaticAppearance(vscode, context) {
  if (!context.globalState.get(STATE_KEY, false)) return false;
  ensureNoLegacyExtension(vscode);
  const state = await automatic.inspect(vscode.env.appRoot);
  if (!state.installed) return false; // A new workbench patch requires user consent.
  const { wallpaper, workspaceId, layers } = await styles(vscode);
  await automatic.sync(vscode.env.appRoot, wallpaper, workspaceId, layers);
  return true;
}

async function enableAutomaticAppearance(vscode, context) {
  ensureNoLegacyExtension(vscode);
  const choice = await vscode.window.showWarningMessage(
    '背景画像と透過の自動適用では、VS Code 本体の workbench.html に管理ローダーを追加します。元ファイルをバックアップしますが、整合性警告が表示される場合があります。VS Code 更新後の修復が必要になることがあります。',
    { modal: true }, '自動適用を有効にする'
  );
  if (choice !== '自動適用を有効にする') return false;
  const { wallpaper, workspaceId, layers } = await styles(vscode);
  await automatic.enable(vscode.env.appRoot, wallpaper, workspaceId, layers);
  await context.globalState.update(STATE_KEY, true);
  await context.globalState.update(MIGRATION_KEY, true);
  return true;
}

async function disableAutomaticAppearance(vscode, context) {
  ensureNoLegacyExtension(vscode);
  await automatic.disable(vscode.env.appRoot);
  await context.globalState.update(MIGRATION_KEY, true);
  await context.globalState.update(STATE_KEY, false);
  return true;
}

async function repairAutomaticAppearance(vscode, context) {
  ensureNoLegacyExtension(vscode);
  const choice = await vscode.window.showWarningMessage(
    'VS Code 更新後に残った管理ファイルを確認し、所有を確認できるものだけを整理して再導入します。現在の workbench.html は修復処理で直接復元しません。',
    { modal: true }, '背景読み込みを修復する'
  );
  if (choice !== '背景読み込みを修復する') return false;
  // Validate all settings and generate CSS before removing stale files.
  // A malformed image path must never leave the installation half-repaired.
  const { wallpaper, workspaceId, layers } = await styles(vscode);
  await automatic.repairStale(vscode.env.appRoot);
  await automatic.enable(vscode.env.appRoot, wallpaper, workspaceId, layers);
  await context.globalState.update(STATE_KEY, true);
  await context.globalState.update(MIGRATION_KEY, true);
  return true;
}

module.exports = {
  STATE_KEY, MIGRATION_KEY, TRANSPARENT_THEME, LEGACY_WALLPAPER_ID, LAYER_ID,
  currentTheme, isTransparentTheme, currentCss, currentWallpaperCss,
  styles, ensureNoLegacyExtension, adoptInstalledWallpaper, syncAutomaticAppearance,
  enableAutomaticAppearance, disableAutomaticAppearance, repairAutomaticAppearance
};
