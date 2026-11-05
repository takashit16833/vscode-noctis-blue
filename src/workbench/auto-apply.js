'use strict';

// Explicit, reversible VS Code workbench patch. No checksum bypass or debug port.
// The renderer selects a different stylesheet for each window's workspace ID.
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const path = require('node:path');

const HTML_RELATIVE_PATH = 'out/vs/code/electron-browser/workbench/workbench.html';
const BACKUP_NAME = 'workbench.html.noctis-blue.backup';
const LOADER_NAME = 'noctis-blue-loader.js';
const CSS_HEADER = '/* Noctis Blue: managed stylesheet; generated from user settings. */\n';
const LAYERS_CSS_HEADER = '/* Noctis Blue: managed external CSS layers. */\n';
const WORKBENCH_CSS = '<link rel="stylesheet" href="../../../workbench/workbench.desktop.main.css">';
const LINK = '<!-- Noctis Blue: managed per-workspace stylesheet -->\n\t\t<script type="module" src="./noctis-blue-loader.js"></script>';
const ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;
const LAYER_ID_PATTERN = /^[a-zA-Z0-9._-]{1,128}$/;

// Reject a pre-existing workbench module loader we do not own. A filename
// change must never stack a second loader over an existing installation.
function hasUnrecognizedLoader(html) {
  return /<script\s+type=["']module["']\s+src=["']\.\/[^"']+-loader\.js["']\s*><\/script>/i.test(html);
}

function pathsFor(appRoot) {
  if (typeof appRoot !== 'string' || !path.isAbsolute(appRoot)) {
    throw new Error('VS Code のアプリケーションディレクトリが取得できません。');
  }
  const html = path.join(appRoot, HTML_RELATIVE_PATH);
  const dir = path.dirname(html);
  return { html, dir, backup: path.join(dir, BACKUP_NAME), loader: path.join(dir, LOADER_NAME) };
}

function validateWorkspaceId(id) {
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    throw new Error('不正なワークスペース識別子です。');
  }
  return id;
}

function workspaceStylePath(files, id) {
  return path.join(files.dir, 'noctis-blue-' + validateWorkspaceId(id) + '.css');
}

function workspaceLayersPath(files, id) {
  return path.join(files.dir, 'noctis-blue-layers-' + validateWorkspaceId(id) + '.css');
}

function normalizeLayers(layers = {}) {
  if (!layers || typeof layers !== 'object' || Array.isArray(layers)) {
    throw new Error('外部 CSS レイヤーが不正です。');
  }
  const result = {};
  for (const [id, css] of Object.entries(layers)) {
    if (!LAYER_ID_PATTERN.test(id)) {
      throw new Error('不正な CSS レイヤー識別子です: ' + id);
    }
    if (typeof css !== 'string') {
      throw new Error('CSS レイヤーの内容は文字列で指定してください: ' + id);
    }
    result[id] = css;
  }
  return result;
}

function composeLayers(layers = {}) {
  const normalized = normalizeLayers(layers);
  return Object.keys(normalized).sort().map(id => {
    const css = normalized[id].trimEnd();
    return '/* layer: ' + id + ' */\n' + css + (css ? '\n' : '');
  }).join('\n');
}

function patchWith(original, link) {
  const index = original.indexOf(WORKBENCH_CSS);
  if (index < 0 || original.indexOf(WORKBENCH_CSS, index + WORKBENCH_CSS.length) !== -1) {
    throw new Error('対応する VS Code の workbench.html が見つかりません。変更しませんでした。');
  }
  return original.replace(WORKBENCH_CSS, WORKBENCH_CSS + '\n\t\t' + link);
}

function patchedHtml(original) { return patchWith(original, LINK); }

