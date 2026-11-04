'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const palette=require('../palette/colors.json');
const {buildTheme}=require('../scripts/theme');
const pkg=require('../package.json');
const a=buildTheme(palette,false),b=buildTheme(palette,true);
test('transparent variant retains surfaces and adds only specified translucent details',()=>{
  const detailColors={
    'editor.lineHighlightBackground':'#06153680',
    'editor.inactiveLineHighlightBackground':'#06153666',
    'editor.selectionBackground':'#13264BA6',
    'editor.inactiveSelectionBackground':'#13264B80',
    'list.activeSelectionBackground':'#052A59B3',
    'list.inactiveSelectionBackground':'#0B173799',
    'list.focusBackground':'#052A59B3',
    'list.inactiveFocusBackground':'#0B173799',
    'input.background':'#000E2F80',
    'dropdown.background':'#000E2FBF',
    'agentsChatInput.background':'#001E4A80',
    'list.hoverBackground':'#060C24A6',
    'modernTab.hoverBackground':'#060C24A6',
    'tab.hoverBackground':'#052A59A6',
    'editorSuggestWidget.background':'#001E4AA6',
    'editorSuggestWidget.selectedBackground':'#052A59B3',
    'editorStickyScrollHover.background':'#052A59A6'
  };
  const allKeys=new Set([...Object.keys(a.colors),...Object.keys(b.colors)]);
  const changed=[...allKeys].filter(k=>a.colors[k]!==b.colors[k]);
  assert.equal(changed.length,37);
  for(const key of changed){
    if(Object.hasOwn(detailColors,key)) {
      assert.equal(b.colors[key],detailColors[key],key);
      continue;
    }
    assert.equal(b.colors[key],a.colors[key]+'00',key);
  }
  assert.deepEqual(a.tokenColors,b.tokenColors);
  assert.deepEqual(a.semanticTokenColors,b.semanticTokenColors);
  assert.equal(a.colors['editor.lineHighlightBackground'],palette.line);
  assert.equal(a.colors['editor.selectionBackground'],palette.selection);
  assert.equal(a.colors['input.background'],palette.backgroundDeep);
  assert.equal(a.colors['agentsChatInput.background'],undefined);
});
test('colors are valid and cursor / errors use Emacs pink',()=>{
  assert.equal(a.colors['editorCursor.foreground'],'#FF4DE1');
  assert.equal(a.colors['editorError.foreground'],'#FF4DE1');
  for(const theme of [a,b])for(const [key,value] of Object.entries(theme.colors))assert.match(value,/^#[0-9a-f]{6}([0-9a-f]{2})?$/i,key);
});
test('all contributed theme files match generator',()=>{
  for(const c of pkg.contributes.themes){
    const theme=JSON.parse(fs.readFileSync(path.resolve(__dirname,'..',c.path),'utf8'));
    assert.equal(theme.name,c.label);
    assert.deepEqual(theme,buildTheme(palette,c.label.endsWith('Transparent')));
  }
});
