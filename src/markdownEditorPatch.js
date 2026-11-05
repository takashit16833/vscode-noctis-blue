'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { constants } = require('node:fs');

const START_MARKER = '/* >>> Noctis Blue Markdown Editor CSS >>> */';
const END_MARKER = '/* <<< Noctis Blue Markdown Editor CSS <<< */';
const BACKUP_SUFFIX = '.noctis-blue.backup';

async function regularFile(filename, io = fs) {
  try {
    const stat = await io.lstat(filename);
    if (!stat.isFile()) {
      throw new Error('通常ファイルではありません: ' + filename);
    }
    return stat;
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function managedBlock(css) {
  if (typeof css !== 'string' || !css.trim()) {
    throw new Error('Markdown Editor CSS が空です。');
  }
  if (css.includes(START_MARKER) || css.includes(END_MARKER)) {
    throw new Error('Markdown Editor CSS に管理マーカーを含めることはできません。');
  }
  return START_MARKER + '\n' + css.trimEnd() + '\n' + END_MARKER + '\n';
}

function separatorFor(content) {
  return content.endsWith('\n') ? '\n' : '\n\n';
}

function markerState(content) {
  const start = content.indexOf(START_MARKER);
  const end = content.indexOf(END_MARKER);
  if (start === -1 && end === -1) return { patched: false };
  if (start < 0 || end < 0 || end < start ||
      content.indexOf(START_MARKER, start + START_MARKER.length) >= 0 ||
      content.indexOf(END_MARKER, end + END_MARKER.length) >= 0) {
    throw new Error('Markdown Editor CSS の Noctis Blue 管理マーカーが壊れています。');
  }
  const after = content.slice(end + END_MARKER.length);
  if (after.trim()) {
    throw new Error('Noctis Blue 管理ブロックの後ろに不明な内容があります。');
  }
  return { patched: true, start, end: end + END_MARKER.length };
}

// Each write owns an unpredictable, exclusively created temporary file.
// Never remove a path that this call did not successfully create.
async function atomicWrite(filename, content, mode, io = fs) {
  const temporary = path.join(path.dirname(filename),
    '.' + path.basename(filename) + '.noctis-blue-' + crypto.randomUUID() + '.tmp');
  let created = false;
  try {
    await io.writeFile(temporary, content, { flag: 'wx', mode });
    created = true;
    await io.chmod(temporary, mode);
    await io.rename(temporary, filename);
  } finally {
    if (created) await io.rm(temporary, { force: true }).catch(() => {});
  }
}

async function createBackupExclusive(filename, backupFilename, original, io = fs) {
  // Native copyFile with COPYFILE_EXCL and workspace.fs.copy(overwrite:false)
  // both reject an existing backup without touching its content.
  if (io === fs) {
    await io.copyFile(filename, backupFilename, constants.COPYFILE_EXCL);
  } else {
    await io.copyFileExclusive(filename, backupFilename);
  }
  const saved = await io.readFile(backupFilename, 'utf8');
  if (saved !== original) {
    throw new Error('バックアップ中に元の Markdown Editor CSS が変化しました。確認が必要です。');
  }
}

async function readBackup(filename, io = fs) {
  const backup = filename + BACKUP_SUFFIX;
  const stat = await regularFile(backup, io);
  if (!stat) return null;
  return { filename: backup, stat, content: await io.readFile(backup, 'utf8') };
}

function validatePatchedContent(current, original) {
  const state = markerState(current);
  if (!state.patched) {
    throw new Error('Noctis Blue 管理ブロックがありません。');
  }
  const expectedPrefix = original + separatorFor(original);
  if (current.slice(0, state.start) !== expectedPrefix) {
    throw new Error('Markdown Editor CSS が Noctis Blue 適用後に変更されています。');
  }
}

async function applyUnlocked(filename, css, io = fs) {
  const stat = await regularFile(filename, io);
  if (!stat) throw new Error('Markdown Editor CSS が見つかりません: ' + filename);

  const current = await io.readFile(filename, 'utf8');
  const state = markerState(current);
  let original;
  let createdBackup = false;

  if (state.patched) {
    const backup = await readBackup(filename, io);
    if (!backup) {
      throw new Error('Markdown Editor CSS のバックアップがありません。安全のため更新しません。');
    }
    original = backup.content;
    validatePatchedContent(current, original);
  } else {
    // Unpatched CSS offers no proof that a pre-existing backup is ours,
    // even when its contents happen to match.
    original = current;
    const existing = await readBackup(filename, io);
    if (existing) throw new Error('Markdown Editor CSS の既存バックアップの由来が分かりません。削除・上書きせず停止します。');
    await createBackupExclusive(filename, filename + BACKUP_SUFFIX, original, io);
    createdBackup = true;
  }

  const next = original + separatorFor(original) + managedBlock(css);
  try {
    if (next !== current) await atomicWrite(filename, next, stat.mode, io);
  } catch (error) {
    // Roll back a backup created by this attempt only if the original CSS
    // is still untouched. Never remove a pre-existing or changed backup.
    if (createdBackup &&
        await io.readFile(filename, 'utf8').catch(() => null) === original &&
        await io.readFile(filename + BACKUP_SUFFIX, 'utf8').catch(() => null) === original) {
      await io.unlink(filename + BACKUP_SUFFIX).catch(() => {});
    }
    throw error;
  }
  return { changed: next !== current, patched: true };
}

async function removeUnlocked(filename, io = fs) {
  const stat = await regularFile(filename, io);
  if (!stat) return { changed: false, patched: false };

  const current = await io.readFile(filename, 'utf8');
  const state = markerState(current);
  const backup = await readBackup(filename, io);

  if (!state.patched) {
    // A matching filename alone never proves that a backup belongs to us.
    // Leave it untouched if a prior restore stopped halfway through.
    return { changed: false, patched: false };
  }
  if (!backup) {
    throw new Error('Markdown Editor CSS のバックアップがありません。安全のため解除しません。');
  }

  validatePatchedContent(current, backup.content);
  await atomicWrite(filename, backup.content, stat.mode, io);
  await io.unlink(backup.filename);
  return { changed: true, patched: false };
}


async function withLocalLock(filename, io, task) {
  // Other local VS Code windows run in separate extension hosts. A per-host
  // queue alone cannot keep their shared editor.css safe.
  if (io !== fs) return task();
  const lock = filename + '.noctis-blue.lock';
  let handle;
  try {
    handle = await fs.open(lock, 'wx', 0o600);
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error('別のウィンドウが Markdown Editor CSS を操作中です。後で再実行してください。');
    }
    throw error;
  }
  try {
    return await task();
  } finally {
    const owned = await handle.stat();
    await handle.close();
    const current = await fs.lstat(lock).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (current && current.dev === owned.dev && current.ino === owned.ino) {
      await fs.unlink(lock);
    }
  }
}

async function applyMarkdownEditorCss(filename, css, io = fs) {
  return withLocalLock(filename, io, () => applyUnlocked(filename, css, io));
}

async function removeMarkdownEditorCss(filename, io = fs) {
  return withLocalLock(filename, io, () => removeUnlocked(filename, io));
}

module.exports = {
  START_MARKER,
  END_MARKER,
  BACKUP_SUFFIX,
  managedBlock,
  markerState,
  applyMarkdownEditorCss,
  removeMarkdownEditorCss
};
