'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');
const {
  remoteServerPaths, remoteMarkdownEditorTarget, remoteFileOperations, currentCommit
} = require('../src/markdownEditorRemote');
const {
  applyMarkdownEditorCss, removeMarkdownEditorCss, START_MARKER, BACKUP_SUFFIX
} = require('../src/markdownEditorPatch');

const COMMIT = 'a'.repeat(40);

async function fixture(t, found = true) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'noctis-remote-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  // Independent observed path: do not derive the only tested path from the locator.
  const filename = '/vscode/extensions/markdown-language-features/markdown-editor-out/editor.css';
  const local = remotePath => path.join(root, remotePath);
  await fs.mkdir(path.dirname(local(filename)), { recursive: true });
  if (found) await fs.writeFile(local(filename), '/* original css */\n');
  const asError = error => {
    if (error.code === 'ENOENT') {
      const missing = new Error('not found');
      missing.code = 'FileNotFound';
      return missing;
    }
    return error;
  };
  const safe = async action => { try { return await action(); } catch (e) { throw asError(e); } };
  const vscode = {
    env: { appRoot: root, remoteName: 'dev-container' },
    Uri: { from: o => o },
    workspace: {
      workspaceFolders: [{
        uri: { scheme: 'vscode-remote', authority: 'dev-container+abc', path: '/workspaces/project' }
      }],
      fs: {
        stat: uri => safe(async () => {
          const stat = await fs.stat(local(uri.path));
          return { type: stat.isFile() ? 1 : 2 };
        }),
        readFile: uri => safe(() => fs.readFile(local(uri.path))),
        writeFile: (uri, bytes) => safe(() => fs.writeFile(local(uri.path), bytes)),
        copy: (a, b, options) => safe(() => fs.copyFile(
          local(a.path), local(b.path), options?.overwrite ? 0 : require('node:fs').constants.COPYFILE_EXCL
        )),
        rename: (a, b) => safe(() => fs.rename(local(a.path), local(b.path))),
        delete: uri => safe(() => fs.unlink(local(uri.path)))
      }
    }
  };
  return { root, filename, local, vscode };
}

test('コミット ID が不明なら推測したパスを試さない', () => {
  assert.throws(() => remoteServerPaths('unknown'), /コミット番号/);
});

test('リモートで見つかった現在バージョンの CSS だけを対象にする', async t => {
  const f = await fixture(t);
  const target = await remoteMarkdownEditorTarget(f.vscode, COMMIT);
  assert.equal(target.filename, f.filename);
  assert.equal(typeof target.io.readFile, 'function');
});

test('リモートでも元 CSS のバックアップと復元を維持する', async t => {
  const f = await fixture(t);
  const target = await remoteMarkdownEditorTarget(f.vscode, COMMIT);
  const original = await fs.readFile(f.local(f.filename), 'utf8');
  await applyMarkdownEditorCss(target.filename, '.md-heading{color:blue}', target.io);
  const after = await fs.readFile(f.local(f.filename), 'utf8');
  assert.ok(after.startsWith(original));
  assert.ok(after.includes(START_MARKER));
  assert.equal(await fs.readFile(f.local(f.filename + BACKUP_SUFFIX), 'utf8'), original);
  await removeMarkdownEditorCss(target.filename, target.io);
  assert.equal(await fs.readFile(f.local(f.filename), 'utf8'), original);
});

test('候補が見つからなければ CSS やバックアップを生成しない', async t => {
  const f = await fixture(t, false);
  await assert.rejects(remoteMarkdownEditorTarget(f.vscode, COMMIT), /見つかりません/);
  await assert.rejects(fs.stat(f.local(f.filename + BACKUP_SUFFIX)), { code: 'ENOENT' });
});

test('権限エラーは説明を返し、自動的な chmod や chown をしない', async t => {
  const f = await fixture(t);
  const io = remoteFileOperations(f.vscode, f.vscode.workspace.workspaceFolders[0].uri);
  f.vscode.workspace.fs.copy = async () => {
    const error = new Error('Permission denied');
    error.code = 'NoPermissions';
    throw error;
  };
  await assert.rejects(applyMarkdownEditorCss(f.filename, '.a{}', io), /書き込み権限/);
  assert.doesNotMatch(await fs.readFile(f.local(f.filename), 'utf8'), /Noctis Blue/);
});

test('product.json に含まれる VS Code コミット番号を使う', async t => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.root, 'product.json'), JSON.stringify({commit: COMMIT}));
  assert.equal(await currentCommit(f.root), COMMIT);
});

test('複数の CSS 候補があれば書き込み先を推測しない', async t => {
  const f = await fixture(t);
  const second = remoteServerPaths(COMMIT)[1];
  await fs.mkdir(path.dirname(f.local(second)), { recursive: true });
  await fs.writeFile(f.local(second), '/* old server */');
  await assert.rejects(remoteMarkdownEditorTarget(f.vscode, COMMIT), /候補が複数/);
});
