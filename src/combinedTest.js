'use strict';

const { generateCss } = require('./appearance');
const { generateMarkdownCss } = require('./markdownAppearance');

// A single script is pasted twice: once in top, once in Markdown Editor.
// Both locations are actual VS Code contexts, not a simulated preview.
const WORKBENCH_STYLE_ID = 'noctis-blue-combined-workbench-test';
const MARKDOWN_STYLE_ID = 'noctis-blue-combined-markdown-test';
const TEST_OPACITY = Object.freeze({
  editor: 0.5,
  sidebar: 0.5,
  panel: 0.5,
  auxiliaryBar: 0.5,
  chrome: 0.5,
  gap: 0.5
});
const MARKDOWN_TEST_OPACITY = 0.65;

function generateCombinedTestScript() {
  // Visible diagnostic stripes, not a real wallpaper and not multiply blending.
  const stripes = [
    '/* Diagnostic stripes in the actual VS Code workbench. */',
    '.monaco-workbench {',
    '  background-image: repeating-linear-gradient(45deg, #10244C 0 24px, #285A83 24px 48px) !important;',
    '  background-color: #010111 !important;',
    '  background-blend-mode: normal !important;',
    '}',
    ''
  ].join('\n');
  const workbenchCss = stripes + generateCss(TEST_OPACITY);
  const markdownCss = generateMarkdownCss(MARKDOWN_TEST_OPACITY);

  return [
    '/* Noctis Blue: actual-window combined temporary test.',
    ' * Copy this ONE script; run once with Console context "top",',
    ' * then run THE SAME script with context "Markdown Editor".',
    ' * Workbench surface colors: 50% (temporary visibility test).',
    ' * Markdown active block color and shadow: 65%.',
    ' * Re-run in either context to remove its CSS; Reload Window removes both.',
    ' * Does not edit files, user settings, or VS Code itself.',
    ' */',
    '(() => {',
    '  "use strict";',
    '  const inWorkbench = Boolean(document.querySelector(".monaco-workbench"));',
    '  const inMarkdown = Boolean(document.querySelector(".md-editor"));',
    '  if (inWorkbench === inMarkdown) {',
    '    throw new Error("Consoleの実行対象を top または Markdown Editor にしてください。");',
    '  }',
    '  const id = inWorkbench ? ' + JSON.stringify(WORKBENCH_STYLE_ID) + ' : ' + JSON.stringify(MARKDOWN_STYLE_ID) + ';',
    '  const previous = document.getElementById(id);',
    '  if (previous) {',
    '    previous.remove();',
    '    return "Noctis Blue: " + (inWorkbench ? "top" : "Markdown Editor") + " のテストを解除しました";',
    '  }',
    '  const node = document.createElement("style");',
    '  node.id = id;',
    '  node.textContent = inWorkbench ? ' + JSON.stringify(workbenchCss) + ' : ' + JSON.stringify(markdownCss) + ';',
    '  document.head.appendChild(node);',
    '  return "Noctis Blue: " + (inWorkbench ? "top（縞模様・領域別50%）" : "Markdown Editor（編集中65%）") + " に適用しました";',
    '})();',
    ''
  ].join('\n');
}

module.exports = { generateCombinedTestScript, TEST_OPACITY, MARKDOWN_TEST_OPACITY };
