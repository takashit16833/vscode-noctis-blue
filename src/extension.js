'use strict';
const vscode = require('vscode');
const { generateTemporaryScript } = require('./appearance');

function activate(context) {
  context.subscriptions.push(vscode.commands.registerCommand(
    'noctisBlue.showOpacityScript',
    async () => {
      const name = vscode.workspace.getConfiguration('workbench').get('colorTheme');
      if (name !== 'Noctis Blue Transparent') {
        void vscode.window.showWarningMessage(
          'Noctis Blue Transparent を選択してから透過を試してください。'
        );
        return;
      }
      try {
        const opacity = vscode.workspace.getConfiguration('noctisBlue').get('opacity', {});
        const document = await vscode.workspace.openTextDocument({
          language: 'javascript',
          content: generateTemporaryScript(opacity)
        });
        await vscode.window.showTextDocument(document, { preview: false });
        void vscode.window.showInformationMessage(
          '表示されたJavaScriptを、開発者ツールのtopフレームのConsoleで実行してください。' +
          ' VS Code本体やユーザー設定は変更しません。'
        );
      } catch (error) {
        void vscode.window.showErrorMessage('不透明度の設定が不正です: ' + error.message);
      }
    }
  ));
}
function deactivate() {}
module.exports = { activate, deactivate };
