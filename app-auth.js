"use strict";
const authClient=window.supabase.createClient("https://itaoljnqwoiifztjlfyc.supabase.co","sb_publishable_9SXRrjZnf1-Od24sBr6QNA_9WUPofZV",{auth:{persistSession:true,autoRefreshToken:true}});
async function syncAppAuth(){
 const {data:{user}}=await authClient.auth.getUser();
 if(!user){document.body.classList.add("auth-locked");document.getElementById("appLogin").hidden=false;return}
 const {data:profile,error}=await authClient.from("profiles").select("account_status,is_admin").eq("user_id",user.id).maybeSingle();
 if(error||profile?.account_status!=="active"){
  document.body.classList.add("auth-locked");document.getElementById("appLogin").hidden=false;
  document.getElementById("appNotice").textContent=error?"Kontostatus konnte nicht geprüft werden.":profile?.account_status==="pending"?"Dein Konto wartet auf Freigabe.":"Dein Konto ist nicht freigeschaltet.";
  return;
 }
 document.body.classList.remove("auth-locked");document.getElementById("appLogin").hidden=true;
 document.getElementById("accountLabel").textContent="Angemeldet als "+user.email;
 document.getElementById("openAdmin").hidden=!profile.is_admin;document.getElementById("openCategoryAssignment").hidden=!profile.is_admin;
}
document.getElementById("appLoginForm").onsubmit=async event=>{
 event.preventDefault();const status=document.getElementById("appNotice");status.textContent="Anmeldung wird geprüft …";
 const {error}=await authClient.auth.signInWithPassword({email:document.getElementById("appEmail").value,password:document.getElementById("appPassword").value});
 if(error){status.textContent="Anmeldung fehlgeschlagen: "+error.message;return}
 document.getElementById("appPassword").value="";await syncAppAuth();
};
document.getElementById("appSignup").onclick=async()=>{
 const email=document.getElementById("appEmail").value.trim(),password=document.getElementById("appPassword").value;
 if(!email||password.length<8){document.getElementById("appNotice").textContent="Bitte E-Mail und ein Passwort mit mindestens 8 Zeichen eingeben.";return}
 const {error}=await authClient.auth.signUp({email,password});
 document.getElementById("appNotice").textContent=error?"Registrierung fehlgeschlagen: "+error.message:"Registrierung angefragt. Bitte E-Mail-Bestätigung und Freigabe abwarten.";
};
document.getElementById("switchAccount").onclick=async()=>{await authClient.auth.signOut();document.getElementById("appNotice").textContent="Du kannst dich jetzt mit einem anderen Konto anmelden.";document.getElementById("appPassword").value=""};
document.getElementById("appLogout").onclick=async()=>{await authClient.auth.signOut();document.getElementById("newFrame").src="about:blank";document.getElementById("adminFrame").src="about:blank";location.reload()};
document.getElementById("openAdmin").onclick=()=>{document.querySelectorAll("main section").forEach(s=>s.hidden=s.id!=="adminSection");document.getElementById("adminFrame").src="vorschlagen.html?mode=admin&embedded=1&v=46"};
document.getElementById("openCategoryAssignment").onclick=()=>{document.querySelectorAll("main section").forEach(s=>s.hidden=s.id!=="adminSection");document.getElementById("adminFrame").src="vorschlagen.html?mode=admin&tab=places&embedded=1&v=46";};
syncAppAuth().catch(error=>{document.getElementById("appNotice").textContent="Anmeldung konnte nicht geprüft werden: "+error.message});
