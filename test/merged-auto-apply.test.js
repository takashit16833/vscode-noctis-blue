'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { pathsFor, workspaceStylePath, workspaceLayersPath, inspect, enable, sync, disable,
  repairStale, patchedHtml, composeLayers, CSS_HEADER, LAYERS_CSS_HEADER } = require('../src/workbench/auto-apply');

const cssAnchor = '<link rel="stylesheet" href="../../../workbench/workbench.desktop.main.css">';
const original = '<!doctype html>\n<html><head>\n\t' + cssAnchor + '\n</head><body></body></html>\n';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wallpaper-auto-test-'));
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
    LAYERS_CSS_HEADER);
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
  assert.equal(await fs.readFile(workspaceLayersPath(files, 'empty'), 'utf8'), LAYERS_CSS_HEADER);
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
    LAYERS_CSS_HEADER + composeLayers(layers)
  );
  assert.match(composeLayers(layers), /^\/\* layer: noctis-blue \*\//);
  assert.ok(composeLayers(layers).indexOf('noctis-blue') < composeLayers(layers).indexOf('z-last'));
});

test('v0.7.3 の既知ローダーだけを同期時に安全に更新する', async t => {
  const { root, files } = await fixture(t);
  await enable(root, 'body{}', 'project');
  const legacy = `// Runs once during workbench startup. No polling or configuration bridge.
// CSS files are generated by the extension and applied on Reload Window.
(async () => {
  try {
    const configuration = await window.vscode.context.resolveConfiguration();
    const workspaceId = configuration.workspace?.id ?? 'empty';
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(workspaceId)) {
      throw new Error('Invalid workspace identifier');
    }

    const css = new URL('./vscode-wallpaper-' + workspaceId + '.css', import.meta.url);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    // The generated CSS may have changed since the previous VS Code session.
    link.href = css.href + '?startup=' + Date.now();
    link.onerror = () => {
      link.remove();
      console.warn('VS Code Wallpaper: CSS is not available yet. Reload Window after the extension generates it.');
    };
    document.head.append(link);
  } catch (error) {
    console.warn('VS Code Wallpaper: could not load workspace stylesheet', error);
  }
})();
`;
  await fs.writeFile(files.loader, legacy);
  assert.equal((await inspect(root)).loaderNeedsUpgrade, true);
  const result = await sync(root, 'body{}', 'project');
  assert.deepEqual(result, { installed: true, changed: true });
  assert.equal(await fs.readFile(files.loader, 'utf8'),
    await fs.readFile(path.join(__dirname, '..', 'src', 'workbench', 'renderer-loader.js'), 'utf8'));
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
  await assert.rejects(repairStale(root), /所有を確認できません/);
  assert.equal(await fs.readFile(files.loader, 'utf8'), 'unrelated loader');

  await fs.unlink(files.loader);
  await fs.writeFile(workspaceStylePath(files, 'project'), '/* edited by user */\nbody{}');
  await assert.rejects(repairStale(root), /管理外の CSS/);
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
    if (!failedOnce && String(filename).endsWith('vscode-wallpaper-project.css')) {
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
