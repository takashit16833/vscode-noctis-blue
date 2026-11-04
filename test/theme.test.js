'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const palette=require('../palette/colors.json');
const {buildTheme}=require('../scripts/theme');
const pkg=require('../package.json');
const a=buildTheme(palette,false),b=buildTheme(palette,true);
test('the transparent variant changes only surfaces',()=>{
  const changed=Object.keys(a.colors).filter(k=>a.colors[k]!==b.colors[k]);
  assert.equal(changed.length,20);
  for(const key of changed){assert.equal(b.colors[key],a.colors[key]+'00');}
  assert.deepEqual(a.tokenColors,b.tokenColors);
  assert.deepEqual(a.semanticTokenColors,b.semanticTokenColors);
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
