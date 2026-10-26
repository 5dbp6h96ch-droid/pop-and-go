"use strict";
const $=id=>document.getElementById(id);
const db=window.supabase.createClient("https://itaoljnqwoiifztjlfyc.supabase.co","sb_publishable_9SXRrjZnf1-Od24sBr6QNA_9WUPofZV",{auth:{persistSession:true,autoRefreshToken:true}});
let user=null,profile=null,selectedPlace=null;
const msg=t=>$("msg").textContent=t;
const esc=s=>String(s??"");
function element(tag,label){const e=document.createElement(tag);if(label!==undefined)e.textContent=label;return e}
function line(container,label,val){const p=element("p",label+": "+esc(val));container.append(p)}
async function refresh(){
 const {data:{user:u}}=await db.auth.getUser();user=u;
 $("auth").hidden=!!u;$("logged").hidden=!u;
 if(!u){profile=null;return}
 const {data,error}=await db.from("profiles").select("account_status,is_admin").eq("user_id",u.id).maybeSingle();
 profile=data;
 if(error){msg("Profil konnte nicht geladen werden: "+error.message);return}
 const active=profile?.account_status==="active";
 $("pendingAccount").hidden=active;
 $("proposal").hidden=!active;
 $("admin").hidden=!(active&&profile?.is_admin);
 if(!active)msg("Konto noch nicht freigegeben. Anträge sind erst nach Administratorfreigabe möglich.");
 else msg("Angemeldet als "+u.email);
 await listMine();
 if(active&&profile?.is_admin)await listAdmin();
}
$("login").onsubmit=async e=>{e.preventDefault();msg("Anmeldung wird geprüft …");const {error}=await db.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});if(error){msg("Anmeldung fehlgeschlagen: "+error.message);return}await refresh()};
$("signup").onclick=async()=>{const email=$("email").value.trim(),password=$("password").value;if(!email||password.length<8){msg("Bitte E-Mail und Passwort mit mindestens acht Zeichen eingeben.");return}const {error}=await db.auth.signUp({email,password});msg(error?"Registrierung fehlgeschlagen: "+error.message:"Registrierung beantragt. Bitte bestätige gegebenenfalls die E-Mail und warte auf Administratorfreigabe.")};
$("logout").onclick=async()=>{await db.auth.signOut();await refresh();msg("Abgemeldet.")};
$("doSearch").onclick=async()=>{
 const term=$("searchPlace").value.trim();if(term.length<3){msg("Bitte einen Suchbegriff mit mindestens drei Zeichen eingeben.");return}
 const button=$("doSearch");button.disabled=true;msg("Suche nach passenden Orten …");const list=$("searchResults");list.replaceChildren();
 try{
 const {data:{session}}=await db.auth.getSession();if(!session?.access_token)throw Error("Bitte erneut anmelden");
 const response=await fetch("https://itaoljnqwoiifztjlfyc.supabase.co/functions/v1/popgo-place-search?q="+encodeURIComponent(term),{headers:{Authorization:"Bearer "+session.access_token,apikey:"sb_publishable_9SXRrjZnf1-Od24sBr6QNA_9WUPofZV"}});
 const payload=await response.json();if(!response.ok)throw Error(payload.error||"Suche fehlgeschlagen");
 if(!payload.results?.length){list.append(element("p","Keine passenden Orte gefunden. Du kannst die Idee manuell eingeben."));msg("Keine Treffer.");return}
 for(const p of payload.results){const item=element("div");item.className="item";item.append(element("strong",p.name),element("p",p.address||p.locality||"Keine Adresse"));const b=element("button","Diesen Ort übernehmen");b.type="button";b.onclick=()=>{
 selectedPlace=p;$("name").value=p.name||"";$("locality").value=p.locality||"";$("website").value=p.website||"";
 $("selectedData").hidden=false;$("dataSummary").textContent=[p.address,p.phone,p.email,p.website,p.latitude!=null&&p.longitude!=null?"GPS: "+p.latitude+", "+p.longitude:""].filter(Boolean).join(" · ")||"Keine ergänzenden Daten verfügbar";
 msg("Ort übernommen. Bitte prüfen und den Vorschlag einreichen.");$("proposal").scrollIntoView({block:"start",behavior:"smooth"})};
 item.append(b);list.append(item)}
 msg(payload.results.length+" Treffer gefunden. Bitte den richtigen auswählen.");
 }catch(error){msg("Ortsrecherche fehlgeschlagen: "+error.message)}finally{button.disabled=false}
};
$("proposal").onsubmit=async e=>{e.preventDefault();if(!user||profile?.account_status!=="active")return;const row={proposed_name:$("name").value.trim(),proposed_locality:$("locality").value.trim(),proposed_category:$("category").value,proposed_url:$("website").value.trim(),proposed_note:$("note").value.trim(),submitted_by:user.id,status:"pending",proposed_address:selectedPlace?.address||null,proposed_phone:selectedPlace?.phone||null,proposed_email:selectedPlace?.email||null,proposed_website:selectedPlace?.website||null,proposed_latitude:selectedPlace?.latitude??null,proposed_longitude:selectedPlace?.longitude??null,proposed_source:selectedPlace?.source||null};if(!row.proposed_name||!row.proposed_locality)return msg("Name und Ort fehlen.");const {error}=await db.from("suggestions").insert(row);if(error)return msg("Einreichen fehlgeschlagen: "+error.message);selectedPlace=null;$("selectedData").hidden=true;$("searchResults").replaceChildren();$("proposal").reset();msg("Vorschlag eingereicht. Er wartet auf Administratorprüfung.");await listMine();if(profile.is_admin)await listAdmin()};
async function listMine(){const {data,error}=await db.from("suggestions").select("id,proposed_name,proposed_locality,status,submitted_at,review_note").eq("submitted_by",user.id).order("submitted_at",{ascending:false}).limit(50);const list=$("mineList");list.replaceChildren();if(error){line(list,"Fehler",error.message);return}if(!data?.length){list.append(element("p","Noch keine Vorschläge eingereicht."));return}for(const r of data){const article=element("div");article.className="item";article.append(element("strong",r.proposed_name+" · "+r.proposed_locality),element("p","Status: "+({pending:"Zur Prüfung",approved:"Freigegeben",rejected:"Abgelehnt"}[r.status]||r.status)));if(r.review_note)line(article,"Rückmeldung",r.review_note);list.append(article)}}
function field(form,label,value,name,type="text"){const l=element("label",label);const input=element(type==="textarea"?"textarea":"input");if(type!=="textarea")input.type=type;input.name=name;input.value=esc(value);input.maxLength=type==="textarea"?1500:300;l.append(input);form.append(l);return input}
async function listAdmin(){const box=$("adminList");box.replaceChildren();const {data,error}=await db.from("suggestions").select("*").eq("status","pending").order("submitted_at",{ascending:true}).limit(100);if(error){line(box,"Fehler",error.message);return}if(!data?.length){box.append(element("p","Keine offenen Vorschläge."));return}for(const r of data){const form=element("form");form.className="panel";const title=element("h3",r.proposed_name+" · "+r.proposed_locality);form.append(title);
 const fields={edited_name:field(form,"Name",r.edited_name??r.proposed_name,"edited_name"),edited_locality:field(form,"Ort",r.edited_locality??r.proposed_locality,"edited_locality"),edited_category:field(form,"Kategorie",r.edited_category??r.proposed_category,"edited_category"),edited_address:field(form,"Adresse",r.edited_address??r.proposed_address,"edited_address"),edited_phone:field(form,"Telefon",r.edited_phone??r.proposed_phone,"edited_phone"),edited_email:field(form,"E-Mail",r.edited_email??r.proposed_email,"edited_email"),edited_website:field(form,"Website",r.edited_website??r.proposed_website??r.proposed_url,"edited_website"),edited_notes:field(form,"Notiz",r.edited_notes??r.proposed_note,"edited_notes","textarea"),edited_latitude:field(form,"Breitengrad",r.edited_latitude??r.proposed_latitude,"edited_latitude"),edited_longitude:field(form,"Längengrad",r.edited_longitude??r.proposed_longitude,"edited_longitude"),review_note:field(form,"Rückmeldung",r.review_note,"review_note","textarea")};
 const save=element("button","Änderungen speichern"),approve=element("button","Prüfen und freigeben"),reject=element("button","Ablehnen");approve.type=reject.type=save.type="button";reject.className="secondary";form.append(save,approve,reject);
 async function saveDraft(){const edits={};for(const [k,input] of Object.entries(fields)){let value=input.value.trim();if(k==="edited_latitude"||k==="edited_longitude"){if(value!==""&&!Number.isFinite(Number(value)))throw Error("Ungültige Koordinate");edits[k]=value===""?null:Number(value)}else edits[k]=value||null}const {error}=await db.from("suggestions").update(edits).eq("id",r.id).eq("status","pending");if(error)throw Error(error.message)}
 save.onclick=async()=>{try{await saveDraft();msg("Änderungen gespeichert.")}catch(e){msg("Speichern fehlgeschlagen: "+e.message)}};
 approve.onclick=async()=>{if(!confirm("Diesen Vorschlag einmalig öffentlich freigeben?"))return;approve.disabled=true;try{await saveDraft();const {error}=await db.rpc("review_place_suggestion",{p_suggestion_id:r.id,p_approve:true});if(error)throw Error(error.message);msg("Vorschlag freigegeben.");await listAdmin();await listMine()}catch(e){msg("Freigabe fehlgeschlagen: "+e.message);approve.disabled=false}};
 reject.onclick=async()=>{if(!confirm("Vorschlag ablehnen?"))return;reject.disabled=true;try{await saveDraft();const {error}=await db.rpc("review_place_suggestion",{p_suggestion_id:r.id,p_approve:false});if(error)throw Error(error.message);msg("Vorschlag abgelehnt.");await listAdmin();await listMine()}catch(e){msg("Ablehnung fehlgeschlagen: "+e.message);reject.disabled=false}};
 box.append(form)}}
refresh().catch(e=>msg(e.message));