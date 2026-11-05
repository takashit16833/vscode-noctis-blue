'use strict';

const path = require('node:path');
const { remoteMarkdownEditorTarget } = require('./markdownEditorRemote');
const { generateMarkdownCss } = require('./markdownAppearance');
const { applyMarkdownEditorCss, removeMarkdownEditorCss } = require('./markdownEditorPatch');

const MARKDOWN_EXTENSION_ID = 'vscode.markdown-language-features';
const STATE_KEY = 'noctisBlue.markdownEditorAppearanceEnabledTargets';
const NOCTIS_THEMES = new Set(['Noctis Blue', 'Noctis Blue Transparent']);

const pendingByTarget = new Map();

// A configuration update must not reapply CSS after an explicit disable.
// Serialize the file operation together with its saved enable/disable state.
async function withTargetQueue(scope, task) {
  const previous = pendingByTarget.get(scope);
  const current = (previous ?? Promise.resolve()).catch(() => {}).then(task);
  pendingByTarget.set(scope, current);
  try {
    return await current;
  } finally {
    if (pendingByTarget.get(scope) === current) pendingByTarget.delete(scope);
  }
}

function currentTheme(vscode) {
  return vscode.workspace.getConfiguration('workbench').get('colorTheme');
}
function isNoctisTheme(vscode) {
  return NOCTIS_THEMES.has(currentTheme(vscode));
}

function markdownEditorCssPath(vscode) {
  const extension = vscode.extensions.getExtension(MARKDOWN_EXTENSION_ID);
  if (!extension) throw new Error('VS Code の組み込み Markdown 拡張が見つかりません。');
  return path.join(extension.extensionUri.fsPath, 'markdown-editor-out', 'editor.css');
}

function remoteFolder(vscode) {
  return vscode.workspace.workspaceFolders?.find(folder =>
    folder.uri.scheme !== 'file' && folder.uri.authority);
}

function targetScope(vscode) {
  const remote = remoteFolder(vscode);
  if (remote) return 'remote:' + remote.uri.scheme + '://' + remote.uri.authority;
  if (vscode.env?.remoteName) {
    throw new Error('リモート接続先を確認できません。別の接続先に誤適用しないため停止します。');
  }
  if (!vscode.env?.appRoot) throw new Error('VS Code のインストール場所を確認できません。');
  return 'local:' + vscode.env.appRoot;
}

async function cssTarget(vscode) {
  if (remoteFolder(vscode)) return remoteMarkdownEditorTarget(vscode);
  if (vscode.env?.remoteName) throw new Error('リモート接続先を確認できません。');
  return { filename: markdownEditorCssPath(vscode) };
}

function currentMarkdownCss(vscode) {
  const opacity = vscode.workspace.getConfiguration('noctisBlue')
    .get('markdownActiveBlockOpacity', 0.65);
  return generateMarkdownCss(opacity);
}

function enabledTargets(context) {
  const state = context.globalState.get(STATE_KEY, {});
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error('Markdown Editor の有効化状態が不正です。');
  }
  return state;
}

async function syncMarkdownEditorAppearance(vscode, context) {
  const scope = targetScope(vscode);
  return withTargetQueue(scope, async () => {
    if (!enabledTargets(context)[scope]) return false;
    const { filename, io } = await cssTarget(vscode);
    // The CSS is shared across windows and scoped to the Noctis Blue themes.
    await applyMarkdownEditorCss(filename, currentMarkdownCss(vscode), io);
    return true;
  });
}

async function enableMarkdownEditorAppearance(vscode, context) {
  if (!isNoctisTheme(vscode)) {
    throw new Error('Noctis Blue または Noctis Blue Transparent を選択してから有効にしてください。');
  }
  const scope = targetScope(vscode);
  return withTargetQueue(scope, async () => {
    const { filename, io } = await cssTarget(vscode);
    await applyMarkdownEditorCss(filename, currentMarkdownCss(vscode), io);
    await context.globalState.update(STATE_KEY, { ...enabledTargets(context), [scope]: true });
    return true;
  });
}

async function disableMarkdownEditorAppearance(vscode, context) {
  const scope = targetScope(vscode);
  return withTargetQueue(scope, async () => {
    const { filename, io } = await cssTarget(vscode);
    await removeMarkdownEditorCss(filename, io);
    const state = { ...enabledTargets(context) };
    delete state[scope];
    await context.globalState.update(STATE_KEY, state);
    return true;
  });
}

module.exports = {
  MARKDOWN_EXTENSION_ID, STATE_KEY, NOCTIS_THEMES,
  currentTheme, isNoctisTheme, markdownEditorCssPath, remoteFolder, targetScope,
  cssTarget, currentMarkdownCss, enabledTargets,
  syncMarkdownEditorAppearance, enableMarkdownEditorAppearance, disableMarkdownEditorAppearance
};
