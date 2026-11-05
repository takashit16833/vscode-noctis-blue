'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  MARKDOWN_EXTENSION_ID,
  STATE_KEY,
  LEGACY_STATE_KEY,
  targetScope,
  markdownEditorCssPath,
  syncMarkdownEditorAppearance,
  enableMarkdownEditorAppearance,
  disableMarkdownEditorAppearance
} = require('../src/markdownEditorAutomatic');
const { applyMarkdownEditorCss, BACKUP_SUFFIX } = require('../src/markdownEditorPatch');

function fixture(options = {}) {
  const calls = [];
  const state = { [STATE_KEY]: options.enabled ? { 'local:/app': true } : (options.targets ?? {}) };
  let theme = options.theme ?? 'Noctis Blue Transparent';

  const vscode = {
    env: { appRoot: '/app' },
    workspace: {
      getConfiguration(section) {
        if (section === 'workbench') {
          return { get: key => key === 'colorTheme' ? theme : undefined };
        }
        if (section === 'noctisBlue') {
          return {
            get: (key, fallback) =>
              key === 'markdownActiveBlockOpacity' ? (options.opacity ?? 0.65) : fallback
          };
        }
        throw new Error('unexpected section: ' + section);
      }
    },
    extensions: {
      getExtension(id) {
        calls.push(['getExtension', id]);
        if (options.missingExtension) return undefined;
        return { extensionUri: { fsPath: '/vscode/extensions/markdown-language-features' } };
      }
    }
  };

  const context = {
    globalState: {
      get: (key, fallback) => Object.hasOwn(state, key) ? state[key] : fallback,
      update: async (key, value) => {
        calls.push(['update', key, value]);
        state[key] = value;
      }
    }
  };

  return { vscode, context, calls, state, setTheme: value => { theme = value; } };
}

test('Markdown Editor CSS の場所は組み込み拡張の extensionUri から解決する', () => {
  const f = fixture();
  assert.equal(
    markdownEditorCssPath(f.vscode),
    '/vscode/extensions/markdown-language-features/markdown-editor-out/editor.css'
  );
  assert.deepEqual(f.calls[0], ['getExtension', MARKDOWN_EXTENSION_ID]);
});

test('組み込み Markdown 拡張が見つからなければ推測せず失敗する', () => {
  const f = fixture({ missingExtension: true });
  assert.throws(() => markdownEditorCssPath(f.vscode), /見つかりません/);
});

test('自動適用が無効ならファイルへ触れない', async () => {
  const f = fixture({ enabled: false });
  assert.equal(await syncMarkdownEditorAppearance(f.vscode, f.context), false);
  assert.equal(f.calls.length, 0);
});

test('Noctis 以外のテーマでは有効化を拒否する', async () => {
  const f = fixture({ theme: 'Dark Modern' });
  await assert.rejects(
    enableMarkdownEditorAppearance(f.vscode, f.context),
    /Noctis Blue/
  );
  assert.deepEqual(f.state[STATE_KEY], {});
});

test('接続先が異なる環境では以前の有効化記録を流用しない', async () => {
  const f = fixture({targets: {'remote:vscode-remote://dev-container+first': true}});
  f.vscode.workspace.workspaceFolders = [{
    uri: { scheme: 'vscode-remote', authority: 'dev-container+second' }
  }];
  assert.equal(targetScope(f.vscode), 'remote:vscode-remote://dev-container+second');
  assert.equal(await syncMarkdownEditorAppearance(f.vscode, f.context), false);
});

test('従来の単一真偽値は新しい接続先を許可しない', async () => {
  const f = fixture();
  f.context.globalState.get = (key, fallback) =>
    key === 'noctisBlue.markdownEditorAppearanceEnabled' ? true : fallback;
  assert.equal(await syncMarkdownEditorAppearance(f.vscode, f.context), false);
});

test('CSS 自動更新の途中で解除しても、最後は元の CSS に復元される', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'noctis-editor-queue-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const extensionDir = path.join(directory, 'markdown-language-features');
  const filename = path.join(extensionDir, 'markdown-editor-out', 'editor.css');
  await fs.mkdir(path.dirname(filename), { recursive: true });
  const original = 'body { color: red; }\n';
  await fs.writeFile(filename, original);

  const options = { enabled: true, opacity: 0.65 };
  const f = fixture(options);
  f.vscode.extensions.getExtension = () => ({ extensionUri: { fsPath: extensionDir } });
  await enableMarkdownEditorAppearance(f.vscode, f.context);
  options.opacity = 0.4;

  let releaseRename;
  let notifyRename;
  const entered = new Promise(resolve => { notifyRename = resolve; });
  const originalRename = fs.rename;
  let blocked = false;
  t.mock.method(fs, 'rename', async (from, to) => {
    if (to === filename && !blocked) {
      blocked = true;
      notifyRename();
      await new Promise(resolve => { releaseRename = resolve; });
    }
    return originalRename(from, to);
  });

  const updating = syncMarkdownEditorAppearance(f.vscode, f.context);
  await entered;
  const disabling = disableMarkdownEditorAppearance(f.vscode, f.context);
  releaseRename();
  await Promise.all([updating, disabling]);
  assert.equal(await fs.readFile(filename, 'utf8'), original);
  await assert.rejects(fs.stat(filename + '.noctis-blue.backup'), { code: 'ENOENT' });
  assert.deepEqual(f.state[STATE_KEY], {});
  assert.equal(await syncMarkdownEditorAppearance(f.vscode, f.context), false);
});

