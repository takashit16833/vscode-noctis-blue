'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { pathsFor, workspaceStylePath, workspaceLayersPath, inspect, enable, sync, disable,
  repairStale, patchedHtml, composeLayers, CSS_HEADER, LAYERS_CSS_HEADER } = require('../src/workbench/auto-apply');

const cssAnchor = '<link rel="stylesheet" href="../../../workbench/workbench.desktop.main.css">';
const original = '<!doctype html>\n<html><head>\n\t' + cssAnchor + '\n</head><body></body></html>\n';
const backupMarker = '/* Noctis Blue workbench backup sha256: ' +
  crypto.createHash('sha256').update(original).digest('hex') + ' */\n';


async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'noctis-workbench-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const files = pathsFor(root);
  await fs.mkdir(path.dirname(files.html), { recursive: true });
  await fs.writeFile(files.html, original);
  return { root, files };
}

test('ワークスペースごとの CSS を起動用 HTML から読み分ける', async t => {
  const { root, files } = await fixture(t);
  assert.deepEqual(await enable(root, 'body { color: red; }', 'folder-a'),
    { installed: true, newlyInstalled: true });
  assert.equal(await fs.readFile(files.backup, 'utf8'), original);
  assert.equal(await fs.readFile(files.html, 'utf8'), patchedHtml(original));
  assert.equal(await fs.readFile(workspaceStylePath(files, 'folder-a'), 'utf8'),
    CSS_HEADER + 'body { color: red; }');
  assert.equal(await fs.readFile(workspaceLayersPath(files, 'folder-a'), 'utf8'),
    LAYERS_CSS_HEADER + backupMarker);
  assert.equal(await fs.readFile(files.loader, 'utf8'),
    await fs.readFile(path.join(__dirname, '..', 'src', 'workbench', 'renderer-loader.js'), 'utf8'));

  assert.deepEqual(await sync(root, 'body { color: blue; }', 'folder-b'),
    { installed: true, changed: true });
  assert.equal(await fs.readFile(workspaceStylePath(files, 'folder-a'), 'utf8'),
    CSS_HEADER + 'body { color: red; }');
  assert.equal(await fs.readFile(workspaceStylePath(files, 'folder-b'), 'utf8'),
    CSS_HEADER + 'body { color: blue; }');
  assert.deepEqual(await sync(root, 'body { color: blue; }', 'folder-b'),
    { installed: true, changed: false });

  assert.deepEqual(await disable(root), { installed: false, changed: true });
  assert.equal(await fs.readFile(files.html, 'utf8'), original);
  for (const filename of [files.backup, files.loader,
    workspaceStylePath(files, 'folder-a'), workspaceStylePath(files, 'folder-b'),
    workspaceLayersPath(files, 'folder-a'), workspaceLayersPath(files, 'folder-b')]) {
    await assert.rejects(fs.stat(filename), { code: 'ENOENT' });
  }
  assert.deepEqual(await disable(root), { installed: false, changed: false });
});

test('画像が設定されていないワークスペースも空の CSS で管理する', async t => {
  const { root, files } = await fixture(t);
  await enable(root, '', 'empty');
  assert.equal(await fs.readFile(workspaceStylePath(files, 'empty'), 'utf8'), CSS_HEADER);
  assert.equal(await fs.readFile(workspaceLayersPath(files, 'empty'), 'utf8'), LAYERS_CSS_HEADER + backupMarker);
  assert.equal((await inspect(root)).installed, true);
});

test('VS Code 本体が別の方法で変更された場合は復元・同期を拒否する', async t => {
  const { root, files } = await fixture(t);
  await enable(root, 'a{}', 'project');
  await fs.appendFile(files.html, '\n<!-- external change -->');
  await assert.rejects(disable(root), /別の変更/);
  await assert.rejects(sync(root, 'b{}', 'project'), /別の変更/);
  assert.equal(await fs.readFile(files.backup, 'utf8'), original);
});

test('既存の読み込みスクリプトや非対応 HTML は変更しない', async t => {
  const { root, files } = await fixture(t);
  await fs.writeFile(files.html, '<html><body></body></html>');
  await assert.rejects(enable(root, 'a{}', 'project'), /対応する/);
  await fs.writeFile(files.html, original);
  await fs.writeFile(files.loader, 'not owned');
  await assert.rejects(enable(root, 'a{}', 'project'), /以前の壁紙ファイル/);
  assert.equal(await fs.readFile(files.html, 'utf8'), original);
});

