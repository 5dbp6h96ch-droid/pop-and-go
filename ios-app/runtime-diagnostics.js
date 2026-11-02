"use strict";
// Read-only diagnostics for Capacitor iOS builds. No credentials or tokens logged.
(function(){
 const cap=window.Capacitor;
 const native=!!(cap?.isNativePlatform?.()&&cap?.getPlatform?.()==="ios");
 if(!native)return;
 const report=()=>({
  platform:"ios",
  native:true,
  secureContext:window.isSecureContext,
  authClientAvailable:typeof window.supabase?.createClient==="function",
  appAuthAvailable:typeof authClient!=="undefined",
  nativePushPluginAvailable:!!cap?.Plugins?.PushNotifications,
  webPushExcluded:!window.popgoPush?.supported,
  embeddedNewFormPresent:!!document.getElementById("newFrame"),
  embeddedAdminFormPresent:!!document.getElementById("adminFrame"),
  timestamp:new Date().toISOString()
 });
 // Explicit opt-in diagnostics can be read from a devtools console; never upload.
 window.popgoIOSDiagnostics=Object.freeze({report});
})();
