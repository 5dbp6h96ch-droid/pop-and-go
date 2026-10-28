"use strict";
// Native APNs preparation. No token is persisted or sent until a reviewed
// authenticated backend registration endpoint and Apple signing exist.
(function(){
 const native=window.Capacitor?.isNativePlatform?.()&&window.Capacitor?.getPlatform?.()==="ios";
 if(!native)return;
 const plugin=window.Capacitor?.Plugins?.PushNotifications;
 window.popgoNativePush={
  available:!!plugin,
  async registerForTesting(){
   if(!plugin)throw Error("Native Push-Komponente nicht verfügbar.");
   const state=await plugin.requestPermissions();
   if(state.receive!=="granted")return {status:"denied"};
   return new Promise(async(resolve,reject)=>{
    let done=false;
    const finish=(fn,value)=>{if(done)return;done=true;fn(value)};
    await plugin.addListener("registration",token=>finish(resolve,{status:"registered",tokenAvailable:!!token.value}));
    await plugin.addListener("registrationError",e=>finish(reject,Error(e.error||"APNs-Registrierung fehlgeschlagen")));
    try{await plugin.register()}catch(e){finish(reject,e)}
   });
  }
 };
})();
