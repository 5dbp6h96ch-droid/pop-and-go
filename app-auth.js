"use strict";
const authClient=window.supabase.createClient("https://itaoljnqwoiifztjlfyc.supabase.co","sb_publishable_9SXRrjZnf1-Od24sBr6QNA_9WUPofZV",{auth:{persistSession:true,autoRefreshToken:true}});
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
 if(!error)setSignupMode(false);
}
signupButton.onclick=async()=>{setSignupMode(!signupMode);document.getElementById("appNotice").textContent="";if(signupMode)nameField.focus();};
document.getElementById("switchAccount").onclick=async()=>{await authClient.auth.signOut();document.getElementById("appNotice").textContent="Du kannst dich jetzt mit einem anderen Konto anmelden.";document.getElementById("appPassword").value=""};
document.getElementById("appLogout").onclick=async()=>{await authClient.auth.signOut();document.getElementById("newFrame").src="about:blank";document.getElementById("adminFrame").src="about:blank";location.reload()};
document.getElementById("openAdmin").onclick=()=>{const f=document.getElementById("adminFrame");f.style.visibility="hidden";f.onload=()=>{if(f.contentWindow?.location?.href!=="about:blank")f.style.visibility="visible"};const u=new URL("vorschlagen.html",location.href);u.searchParams.set("mode","admin");u.searchParams.set("embedded","1");u.searchParams.set("_build",document.querySelector('meta[name="app-build"]')?.content||"current");u.searchParams.set("_open",String(Date.now()));f.src=u.href;document.querySelectorAll("main section").forEach(s=>s.hidden=s.id!=="adminSection")};

syncAppAuth().catch(error=>{document.getElementById("appNotice").textContent="Anmeldung konnte nicht geprüft werden: "+error.message});
