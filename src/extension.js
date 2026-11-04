'use strict';
const vscode = require('vscode');
const { generateTemporaryScript } = require('./appearance');
const { generateTemporaryMarkdownScript } = require('./markdownAppearance');
const { generateCombinedTestScript } = require('./combinedTest');

function activate(context) {
  context.subscriptions.push(vscode.commands.registerCommand(
    'noctisBlue.showCombinedTransparencyTest',
    async () => {
      const name = vscode.workspace.getConfiguration('workbench').get('colorTheme');
      if (name !== 'Noctis Blue Transparent') {
        void vscode.window.showWarningMessage(
          'Noctis Blue Transparent を選択してから透過を試してください。'
        );
        return;
      }
      try {
        const document = await vscode.workspace.openTextDocument({
          language: 'javascript',
          content: generateCombinedTestScript()
        });
        await vscode.window.showTextDocument(document, { preview: false });
        void vscode.window.showInformationMessage(
          'この同じコードを開発者ツールの top と Markdown Editor で一回ずつ実行してください。' +
          ' 背景の縞模様と半透明の領域を同時に確認できます。'
        );
      } catch (error) {
        void vscode.window.showErrorMessage('統合検証スクリプトの生成に失敗: ' + error.message);
      }
    }
  ));

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

  context.subscriptions.push(vscode.commands.registerCommand(
    'noctisBlue.showMarkdownActiveBlockTest',
    async () => {
      const name = vscode.workspace.getConfiguration('workbench').get('colorTheme');
      if (name !== 'Noctis Blue Transparent') {
        void vscode.window.showWarningMessage(
          'Noctis Blue Transparent を選択してからMarkdownの半透明表示を試してください。'
        );
        return;
      }
      try {
        const opacity = vscode.workspace.getConfiguration('noctisBlue')
          .get('markdownActiveBlockOpacity', 0.65);
        const document = await vscode.workspace.openTextDocument({
          language: 'javascript',
          content: generateTemporaryMarkdownScript(opacity)
        });
        await vscode.window.showTextDocument(document, { preview: false });
        void vscode.window.showInformationMessage(
          'Markdown Editorのフレームを選択した開発者ツールのConsoleで実行してください。' +
          ' 背景色は維持し、不透明度のみ変更します。'
        );
      } catch (error) {
        void vscode.window.showErrorMessage(
          'Markdown編集中ブロックの不透明度が不正です: ' + error.message
        );
      }
    }
  ));



}
function deactivate() {}
module.exports = { activate, deactivate };
