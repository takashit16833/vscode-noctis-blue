'use strict';

const crypto = require('node:crypto');
const { normalizeOpacity } = require('./appearance');
const { validateOpacity } = require('./markdownAppearance');
const theme = require('../themes/noctis-blue.json');

const AREAS = [
  ['editor', '編集領域'], ['sidebar', 'サイドバー'], ['panel', 'パネル'],
  ['auxiliaryBar', '補助サイドバー'], ['chrome', '上部・下部バー'],
  ['gap', 'パネル間の余白'], ['markdown', 'Markdown編集中ブロック']
];

function renderPreviewHtml(opacity, markdownOpacity, nonce = crypto.randomBytes(16).toString('hex')) {
  const values = normalizeOpacity(opacity);
  values.markdown = validateOpacity(markdownOpacity);
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(nonce)) throw Error('Invalid nonce');
  const color = key => {
    const value = theme.colors[key];
    if (!/^#[a-f0-9]{6}$/i.test(value || '')) throw Error('Invalid theme color: ' + key);
    return value;
  };
  // Built-in Markdown Editor CSS is not available to this extension. The
  // selection color is a representative sample, not its actual active color.
  const palette = {
    editor: color('editor.background'),
    sidebar: color('sideBar.background'),
    panel: color('panel.background'),
    auxiliaryBar: color('auxiliaryBar.background'),
    chrome: color('titleBar.activeBackground'),
    gap: color('editor.background'),
    markdown: color('list.activeSelectionBackground'),
    text: color('editor.foreground'),
    border: color('editorGroup.border')
  };
  const controls = AREAS.map(([key, label]) => {
    const id = 'nb-' + key, value = values[key];
    return '<div class="control"><label for="' + id + '">' + label + '</label>' +
      '<input id="' + id + '" data-area="' + key + '" type="range" min="0" max="1" step="0.01" value="' + value + '">' +
      '<output id="' + id + '-out" for="' + id + '">' + Math.round(value * 100) + '%</output></div>';
  }).join('\n');
  const vars = Object.entries(palette).map(([k, v]) => '--c-' + k + ': ' + v + ';').join('\n');
  const initial = JSON.stringify(values);
  const html = [
    '<!doctype html><html lang="ja"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;nonce-' + nonce + '&#39;; style-src &#39;nonce-' + nonce + '&#39;; img-src &#39;none&#39;; connect-src &#39;none&#39;">',
    '<title>Noctis Blue 外観プレビュー</title>',
    '<style nonce="' + nonce + '">',
    ':root { ' + vars + ' }',
    '* { box-sizing: border-box; }',
    'body { margin:0; padding:20px; background:var(--vscode-editor-background,#010111);color:var(--vscode-foreground,#B8D9FF);font-family:var(--vscode-font-family,system-ui,sans-serif); }',
    'h1 { color:var(--c-text);font-size:20px;margin:0 0 8px;}',
    '.note {font-size:12px;opacity:.85;line-height:1.6;}',
    '.controls {display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;padding:16px;margin:16px 0;background:var(--vscode-editorWidget-background,#001E4A);border:1px solid var(--c-border);border-radius:8px;}',
    '.control {display:grid;grid-template-columns:105px minmax(60px,1fr) 38px;align-items:center;gap:9px;font-size:12px;}',
    '.control input {width:100%;accent-color:#5EAFFF;} .control output {font-variant-numeric:tabular-nums;text-align:right;}',
    'button {background:var(--vscode-button-secondaryBackground,#001E4A);color:var(--c-text);border:1px solid var(--c-border);padding:7px 12px;border-radius:6px;cursor:pointer;}',
    'button:focus-visible {outline:2px solid #5EAFFF;}',
    '.demo {--a-editor:91%;--a-sidebar:93%;--a-panel:94%;--a-auxiliaryBar:86%;--a-chrome:93%;--a-gap:91%;--a-markdown:65%;',
    ' border:1px solid var(--c-border);border-radius:9px;overflow:hidden;color:var(--c-text);font-family:ui-monospace,Menlo,monospace;',
    ' background:repeating-linear-gradient(45deg,#10244C 0 24px,#285A83 24px 48px); }',
    '.chrome {background:color-mix(in srgb,var(--c-chrome) var(--a-chrome),transparent);padding:10px;text-align:center;font-size:12px;}',
    '.layout {display:grid;grid-template-columns:minmax(100px,20%) minmax(180px,1fr) minmax(80px,16%);min-height:390px;}',
    '.side {background:color-mix(in srgb,var(--c-sidebar) var(--a-sidebar),transparent);padding:12px;border-right:1px solid var(--c-border);}',
    '.aux {background:color-mix(in srgb,var(--c-auxiliaryBar) var(--a-auxiliaryBar),transparent);padding:12px;border-left:1px solid var(--c-border);}',
    '.center {padding:8px;display:flex;flex-direction:column;gap:8px;background:color-mix(in srgb,var(--c-gap) var(--a-gap),transparent);}',
    '.editor {background:color-mix(in srgb,var(--c-editor) var(--a-editor),transparent);padding:15px;flex:1;border:1px solid var(--c-border);min-height:250px;}',
    '.active {margin:16px 8px;padding:12px;background:color-mix(in srgb,var(--c-markdown) var(--a-markdown),transparent);',
    'box-shadow:0 0 0 8px color-mix(in srgb,var(--c-markdown) var(--a-markdown),transparent);border-radius:4px;}',
    '.panel {background:color-mix(in srgb,var(--c-panel) var(--a-panel),transparent);padding:12px;min-height:105px;}',
    '.demo h2 {font-size:14px;margin:0 0 12px;} .demo p {font-size:12px;line-height:1.6;} .faint {font-size:11px;opacity:.8;}',
    '@media(max-width:600px){.layout{grid-template-columns:80px 1fr}.aux{display:none}.controls{grid-template-columns:1fr}.editor{padding:8px}}',
    '</style></head><body>',
    '<h1>Noctis Blue 外観プレビュー</h1>',
    '<p class="note"><strong>安全な表示見本です。</strong> VS Code本体や内蔵Markdown Editorを変更しません。縞模様を背景に、色と不透明度を一度に比較できます。</p>',
    '<section class="controls" aria-label="背景不透明度の比較">' + controls + '</section>',
    '<p><button id="reset" type="button">設定値に戻す</button> <span class="note">スライダーの変更はこの画面だけに反映します。保存されません。</span></p>',
    '<div class="demo" id="demo" aria-label="背景の縞模様が見える表示見本">',
    '<header class="chrome">Noctis Blue — 表示見本</header>',
    '<div class="layout">',
    '<aside class="side"><h2>EXPLORER</h2><p class="faint">▾ src<br>　appearance.js<br>　editor.md<br><br>▸ themes<br>▸ test</p></aside>',
    '<div class="center"><main class="editor">',
    '<h2>Markdown Editor（見本）</h2>',
    '<p># Noctis Blue</p><p>背景色を残して不透明度を調整します。</p>',
    '<div class="active"><p>編集中のブロック</p><p>・青い背景色と影を残した半透明の強調表示</p></div>',
    '<p>別の段落：文字の色はそのままです。</p>',
    '</main><section class="panel"><h2>TERMINAL</h2><p class="faint">$ npm test<br>tests passing</p></section></div>',
    '<aside class="aux"><h2>CHAT</h2><p class="faint">補助サイドバー</p></aside></div>',
    '<footer class="chrome">main　・　UTF-8　・　Noctis Blue</footer></div>',
    '<p class="note">※ Markdownブロックの背景色は見本用のNoctis Blueの選択色です。実際のMarkdown Editorが使用するCSS変数の色とは異なる場合があります。</p>',
    '<script nonce="' + nonce + '">',
    '(function(){',
    'const initial = ' + initial + ';',
    'const host = document.getElementById("demo");',
    'const inputs = document.querySelectorAll("input[data-area]");',
    'function render(input) {',
    ' const area = input.dataset.area;',
    ' host.style.setProperty("--a-" + area, (Number(input.value)*100) + "%");',
    ' document.getElementById(input.id + "-out").textContent = Math.round(Number(input.value)*100) + "%";',
    '}',
    'for(const input of inputs){ input.addEventListener("input",()=>render(input)); render(input); }',
    'document.getElementById("reset").addEventListener("click",()=>{',
    ' for(const input of inputs){ input.value = initial[input.dataset.area]; render(input); }',
    '});',
    '})();',
    '</script></body></html>'
  ];
  return html.join('\n');
}

module.exports = { renderPreviewHtml };
