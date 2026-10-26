"use strict";
(function(){
const guide=document.getElementById("installGuide");
const steps=document.getElementById("installSteps");
const isStandalone=window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;
const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent);
const isSafari=/Safari/.test(navigator.userAgent)&&!/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
let promptEvent=null;
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();promptEvent=event;});
function show(force){
 if(isStandalone){guide.hidden=true;return}
 if(!force&&localStorage.getItem("rg-install-intro-shown")==="yes")return;
 if(isIOS){
  steps.textContent=isSafari?"Tippe unten in Safari auf Teilen, wähle „Zum Home-Bildschirm“, aktiviere „Als Web-App öffnen“ (falls angezeigt) und tippe auf Hinzufügen. Öffne die App danach über das neue Symbol.":"Öffne diesen Link zuerst in Safari. Dort tippe auf Teilen → Zum Home-Bildschirm → Hinzufügen.";
 }else{
  steps.textContent="Öffne das Browser-Menü und wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“. Alternativ nutze die Installationsfunktion deines Browsers.";
 }
 guide.hidden=false;
}
document.getElementById("installLater").onclick=()=>{localStorage.setItem("rg-install-intro-shown","yes");guide.hidden=true};
document.getElementById("installDone").onclick=async()=>{
 if(promptEvent){const p=promptEvent;promptEvent=null;try{await p.prompt()}catch{}}
 localStorage.setItem("rg-install-intro-shown","yes");guide.hidden=true
};
document.getElementById("appInstallHelp").onclick=()=>{show(true);guide.scrollIntoView({behavior:"smooth",block:"start"})};
window.addEventListener("appinstalled",()=>{localStorage.setItem("rg-install-intro-shown","yes");guide.hidden=true});
show(false);
})();