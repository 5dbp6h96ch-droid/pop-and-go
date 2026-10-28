"use strict";
// Native iOS account deletion entrypoint. The server must reauthenticate and
// delete the Supabase Auth identity; this interface never claims local logout
// is a completed deletion.
(function(){
 const cap=window.Capacitor;
 if(!(cap?.isNativePlatform?.()&&cap.getPlatform?.()==="ios"))return;
 const add=()=>{
  const section=document.getElementById("more");
  const target=section?.querySelector(".more-logout-row");
  if(!target||document.getElementById("iosDeleteAccount"))return;
  const button=document.createElement("button");
  button.type="button";button.id="iosDeleteAccount";
  button.textContent="Konto und Daten löschen";
  button.style.marginTop="12px";
  button.addEventListener("click",async()=>{
   const account=(await authClient.auth.getUser()).data?.user;
   if(!account){alert("Bitte zuerst anmelden.");return;}
   const confirmed=window.confirm("Dein Konto und zugehörige persönliche Daten endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.");
   if(!confirmed)return;
   const again=window.prompt('Zur Bestätigung bitte LÖSCHEN eingeben.');
   if(again!=="LÖSCHEN")return;
   button.disabled=true;
   try{
    // The backend endpoint has NOT been deployed. Avoid destructive operations
    // or a misleading success message until reviewed and activated.
    alert("Die sichere Kontolöschung wird serverseitig vorbereitet. Dein Konto wurde nicht gelöscht.");
   }finally{button.disabled=false;}
  });
  target.append(button);
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",add,{once:true});
 else add();
})();
