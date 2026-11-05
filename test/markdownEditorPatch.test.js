'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  START_MARKER,
  END_MARKER,
  BACKUP_SUFFIX,
  applyMarkdownEditorCss,
  removeMarkdownEditorCss
} = require('../src/markdownEditorPatch');

async function fixture(t, content = 'body { color: red; }\n') {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'noctis-markdown-patch-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const filename = path.join(directory, 'editor.css');
  await fs.writeFile(filename, content);
  return { directory, filename, content };
}

test('Markdown Editor CSS に管理ブロックだけを追記し、解除時に完全復元する', async t => {
  const f = await fixture(t);
  const css = '.md-heading { color: #A6CAFF !important; }';

  assert.deepEqual(await applyMarkdownEditorCss(f.filename, css), {
    changed: true,
    patched: true
  });

  const patched = await fs.readFile(f.filename, 'utf8');
  assert.ok(patched.startsWith(f.content));
  assert.ok(patched.includes(START_MARKER));
  assert.ok(patched.includes(css));
  assert.ok(patched.includes(END_MARKER));
  assert.equal(await fs.readFile(f.filename + BACKUP_SUFFIX, 'utf8'), f.content);

  assert.deepEqual(await removeMarkdownEditorCss(f.filename), {
    changed: true,
    patched: false
  });
  assert.equal(await fs.readFile(f.filename, 'utf8'), f.content);
  await assert.rejects(fs.stat(f.filename + BACKUP_SUFFIX), { code: 'ENOENT' });
});

test('設定変更は元CSSを維持したまま管理ブロックだけ更新する', async t => {
  const f = await fixture(t);
  await applyMarkdownEditorCss(f.filename, '.md-heading { color: red; }');
  await applyMarkdownEditorCss(f.filename, '.md-heading { color: blue; }');

  const current = await fs.readFile(f.filename, 'utf8');
  assert.ok(current.startsWith(f.content));
  assert.doesNotMatch(current, /color: red/);
  assert.match(current, /color: blue/);
  assert.equal(await fs.readFile(f.filename + BACKUP_SUFFIX, 'utf8'), f.content);
});

test('VS Code 更新で元 editor.css が入れ替わったら古いバックアップを置換して再適用する', async t => {
  const f = await fixture(t, '/* vscode old */\n');
  await applyMarkdownEditorCss(f.filename, '.md-heading { color: red; }');

  const updated = '/* vscode new */\n';
  await fs.writeFile(f.filename, updated);

  await applyMarkdownEditorCss(f.filename, '.md-heading { color: blue; }');
  assert.equal(await fs.readFile(f.filename + BACKUP_SUFFIX, 'utf8'), updated);
  const current = await fs.readFile(f.filename, 'utf8');
  assert.ok(current.startsWith(updated));
  assert.match(current, /color: blue/);

  await removeMarkdownEditorCss(f.filename);
  assert.equal(await fs.readFile(f.filename, 'utf8'), updated);
});

test('管理ブロック適用後に元CSS部分が変更されていたら上書きしない', async t => {
  const f = await fixture(t);
  await applyMarkdownEditorCss(f.filename, '.md-heading { color: red; }');
  const current = await fs.readFile(f.filename, 'utf8');
  await fs.writeFile(f.filename, current.replace('color: red;', 'color: green;').replace(
    'body { color: red; }',
    'body { color: black; }'
  ));

  await assert.rejects(
    applyMarkdownEditorCss(f.filename, '.md-heading { color: blue; }'),
    /変更されています/
  );
  await assert.rejects(
    removeMarkdownEditorCss(f.filename),
    /変更されています/
  );
});

test('壊れた管理マーカーは拒否する', async t => {
  const f = await fixture(t, 'body{}\n' + START_MARKER + '\n.md-heading{}\n');
  await assert.rejects(
    applyMarkdownEditorCss(f.filename, '.md-heading{}'),
    /管理マーカーが壊れています/
  );
});

test('管理ブロックがない状態の解除は古いバックアップだけ掃除する', async t => {
  const f = await fixture(t);
  await fs.writeFile(f.filename + BACKUP_SUFFIX, 'old backup');
  assert.deepEqual(await removeMarkdownEditorCss(f.filename), {
    changed: false,
    patched: false
  });
  await assert.rejects(fs.stat(f.filename + BACKUP_SUFFIX), { code: 'ENOENT' });
});
