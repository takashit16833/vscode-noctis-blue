'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'noctis-install-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const bin = path.join(root, 'bin');
  await fs.mkdir(bin);
  const logger = path.join(root, 'calls.log');
  const npx = `#!/bin/sh
echo npx >> "$INSTALL_LOG"
while [ "$#" -gt 0 ]; do
  if [ "$1" = --out ]; then
    shift
    touch "$1"
    break
  fi
  shift
done
`;
  const code = `#!/bin/sh
echo "code $1" >> "$INSTALL_LOG"
case "$1" in
  --install-extension) exit 0 ;;
  --list-extensions)
    if [ "$LIST_FAIL" = 1 ]; then exit 22; fi
    printf '%s\\n' "$EXTENSION_LIST"
    exit 0 ;;
  --uninstall-extension) exit 0 ;;
esac
exit 2
`;
  await fs.writeFile(path.join(bin, 'npx'), npx, {mode: 0o755});
  await fs.writeFile(path.join(bin, 'fake-code'), code, {mode: 0o755});
  return {bin, logger};
}

function run(f, vars) {
  return spawnSync('bash', [path.join(__dirname, '..', 'install.sh')], {
    encoding: 'utf8',
    env: {
      ...process.env, PATH: f.bin + path.delimiter + process.env.PATH,
      VSCODE_CLI: path.join(f.bin, 'fake-code'),
      INSTALL_LOG: f.logger, ...vars
    }
  });
}

test('拡張一覧を取得できなければ失敗する', async t => {
  const f = await fixture(t);
  const result = run(f, { LIST_FAIL: '1' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /could not list installed extensions/);
});

test('Noctis Blue がインストールされていれば成功する', async t => {
  const f = await fixture(t);
  const result = run(f, { LIST_FAIL: '0', EXTENSION_LIST: 'takashit16833.noctis-blue' });
  assert.equal(result.status, 0, result.stderr);
});

test('Noctis Blue がインストールされていなければ失敗する', async t => {
  const f = await fixture(t);
  const result = run(f, { LIST_FAIL: '0', EXTENSION_LIST: '' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Noctis Blue is not listed/);
});
