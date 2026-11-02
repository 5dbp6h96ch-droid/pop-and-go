"use strict";
// Native-only, read-only diagnostics shown under "Mehr". Never prints tokens.
(function(){
 const cap=window.Capacitor;
 if(!(cap?.isNativePlatform?.() && cap.getPlatform?.()==="ios"))return;
 const add=()=>{
  const section=document.getElementById("more");
  const menu=section?.querySelector(".more-menu");
  if(!menu||document.getElementById("iosDiagnosticPanel"))return;
  const details=document.createElement("details");
  details.id="iosDiagnosticPanel";
  const summary=document.createElement("summary");
  summary.textContent="iOS-App-Diagnose";
  const body=document.createElement("div");
  body.className="more-detail";
  const result=document.createElement("p");
  result.setAttribute("role","status");
  const button=document.createElement("button");
  button.type="button";
  button.textContent="Prüfen";
  button.addEventListener("click",async()=>{
   button.disabled=true;
   try{
    const state=window.popgoIOSDiagnostics?.report?.();
    if(!state)throw Error("Diagnose nicht geladen.");
    const session=typeof authClient!=="undefined"?
      await authClient.auth.getSession():{data:{session:null},error:Error("Supabase nicht geladen")};
    result.textContent=[
     "Plattform: iOS",
     "Supabase-Bibliothek: "+(state.authClientAvailable?"bereit":"fehlt"),
     "Anmeldesitzung: "+(session.error?"nicht prüfbar":session.data.session?"vorhanden":"nicht angemeldet"),
     "Native Push-Komponente: "+(state.nativePushPluginAvailable?"vorhanden":"fehlt"),
     "Web-Push deaktiviert: "+(state.webPushExcluded?"ja":"nein"),
     "Vorschlagsansicht: "+(state.embeddedNewFormPresent?"vorhanden":"fehlt")
    ].join(" · ");
   }catch(e){result.textContent="Diagnose fehlgeschlagen: "+(e?.message||"Unbekannter Fehler");}
   finally{button.disabled=false;}
  });
  body.append(button,result);details.append(summary,body);menu.append(details);
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",add,{once:true});
 else add();
})();
