"use strict";
const authClient=window.supabase.createClient("https://itaoljnqwoiifztjlfyc.supabase.co","sb_publishable_9SXRrjZnf1-Od24sBr6QNA_9WUPofZV",{auth:{persistSession:true,autoRefreshToken:true}});
const pushWelcome=document.getElementById("pushOnboarding");
const pushWelcomeStatus=document.getElementById("pushOnboardingStatus");
const pushWelcomeInfo=document.getElementById("pushOnboardingInfo");
const pushOnboardingDone=uid=>{try{return localStorage.getItem("popgo-push-welcome-"+uid)==="done"}catch{return false}};
const markPushOnboardingDone=uid=>{try{localStorage.setItem("popgo-push-welcome-"+uid,"done")}catch{}};
function showPushWelcome(uid){
 if(!uid||pushOnboardingDone(uid)||!pushWelcome)return;
 pushWelcome.hidden=false;pushWelcomeStatus.textContent="";
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent);
 if(ios&&!(window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true)){
  pushWelcomeInfo.textContent="Auf dem iPhone sind Push-Nachrichten nur möglich, wenn du raus & guggen zum Home-Bildschirm hinzufügst und über das App-Symbol öffnest.";
  pushWelcomeStatus.textContent="Danach kannst du Push hier aktivieren.";
 }else pushWelcomeInfo.textContent="Erlaube Push-Benachrichtigungen für Freigaben, Neuigkeiten und Freizeitideen.";
 pushWelcome.dataset.userId=uid;
}
document.getElementById("pushOnboardingLater").onclick=()=>{markPushOnboardingDone(pushWelcome.dataset.userId);pushWelcome.hidden=true};
document.getElementById("pushOnboardingEnable").onclick=async()=>{
 const btn=document.getElementById("pushOnboardingEnable");
 btn.disabled=true;pushWelcomeStatus.textContent="Push wird eingerichtet …";
 try{
  if(!window.popgoPush?.activate)throw Error("Push ist noch nicht bereit.");
  await window.popgoPush.activate();
  markPushOnboardingDone(pushWelcome.dataset.userId);
  pushWelcome.hidden=true;
 }catch(e){pushWelcomeStatus.textContent=e.message||"Aktivierung nicht möglich."}
 finally{btn.disabled=false}
};
async function syncAppAuth(){
 const {data:{user}}=await authClient.auth.getUser();
 if(!user){document.body.classList.add("auth-locked");document.getElementById("appLogin").hidden=false;return}
 const {data:profile,error}=await authClient.from("profiles").select("account_status,is_admin,display_name").eq("user_id",user.id).maybeSingle();
 if(error||profile?.account_status!=="active"){
  document.body.classList.add("auth-locked");document.getElementById("appLogin").hidden=false;
  document.getElementById("appNotice").textContent=error?"Kontostatus konnte nicht geprüft werden.":profile?.account_status==="pending"?"Dein Konto wartet auf Freigabe.":"Dein Konto ist nicht freigeschaltet.";
  return;
 }
 document.body.classList.remove("auth-locked");document.getElementById("appLogin").hidden=true;
 document.getElementById("accountLabel").textContent=user.email||"";
 document.getElementById("profileName").textContent=profile.display_name?.trim()||"Mein Profil";
 document.getElementById("accountRole").textContent=profile.is_admin?"Administrator":"Mitglied";
 document.getElementById("adminArea").hidden=!profile.is_admin;
 document.getElementById("openAdmin").hidden=!profile.is_admin;
 document.getElementById("adminUsersLink").hidden=!profile.is_admin;
 showPushWelcome(user.id);
 if(profile.is_admin&&location.hash==="#verwaltung")document.getElementById("openAdmin").click();
}
document.getElementById("appLoginForm").onsubmit=async event=>{
 event.preventDefault();const status=document.getElementById("appNotice");status.textContent="Anmeldung wird geprüft …";
 const {error}=await authClient.auth.signInWithPassword({email:document.getElementById("appEmail").value,password:document.getElementById("appPassword").value});
 if(error){status.textContent="Anmeldung fehlgeschlagen: "+error.message;return}
 document.getElementById("appPassword").value="";await syncAppAuth();
};
let signupMode=false;
const nameLabel=document.getElementById("appNameLabel"),nameField=document.getElementById("appName"),signupButton=document.getElementById("appSignup"),loginButton=document.getElementById("appLoginSubmit");
function setSignupMode(enabled){signupMode=enabled;nameLabel.hidden=!enabled;nameField.required=enabled;loginButton.textContent=enabled?"Konto erstellen":"Anmelden";signupButton.textContent=enabled?"Zur Anmeldung":"Registrieren";}
document.getElementById("appLoginForm").addEventListener("submit",async event=>{if(!signupMode)return;event.preventDefault();event.stopImmediatePropagation();await submitRegistration();},true);
async function submitRegistration(){
 const email=document.getElementById("appEmail").value.trim(),password=document.getElementById("appPassword").value,display_name=nameField.value.trim().replace(/\\s+/g," ");
 if(display_name.length<2){document.getElementById("appNotice").textContent="Bitte deinen Namen mit mindestens 2 Zeichen eingeben.";nameField.focus();return}
 if(!email||password.length<8){document.getElementById("appNotice").textContent="Bitte E-Mail und ein Passwort mit mindestens 8 Zeichen eingeben.";return}
 const {error}=await authClient.auth.signUp({email,password,options:{data:{display_name}}});
 document.getElementById("appNotice").textContent=error?"Registrierung fehlgeschlagen: "+error.message:"Registrierung angefragt. Bitte E-Mail-Bestätigung und Freigabe abwarten.";
 if(!error){setSignupMode(false);document.getElementById("appNotice").textContent+=" Push lässt sich nach der Kontofreigabe bei der ersten Anmeldung direkt einschalten. Auf dem iPhone muss die App vom Home-Bildschirm gestartet werden.";}
}
signupButton.onclick=async()=>{setSignupMode(!signupMode);document.getElementById("appNotice").textContent="";if(signupMode)nameField.focus();};
document.getElementById("switchAccount").onclick=async()=>{await authClient.auth.signOut();document.getElementById("appNotice").textContent="Du kannst dich jetzt mit einem anderen Konto anmelden.";document.getElementById("appPassword").value=""};
document.getElementById("appLogout").onclick=async()=>{await authClient.auth.signOut();document.getElementById("newFrame").src="about:blank";document.getElementById("adminFrame").src="about:blank";location.reload()};
document.getElementById("openAdmin").onclick=()=>{const f=document.getElementById("adminFrame");f.style.visibility="hidden";f.onload=null;const u=new URL("vorschlagen.html",location.href);u.searchParams.set("mode","admin");u.searchParams.set("embedded","1");u.searchParams.set("_build",document.querySelector('meta[name="app-build"]')?.content||"current");u.searchParams.set("_open",String(Date.now()));f.src=u.href;document.querySelectorAll("main section").forEach(s=>s.hidden=s.id!=="adminSection")};

syncAppAuth().catch(error=>{document.getElementById("appNotice").textContent="Anmeldung konnte nicht geprüft werden: "+error.message});

window.addEventListener("message",event=>{const f=document.getElementById("adminFrame");if(event.origin===location.origin&&event.source===f.contentWindow&&event.data?.type==="popgo-admin-ready")f.style.visibility="visible"});
