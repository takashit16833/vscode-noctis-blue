'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const loader = fs.readFileSync(path.join(__dirname, '..', 'src', 'workbench', 'renderer-loader.js'), 'utf8')
  .replace('import.meta.url', JSON.stringify('vscode-file://vscode-app/renderer-loader.js'));

async function openWorkbench(workspaceId, options = {}) {
  const links = [];
  const warnings = [];
  const context = {
    window: {
      vscode: {
        context: {
          resolveConfiguration: async () => ({
            workspace: workspaceId === undefined ? undefined : { id: workspaceId }
          })
        }
      }
    },
    document: {
      createElement: () => ({
        remove() { this.removed = true; }
      }),
      head: {
        append(link) {
          links.push(link);
          if (options.cssMissing && !link.href.includes('noctis-blue-layers-')) link.onerror?.();
        }
      }
    },
    Date: { now: () => options.timestamp ?? 123 },
    URL,
    console: { warn: (...args) => warnings.push(args) },
    setInterval: () => { throw new Error('background timer must not be used'); },
    setTimeout: () => { throw new Error('background timer must not be used'); },
    fetch: () => { throw new Error('CSS content must not be polled'); }
  };
  await vm.runInNewContext(loader, context);
  return { links, warnings };
}

test('起動時にワークスペース固有の CSS を一度だけ読み込む', async () => {
  const { links, warnings } = await openWorkbench('project-a');
  assert.equal(links.length, 2);
  assert.equal(links[0].rel, 'stylesheet');
  assert.equal(links[1].rel, 'stylesheet');
  assert.match(links[0].href, /noctis-blue-project-a\.css\?startup=123$/);
  assert.match(links[1].href, /noctis-blue-layers-project-a\.css\?startup=123$/);
  assert.equal(warnings.length, 0);
});

test('異なるワークスペースは CSS が混ざらない', async () => {
  const a = await openWorkbench('project-a');
  const b = await openWorkbench('project-b');
  assert.notEqual(a.links[0].href, b.links[0].href);
});

test('再起動時はキャッシュを避けて新しい CSS を読み込む', async () => {
  const a = await openWorkbench('project-a', { timestamp: 123 });
  const b = await openWorkbench('project-a', { timestamp: 456 });
  assert.notEqual(a.links[0].href, b.links[0].href);
});

test('まだ CSS がない場合は再試行せず、Reload Window が必要と分かる警告を出す', async () => {
  const { links, warnings } = await openWorkbench('new-project', { cssMissing: true });
  assert.equal(links.length, 2);
  assert.equal(links[0].removed, true);
  assert.notEqual(links[1].removed, true);
  assert.equal(warnings.length, 1);
  assert.match(String(warnings[0][0]), /Reload Window/);
});

test('作業領域がないウィンドウは empty 用 CSS を参照する', async () => {
  const { links } = await openWorkbench();
  assert.match(links[0].href, /noctis-blue-empty\.css/);
});

test('不正なワークスペース ID は使わない', async () => {
  const { links, warnings } = await openWorkbench('../unknown');
  assert.equal(links.length, 0);
  assert.equal(warnings.length, 1);
});
