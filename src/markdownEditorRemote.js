'use strict';

// UI host: workbench patch is local, but Markdown Editor CSS can be remote.
// Only verify known VS Code Server paths and write through vscode.workspace.fs.
// No sudo, no permission changes, no guessed VS Code commit IDs.
const path = require('node:path');
const fs = require('node:fs/promises');
const TAIL = 'extensions/markdown-language-features/markdown-editor-out/editor.css';

function errorCode(error) { return String(error?.code || ''); }
function remoteUri(vscode, workspaceUri, filename) {
  return vscode.Uri.from({scheme: workspaceUri.scheme, authority: workspaceUri.authority, path: filename});
}
function remoteFileOperations(vscode, workspaceUri) {
  const files = vscode.workspace.fs;
  const uri = filename => remoteUri(vscode, workspaceUri, filename);
  function normalize(error) {
    if (errorCode(error) === 'FileNotFound') {
      const result = new Error(error.message);
      result.code = 'ENOENT';
      return result;
    }
    if (errorCode(error) === 'NoPermissions') {
      return new Error('Markdown Editor CSS の書き込み権限がありません。権限の変更は自動で行いません。');
    }
    return error;
  }
  async function safe(fn) { try { return await fn(); } catch (error) { throw normalize(error); } }
  return {
    async lstat(filename) {
      const stat = await safe(() => files.stat(uri(filename)));
      return { mode: 0o644, isFile: () => Boolean(stat.type & 1) && !(stat.type & 64) };
    },
    async readFile(filename) {
      return Buffer.from(await safe(() => files.readFile(uri(filename)))).toString('utf8');
    },
    async writeFile(filename, content) {
      await safe(() => files.writeFile(uri(filename), Buffer.from(content)));
    },
    // FileSystemProvider does not expose chmod. Never invent permissions.
    async chmod() {},
    async rename(a, b) {
      await safe(() => files.rename(uri(a), uri(b), { overwrite: true }));
    },
    async unlink(filename) {
      await safe(() => files.delete(uri(filename)));
    },
    async rm(filename, options = {}) {
      try { await files.delete(uri(filename)); }
      catch (error) {
        if (options.force && errorCode(error) === 'FileNotFound') return;
        throw normalize(error);
      }
    }
  };
}

function remoteServerPaths(commit) {
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('VS Code のコミット番号が不正です。');
  return [
    '/vscode/vscode-server/bin/linux-arm64/' + commit + '/' + TAIL,
    '/vscode/vscode-server/bin/linux-x64/' + commit + '/' + TAIL,
    '/home/vscode/.vscode-server/bin/' + commit + '/' + TAIL,
    '/root/.vscode-server/bin/' + commit + '/' + TAIL
  ];
}
async function currentCommit(appRoot) {
  const product = JSON.parse(await fs.readFile(path.join(appRoot, 'product.json'), 'utf8'));
  if (typeof product.commit !== 'string' || !/^[a-f0-9]{40}$/.test(product.commit)) {
    throw new Error('VS Code のコミット番号を確認できません。');
  }
  return product.commit;
}
async function remoteMarkdownEditorTarget(vscode, commit = null) {
  const folder = vscode.workspace.workspaceFolders?.find(f => f.uri.scheme !== 'file' && f.uri.authority);
  if (!folder) throw new Error('リモートの接続先 URI が分かりません。');
  const version = commit || await currentCommit(vscode.env.appRoot);
  for (const filename of remoteServerPaths(version)) {
    try {
      const stat = await vscode.workspace.fs.stat(remoteUri(vscode, folder.uri, filename));
      if ((stat.type & 1) && !(stat.type & 64)) {
        return { filename, io: remoteFileOperations(vscode, folder.uri) };
      }
    } catch (error) {
      if (errorCode(error) === 'FileNotFound') continue;
      throw error;
    }
  }
  throw new Error('接続先の Markdown Editor CSS が見つかりません。パスを推測して変更しません。');
}

module.exports = { remoteServerPaths, remoteFileOperations, remoteMarkdownEditorTarget, currentCommit };
