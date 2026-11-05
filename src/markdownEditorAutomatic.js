'use strict';

const path = require('node:path');
const { generateMarkdownCss } = require('./markdownAppearance');
const {
  applyMarkdownEditorCss,
  removeMarkdownEditorCss
} = require('./markdownEditorPatch');

const MARKDOWN_EXTENSION_ID = 'vscode.markdown-language-features';
const STATE_KEY = 'noctisBlue.markdownEditorAppearanceEnabled';
const NOCTIS_THEMES = new Set(['Noctis Blue', 'Noctis Blue Transparent']);

function currentTheme(vscode) {
  return vscode.workspace.getConfiguration('workbench').get('colorTheme');
}

function isNoctisTheme(vscode) {
  return NOCTIS_THEMES.has(currentTheme(vscode));
}

function markdownEditorCssPath(vscode) {
  const extension = vscode.extensions.getExtension(MARKDOWN_EXTENSION_ID);
  if (!extension) {
    throw new Error('VS Code の組み込み Markdown 拡張が見つかりません。');
  }
  return path.join(extension.extensionUri.fsPath, 'markdown-editor-out', 'editor.css');
}

function currentMarkdownCss(vscode) {
  const opacity = vscode.workspace.getConfiguration('noctisBlue')
    .get('markdownActiveBlockOpacity', 0.65);
  return generateMarkdownCss(opacity);
}

async function syncMarkdownEditorAppearance(vscode, context) {
  if (!context.globalState.get(STATE_KEY, false)) return false;

  const filename = markdownEditorCssPath(vscode);
  if (isNoctisTheme(vscode)) {
    await applyMarkdownEditorCss(filename, currentMarkdownCss(vscode));
  } else {
    await removeMarkdownEditorCss(filename);
  }
  return true;
}

async function enableMarkdownEditorAppearance(vscode, context) {
  if (!isNoctisTheme(vscode)) {
    throw new Error('Noctis Blue または Noctis Blue Transparent を選択してから有効にしてください。');
  }

  const filename = markdownEditorCssPath(vscode);
  await applyMarkdownEditorCss(filename, currentMarkdownCss(vscode));
  try {
    await context.globalState.update(STATE_KEY, true);
  } catch (error) {
    await removeMarkdownEditorCss(filename).catch(() => {});
    throw error;
  }
  return true;
}

async function disableMarkdownEditorAppearance(vscode, context) {
  const filename = markdownEditorCssPath(vscode);
  await removeMarkdownEditorCss(filename);
  await context.globalState.update(STATE_KEY, false);
  return true;
}

module.exports = {
  MARKDOWN_EXTENSION_ID,
  STATE_KEY,
  NOCTIS_THEMES,
  currentTheme,
  isNoctisTheme,
  markdownEditorCssPath,
  currentMarkdownCss,
  syncMarkdownEditorAppearance,
  enableMarkdownEditorAppearance,
  disableMarkdownEditorAppearance
};
