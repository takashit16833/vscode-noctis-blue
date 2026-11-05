'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { currentWorkspaceId } = require('../src/workbench/workspace-id');

const hash = (...parts) => {
  const digest = crypto.createHash('md5');
  for (const part of parts) digest.update(part);
  return digest.digest('hex');
};

test('フォルダーの識別子は VS Code の node/workspaces.ts と一致する', async t => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'wallpaper-workspace-test-'));
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  const uri = { scheme: 'file', fsPath: folder, toString: () => 'file://' + folder };
  const stat = await fs.stat(folder);
  const workspace = { workspaceFolders: [{ uri }] };
  assert.equal(await currentWorkspaceId(workspace, 'darwin'),
    hash(folder, String(stat.birthtime.getTime())));
  assert.equal(await currentWorkspaceId(workspace, 'linux'),
    hash(folder, String(stat.ino)));
});

test('保存済み・未保存の複数フォルダーは workspaceFile URI から識別する', async () => {
  const config = {
    scheme: 'file',
    fsPath: '/Users/Example/Sample.code-workspace',
    toString: () => 'file:///Users/Example/Sample.code-workspace'
  };
  assert.equal(await currentWorkspaceId({ workspaceFile: config }, 'darwin'),
    hash('/users/example/sample.code-workspace'));

  const untitled = {
    scheme: 'untitled',
    fsPath: '',
    toString: () => 'untitled:123456789'
  };
  const remote = { scheme: 'vscode-remote', toString: () => 'vscode-remote://ssh-host/home/project' };
  assert.equal(await currentWorkspaceId({
    workspaceFile: untitled,
    workspaceFolders: [{ uri: remote }, { uri: remote }]
  }, 'darwin'), hash('untitled:123456789'));
});

test('単一リモートフォルダー・空のウィンドウを識別する', async () => {
  const remote = { scheme: 'vscode-remote', toString: () => 'vscode-remote://ssh-host/home/project' };
  assert.equal(await currentWorkspaceId({ workspaceFolders: [{ uri: remote }] }, 'darwin'),
    hash('vscode-remote://ssh-host/home/project'));
  assert.equal(await currentWorkspaceId({}, 'darwin'), 'empty');
});

test('workspaceFile のない複数フォルダーは推測しない', async () => {
  const remote = { scheme: 'vscode-remote', toString: () => 'vscode-remote://ssh-host/home/project' };
  await assert.rejects(currentWorkspaceId({
    workspaceFolders: [{ uri: remote }, { uri: remote }]
  }), /workspaceFile がない複数フォルダー/);
});
