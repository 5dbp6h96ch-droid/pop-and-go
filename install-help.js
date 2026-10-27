"use strict";
(function(){
const guide=document.getElementById("installGuide"),steps=document.getElementById("installSteps"),done=document.getElementById("installDone"),later=document.getElementById("installLater");
const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1;
const isAndroid=/Android/i.test(navigator.userAgent);
const isMobile=isIOS||isAndroid;
const isStandalone=()=>window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;
const isSafari=/Safari/.test(navigator.userAgent)&&!/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
let promptEvent=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();promptEvent=e;if(!isStandalone()&&isMobile)displayGate()});
function instructions(){
 if(isIOS)steps.textContent=isSafari?"Öffne das Teilen-Menü in Safari, wähle „Zum Home-Bildschirm“, aktiviere „Als Web-App öffnen“ und tippe auf „Hinzufügen“. Starte raus & guggen anschließend über das neue Symbol.":"Öffne diese Seite in Safari und wähle Teilen → Zum Home-Bildschirm → Als Web-App öffnen → Hinzufügen. Danach das App-Symbol öffnen.";
 else steps.textContent="Öffne das Browser-Menü und wähle „App installieren“ beziehungsweise „Zum Startbildschirm hinzufügen“. Starte die App anschließend über das neue Symbol.";
}
function displayGate(){if(!isMobile||isStandalone()){guide.classList.remove("install-required");guide.hidden=true;return}instructions();guide.hidden=false;guide.classList.add("install-required");document.body.classList.add("install-gated");done.textContent=promptEvent?"App installieren":"Installationsanleitung anzeigen";later.hidden=true;}
function check(){if(isStandalone()){guide.hidden=true;guide.classList.remove("install-required");document.body.classList.remove("install-gated")}else if(isMobile)displayGate()}
done.onclick=async()=>{if(promptEvent){const p=promptEvent;promptEvent=null;try{await p.prompt();await p.userChoice}catch{}}instructions();check()};
later.onclick=()=>{if(isMobile){check();return}guide.hidden=true};
document.getElementById("appInstallHelp").onclick=()=>{instructions();guide.hidden=false;if(isMobile)displayGate();guide.scrollIntoView({behavior:"smooth",block:"start"})};
window.addEventListener("appinstalled",check);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)check()});window.addEventListener("pageshow",check);
check();
})();
