'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const START_MARKER = '/* >>> Noctis Blue Markdown Editor CSS >>> */';
const END_MARKER = '/* <<< Noctis Blue Markdown Editor CSS <<< */';
const BACKUP_SUFFIX = '.noctis-blue.backup';

async function regularFile(filename) {
  try {
    const stat = await fs.lstat(filename);
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

async function atomicWrite(filename, content, mode) {
  const directory = path.dirname(filename);
  const temporary = path.join(
    directory,
    '.' + path.basename(filename) + '.noctis-blue-' + process.pid + '.tmp'
  );
  try {
    await fs.writeFile(temporary, content, { mode });
    await fs.chmod(temporary, mode);
    await fs.rename(temporary, filename);
  } finally {
    await fs.rm(temporary, { force: true }).catch(() => {});
  }
}

async function readBackup(filename) {
  const backup = filename + BACKUP_SUFFIX;
  const stat = await regularFile(backup);
  if (!stat) return null;
  return { filename: backup, stat, content: await fs.readFile(backup, 'utf8') };
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

async function applyMarkdownEditorCss(filename, css) {
  const stat = await regularFile(filename);
  if (!stat) throw new Error('Markdown Editor CSS が見つかりません: ' + filename);

  const current = await fs.readFile(filename, 'utf8');
  const state = markerState(current);
  let original;

  if (state.patched) {
    const backup = await readBackup(filename);
    if (!backup) {
      throw new Error('Markdown Editor CSS のバックアップがありません。安全のため更新しません。');
    }
    original = backup.content;
    validatePatchedContent(current, original);
  } else {
    // A VS Code update replaces editor.css but can leave our sidecar backup.
    // Once the current file has no managed marker, it is the new clean source.
    original = current;
    const staleBackup = await readBackup(filename);
    if (staleBackup) await fs.unlink(staleBackup.filename);
    const backupFilename = filename + BACKUP_SUFFIX;
    await fs.writeFile(backupFilename, original, { mode: stat.mode });
    await fs.chmod(backupFilename, stat.mode);
  }

  const next = original + separatorFor(original) + managedBlock(css);
  if (next !== current) await atomicWrite(filename, next, stat.mode);
  return { changed: next !== current, patched: true };
}

async function removeMarkdownEditorCss(filename) {
  const stat = await regularFile(filename);
  if (!stat) return { changed: false, patched: false };

  const current = await fs.readFile(filename, 'utf8');
  const state = markerState(current);
  const backup = await readBackup(filename);

  if (!state.patched) {
    if (backup) await fs.unlink(backup.filename);
    return { changed: false, patched: false };
  }
  if (!backup) {
    throw new Error('Markdown Editor CSS のバックアップがありません。安全のため解除しません。');
  }

  validatePatchedContent(current, backup.content);
  await atomicWrite(filename, backup.content, stat.mode);
  await fs.unlink(backup.filename);
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