async function regularOrAbsent(filename) {
  try {
    const stat = await fs.lstat(filename);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error('管理対象が通常ファイルではありません: ' + filename);
    }
    return stat;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function readOwnedCss(filename, header) {
  if (!await regularOrAbsent(filename)) return null;
  const content = await fs.readFile(filename, 'utf8');
  if (!content.startsWith(header)) throw new Error('管理外の CSS が存在します: ' + filename);
  return content;
}

async function managedCssNames(files) {
  return (await fs.readdir(files.dir)).filter(name =>
    /^noctis-blue-(?:layers-)?[a-zA-Z0-9_-]+\.css$/.test(name));
}

async function validateManagedLoader(filename) {
  if (!await regularOrAbsent(filename)) return false;
  const actual = await fs.readFile(filename, 'utf8');
  const expected = await fs.readFile(path.join(__dirname, 'renderer-loader.js'), 'utf8');
  if (actual === expected) return true;
  throw new Error('壁紙読み込みスクリプトが変更されています。');
}

async function inspect(appRoot) {
  const files = pathsFor(appRoot);
  const stat = await regularOrAbsent(files.html);
  if (!stat) throw new Error('VS Code の workbench.html が見つかりません: ' + files.html);
  const html = await fs.readFile(files.html, 'utf8');
  const backupStat = await regularOrAbsent(files.backup);
  const loaderStat = await regularOrAbsent(files.loader);
  const installed = html.includes(LINK);
  if (installed) {
    if (!backupStat) throw new Error('元の workbench.html のバックアップがありません。');
    const backup = await fs.readFile(files.backup, 'utf8');
    if (patchedHtml(backup) !== html) {
      throw new Error('VS Code 本体の HTML に別の変更があります。操作を中止しました。');
    }
    if (!loaderStat) throw new Error('壁紙読み込みスクリプトがありません。');
    const actual = await fs.readFile(files.loader, 'utf8');
    const expected = await fs.readFile(path.join(__dirname, 'renderer-loader.js'), 'utf8');
    if (actual !== expected) {
      throw new Error('壁紙読み込みスクリプトが変更されています。');
    }
    return {
      installed: true, files, stat, backup, html
    };
  }

  if (backupStat || loaderStat || hasUnrecognizedLoader(html)) {
    throw new Error('以前の壁紙ファイルが残っています。確認せずに上書きしません。');
  }
  return { installed: false, files, stat, html };
}

async function atomicWrite(filename, content, mode) {
  const temp = filename + '.tmp-' + crypto.randomUUID();
  let created = false;
  try {
    await fs.writeFile(temp, content, { flag: 'wx', mode });
    created = true;
    await fs.rename(temp, filename);
    created = false;
  } finally {
    // A failed exclusive create does not give us ownership of this path.
    if (created) await fs.unlink(temp).catch(() => {});
  }
}

async function writeOwnedCss(filename, header, content) {
  const previous = await readOwnedCss(filename, header);
  const next = header + content;
  if (previous === next) return false;
  await atomicWrite(filename, next, 0o644);
  return true;
}

async function writeWorkspaceCss(files, css, id) {
  return writeOwnedCss(workspaceStylePath(files, id), CSS_HEADER, css);
}

function storedLayers(layers, originalHtml) {
  // Bind the saved CSS to the original HTML backup. When VS Code replaces
  // workbench.html, matching filenames alone cannot prove backup ownership.
  const digest = crypto.createHash('sha256').update(originalHtml).digest('hex');
  return '/* Noctis Blue workbench backup sha256: ' + digest + ' */\n' + composeLayers(layers);
}

async function writeWorkspaceLayers(files, layers, id, originalHtml) {
  return writeOwnedCss(workspaceLayersPath(files, id), LAYERS_CSS_HEADER,
    storedLayers(layers, originalHtml));
}

async function enableUnlocked(appRoot, css, id, layers = {}) {
  if (typeof css !== 'string') throw new Error('CSS が不正です。');
  const normalizedLayers = normalizeLayers(layers);
  const info = await inspect(appRoot);
  const stylePath = workspaceStylePath(info.files, id);
  const layersPath = workspaceLayersPath(info.files, id);
  const previousWorkspaceCss = await readOwnedCss(stylePath, CSS_HEADER);
  const previousLayersCss = await readOwnedCss(layersPath, LAYERS_CSS_HEADER);
  if (info.installed) {
    await syncUnlocked(appRoot, css, id, normalizedLayers);
    return { installed: true, newlyInstalled: false };
  }

  const loader = await fs.readFile(path.join(__dirname, 'renderer-loader.js'), 'utf8');
  const patched = patchedHtml(info.html);
  await fs.writeFile(info.files.backup, info.html, { flag: 'wx', mode: 0o600 });
  let createdLoader = false;
  try {
    if (await regularOrAbsent(info.files.loader)) throw new Error('既存の壁紙スクリプトがあります。');
    await fs.writeFile(info.files.loader, loader, { flag: 'wx', mode: 0o644 });
    createdLoader = true;
    await writeWorkspaceCss(info.files, css, id);
    await writeWorkspaceLayers(info.files, normalizedLayers, id, info.html);
    await atomicWrite(info.files.html, patched, info.stat.mode);
  } catch (error) {
    const current = await fs.readFile(info.files.html, 'utf8').catch(() => null);
    if (current === info.html) {
      if (createdLoader && await fs.readFile(info.files.loader, 'utf8').catch(() => null) === loader) {
        await fs.unlink(info.files.loader).catch(() => {});
      }
      // Revert only the exact CSS generated by this attempt. A concurrent
      // unrelated change must be preserved, even during rollback.
      const expectedStyle = CSS_HEADER + css;
      const expectedLayers = LAYERS_CSS_HEADER + storedLayers(normalizedLayers, info.html);
      if (await fs.readFile(stylePath, 'utf8').catch(() => null) === expectedStyle) {
        if (previousWorkspaceCss === null) await fs.unlink(stylePath).catch(() => {});
        else await atomicWrite(stylePath, previousWorkspaceCss, 0o644).catch(() => {});
      }
      if (await fs.readFile(layersPath, 'utf8').catch(() => null) === expectedLayers) {
        if (previousLayersCss === null) await fs.unlink(layersPath).catch(() => {});
        else await atomicWrite(layersPath, previousLayersCss, 0o644).catch(() => {});
      }
      if (await fs.readFile(info.files.backup, 'utf8').catch(() => null) === info.html) {
        await fs.unlink(info.files.backup).catch(() => {});
      }
    }
    throw error;
  }
  return { installed: true, newlyInstalled: true };
}

async function syncUnlocked(appRoot, css, id, layers = {}) {
  if (typeof css !== 'string') throw new Error('CSS が不正です。');
  const normalizedLayers = normalizeLayers(layers);
  const info = await inspect(appRoot);
  if (!info.installed) return { installed: false, changed: false };
  const cssChanged = await writeWorkspaceCss(info.files, css, id);
  const layersChanged = await writeWorkspaceLayers(info.files, normalizedLayers, id, info.backup);
  return { installed: true, changed: cssChanged || layersChanged };
}

async function disableUnlocked(appRoot) {
  // A previous disable may have restored the HTML before cleanup failed.
  // Re-enter cleanup instead of rejecting our own verified remainder.
  const files = pathsFor(appRoot);
  const html = await fs.readFile(files.html, 'utf8');
  if (!html.includes(LINK)) {
    const result = await repairStaleUnlocked(appRoot);
    return { installed: false, changed: result.changed };
  }
  const info = await inspect(appRoot);

  // Check all managed CSS files before restoring the HTML.
  const names = await managedCssNames(info.files);
  for (const name of names) {
    const header = name.startsWith('noctis-blue-layers-') ? LAYERS_CSS_HEADER : CSS_HEADER;
    await readOwnedCss(path.join(info.files.dir, name), header);
  }
  // The VS Code updater does not participate in our lock. Refuse to restore
  // over an HTML that was replaced after inspect() validated it.
  const currentStat = await regularOrAbsent(info.files.html);
  const currentHtml = await fs.readFile(info.files.html, 'utf8');
  if (!currentStat || currentHtml !== info.html ||
      currentStat.dev !== info.stat.dev || currentStat.ino !== info.stat.ino) {
    throw new Error('検証後に VS Code 本体の HTML が変更されました。復元しません。');
  }
  await atomicWrite(info.files.html, info.backup, info.stat.mode);
  for (const name of names) await fs.unlink(path.join(info.files.dir, name));
  // Keep the verified loader until the backup has been removed, so a failed
  // backup deletion leaves enough evidence for a safe cleanup retry.
  await fs.unlink(info.files.backup);
  await fs.unlink(info.files.loader);
  return { installed: false, changed: true };
}

// VS Code updates can replace workbench.html while leaving our backup/loader/CSS.
// Repair only removes files that can still be proven to be managed by this extension.
// The current workbench.html is never changed here.
async function repairStaleUnlocked(appRoot) {
  const files = pathsFor(appRoot);
  if (!await regularOrAbsent(files.html)) {
    throw new Error('VS Code の workbench.html が見つかりません: ' + files.html);
  }

  const html = await fs.readFile(files.html, 'utf8');
  if (html.includes(LINK)) return { changed: false, installed: true };
  if (hasUnrecognizedLoader(html)) {
    throw new Error('VS Code 本体の HTML に不明な壁紙変更があります。修復しません。');
  }

  const backupStat = await regularOrAbsent(files.backup);
  const loaderStat = await regularOrAbsent(files.loader);
  const names = await managedCssNames(files);
  if (!backupStat && !loaderStat && names.length === 0) {
    return { changed: false, installed: false };
  }

  // A backup filename alone cannot establish ownership, even when the
  // contents resemble the original HTML. Require a known loader as evidence.
  if (!loaderStat) {
    throw new Error('管理ローダーがなく、バックアップの所有を確認できません。自動削除しません。');
  }

  let backup;
  if (backupStat) {
    backup = await fs.readFile(files.backup, 'utf8');
    if (hasUnrecognizedLoader(backup) ||
        backup.indexOf(WORKBENCH_CSS) < 0 ||
        backup.indexOf(WORKBENCH_CSS, backup.indexOf(WORKBENCH_CSS) + 1) >= 0) {
      throw new Error('壁紙バックアップの元 HTML 形式が確認できません。修復しません。');
    }
    if (html !== backup && (!loaderStat || names.length === 0)) {
      throw new Error('更新済み HTML と管理ファイルの関係が確認できません。修復しません。');
    }
  } else {
    // Without the original HTML backup there is no independent proof of
    // ownership. Never delete a standalone loader or stylesheet.
    throw new Error('元 HTML のバックアップがなく、残存ファイルの所有を確認できません。');
  }
  if (loaderStat) await validateManagedLoader(files.loader);
  // After an app update, the current HTML cannot authenticate the old backup.
  // At least one stylesheet generated with that backup must carry its hash.
  if (html !== backup) {
    const expectedMarker = '/* Noctis Blue workbench backup sha256: ' +
      crypto.createHash('sha256').update(backup).digest('hex') + ' */';
    let verified = false;
    for (const name of names.filter(name => name.startsWith('noctis-blue-layers-'))) {
      const content = await readOwnedCss(path.join(files.dir, name), LAYERS_CSS_HEADER);
      if (content.includes(expectedMarker)) verified = true;
    }
    if (!verified) {
      throw new Error('更新前の HTML バックアップの所有を確認できません。自動削除しません。');
    }
  }
  for (const name of names) {
    const header = name.startsWith('noctis-blue-layers-') ? LAYERS_CSS_HEADER : CSS_HEADER;
    await readOwnedCss(path.join(files.dir, name), header);
  }

  for (const name of names) await fs.unlink(path.join(files.dir, name));
  if (loaderStat) await fs.unlink(files.loader);
  if (backupStat) await fs.unlink(files.backup);
  return { changed: true, installed: false };
}

// A lock is shared by all extension hosts touching the same VS Code install.
// Never steal a stale lock automatically or unlink a lock another process owns.
async function withWorkbenchLock(appRoot, action) {
  const files = pathsFor(appRoot);
  const filename = path.join(files.dir, '.noctis-blue-workbench.lock');
  let handle;
  try {
    handle = await fs.open(filename, 'wx', 0o600);
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error('別の Noctis Blue ウィンドウが背景の管理ファイルを操作中です。操作終了後に再実行してください。');
    }
    throw error;
  }
  try {
    return await action();
  } finally {
    const ownStat = await handle.stat();
    await handle.close();
    const current = await fs.lstat(filename).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (current && current.dev === ownStat.dev && current.ino === ownStat.ino) {
      await fs.unlink(filename);
    }
  }
}

function enable(appRoot, css, id, layers) {
  return withWorkbenchLock(appRoot, () => enableUnlocked(appRoot, css, id, layers));
}
function sync(appRoot, css, id, layers) {
  return withWorkbenchLock(appRoot, () => syncUnlocked(appRoot, css, id, layers));
}
function disable(appRoot) {
  return withWorkbenchLock(appRoot, () => disableUnlocked(appRoot));
}
function repairStale(appRoot) {
  return withWorkbenchLock(appRoot, () => repairStaleUnlocked(appRoot));
}

module.exports = {
  HTML_RELATIVE_PATH, CSS_HEADER, LAYERS_CSS_HEADER, LINK,
  pathsFor, workspaceStylePath, workspaceLayersPath, composeLayers,
  patchedHtml, inspect, enable, sync, disable, repairStale
};
