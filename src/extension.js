'use strict';

const vscode = require('vscode');
const { generateTemporaryScript } = require('./appearance');
const { generateTemporaryMarkdownScript } = require('./markdownAppearance');
const { generateCombinedTestScript } = require('./combinedTest');
const {
  TRANSPARENT_THEME,
  syncAutomaticAppearance,
  enableAutomaticAppearance,
  disableAutomaticAppearance,
  repairAutomaticAppearance
} = require('./automaticAppearance');
const {
  syncMarkdownEditorAppearance,
  enableMarkdownEditorAppearance,
  disableMarkdownEditorAppearance
} = require('./markdownEditorAutomatic');

function currentTheme() {
  return vscode.workspace.getConfiguration('workbench').get('colorTheme');
}

function ensureTransparentTheme(message) {
  if (currentTheme() === TRANSPARENT_THEME) return true;
  void vscode.window.showWarningMessage(message);
  return false;
}

async function showScript(content) {
  const document = await vscode.workspace.openTextDocument({
    language: 'javascript',
    content
  });
  await vscode.window.showTextDocument(document, { preview: false });
}

function registerCommand(context, id, handler) {
  context.subscriptions.push(vscode.commands.registerCommand(id, handler));
}

function reportSyncError(error) {
  void vscode.window.showWarningMessage(
    'Noctis Blue の自動表示 CSS を更新できませんでした: ' + error.message
  );
}

function reportMarkdownSyncError(error) {
  void vscode.window.showWarningMessage(
    'Noctis Blue の Markdown Editor CSS を更新できませんでした: ' + error.message
  );
}

function activate(context) {
  registerCommand(context, 'noctisBlue.showCombinedTransparencyTest', async () => {
    if (!ensureTransparentTheme(
      'Noctis Blue Transparent を選択してから透過を試してください。'
    )) return;

    try {
      await showScript(generateCombinedTestScript());
      void vscode.window.showInformationMessage(
        'この同じコードを開発者ツールの top と Markdown Editor で一回ずつ実行してください。' +
        ' 背景の縞模様と半透明の領域を同時に確認できます。'
      );
    } catch (error) {
      void vscode.window.showErrorMessage(
        '統合検証スクリプトの生成に失敗: ' + error.message
      );
    }
  });

  registerCommand(context, 'noctisBlue.showOpacityScript', async () => {
    if (!ensureTransparentTheme(
      'Noctis Blue Transparent を選択してから透過を試してください。'
    )) return;

    try {
      const opacity = vscode.workspace.getConfiguration('noctisBlue').get('opacity', {});
      await showScript(generateTemporaryScript(opacity));
      void vscode.window.showInformationMessage(
        '表示されたJavaScriptを、開発者ツールのtopフレームのConsoleで実行してください。' +
        ' VS Code本体やユーザー設定は変更しません。'
      );
    } catch (error) {
      void vscode.window.showErrorMessage(
        '不透明度の設定が不正です: ' + error.message
      );
    }
  });

  registerCommand(context, 'noctisBlue.showMarkdownActiveBlockTest', async () => {
    if (!ensureTransparentTheme(
      'Noctis Blue Transparent を選択してからMarkdownの半透明表示を試してください。'
    )) return;

    try {
      const opacity = vscode.workspace.getConfiguration('noctisBlue')
        .get('markdownActiveBlockOpacity', 0.65);
      await showScript(generateTemporaryMarkdownScript(opacity));
      void vscode.window.showInformationMessage(
        'Markdown Editorのフレームを選択した開発者ツールのConsoleで実行してください。' +
        ' 背景色は維持し、不透明度のみ変更します。'
      );
    } catch (error) {
      void vscode.window.showErrorMessage(
        'Markdown編集中ブロックの不透明度が不正です: ' + error.message
      );
    }
  });

  registerCommand(context, 'noctisBlue.enableAutomaticAppearance', async () => {
    try {
      await enableAutomaticAppearance(vscode, context);
    } catch (error) {
      void vscode.window.showErrorMessage('Noctis Blue: ' + error.message);
    }
  });

  registerCommand(context, 'noctisBlue.repairWorkbench', async () => {
    try {
      await repairAutomaticAppearance(vscode, context);
    } catch (error) {
      void vscode.window.showErrorMessage('Noctis Blue: ' + error.message);
    }
  });

  registerCommand(context, 'noctisBlue.disableAutomaticAppearance', async () => {
    try {
      await disableAutomaticAppearance(vscode, context);
    } catch (error) {
      void vscode.window.showErrorMessage('Noctis Blue: ' + error.message);
    }
  });

  registerCommand(context, 'noctisBlue.enableMarkdownEditorAppearance', async () => {
    const choice = await vscode.window.showWarningMessage(
      'Markdown Editor の自動CSSでは、VS Code 組み込み Markdown 拡張の editor.css に ' +
      'Noctis Blue 管理ブロックを追記します。元ファイルはバックアップし、解除時に復元します。' +
      'VS Code 更新後は新しい editor.css へ再適用されます。',
      { modal: true },
      'Markdown Editor CSS を有効にする'
    );
    if (choice !== 'Markdown Editor CSS を有効にする') return;

    try {
      await enableMarkdownEditorAppearance(vscode, context);
    } catch (error) {
      void vscode.window.showErrorMessage('Noctis Blue: ' + error.message);
    }
  });

  registerCommand(context, 'noctisBlue.disableMarkdownEditorAppearance', async () => {
    try {
      await disableMarkdownEditorAppearance(vscode, context);
    } catch (error) {
      void vscode.window.showErrorMessage('Noctis Blue: ' + error.message);
    }
  });

  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
    const themeChanged = event.affectsConfiguration('workbench.colorTheme');

    if (event.affectsConfiguration('noctisBlue.opacity') ||
        event.affectsConfiguration('noctisBlue.wallpaper') || themeChanged) {
      syncAutomaticAppearance(vscode, context).catch(reportSyncError);
    }
    if (event.affectsConfiguration('noctisBlue.markdownActiveBlockOpacity') || themeChanged) {
      syncMarkdownEditorAppearance(vscode, context).catch(reportMarkdownSyncError);
    }
  }));

  // Configuration changes update managed CSS only.
  // The user decides when to Reload Window / reopen the Markdown Editor.
  syncAutomaticAppearance(vscode, context).catch(reportSyncError);
  syncMarkdownEditorAppearance(vscode, context).catch(reportMarkdownSyncError);
}

function deactivate() {}

module.exports = { activate, deactivate };