test('ワークスペース ID を使ったファイル名の逸脱を拒否する', async t => {
  const { root, files } = await fixture(t);
  assert.throws(() => workspaceStylePath(files, '../other'), /不正な/);
  assert.throws(() => workspaceStylePath(files, ''), /不正な/);
  await assert.rejects(enable(root, 'a{}', '../other'), /不正な/);
});

test('不明な読み込みスクリプトは更新も解除も拒否する', async t => {
  const { root, files } = await fixture(t);
  await enable(root, 'body{}', 'project');
  await fs.writeFile(files.loader, 'unrelated changes');
  await assert.rejects(sync(root, 'body{color:red}', 'project'), /読み込みスクリプト/);
  await assert.rejects(disable(root), /読み込みスクリプト/);
  assert.equal(await fs.readFile(files.backup, 'utf8'), original);
});


test('外部 CSS レイヤーを識別子順に一つの管理ファイルへ出力する', async t => {
  const { root, files } = await fixture(t);
  const layers = {
    'z-last': '.z { color: blue; }',
    'noctis-blue': '.n { color: cyan; }'
  };
  await enable(root, 'body{}', 'project', layers);
  assert.equal(
    await fs.readFile(workspaceLayersPath(files, 'project'), 'utf8'),
    LAYERS_CSS_HEADER + backupMarker + composeLayers(layers)
  );
  assert.match(composeLayers(layers), /^\/\* layer: noctis-blue \*\//);
  assert.ok(composeLayers(layers).indexOf('noctis-blue') < composeLayers(layers).indexOf('z-last'));
});

test('現在の管理外ローダーには上書きせず停止する', async t => {
  const { root, files } = await fixture(t);
  await enable(root, 'body{}', 'project');
  await fs.writeFile(files.loader, '// unrelated loader');
  await assert.rejects(sync(root, 'body { color: red; }', 'project'), /読み込みスクリプト/);
  assert.equal(await fs.readFile(files.loader, 'utf8'), '// unrelated loader');
});

test('別の workbench ローダーが残っていたら上書き・二重適用しない', async t => {
  const { root, files } = await fixture(t);
  const modified = original.replace(cssAnchor,
    cssAnchor + '\n\t\t<script type="module" src="./other-loader.js"></script>');
  await fs.writeFile(files.html, modified);

  await assert.rejects(enable(root, 'body{}', 'project'), /以前の壁紙ファイル/);
  assert.equal(await fs.readFile(files.html, 'utf8'), modified);
  await assert.rejects(fs.stat(files.backup), { code: 'ENOENT' });
});

test('不正な外部 CSS レイヤーはファイルを書き換える前に拒否する', async t => {
  const { root, files } = await fixture(t);
  await assert.rejects(enable(root, 'body{}', 'project', { '../bad': 'a{}' }), /レイヤー識別子/);
  assert.equal(await fs.readFile(files.html, 'utf8'), original);
});


test('VS Code 更新後に残った管理ファイルだけを安全に修復できる', async t => {
  const { root, files } = await fixture(t);
  await enable(root, 'body{}', 'project', { 'takashit16833.noctis-blue': '.n{}' });

  await fs.writeFile(files.html, original.replace('</body>', '<main>updated</main></body>'));
  assert.deepEqual(await repairStale(root), { changed: true, installed: false });
  assert.match(await fs.readFile(files.html, 'utf8'), /<main>updated<\/main>/);

  for (const filename of [
    files.backup,
    files.loader,
    workspaceStylePath(files, 'project'),
    workspaceLayersPath(files, 'project')
  ]) {
    await assert.rejects(fs.stat(filename), { code: 'ENOENT' });
  }

  assert.deepEqual(await enable(root, 'body{}', 'project'),
    { installed: true, newlyInstalled: true });
});

test('修復は管理外 loader や CSS を削除しない', async t => {
  const { root, files } = await fixture(t);
  await fs.writeFile(files.loader, 'unrelated loader');
  await assert.rejects(repairStale(root), /読み込みスクリプト|所有を確認できません/);
  assert.equal(await fs.readFile(files.loader, 'utf8'), 'unrelated loader');

  await fs.unlink(files.loader);
  await fs.writeFile(workspaceStylePath(files, 'project'), '/* edited by user */\nbody{}');
  await assert.rejects(repairStale(root), /所有を確認できません/);
  assert.match(await fs.readFile(workspaceStylePath(files, 'project'), 'utf8'), /edited by user/);
});

test('現在の自動適用が有効なら repairStale は何も削除しない', async t => {
  const { root } = await fixture(t);
  await enable(root, 'body{}', 'project');
  assert.deepEqual(await repairStale(root), { changed: false, installed: true });
  assert.equal((await inspect(root)).installed, true);
});

test('解除中の削除失敗後は HTML が復元され、次の解除で安全に清掃を完了する', async t => {
  const { root, files } = await fixture(t);
  await enable(root, 'body{}', 'project', { 'takashit16833.noctis-blue': '.n{}' });
  const originalUnlink = fs.unlink;
  let failedOnce = false;
  t.mock.method(fs, 'unlink', async filename => {
    if (!failedOnce && String(filename).endsWith('noctis-blue-project.css')) {
      failedOnce = true;
      throw new Error('simulated I/O failure');
    }
    return originalUnlink(filename);
  });
  await assert.rejects(disable(root), /simulated I\/O failure/);
  t.mock.restoreAll();
  assert.equal(await fs.readFile(files.html, 'utf8'), original);
  assert.equal((await disable(root)).changed, true);
  assert.equal((await inspect(root)).installed, false);
  for (const filename of [files.backup, files.loader,
    workspaceStylePath(files, 'project'), workspaceLayersPath(files, 'project')]) {
    await assert.rejects(fs.stat(filename), { code: 'ENOENT' });
  }
});

test('更新前のバックアップ内容が書き換わったら修復で削除しない', async t => {
  const { root, files } = await fixture(t);
  await enable(root, 'body{}', 'project', { 'noctis-blue': '.n{}' });
  await fs.writeFile(files.html, original.replace('</body>', '<main>updated</main></body>'));
  const replacedBackup = original.replace('</body>', '<!-- different --></body>');
  await fs.writeFile(files.backup, replacedBackup);
  await assert.rejects(repairStale(root), /バックアップの所有/);
  assert.equal(await fs.readFile(files.backup, 'utf8'), replacedBackup);
  assert.equal((await fs.readFile(files.html, 'utf8')).includes('<main>updated</main>'), true);
});

test('HTML 復元後のバックアップ削除失敗は次の解除で再試行できる', async t => {
  const { root, files } = await fixture(t);
  await enable(root, 'body{}', 'project');
  const originalUnlink = fs.unlink;
  let failedOnce = false;
  t.mock.method(fs, 'unlink', async filename => {
    if (!failedOnce && filename === files.backup) {
      failedOnce = true;
      throw new Error('simulated backup unlink failure');
    }
    return originalUnlink(filename);
  });
  await assert.rejects(disable(root), /simulated backup unlink failure/);
  t.mock.restoreAll();
  assert.equal(await fs.readFile(files.html, 'utf8'), original);
  assert.equal(await fs.readFile(files.backup, 'utf8'), original);
  assert.equal(await fs.readFile(files.loader, 'utf8'),
    await fs.readFile(path.join(__dirname, '..', 'src', 'workbench', 'renderer-loader.js'), 'utf8'));
  assert.deepEqual(await disable(root), { installed: false, changed: true });
  await assert.rejects(fs.stat(files.backup), { code: 'ENOENT' });
  await assert.rejects(fs.stat(files.loader), { code: 'ENOENT' });
});

test('最後の管理ローダー削除失敗は、確認後に安全に再試行できる', async t => {
  const { root, files } = await fixture(t);
  await enable(root, 'body{}', 'project');
  const originalUnlink = fs.unlink;
  t.mock.method(fs, 'unlink', async filename => {
    if (filename === files.loader) throw new Error('simulated loader unlink failure');
    return originalUnlink(filename);
  });
  await assert.rejects(disable(root), /simulated loader unlink failure/);
  t.mock.restoreAll();
  assert.equal(await fs.readFile(files.html, 'utf8'), original);
  await assert.rejects(fs.stat(files.backup), { code: 'ENOENT' });
  assert.deepEqual(await disable(root), { installed: false, changed: true });
  await assert.rejects(fs.stat(files.loader), { code: 'ENOENT' });
});

test('無関係の HTML バックアップだけがある場合は修復で消さない', async t => {
  const { root, files } = await fixture(t);
  await fs.writeFile(files.backup, '<html>unrelated</html>');
  await assert.rejects(repairStale(root), /バックアップ|所有/);
  assert.equal(await fs.readFile(files.backup, 'utf8'), '<html>unrelated</html>');
});

test('別ウィンドウが管理中ならロックを奪わずファイルを変更しない', async t => {
  const { root, files } = await fixture(t);
  const lock = path.join(files.dir, '.noctis-blue-workbench.lock');
  await fs.writeFile(lock, 'another process');
  await assert.rejects(enable(root, 'body{}', 'project'), /操作中/);
  assert.equal(await fs.readFile(lock, 'utf8'), 'another process');
  assert.equal(await fs.readFile(files.html, 'utf8'), original);
});

test('初回導入中に別の loader が現れても巻き戻しで消さない', async t => {
  const { root, files } = await fixture(t);
  const originalWrite = fs.writeFile;
  t.mock.method(fs, 'writeFile', async (filename, data, options) => {
    if (filename === files.backup) {
      await originalWrite(files.loader, 'unrelated loader');
    }
    return originalWrite(filename, data, options);
  });
  await assert.rejects(enable(root, 'body{}', 'project'), /既存の壁紙スクリプト/);
  t.mock.restoreAll();
  assert.equal(await fs.readFile(files.loader, 'utf8'), 'unrelated loader');
  assert.equal(await fs.readFile(files.html, 'utf8'), original);
});

test('一時ファイルの排他的作成が失敗しても、他者のファイルを削除しない', async t => {
  const { root } = await fixture(t);
  const originalWrite = fs.writeFile;
  let foreign;
  t.mock.method(fs, 'writeFile', async (filename, content, options) => {
    if (String(filename).includes('.tmp-')) {
      foreign = filename;
      await originalWrite(filename, 'unrelated', { flag: 'wx' });
      const error = new Error('already exists');
      error.code = 'EEXIST';
      throw error;
    }
    return originalWrite(filename, content, options);
  });
  await assert.rejects(enable(root, 'body{}', 'project'), { code: 'EEXIST' });
  assert.equal(await fs.readFile(foreign, 'utf8'), 'unrelated');
});

test('有効化の途中で VS Code の HTML が交換された場合も上書きしない', async t => {
  const { root, files } = await fixture(t);
  const layerFile = workspaceLayersPath(files, 'project');
  const updated = original.replace('</body>', '<main>updated</main></body>');
  const originalRename = fs.rename;
  let replaced = false;
  t.mock.method(fs, 'rename', async (source, destination) => {
    if (!replaced && destination === layerFile) {
      replaced = true;
      await fs.writeFile(files.html, updated);
    }
    return originalRename(source, destination);
  });
  await assert.rejects(enable(root, 'body{}', 'project'), /検証後に/);
  assert.equal(await fs.readFile(files.html, 'utf8'), updated);
  assert.equal(await fs.readFile(files.backup, 'utf8'), original);
});

test('検証後に VS Code の HTML が交換された場合は復元しない', async t => {
  const { root, files } = await fixture(t);
  await enable(root, 'body{}', 'project');
  const originalReaddir = fs.readdir;
  let changed = false;
  t.mock.method(fs, 'readdir', async (...args) => {
    const result = await originalReaddir(...args);
    if (!changed) {
      changed = true;
      await fs.appendFile(files.html, '<!-- updated externally -->');
    }
    return result;
  });
  await assert.rejects(disable(root), /検証後に/);
  assert.match(await fs.readFile(files.html, 'utf8'), /updated externally/);
  assert.equal(await fs.readFile(files.backup, 'utf8'), original);
});

test('元 HTML と同一の無関係なバックアップ単体は削除しない', async t => {
  const { root, files } = await fixture(t);
  await fs.writeFile(files.backup, original);
  await assert.rejects(repairStale(root), /管理ローダー|所有を確認/);
  assert.equal(await fs.readFile(files.backup, 'utf8'), original);
});
