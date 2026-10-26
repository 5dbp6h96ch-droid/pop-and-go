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
 if(active&&profile?.is_admin){await listAdmin();await listMembers()}
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
 selectedPlace=p;$("siteFields").hidden=false;$("foundAddress").value=p.address||"";$("foundPhone").value=p.phone||"";$("foundEmail").value=p.email||"";$("name").value=p.name||"";$("locality").value=p.locality||"";$("website").value=p.website||"";
 $("selectedData").hidden=false;$("dataSummary").textContent=[p.address,p.phone,p.email,p.website,p.latitude!=null&&p.longitude!=null?"GPS: "+p.latitude+", "+p.longitude:""].filter(Boolean).join(" · ")||"Keine ergänzenden Daten verfügbar";
 msg("Ort übernommen. Bitte prüfen und den Vorschlag einreichen.");$("proposal").scrollIntoView({block:"start",behavior:"smooth"})};
 item.append(b);list.append(item)}
 msg(payload.results.length+" Treffer gefunden. Bitte den richtigen auswählen.");
 }catch(error){msg("Ortsrecherche fehlgeschlagen: "+error.message)}finally{button.disabled=false}
};
$("enrichSite").onclick=async()=>{
 const website=$("website").value.trim();if(!/^https:\/\//i.test(website)){msg("Bitte zuerst eine gültige HTTPS-Website eintragen.");return}
 const button=$("enrichSite");button.disabled=true;msg("Website wird nach Kontaktdaten geprüft …");
 try{
 const {data:{session}}=await db.auth.getSession();if(!session?.access_token)throw Error("Bitte erneut anmelden.");
 const response=await fetch("https://itaoljnqwoiifztjlfyc.supabase.co/functions/v1/popgo-site-enrich",{method:"POST",headers:{authorization:"Bearer "+session.access_token,apikey:"sb_publishable_9SXRrjZnf1-Od24sBr6QNA_9WUPofZV","content-type":"application/json"},body:JSON.stringify({url:website})});
 const output=await response.json();if(!response.ok)throw Error(output.error||"Website-Recherche fehlgeschlagen");
 const data=output.data||{};$("siteFields").hidden=false;
 if(data.address)$("foundAddress").value=data.address;
 if(data.phone)$("foundPhone").value=data.phone;
 if(data.email)$("foundEmail").value=data.email;
 if(!selectedPlace)selectedPlace={};
 selectedPlace={...selectedPlace,source:data.source||selectedPlace.source||null};
 msg([data.address?"Adresse":null,data.phone?"Telefon":null,data.email?"E-Mail":null].filter(Boolean).length?"Website ausgewertet. Gefundene Angaben sind eingetragen und können korrigiert werden.":"Website ausgewertet, aber keine strukturierten Kontaktdaten gefunden. Bitte manuell ergänzen.");
 }catch(error){msg("Website-Auswertung: "+error.message)}finally{button.disabled=false}
};
function interpretDictation(raw){
 const text=raw.replace(/\s+/g," ").trim();
 let rest=text.replace(/^(?:ich (?:möchte|würde gerne|will)\s+)?(?:das |den |die |ein |eine )?(?:restaurant|café|cafe|biergarten|ausflugsziel|aktivität|weinstube|gasthaus)\s*/i,"");
 rest=rest.replace(/^(?:ich (?:schlage|empfehle)\s+)?(?:das |den |die |ein |eine )?(?:restaurant|café|cafe|biergarten|ausflugsziel|aktivität|weinstube|gasthaus)\s*/i,"");
 const category=/\b(café|cafe|kaffeehaus)\b/i.test(text)?"Café":/\b(restaurant|essen|italiener|grieche|gasthaus|weinstube|biergarten)\b/i.test(text)?"Restaurant":/\b(wanderung|museum|klettern|aktivität|ausflug|besichtigung)\b/i.test(text)?"Aktivität":"Sonstiges";
 const match=rest.match(/\b(?:in|bei)\s+([A-ZÄÖÜ][\p{L}äöüß.-]*(?:\s+[A-ZÄÖÜ][\p{L}äöüß.-]*)?)(?=\s*(?:[.,;!?]|\s+(?:vor\b|mit\b|dort\b|weil\b|das\b|die\b|der\b|hat\b))|$)/u);
 const locality=match?.[1]||"";
 let name=(match?rest.slice(0,match.index):rest).replace(/\b(?:vorschlagen|empfehlen|vor|besuchen)\b.*$/i,"").replace(/^(?:namens|heißt|das|den|die|ein|eine)\s+/i,"").replace(/[.,;!?\s]+$/,"").trim();
 name=name.replace(/^(?:ich\s+)?(?:schlage|empfehle)\s+(?:das|den|die)?\s*/i,"").trim();
 if(/^(ich|wir|man|es)\b/i.test(name))name="";
 return {name:name.slice(0,120),locality,category};
}
$("parseDictation").onclick=()=>{
 const raw=$("dictation").value.trim();if(!raw){msg("Bitte zuerst einen Vorschlag diktieren oder eingeben.");return}
 const parsed=interpretDictation(raw);
 if(parsed.name&&!$("name").value.trim())$("name").value=parsed.name;
 if(parsed.locality&&!$("locality").value.trim())$("locality").value=parsed.locality;
 if(parsed.category!=="Sonstiges")$("category").value=parsed.category;
 if(!$("note").value.trim())$("note").value=raw.slice(0,1000);
 msg("Angaben soweit erkannt. Bitte Name und Ort prüfen oder ergänzen. Der vollständige diktierte Text bleibt als Notiz erhalten.");
};
$("proposal").onsubmit=async e=>{e.preventDefault();if(!user||profile?.account_status!=="active")return;const row={proposed_name:$("name").value.trim(),proposed_locality:$("locality").value.trim()||"Noch offen",proposed_category:$("category").value,proposed_url:$("website").value.trim(),proposed_note:$("note").value.trim(),submitted_by:user.id,status:"pending",proposed_address:$("foundAddress").value.trim()||selectedPlace?.address||null,proposed_phone:$("foundPhone").value.trim()||selectedPlace?.phone||null,proposed_email:$("foundEmail").value.trim()||selectedPlace?.email||null,proposed_website:selectedPlace?.website||null,proposed_latitude:selectedPlace?.latitude??null,proposed_longitude:selectedPlace?.longitude??null,proposed_source:selectedPlace?.source||null};if(!row.proposed_name)return msg("Bitte mindestens einen Namen eingeben oder aus dem diktierten Text übernehmen.");const {error}=await db.from("suggestions").insert(row);if(error)return msg("Einreichen fehlgeschlagen: "+error.message);selectedPlace=null;$("selectedData").hidden=true;$("siteFields").hidden=true;$("searchResults").replaceChildren();$("proposal").reset();msg("Vorschlag eingereicht. Er wartet auf Administratorprüfung.");await listMine();if(profile.is_admin)await listAdmin()};
async function listMine(){const {data,error}=await db.from("suggestions").select("id,proposed_name,proposed_locality,status,submitted_at,review_note").eq("submitted_by",user.id).order("submitted_at",{ascending:false}).limit(50);const list=$("mineList");list.replaceChildren();if(error){line(list,"Fehler",error.message);return}if(!data?.length){list.append(element("p","Noch keine Vorschläge eingereicht."));return}for(const r of data){const article=element("div");article.className="item";article.append(element("strong",r.proposed_name+" · "+r.proposed_locality),element("p","Status: "+({pending:"Zur Prüfung",approved:"Freigegeben",rejected:"Abgelehnt"}[r.status]||r.status)));if(r.review_note)line(article,"Rückmeldung",r.review_note);list.append(article)}}
function field(form,label,value,name,type="text"){const l=element("label",label);const input=element(type==="textarea"?"textarea":"input");if(type!=="textarea")input.type=type;input.name=name;input.value=esc(value);input.maxLength=type==="textarea"?1500:300;l.append(input);form.append(l);return input}
async function adminApi(path,body){const {data:{session}}=await db.auth.getSession();if(!session?.access_token)throw Error("Bitte neu anmelden");const response=await fetch("https://itaoljnqwoiifztjlfyc.supabase.co/functions/v1/popgo-admin/"+path,{method:body?"POST":"GET",headers:{"authorization":"Bearer "+session.access_token,"apikey":"sb_publishable_9SXRrjZnf1-Od24sBr6QNA_9WUPofZV","content-type":"application/json"},body:body?JSON.stringify(body):undefined});const json=await response.json();if(!response.ok)throw Error(json.error||"Administrationsanfrage fehlgeschlagen");return json}
async function listAdmin(){const box=$("adminList");box.replaceChildren();const {data,error}=await db.from("suggestions").select("*").eq("status","pending").order("submitted_at",{ascending:true}).limit(100);if(error){line(box,"Fehler",error.message);return}if(!data?.length){box.append(element("p","Keine offenen Vorschläge."));return}for(const r of data){const form=element("form");form.className="panel";const title=element("h3",r.proposed_name+" · "+r.proposed_locality);form.append(title);
 const fields={edited_name:field(form,"Name",r.edited_name??r.proposed_name,"edited_name"),edited_locality:field(form,"Ort",r.edited_locality??r.proposed_locality,"edited_locality"),edited_category:field(form,"Kategorie",r.edited_category??r.proposed_category,"edited_category"),edited_address:field(form,"Adresse",r.edited_address??r.proposed_address,"edited_address"),edited_phone:field(form,"Telefon",r.edited_phone??r.proposed_phone,"edited_phone"),edited_email:field(form,"E-Mail",r.edited_email??r.proposed_email,"edited_email"),edited_website:field(form,"Website",r.edited_website??r.proposed_website??r.proposed_url,"edited_website"),edited_notes:field(form,"Notiz",r.edited_notes??r.proposed_note,"edited_notes","textarea"),edited_latitude:field(form,"Breitengrad",r.edited_latitude??r.proposed_latitude,"edited_latitude"),edited_longitude:field(form,"Längengrad",r.edited_longitude??r.proposed_longitude,"edited_longitude"),review_note:field(form,"Rückmeldung",r.review_note,"review_note","textarea")};
 const scanButton=element("button","Website auswerten");scanButton.type="button";scanButton.className="secondary";
 const scanBox=element("div");scanBox.className="panel";scanBox.hidden=true;
 form.append(scanButton,scanBox);
 let scanData=null;
 scanButton.onclick=async()=>{
   const url=fields.edited_website.value.trim();
   if(!/^https:\/\//i.test(url)){msg("Bitte zuerst eine HTTPS-Website eintragen.");return}
   scanButton.disabled=true;scanBox.hidden=false;scanBox.replaceChildren(element("p","Website wird ausgewertet …"));scanData=null;
   try{
     const {data:{session}}=await db.auth.getSession();if(!session?.access_token)throw Error("Bitte neu anmelden.");
     const response=await fetch("https://itaoljnqwoiifztjlfyc.supabase.co/functions/v1/popgo-site-enrich",{method:"POST",headers:{authorization:"Bearer "+session.access_token,apikey:"sb_publishable_9SXRrjZnf1-Od24sBr6QNA_9WUPofZV","content-type":"application/json"},body:JSON.stringify({url})});
     const body=await response.json();if(!response.ok)throw Error(body.error||"Auswertung fehlgeschlagen");
     scanData=body.data||{};scanBox.replaceChildren(element("h4","Gefundene Angaben"));
     const matching=[["edited_name","Name","name"],["edited_address","Adresse","address"],["edited_phone","Telefon","phone"],["edited_email","E-Mail","email"]];
     let found=0;
     for(const [,label,key] of matching){if(scanData[key]){line(scanBox,label,scanData[key]);found++}}
     const checked=Array.isArray(body.pages_checked)?body.pages_checked:[];if(checked.length){const sources=element("div");sources.append(element("small","Geprüfte Seiten:"));for(const u of checked){const p=element("p");const link=element("a",u);link.href=u;link.target="_blank";link.rel="noopener noreferrer";p.append(link);sources.append(p)}scanBox.append(sources)}
     if(!found){scanBox.append(element("p","Keine zusätzlichen Kontaktdaten ermittelt."));return}
     const apply=element("button","Gefundene Daten übernehmen");apply.type="button";
     apply.onclick=()=>{
       let used=0;
       for(const [fieldName,,key] of matching){if(scanData[key]&&!fields[fieldName].value.trim()){fields[fieldName].value=scanData[key];used++}}
       msg(used+" bisher leere Felder ergänzt. Bitte prüfen und anschließend speichern.");
       apply.disabled=true;
     };
     scanBox.append(element("small","Bereits ausgefüllte Felder werden nicht überschrieben. Ergebnisse vor dem Speichern prüfen."),apply);
   }catch(error){scanBox.replaceChildren(element("p","Website-Auswertung fehlgeschlagen: "+error.message))}
   finally{scanButton.disabled=false}
 };
 const mapButton=element("button","Standort suchen / auf Karte auswählen");mapButton.type="button";mapButton.className="secondary";
 const mapControls=element("div");mapControls.className="panel";mapControls.hidden=true;
 const searchLabel=element("label","Restaurant oder Adresse suchen");
 const mapQuery=element("input");mapQuery.type="search";mapQuery.maxLength=100;mapQuery.value=[fields.edited_name.value,fields.edited_locality.value].filter(Boolean).join(", ");searchLabel.append(mapQuery);mapControls.append(searchLabel);
 const searchButton=element("button","Suchtreffer anzeigen");searchButton.type="button";mapControls.append(searchButton);
 const external=element("div");external.style.cssText="display:flex;gap:8px;flex-wrap:wrap";
 for(const [label,root] of [["Google Maps","https://www.google.com/maps/search/?api=1&query="],["Apple Maps","https://maps.apple.com/?q="]]){
   const link=element("a",label+" ↗");link.target="_blank";link.rel="noopener noreferrer";link.style.cssText="display:inline-block;padding:10px;border:1px solid #d7d1da;border-radius:9px";
   link.href=root+encodeURIComponent(mapQuery.value);
   mapQuery.addEventListener("input",()=>link.href=root+encodeURIComponent(mapQuery.value.trim()));
   external.append(link);
 }
 mapControls.append(external);
 const results=element("div");results.setAttribute("aria-live","polite");mapControls.append(results);
 const help=element("small","Treffer aus der vorhandenen Ortssuche auswählen oder auf die Karte tippen. Externe Maps-Apps übergeben ihren Pin nicht automatisch zurück.");mapControls.append(help);
 const mapBox=element("div");mapBox.className="admin-map";mapBox.style.cssText="height:320px;width:100%;max-width:100%;border-radius:12px;margin:12px 0 16px;display:none;position:relative;overflow:hidden";
 mapControls.append(mapBox);form.append(mapButton,mapControls);
 let map=null,marker=null;
 function placeMarker(lat,lon){
   const a=Number(lat),b=Number(lon);
   if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a)>90||Math.abs(b)>180)return;
   fields.edited_latitude.value=a.toFixed(6);fields.edited_longitude.value=b.toFixed(6);
   if(!map)return;
   if(marker)marker.setLatLng([a,b]);else marker=L.marker([a,b]).addTo(map);
   map.setView([a,b],16);setTimeout(()=>map.invalidateSize(),60);
   msg("Position übernommen. Bitte speichern oder freigeben.");
 }
 function openMap(){
   if(!window.L){msg("Die Karte konnte nicht geladen werden.");return}
   mapBox.style.display="block";
   if(map){setTimeout(()=>map.invalidateSize(),50);return}
   const lat=Number(fields.edited_latitude.value),lon=Number(fields.edited_longitude.value);
   const valid=fields.edited_latitude.value.trim()!==""&&fields.edited_longitude.value.trim()!==""&&Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180;
   map=L.map(mapBox).setView(valid?[lat,lon]:[49.42,8.60],valid?15:9);
   L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap-Mitwirkende"}).addTo(map);
   if(valid)marker=L.marker([lat,lon]).addTo(map);
   map.on("click",event=>placeMarker(event.latlng.lat,event.latlng.lng));
   setTimeout(()=>map.invalidateSize(),50);
 }
 mapButton.onclick=()=>{
   mapControls.hidden=!mapControls.hidden;
   mapButton.textContent=mapControls.hidden?"Standort suchen / auf Karte auswählen":"Standortsuche schließen";
   if(!mapControls.hidden)openMap();
 };
 searchButton.onclick=async()=>{
   const term=mapQuery.value.trim();if(term.length<3){msg("Bitte mindestens drei Zeichen eingeben.");return}
   searchButton.disabled=true;results.replaceChildren();results.append(element("p","Suche läuft …"));
   try{
     const {data:{session}}=await db.auth.getSession();if(!session?.access_token)throw Error("Bitte neu anmelden");
     const url="https://itaoljnqwoiifztjlfyc.supabase.co/functions/v1/popgo-place-search?q="+encodeURIComponent(term);
     const response=await fetch(url,{headers:{authorization:"Bearer "+session.access_token,apikey:"sb_publishable_9SXRrjZnf1-Od24sBr6QNA_9WUPofZV"}});
     const payload=await response.json();if(!response.ok)throw Error(payload.error||"Suche fehlgeschlagen");
     results.replaceChildren();
     if(!payload.results?.length){results.append(element("p","Keine Treffer. Setze den Punkt manuell auf der Karte."));return}
     for(const p of payload.results){
       const row=element("div");row.className="item";row.append(element("strong",p.name),element("p",p.address||p.locality||""));
       const choose=element("button","Diesen Standort übernehmen");choose.type="button";
       const hasGPS=p.latitude!=null&&p.longitude!=null&&Number.isFinite(Number(p.latitude))&&Number.isFinite(Number(p.longitude));
       choose.disabled=!hasGPS;
       if(hasGPS)choose.onclick=()=>{openMap();placeMarker(p.latitude,p.longitude)};
       else row.append(element("small","Keine Koordinaten vorhanden – Punkt auf Karte setzen."));
       row.append(choose);results.append(row);
     }
   }catch(e){results.replaceChildren();results.append(element("p","Suche nicht verfügbar: "+e.message+". Karte kann manuell genutzt werden."))}
   finally{searchButton.disabled=false}
 };
 const addressButton=element("button","Koordinaten aus Adresse ermitteln");addressButton.type="button";addressButton.className="secondary";
 const addressResults=element("div");addressResults.setAttribute("aria-live","polite");form.append(addressButton,addressResults);
 addressButton.onclick=async()=>{
  const address=fields.edited_address.value.trim();
  if(address.length<5){msg("Bitte zuerst eine vollständige Adresse eingeben.");return}
  addressButton.disabled=true;addressResults.replaceChildren(element("p","Suche nach der Adresse …"));
  try{
   const {data:{session}}=await db.auth.getSession();if(!session?.access_token)throw Error("Bitte neu anmelden.");
   const query=[address,fields.edited_locality.value.trim()].filter(Boolean).join(", ");
   const response=await fetch("https://itaoljnqwoiifztjlfyc.supabase.co/functions/v1/popgo-place-search?q="+encodeURIComponent(query),{headers:{authorization:"Bearer "+session.access_token,apikey:"sb_publishable_9SXRrjZnf1-Od24sBr6QNA_9WUPofZV"}});
   const payload=await response.json();if(!response.ok)throw Error(payload.error||"Adresssuche fehlgeschlagen");
   addressResults.replaceChildren();
   const items=(payload.results||[]).filter(p=>p.latitude!=null&&p.longitude!=null);
   if(!items.length){addressResults.append(element("p","Kein eindeutiger Adresstreffer. Bitte Standort manuell auf Karte wählen."));return}
   addressResults.append(element("small","Bitte den passenden Standort prüfen und ausdrücklich übernehmen."));
   for(const p of items){
    const row=element("div");row.className="item";
    row.append(element("strong",p.address||p.name||"Adressvorschlag"));
    const preview=element("button","Auf Karte prüfen");preview.type="button";preview.className="secondary";
    const confirm=element("button","Diese Koordinaten übernehmen");confirm.type="button";
    preview.onclick=()=>{mapControls.hidden=false;mapButton.textContent="Standortsuche schließen";openMap();if(map){map.setView([Number(p.latitude),Number(p.longitude)],17);if(marker)marker.setLatLng([Number(p.latitude),Number(p.longitude)]);else marker=L.marker([Number(p.latitude),Number(p.longitude)]).addTo(map)}};
    confirm.onclick=()=>{mapControls.hidden=false;mapButton.textContent="Standortsuche schließen";openMap();placeMarker(p.latitude,p.longitude);msg("Koordinaten in die Felder übernommen. Zum dauerhaften Speichern bitte Änderungen speichern.")};
    row.append(preview,confirm);addressResults.append(row);
   }
  }catch(error){addressResults.replaceChildren(element("p","Adresssuche fehlgeschlagen: "+error.message))}
  finally{addressButton.disabled=false}
 };
 const save=element("button","Änderungen speichern"),approve=element("button","Prüfen und freigeben"),reject=element("button","Ablehnen");
 approve.type=reject.type=save.type="button";reject.className="secondary";form.append(save,approve,reject);
 const feedback=element("p");feedback.setAttribute("role","status");feedback.setAttribute("aria-live","polite");form.append(feedback);
 const say=t=>{feedback.textContent=t;msg(t)};
 async function saveDraft(){
  const edits={};
  for(const [k,input] of Object.entries(fields)){
    let value=input.value.trim();
    if(k==="edited_latitude"||k==="edited_longitude"){
      if(value!==""&&!Number.isFinite(Number(value)))throw Error("Ungültige Koordinate");
      edits[k]=value===""?null:Number(value)
    }else edits[k]=value||null;
  }
  const {data,error}=await db.from("suggestions").update(edits).eq("id",r.id).eq("status","pending").select("id");
  if(error)throw Error(error.message);
  if(!data?.length)throw Error("Keine Änderung gespeichert. Bitte den Vorschlagsstatus prüfen.");
 }
 save.onclick=async()=>{save.disabled=true;try{await saveDraft();say("Änderungen gespeichert.")}catch(e){say("Speichern fehlgeschlagen: "+e.message)}finally{save.disabled=false}};
 let armed=false;
 approve.onclick=async()=>{
  if(!armed){armed=true;approve.textContent="Freigabe jetzt bestätigen";say("Bitte die Freigabe mit einem zweiten Tippen bestätigen.");return}
  approve.disabled=true;approve.textContent="Freigabe läuft …";say("Freigabe wird verarbeitet …");
  try{
    await saveDraft();
    const result=await adminApi("review",{id:r.id,approve:true});
    if(!result.success)throw Error("Server hat die Freigabe nicht bestätigt.");
    say("Vorschlag erfolgreich freigegeben.");await listAdmin();await listMine()
  }catch(e){const reason=String(e.message||e);say(/bereits|duplicate|existiert|doppelt|already/i.test(reason)?"Dieser Ort ist bereits vorhanden. Bitte den bestehenden Eintrag prüfen oder den Vorschlag ablehnen. ("+reason+")":"Freigabe fehlgeschlagen: "+reason);approve.disabled=false;approve.textContent="Prüfen und freigeben";armed=false}
 };
 let rejectArmed=false;
 reject.onclick=async()=>{
  if(!rejectArmed){rejectArmed=true;reject.textContent="Ablehnung bestätigen";say("Bitte durch erneutes Tippen bestätigen.");return}
  reject.disabled=true;say("Ablehnung wird verarbeitet …");
  try{await saveDraft();await adminApi("review",{id:r.id,approve:false});say("Vorschlag abgelehnt.");await listAdmin();await listMine()}
  catch(e){say("Ablehnung fehlgeschlagen: "+e.message);reject.disabled=false;rejectArmed=false;reject.textContent="Ablehnen"}
 };
 box.append(form)}}
async function listMembers(){const box=$("membersList");if(!box)return;box.replaceChildren();try{const {members}=await adminApi("members");const activeRequests=members.filter(m=>m.account_status==="pending");if(!activeRequests.length){box.append(element("p","Keine offenen Registrierungsanträge."));return}for(const m of activeRequests){const row=element("div");row.className="item";row.append(element("strong",m.email||m.user_id));const accept=element("button","Konto freigeben"),deny=element("button","Ablehnen");deny.className="secondary";accept.type=deny.type="button";accept.onclick=async()=>{if(!confirm("Dieses Mitglied freigeben?"))return;try{await adminApi("member",{id:m.user_id,status:"active"});msg("Mitglied freigegeben.");await listMembers()}catch(e){msg(e.message)}};deny.onclick=async()=>{if(!confirm("Diesen Registrierungsantrag ablehnen?"))return;try{await adminApi("member",{id:m.user_id,status:"rejected"});msg("Registrierungsantrag abgelehnt.");await listMembers()}catch(e){msg(e.message)}};row.append(accept,deny);box.append(row)}}catch(e){msg("Mitglieder konnten nicht geladen werden: "+e.message)}}
refresh().catch(e=>msg(e.message));