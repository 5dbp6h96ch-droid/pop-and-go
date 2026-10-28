(()=>{"use strict";
const $=id=>document.getElementById(id),input=$("dictation"),button=$("voiceStart"),status=$("voiceStatus"),label=$("voiceStartLabel");
if(!input||!button||!status||!label)return;
const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
let recognition=null,active=false,session=0,base="",latest="",received=false,stopped=false;
const idle=()=>{active=false;button.disabled=false;button.setAttribute("aria-pressed","false");label.textContent="Jetzt sprechen"};
function finish(id){if(id!==session)return;const text=latest.trim();recognition=null;idle();if(text){input.value=[base,text].filter(Boolean).join(" ");input.dispatchEvent(new Event("input",{bubbles:true}));status.textContent="Sprache erkannt. Angaben prüfen und passenden Ort auswählen."}else if(stopped){status.textContent="Aufnahme beendet, aber keine Sprache erkannt. Bitte erneut versuchen."}}
button.addEventListener("contextmenu",e=>e.preventDefault());
button.addEventListener("dragstart",e=>e.preventDefault());
button.addEventListener("click",()=>{
 if(active){stopped=true;button.disabled=true;status.textContent="Aufnahme wird beendet …";try{recognition?.stop()}catch(e){finish(session)}return}
 if(!Speech){status.textContent="Spracherkennung auf diesem Gerät nicht verfügbar. Bitte das Tastaturmikrofon verwenden.";input.focus();return}
 const id=++session;const r=new Speech();recognition=r;base=input.value.trim();latest="";received=false;stopped=false;
 r.lang="de-DE";r.interimResults=true;r.continuous=false;r.maxAlternatives=1;
 r.onstart=()=>{if(id!==session)return;active=true;button.disabled=false;button.setAttribute("aria-pressed","true");label.textContent="Aufnahme beenden";status.textContent="Ich höre zu …"};
 r.onresult=e=>{if(id!==session)return;const values=[];for(let i=0;i<e.results.length;i++){const item=e.results[i];if(item&&item[0]?.transcript)values.push(item[0].transcript)}const t=values.join(" ").trim();if(t){latest=t;received=true;input.value=[base,t].filter(Boolean).join(" ");input.dispatchEvent(new Event("input",{bubbles:true}));status.textContent="Sprache erkannt …"}};
 r.onerror=e=>{if(id!==session)return;const error=String(e.error||"unknown");if(error==="aborted"&&stopped)return;status.textContent=error==="no-speech"?"Keine Sprache erkannt. Bitte erneut versuchen.":"Spracherkennung fehlgeschlagen ("+error+"). Bitte erneut versuchen.";stopped=false};
 r.onend=()=>finish(id);
 button.disabled=true;status.textContent="Mikrofon wird gestartet …";
 try{r.start()}catch(e){status.textContent="Mikrofon konnte nicht gestartet werden.";finish(id)}
});
$("ideaDiscard")?.addEventListener("click",()=>{session++;const old=recognition;recognition=null;try{old?.abort()}catch(e){}base="";latest="";received=false;stopped=false;idle();status.textContent="Bereit für eine neue Idee."});
window.addEventListener("pagehide",()=>{session++;try{recognition?.abort()}catch(e){}recognition=null});
status.textContent=Speech?"Tippe auf Jetzt sprechen und erzähle deine Idee.":"Alternativ das iPhone-Tastaturmikrofon verwenden.";
})();