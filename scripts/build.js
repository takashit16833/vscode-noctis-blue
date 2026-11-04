'use strict';
const fs=require('node:fs');
const path=require('node:path');
const palette=require('../palette/colors.json');
const {buildTheme}=require('./theme');
const root=path.join(__dirname,'..');
const check=process.argv.includes('--check');
let outdated=false;
for(const [transparent,name] of [[false,'noctis-blue.json'],[true,'noctis-blue-transparent.json']]){
  const target=path.join(root,'themes',name);
  const content=JSON.stringify(buildTheme(palette,transparent),null,2)+'\n';
  if(check){if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==content){console.error('Outdated theme:',name);outdated=true;}}
  else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);}
}
if(outdated)process.exitCode=1;
