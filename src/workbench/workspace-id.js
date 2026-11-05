'use strict';

// VS Code's stable workspace IDs are derived in workspaces/node/workspaces.ts.
// Match these IDs so the renderer and this extension independently select
// the same stylesheet without a debugging port or cross-window shared CSS.
const fs = require('node:fs/promises');
const crypto = require('node:crypto');

function md5(parts) {
  const hash = crypto.createHash('md5');
  for (const part of parts) hash.update(part);
  return hash.digest('hex');
}

async function currentWorkspaceId(workspace, platform = process.platform) {
  if (workspace.workspaceFile) {
    const uri = workspace.workspaceFile;
    const identity = uri.scheme === 'file'
      ? (platform === 'linux' ? uri.fsPath : uri.fsPath.toLowerCase())
      : uri.toString();
    return md5([identity]);
  }

  const folders = workspace.workspaceFolders;
  if (!folders || folders.length === 0) return 'empty';
  if (folders.length !== 1) {
    throw new Error('workspaceFile がない複数フォルダーのワークスペース識別子を取得できません。');
  }

  const uri = folders[0].uri;
  if (uri.scheme !== 'file') return md5([uri.toString()]);

  const stat = await fs.stat(uri.fsPath);
  const stamp = platform === 'linux' ? stat.ino : stat.birthtime.getTime();
  const salt = stamp ? String(stamp) : '';
  return md5([uri.fsPath, salt]);
}

module.exports = { currentWorkspaceId };
