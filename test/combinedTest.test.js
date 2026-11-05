'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const manifest = require('../package.json');
const opaque = require('../themes/noctis-blue.json');
const {
  generateCombinedTestScript, TEST_OPACITY, MARKDOWN_TEST_OPACITY
} = require('../src/combinedTest');

function makeContext(kind) {
  const styles = new Map();
  const document = {
    querySelector(selector) {
      if (kind === 'top' && selector === '.monaco-workbench') return {};
      if (kind === 'markdown' && selector === '.md-editor') return {};
      return null;
    },
    getElementById(id) { return styles.get(id) || null; },
    createElement(tag) {
      assert.equal(tag, 'style');
      return {
        id: '', textContent: '',
        remove() { styles.delete(this.id); }
      };
    },
    head: {
      appendChild(node) { styles.set(node.id, node); }
    }
  };
  return { document, styles };
}

test('one command produces the exact same JavaScript for both real frames', () => {
  const script = generateCombinedTestScript();
  assert.ok(manifest.contributes.commands.some(
    command => command.command === 'noctisBlue.showCombinedTransparencyTest'
  ));
  assert.match(script, /document\.querySelector\("\.monaco-workbench"\)/);
  assert.match(script, /document\.querySelector\("\.md-editor"\)/);
  assert.match(script, /inWorkbench === inMarkdown/);
  assert.match(script, /repeating-linear-gradient\(45deg, #10244C 0 24px, #285A83 24px 48px\)/);
  assert.ok(script.includes(opaque.colors['editor.background']));
  assert.match(script, /color-mix\(in srgb/);
  assert.match(script, /--md-block-active-background/);
  assert.match(script, /65%, transparent/);
  assert.deepEqual(TEST_OPACITY, {
    editor: 0.5, sidebar: 0.5, panel: 0.5,
    auxiliaryBar: 0.5, chrome: 0.5, gap: 0.5
  });
  assert.equal(MARKDOWN_TEST_OPACITY, 0.65);
  assert.doesNotMatch(script, /workbench\.html|localStorage|fetch\(|require\(|vscode\.workspace|child_process/);
});

test('top frame applies stripes + Noctis translucent colors; second run removes them', () => {
  const script = generateCombinedTestScript();
  const context = makeContext('top');
  assert.match(vm.runInNewContext(script, context), /top.*適用/);
  const node = context.styles.get('noctis-blue-combined-workbench-test');
  assert.ok(node);
  assert.match(node.textContent, /background-image: repeating-linear-gradient/);
  assert.match(node.textContent, /background-color: transparent !important/);
  assert.ok(node.textContent.includes(
    'color-mix(in srgb, ' + opaque.colors['panel.background'] + ' 50%, transparent)'
  ));
  assert.ok(!context.styles.has('noctis-blue-combined-markdown-test'));
  assert.match(vm.runInNewContext(script, context), /解除/);
  assert.equal(context.styles.size, 0);
});

test('Markdown frame changes active block background and shadow alpha without deleting highlight', () => {
  const script = generateCombinedTestScript();
  const context = makeContext('markdown');
  assert.match(vm.runInNewContext(script, context), /Markdown Editor.*適用/);
  const node = context.styles.get('noctis-blue-combined-markdown-test');
  assert.ok(node);
  assert.match(node.textContent, /\.md-block-active/);
  assert.match(node.textContent, /background: color-mix\(in srgb, var\(--md-block-active-background/);
  assert.match(node.textContent, /box-shadow: 0 0 0 8px color-mix/);
  const activeRule = node.textContent.match(
    /\.md-editor:not\(\.md-no-active-block-highlight\) \.md-block-active \{[\s\S]*?\}/
  )?.[0] ?? '';
  assert.doesNotMatch(activeRule, /background:\s*transparent\b|display:\s*none|opacity:/);
  assert.ok(!context.styles.has('noctis-blue-combined-workbench-test'));
  assert.match(vm.runInNewContext(script, context), /解除/);
  assert.equal(context.styles.size, 0);
});

test('script rejects unknown contexts without modifying DOM', () => {
  const script = generateCombinedTestScript();
  const context = makeContext('other');
  assert.throws(() => vm.runInNewContext(script, context), /top または Markdown Editor/);
  assert.equal(context.styles.size, 0);
});
