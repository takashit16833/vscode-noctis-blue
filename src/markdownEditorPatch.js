'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

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

async function atomicWrite(filename, content, mode, io = fs) {
  const directory = path.dirname(filename);
  const temporary = path.join(
    directory,
    '.' + path.basename(filename) + '.noctis-blue-' + process.pid + '.tmp'
  );
  try {
    await io.writeFile(temporary, content, { mode });
    await io.chmod(temporary, mode);
    await io.rename(temporary, filename);
  } finally {
    await io.rm(temporary, { force: true }).catch(() => {});
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

async function applyMarkdownEditorCss(filename, css, io = fs) {
  const stat = await regularFile(filename, io);
  if (!stat) throw new Error('Markdown Editor CSS が見つかりません: ' + filename);

  const current = await io.readFile(filename, 'utf8');
  const state = markerState(current);
  let original;

  if (state.patched) {
    const backup = await readBackup(filename, io);
    if (!backup) {
      throw new Error('Markdown Editor CSS のバックアップがありません。安全のため更新しません。');
    }
    original = backup.content;
    validatePatchedContent(current, original);
  } else {
    // A VS Code update replaces editor.css but can leave our sidecar backup.
    // Once the current file has no managed marker, it is the new clean source.
    original = current;
    const staleBackup = await readBackup(filename, io);
    if (staleBackup) await io.unlink(staleBackup.filename);
    const backupFilename = filename + BACKUP_SUFFIX;
    await io.writeFile(backupFilename, original, { mode: stat.mode });
    await io.chmod(backupFilename, stat.mode);
  }

  const next = original + separatorFor(original) + managedBlock(css);
  if (next !== current) await atomicWrite(filename, next, stat.mode, io);
  return { changed: next !== current, patched: true };
}

async function removeMarkdownEditorCss(filename, io = fs) {
  const stat = await regularFile(filename, io);
  if (!stat) return { changed: false, patched: false };

  const current = await io.readFile(filename, 'utf8');
  const state = markerState(current);
  const backup = await readBackup(filename, io);

  if (!state.patched) {
    if (backup) await io.unlink(backup.filename);
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

module.exports = {
  START_MARKER,
  END_MARKER,
  BACKUP_SUFFIX,
  managedBlock,
  markerState,
  applyMarkdownEditorCss,
  removeMarkdownEditorCss
};
