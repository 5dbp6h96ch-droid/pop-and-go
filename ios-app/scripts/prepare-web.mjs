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
  // Capacitor native webview cannot use the PWA Web Push subscription flow.
  // Keep the web/PWA source unchanged, and make the iOS limitation explicit.
  if(rel==='push-settings.js'){
   source='const nativeIOS = !!(window.Capacitor?.isNativePlatform?.() && window.Capacitor.getPlatform?.()==="ios");\n'+source;
   source=source.replace('const supported="serviceWorker"in navigator&&"PushManager"in window&&"Notification"in window;', 'const supported=!nativeIOS&&"serviceWorker"in navigator&&"PushManager"in window&&"Notification"in window;');
   source=source.replace('Dieses Gerät unterstützt keine Web-Push-Nachrichten.', 'Native iOS-Push ist in dieser Testversion noch nicht eingerichtet.');
  }
  if(rel==='app-auth.js'){
   source=source.replace('function showPushWelcome(uid){','function showPushWelcome(uid){\n if(window.Capacitor?.isNativePlatform?.() && window.Capacitor.getPlatform?.()==="ios")return;');
   // Native iOS needs a predictable persistent session storage configuration.
   const before='persistSession:true,autoRefreshToken:true';
   if(!source.includes(before))throw new Error('Supabase Auth configuration changed: review native transformation');
   source=source.replace(before,'persistSession:true,autoRefreshToken:true,detectSessionInUrl:false');
  }
  writeFileSync(dest,source);
 }else copyFileSync(join(root,rel),dest);
 copied++;
}
// Include the native-only bridge before the existing web push setup.
const nativeBridge=readFileSync(join(root,'ios-app','native-push.js'),'utf8');
writeFileSync(join(out,'native-push.js'),nativeBridge);
writeFileSync(join(out,'runtime-diagnostics.js'),readFileSync(join(root,'ios-app','runtime-diagnostics.js'),'utf8'));
writeFileSync(join(out,'diagnostics-ui.js'),readFileSync(join(root,'ios-app','diagnostics-ui.js'),'utf8'));
writeFileSync(join(out,'account-deletion-ui.js'),readFileSync(join(root,'ios-app','account-deletion-ui.js'),'utf8'));
const indexPath=join(out,'index.html');
const html=readFileSync(indexPath,'utf8');
if(!html.includes('src="push-settings.js'))throw new Error('Push settings entry not found');
writeFileSync(indexPath,html.replace('<script src="push-settings.js','<script src="native-push.js"></script><script src="runtime-diagnostics.js"></script><script src="diagnostics-ui.js"></script><script src="account-deletion-ui.js"></script><script src="push-settings.js'));
if(!copied||!tracked.includes('index.html'))throw new Error('No index.html found in tracked frontend files');
console.log('Prepared '+copied+' tracked frontend assets for Capacitor.');
