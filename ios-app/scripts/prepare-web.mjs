import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { extname, dirname, join } from 'node:path';
const root=new URL('../../',import.meta.url).pathname;
const out=join(root,'ios-app','www');
rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});
const allowed=new Set(['.html','.css','.js','.json','.png','.jpg','.jpeg','.webp','.svg','.woff','.woff2','.ico','.webmanifest','.txt']);
const tracked=execFileSync('git',['ls-files','-z'],{cwd:root}).toString().split('\0').filter(Boolean);
let copied=0;
for(const rel of tracked){
 if(rel.startsWith('ios-app/')||rel.startsWith('.github/')||rel.startsWith('docs/')||!allowed.has(extname(rel)))continue;
 const dest=join(out,rel);mkdirSync(dirname(dest),{recursive:true});
 if(['.html','.js','.css','.json','.webmanifest'].includes(extname(rel))){
  let source=readFileSync(join(root,rel),'utf8');
  // Native bundle is served from capacitor://localhost/, never GitHub Pages /pop-and-go/.
  source=source.replaceAll('/pop-and-go/','/');
  writeFileSync(dest,source);
 }else copyFileSync(join(root,rel),dest);
 copied++;
}
if(!copied||!tracked.includes('index.html'))throw new Error('No index.html found in tracked frontend files');
console.log('Prepared '+copied+' tracked frontend assets for Capacitor.');
