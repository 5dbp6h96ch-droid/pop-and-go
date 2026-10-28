(()=>{"use strict";
const $=id=>document.getElementById(id),input=$("dictation"),button=$("voiceStart"),status=$("voiceStatus"),label=$("voiceStartLabel");
if(!input||!button||!status||!label)return;
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
let recognition=null,phase="idle",baseText="",interim="",finalText="",hadResult=false,manualStop=false,errorKind="",silenceTimer=null,hardTimer=null,stopTimer=null,recoveryTimer=null,lastRecognized="",session=0,retryCount=0,retryTimer=null;
const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
// Diagnostic log remains on this device; it contains events only, never dictated words.
const diagnostics=document.createElement("details");diagnostics.id="voiceDiagnostics";diagnostics.style.cssText="margin:12px 0;padding:12px;border:1px solid #cfc6e0;border-radius:12px;background:#fff;color:#302646";
const summary=document.createElement("summary");summary.textContent="Spracherkennung: Fehlerdiagnose";diagnostics.append(summary);
const output=document.createElement("pre");output.style.cssText="white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;max-height:180px;overflow:auto";diagnostics.append(output);
const copy=document.createElement("button");copy.type="button";copy.textContent="Diagnose kopieren";copy.style.cssText="width:100%;background:#f0eaff;color:#3b2570";diagnostics.append(copy);
status.insertAdjacentElement("afterend",diagnostics);
const diagnosticKey="popgo-voice-events-v1";
let events=[];try{const previous=JSON.parse(sessionStorage.getItem(diagnosticKey)||"[]");if(Array.isArray(previous))events=previous.filter(x=>typeof x==="string").slice(-70)}catch(e){}
const trace=(name,detail="")=>{events.push(new Date().toLocaleTimeString("de-DE")+" | "+name+(detail?" | "+detail:""));if(events.length>90)events.shift();output.textContent=events.join("\n");try{sessionStorage.setItem(diagnosticKey,JSON.stringify(events))}catch(e){}};
output.textContent=events.join("\n");
copy.addEventListener("click",()=>{const t=output.textContent;if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(()=>{copy.textContent="Kopiert"}).catch(()=>{copy.textContent="Kopieren nicht möglich"});else{output.hidden=false;copy.textContent="Text markieren und kopieren"}});
trace("seitenstart",window.SpeechRecognition?"SpeechRecognition":window.webkitSpeechRecognition?"webkitSpeechRecognition":"keine API");

const clearTimers=()=>{clearTimeout(silenceTimer);clearTimeout(hardTimer);clearTimeout(stopTimer);silenceTimer=null;hardTimer=null;stopTimer=null};
const setPhase=(value)=>{phase=value;const running=value==="starting"||value==="listening"||value==="stopping";button.setAttribute("aria-pressed",String(running));label.textContent=value==="starting"?"Mikrofon wird gestartet …":value==="listening"?"Aufnahme beenden":value==="stopping"?"Verarbeite Sprache …":"Jetzt sprechen";button.disabled=value==="starting"||value==="stopping"};
const commitText=()=>{
 const phrase=(finalText||interim||lastRecognized).trim();if(!phrase)return false;
 const combined=[baseText,phrase].filter(Boolean).join(" ").trim();
 input.value=combined;input.dispatchEvent(new Event("input",{bubbles:true}));return true;
};
const finish=()=>{trace("finish","error="+(errorKind||"none")+"; result="+(hadResult?"yes":"no"));
 clearTimers();const ok=commitText();setPhase("idle");recognition=null;
 if(ok){retryCount=0;status.textContent="Sprache erkannt. Passende Vorschläge werden gesucht.";return}
 
 status.textContent="iOS hat keine Sprache erkannt. Bitte erneut versuchen oder die Diagnose kopieren.";
};
const stop=()=>{trace("stop",phase);
 if(!recognition||phase==="idle"||phase==="stopping")return;
 manualStop=true;clearTimers();setPhase("stopping");status.textContent="Sprache wird verarbeitet …";
 const current=session;stopTimer=setTimeout(()=>{if(current!==session||phase!=="stopping")return;try{recognition&&recognition.abort()}catch(e){}status.textContent="Die Verarbeitung hat nicht geantwortet. Bitte erneut sprechen.";errorKind="timeout";trace("stop-timeout");finish()},3500);const r=recognition;const stopNative=()=>{if(current!==session||recognition!==r||phase!=="stopping")return;trace("native-stop",hadResult?"result":"no-result");try{r.stop()}catch(e){errorKind="stop";status.textContent="Aufnahme konnte nicht beendet werden.";finish()}};if(hadResult)stopNative();else{trace("await-late-result");setTimeout(stopNative,800)}
};
const armSilence=()=>{
 clearTimeout(silenceTimer);
 // End after a short pause once the browser delivered speech, not after fixed recording time.
 silenceTimer=setTimeout(()=>{if(phase==="listening"&&hadResult)stop()},1800);
};
function start(isRetry=false){if(!isRetry){retryCount=0;clearTimeout(retryTimer);retryTimer=null}trace(isRetry?"retry-start":"start-button",phase);
 if(!SR){status.textContent="Direkte Spracherkennung wird von diesem Browser nicht angeboten.";return}
 clearTimers();session++;const current=session;
 recognition=new SR();const r=recognition;trace("session",String(current));
 baseText=input.value.trim();interim="";finalText="";lastRecognized="";hadResult=false;manualStop=false;errorKind="";
 r.lang="de-DE";r.interimResults=true;r.continuous=false;r.maxAlternatives=1;
 r.onstart=()=>{
  if(current!==session||phase!=="starting")return;trace("onstart");clearTimeout(stopTimer);stopTimer=null;setPhase("listening");
  status.textContent="Mikrofon aktiv. Bitte jetzt sprechen.";
  hardTimer=setTimeout(()=>{if(current===session&&phase==="listening")stop()},45000);
 };
 r.onaudiostart=()=>{trace("onaudiostart");if(current===session&&phase==="listening")status.textContent="Mikrofon empfängt Audio. Bitte sprechen."};
 r.onspeechstart=()=>{trace("onspeechstart");if(current===session&&phase==="listening")status.textContent="Sprache erkannt …"};
 r.onresult=e=>{trace("onresult","items="+e.results.length);
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
 r.onspeechend=()=>{trace("onspeechend");if(current!==session)return;if(hadResult&&phase==="listening")armSilence()};
 r.onerror=e=>{
  if(current!==session)return;errorKind=String(e.error||"unbekannt");trace("onerror",errorKind);
  if(errorKind==="aborted"&&manualStop)return;
  const messages={"not-allowed":"Mikrofon- oder Spracherkennungsberechtigung verweigert.","service-not-allowed":"Die Spracherkennung ist in dieser iPhone-Umgebung nicht erlaubt.","network":"Verbindungsproblem bei der Spracherkennung.","no-speech":"Keine Sprache erkannt.","audio-capture":"Das Mikrofon ist nicht verfügbar.","aborted":"Die Spracherkennung wurde von iOS abgebrochen."};
  status.textContent=(messages[errorKind]||"Spracherkennung fehlgeschlagen.")+" ("+errorKind+")";
 };
 r.onend=()=>{trace("onend");if(current!==session)return;finish()};
 setPhase("starting");status.textContent="Starte Mikrofon …";
 const startSession=session;stopTimer=setTimeout(()=>{if(session!==startSession||phase!=="starting")return;errorKind="start-timeout";trace("start-timeout");status.textContent="Mikrofonstart hat nicht geantwortet. Bitte erneut versuchen.";try{r.abort()}catch(e){}finish()},5000);try{r.start()}catch(e){errorKind="start";status.textContent="Spracherkennung konnte nicht gestartet werden.";finish()}
}
button.addEventListener("contextmenu",e=>e.preventDefault());
button.addEventListener("dragstart",e=>e.preventDefault());
button.querySelectorAll("*").forEach(el=>el.setAttribute("draggable","false"));
button.setAttribute("aria-label","Spracherkennung starten oder beenden");
button.addEventListener("click",()=>{if(phase==="listening")stop();else if(phase==="idle")start()});
status.textContent=SR?"Einmal tippen und sprechen. Nach einer Sprechpause endet die Aufnahme automatisch.":"Spracherkennung ist hier nicht verfügbar.";
window.addEventListener("pagehide",()=>{session++;clearTimers();clearTimeout(retryTimer);try{recognition&&recognition.abort()}catch(e){}recognition=null});
const discard=$("ideaDiscard");
if(discard)discard.addEventListener("click",()=>{trace("verwerfen");
 // Reload only the embedded suggestion document. The parent app and login stay open.
 // A fresh document creates a new SpeechRecognition owner rather than reusing
 // iOS WebKit's potentially stale recognition session after discard.
 session++;clearTimers();clearTimeout(recoveryTimer);clearTimeout(retryTimer);retryCount=0;
 const previous=recognition;recognition=null;
 if(previous){try{previous.onresult=null;previous.onerror=null;previous.onstart=null;previous.onend=null;previous.abort()}catch(e){}}
 button.disabled=true;
 status.textContent="Formular und Mikrofon werden neu gestartet …";
 setTimeout(()=>{try{sessionStorage.setItem("popgo-return-to-new","1")}catch(e){}window.top.location.replace("./?voiceRestart=1")},150);
});
})();