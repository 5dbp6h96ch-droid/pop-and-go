(()=>{"use strict";
const $=id=>document.getElementById(id),input=$("dictation"),button=$("voiceStart"),status=$("voiceStatus"),label=$("voiceStartLabel");
if(!input||!button||!status||!label)return;
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
let recognition=null,phase="idle",baseText="",interim="",finalText="",hadResult=false,manualStop=false,errorKind="",silenceTimer=null,hardTimer=null,stopTimer=null,recoveryTimer=null,lastRecognized="",session=0;
const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const clearTimers=()=>{clearTimeout(silenceTimer);clearTimeout(hardTimer);clearTimeout(stopTimer);silenceTimer=null;hardTimer=null;stopTimer=null};
const setPhase=(value)=>{phase=value;const running=value==="starting"||value==="listening"||value==="stopping";button.setAttribute("aria-pressed",String(running));label.textContent=value==="starting"?"Mikrofon wird gestartet …":value==="listening"?"Aufnahme beenden":value==="stopping"?"Verarbeite Sprache …":"Jetzt sprechen";button.disabled=value==="starting"||value==="stopping"};
const commitText=()=>{
 const phrase=(finalText||interim||lastRecognized).trim();if(!phrase)return false;
 const combined=[baseText,phrase].filter(Boolean).join(" ").trim();
 input.value=combined;input.dispatchEvent(new Event("input",{bubbles:true}));return true;
};
const finish=()=>{
 clearTimers();const ok=commitText();setPhase("idle");recognition=null;
 if(ok){status.textContent="Sprache erkannt. Passende Vorschläge werden gesucht.";return}
 if(!errorKind||manualStop)status.textContent="Aufnahme beendet, aber kein Text erkannt. Bitte erneut sprechen.";
};
const stop=()=>{
 if(!recognition||phase==="idle"||phase==="stopping")return;
 manualStop=true;clearTimers();setPhase("stopping");status.textContent="Sprache wird verarbeitet …";
 const current=session;stopTimer=setTimeout(()=>{if(current!==session||phase!=="stopping")return;try{recognition&&recognition.abort()}catch(e){}status.textContent="Die Verarbeitung hat nicht geantwortet. Bitte erneut sprechen.";errorKind="timeout";finish()},3500);try{recognition.stop()}catch(e){status.textContent="Aufnahme konnte nicht beendet werden.";errorKind="stop";finish()}
};
const armSilence=()=>{
 clearTimeout(silenceTimer);
 // End after a short pause once the browser delivered speech, not after fixed recording time.
 silenceTimer=setTimeout(()=>{if(phase==="listening"&&hadResult)stop()},1800);
};
function start(){
 if(!SR){status.textContent="Direkte Spracherkennung wird von diesem Browser nicht angeboten.";return}
 clearTimers();session++;const current=session;
 recognition=new SR();const r=recognition;
 baseText=input.value.trim();interim="";finalText="";lastRecognized="";hadResult=false;manualStop=false;errorKind="";
 r.lang="de-DE";r.interimResults=true;r.continuous=false;r.maxAlternatives=1;
 r.onstart=()=>{
  if(current!==session||phase!=="starting")return;clearTimeout(stopTimer);stopTimer=null;setPhase("listening");
  status.textContent="Mikrofon aktiv. Bitte jetzt sprechen.";
  hardTimer=setTimeout(()=>{if(current===session&&phase==="listening")stop()},45000);
 };
 r.onaudiostart=()=>{if(current===session&&phase==="listening")status.textContent="Mikrofon empfängt Audio. Bitte sprechen."};
 r.onspeechstart=()=>{if(current===session&&phase==="listening")status.textContent="Sprache erkannt …"};
 r.onresult=e=>{
  if(current!==session)return;
  let finals=[],partials=[];
  for(let i=0;i<e.results.length;i++){
   const item=e.results[i];const transcript=item&&item[0]&&item[0].transcript||"";
   (item.isFinal?finals:partials).push(transcript);
  }
  finalText=finals.join(" ").trim();interim=partials.join(" ").trim();if(finalText||interim)lastRecognized=[finalText,interim].filter(Boolean).join(" ").trim();hadResult=!!(finalText||interim||lastRecognized);
  if(hadResult){
   const combined=[baseText,finalText||lastRecognized,interim&&finalText?interim:""].filter(Boolean).join(" ").trim();
   input.value=combined;input.dispatchEvent(new Event("input",{bubbles:true}));
   status.textContent=finalText?"Erkannt: "+finalText:"Ich höre: "+interim;
   if(phase==="listening"){armSilence();if(finalText&&!interim)armSilence()}
  }
 };
 r.onspeechend=()=>{if(current!==session)return;if(hadResult&&phase==="listening")armSilence()};
 r.onerror=e=>{
  if(current!==session)return;errorKind=String(e.error||"unbekannt");
  if(errorKind==="aborted"&&manualStop)return;
  const messages={"not-allowed":"Mikrofon- oder Spracherkennungsberechtigung verweigert.","service-not-allowed":"Die Spracherkennung ist in dieser iPhone-Umgebung nicht erlaubt.","network":"Verbindungsproblem bei der Spracherkennung.","no-speech":"Keine Sprache erkannt.","audio-capture":"Das Mikrofon ist nicht verfügbar.","aborted":"Die Spracherkennung wurde von iOS abgebrochen."};
  status.textContent=(messages[errorKind]||"Spracherkennung fehlgeschlagen.")+" ("+errorKind+")";
 };
 r.onend=()=>{if(current!==session)return;finish()};
 setPhase("starting");status.textContent="Starte Mikrofon …";
 const startSession=session;stopTimer=setTimeout(()=>{if(session!==startSession||phase!=="starting")return;errorKind="start-timeout";status.textContent="Mikrofonstart hat nicht geantwortet. Bitte erneut versuchen.";try{r.abort()}catch(e){}finish()},5000);try{r.start()}catch(e){errorKind="start";status.textContent="Spracherkennung konnte nicht gestartet werden.";finish()}
}
button.addEventListener("contextmenu",e=>e.preventDefault());
button.addEventListener("dragstart",e=>e.preventDefault());
button.querySelectorAll("*").forEach(el=>el.setAttribute("draggable","false"));
button.setAttribute("aria-label","Spracherkennung starten oder beenden");
button.addEventListener("click",()=>{if(phase==="listening")stop();else if(phase==="idle")start()});
status.textContent=SR?"Einmal tippen und sprechen. Nach einer Sprechpause endet die Aufnahme automatisch.":"Spracherkennung ist hier nicht verfügbar.";
window.addEventListener("pagehide",()=>{session++;clearTimers();try{recognition&&recognition.abort()}catch(e){}recognition=null});
const discard=$("ideaDiscard");
if(discard)discard.addEventListener("click",()=>{
 // Reload only the embedded suggestion document. The parent app and login stay open.
 // A fresh document creates a new SpeechRecognition owner rather than reusing
 // iOS WebKit's potentially stale recognition session after discard.
 session++;clearTimers();clearTimeout(recoveryTimer);
 const previous=recognition;recognition=null;
 if(previous){try{previous.onresult=null;previous.onerror=null;previous.onstart=null;previous.onend=null;previous.abort()}catch(e){}}
 button.disabled=true;
 status.textContent="Formular und Mikrofon werden neu gestartet …";
 setTimeout(()=>{window.location.reload()},150);
});
})();