function withLegacyConsent(f) {
  const get = f.context.globalState.get;
  f.context.globalState.get = (key, fallback) =>
    key === LEGACY_STATE_KEY ? true : get(key, fallback);
}

async function legacyLocalFixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'noctis-legacy-css-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const extensionDir = path.join(dir, 'markdown-language-features');
  const filename = path.join(extensionDir, 'markdown-editor-out', 'editor.css');
  const original = 'body { color: red; }\n';
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(filename, original);
  const f = fixture();
  f.vscode.extensions.getExtension = () => ({ extensionUri: { fsPath: extensionDir } });
  withLegacyConsent(f);
  return { ...f, filename, original };
}

test('旧形式の許可は検証できる既存ローカル管理 CSS だけに引き継ぐ', async t => {
  const f = await legacyLocalFixture(t);
  await applyMarkdownEditorCss(f.filename, '.md-heading { color: red; }');
  assert.equal(await syncMarkdownEditorAppearance(f.vscode, f.context), true);
  const content = await fs.readFile(f.filename, 'utf8');
  assert.match(content, /#001947/);
  assert.doesNotMatch(content, /\.md-heading \{ color: red; \}/);
  assert.equal(await fs.readFile(f.filename + BACKUP_SUFFIX, 'utf8'), f.original);
  assert.deepEqual(f.state[STATE_KEY], { 'local:/app': true });
  assert.equal(await syncMarkdownEditorAppearance(f.vscode, f.context), true);
});

test('旧形式の許可だけでは未加工のローカル CSS に初回適用しない', async t => {
  const f = await legacyLocalFixture(t);
  assert.equal(await syncMarkdownEditorAppearance(f.vscode, f.context), false);
  assert.equal(await fs.readFile(f.filename, 'utf8'), f.original);
  await assert.rejects(fs.stat(f.filename + BACKUP_SUFFIX), { code: 'ENOENT' });
  assert.deepEqual(f.state[STATE_KEY], {});
});

test('旧形式の許可があってもバックアップ欠落時には停止する', async t => {
  const f = await legacyLocalFixture(t);
  await applyMarkdownEditorCss(f.filename, '.md-heading { color: red; }');
  await fs.unlink(f.filename + BACKUP_SUFFIX);
  await assert.rejects(syncMarkdownEditorAppearance(f.vscode, f.context), /バックアップがありません/);
  assert.deepEqual(f.state[STATE_KEY], {});
});

test('旧形式の許可はリモート接続先に流用しない', async () => {
  const f = fixture();
  withLegacyConsent(f);
  f.vscode.workspace.workspaceFolders = [{
    uri: { scheme: 'vscode-remote', authority: 'dev-container+second' }
  }];
  assert.equal(await syncMarkdownEditorAppearance(f.vscode, f.context), false);
  assert.equal(f.calls.length, 0);
});

test('新形式で明示的に無効化した接続先に旧形式の許可を流用しない', async t => {
  const f = await legacyLocalFixture(t);
  f.state[STATE_KEY] = { 'local:/app': false };
  await applyMarkdownEditorCss(f.filename, '.md-heading { color: red; }');
  assert.equal(await syncMarkdownEditorAppearance(f.vscode, f.context), false);
  assert.match(await fs.readFile(f.filename, 'utf8'), /\.md-heading \{ color: red; \}/);
  assert.deepEqual(f.state[STATE_KEY], { 'local:/app': false });
});

test('旧形式が残っていても明示的な解除後に自動再適用しない', async t => {
  const f = await legacyLocalFixture(t);
  await applyMarkdownEditorCss(f.filename, '.md-heading { color: red; }');
  await disableMarkdownEditorAppearance(f.vscode, f.context);
  assert.equal(await syncMarkdownEditorAppearance(f.vscode, f.context), false);
  assert.equal(await fs.readFile(f.filename, 'utf8'), f.original);
  await assert.rejects(fs.stat(f.filename + BACKUP_SUFFIX), { code: 'ENOENT' });
});
