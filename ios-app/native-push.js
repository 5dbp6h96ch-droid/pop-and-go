"use strict";
// APNs capability probe only. No device token is logged, stored or transmitted.
// A production feature requires Apple entitlements and authenticated backend registration.
(function(){
 const cap=window.Capacitor;
 if(!(cap?.isNativePlatform?.()&&cap?.getPlatform?.()==="ios"))return;
 const plugin=cap.Plugins?.PushNotifications;
 window.popgoNativePush={
  available:!!plugin,
  async registerForTesting(){
   if(!plugin)throw Error("Native Push-Komponente nicht verfügbar.");
   const state=await plugin.requestPermissions();
   if(state.receive!=="granted")return {status:"denied"};
   let registrationHandle, errorHandle, timeout;
   try{
    return await new Promise(async(resolve,reject)=>{
     let settled=false;
     const finish=(fn,value)=>{if(settled)return;settled=true;fn(value)};
     try{
      registrationHandle=await plugin.addListener("registration",token=>finish(resolve,{status:"registered",tokenAvailable:!!token?.value}));
      errorHandle=await plugin.addListener("registrationError",e=>finish(reject,Error(e?.error||"APNs-Registrierung fehlgeschlagen")));
      timeout=setTimeout(()=>finish(reject,Error("APNs-Registrierung ohne Rückmeldung.")),15000);
      await plugin.register();
     }catch(error){finish(reject,error)}
    });
   }finally{
    clearTimeout(timeout);
    await Promise.allSettled([registrationHandle?.remove?.(),errorHandle?.remove?.()]);
   }
  }
 };
})();
