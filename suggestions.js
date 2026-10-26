"use strict";
const $=id=>document.getElementById(id);
const db=window.supabase.createClient("https://itaoljnqwoiifztjlfyc.supabase.co","sb_publishable_9SXRrjZnf1-Od24sBr6QNA_9WUPofZV",{auth:{persistSession:true,autoRefreshToken:true}});
let user=null,profile=null,selectedPlace=null;
const adminMode=new URLSearchParams(location.search).get("mode")==="admin";
const msg=t=>$("msg").textContent=t;
const esc=s=>String(s??"");
function element(tag,label){const e=document.createElement(tag);if(label!==undefined)e.textContent=label;return e}
function line(container,label,val){const p=element("p",label+": "+esc(val));container.append(p)}
function showTab(tab){
 const active=profile?.account_status==="active",admin=active&&profile?.is_admin;
 const allowed=adminMode?(admin?(["admin","design","mine","places","categories"].includes(tab)?tab:"admin"):"none"):"proposal";
 $("proposal").hidden=!active||allowed!=="proposal";
 $("mine").hidden=!adminMode||!active||allowed!=="mine";
 $("admin").hidden=!adminMode||!admin||allowed!=="admin";$("design").hidden=!adminMode||!admin||allowed!=="design";$("placesAdmin").hidden=!adminMode||!admin||allowed!=="places";$("categoryAdmin").hidden=!adminMode||!admin||allowed!=="categories";
 for(const [name,id] of [["proposal","tabProposal"],["mine","tabMine"],["admin","tabAdmin"],["design","tabDesign"],["places","tabPlaces"],["categories","tabCategories"]]){$(id).setAttribute("aria-selected",String(allowed===name))}
}
for(const [tab,id] of [["proposal","tabProposal"],["mine","tabMine"],["admin","tabAdmin"],["design","tabDesign"],["places","tabPlaces"],["categories","tabCategories"]])$(id).onclick=()=>{showTab(tab);if(tab==="design")openDesignStudio();if(tab==="categories"){loadPlacesAdmin().then(()=>$("categoryAdmin").scrollIntoView({block:"start"})).catch(e=>$("categoryAdminStatus").textContent=e.message)}if(tab==="places"){ $("placesSummary").textContent="Eintragsverwaltung wird geöffnet …";loadPlacesAdmin().catch(e=>$("placesSummary").textContent="Fehler: "+e.message) }};
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
 $("tabNav").hidden=!adminMode||!active;$("tabProposal").hidden=adminMode;$("tabMine").hidden=!adminMode;$("tabAdmin").hidden=!(adminMode&&active&&profile?.is_admin);$("tabDesign").hidden=!(adminMode&&active&&profile?.is_admin);$("tabPlaces").hidden=!(adminMode&&active&&profile?.is_admin);$("tabCategories").hidden=!(adminMode&&active&&profile?.is_admin);showTab(adminMode?(new URLSearchParams(location.search).get("tab")==="categories"?"categories":new URLSearchParams(location.search).get("tab")==="places"?"places":"admin"):"proposal");if(adminMode&&profile?.is_admin&&new URLSearchParams(location.search).get("tab")==="places")loadPlacesAdmin().catch(e=>$("placesSummary").textContent=e.message);if(adminMode&&profile?.is_admin&&new URLSearchParams(location.search).get("tab")==="categories")loadPlacesAdmin().catch(e=>$("categoryAdminStatus").textContent=e.message);
 if(!active)msg("Konto noch nicht freigegeben. Anträge sind erst nach Administratorfreigabe möglich.");
 else msg(adminMode&&!profile?.is_admin?"Dieser Verwaltungsbereich ist ausschließlich für Administratoren zugänglich.":"Angemeldet als "+u.email);
 if(adminMode)await listMine();
 if(adminMode&&active&&profile?.is_admin){await listAdmin();await listMembers()}
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
 if(!payload.results?.length){list.append(element("p","Keine passenden Orte gefunden. Du kannst die Idee manuell eingeben."));msg("Keine Treffer.");$("searchStatus").textContent="Kein Treffer. Angaben bitte manuell prüfen.";showProposalPreview("Ohne Suchtreffer");return}
 for(const p of payload.results){const item=element("div");item.className="item";item.append(element("strong",p.name),element("p",p.address||p.locality||"Keine Adresse"));const b=element("button","Diesen Ort übernehmen");b.type="button";b.onclick=()=>{
 selectedPlace=p;$("siteFields").hidden=false;$("foundAddress").value=p.address||"";$("foundPhone").value=p.phone||"";$("foundEmail").value=p.email||"";$("name").value=p.name||"";$("locality").value=p.locality||"";$("website").value=p.website||"";
 $("selectedData").hidden=false;$("dataSummary").textContent=[p.address,p.phone,p.email,p.website,p.latitude!=null&&p.longitude!=null?"GPS: "+p.latitude+", "+p.longitude:""].filter(Boolean).join(" · ")||"Keine ergänzenden Daten verfügbar";
 showProposalPreview("Treffer übernommen");$("proposalPreview").scrollIntoView({block:"center",behavior:"smooth"})};
 item.append(b);list.append(item)}
 msg(payload.results.length+" Treffer gefunden. Bitte den richtigen auswählen.");$("searchStatus").textContent=payload.results.length+" mögliche Treffer – passenden Ort antippen.";
 }catch(error){msg("Ortsrecherche fehlgeschlagen: "+error.message);$("searchStatus").textContent="Suche derzeit nicht verfügbar. Du kannst den Vorschlag trotzdem einreichen.";showProposalPreview("Ohne Suchtreffer")}finally{button.disabled=false}
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
function showProposalPreview(prefix){$("proposalPreview").hidden=false;$("previewText").textContent=prefix+": "+[$("name").value.trim(),$("locality").value.trim(),$("category").value,$("foundAddress").value.trim(),$("website").value.trim()].filter(Boolean).join(" · ");}
$("parseDictation").onclick=()=>{
 const raw=$("dictation").value.trim();if(!raw){msg("Bitte zuerst einen Vorschlag diktieren oder eingeben.");return}
 const parsed=interpretDictation(raw);
 if(parsed.name&&!$("name").value.trim())$("name").value=parsed.name;
 if(parsed.locality&&!$("locality").value.trim())$("locality").value=parsed.locality;
 if(parsed.category!=="Sonstiges")$("category").value=parsed.category;
 if(!$("note").value.trim())$("note").value=raw.slice(0,1000);
 const query=[parsed.name||$("name").value.trim(),parsed.locality||$("locality").value.trim()].filter(Boolean).join(" ").trim();
 if(query.length>=3){
  $("searchPlace").value=query.slice(0,100);
  
  msg("Angaben erkannt. Die Ortssuche wird gestartet. Bitte einen passenden Treffer auswählen oder die Felder manuell prüfen.");
  showProposalPreview("Erkannte Angaben – Treffer noch nicht bestätigt");$("doSearch").click();
 }else{
  $("manualDetails").open=true;showProposalPreview("Manuelle Angaben");msg("Bitte Name und Ort ergänzen.");
 }
};
$("proposal").onsubmit=async e=>{e.preventDefault();if(!user||profile?.account_status!=="active")return;const row={proposed_name:$("name").value.trim(),proposed_locality:$("locality").value.trim()||"Noch offen",proposed_category:$("category").value,proposed_url:$("website").value.trim(),proposed_note:$("note").value.trim(),submitted_by:user.id,status:"pending",proposed_address:$("foundAddress").value.trim()||selectedPlace?.address||null,proposed_phone:$("foundPhone").value.trim()||selectedPlace?.phone||null,proposed_email:$("foundEmail").value.trim()||selectedPlace?.email||null,proposed_website:selectedPlace?.website||null,proposed_latitude:selectedPlace?.latitude??null,proposed_longitude:selectedPlace?.longitude??null,proposed_source:selectedPlace?.source||null};if(!row.proposed_name){$("manualDetails").open=true;$("name").focus();$("proposalStatus").textContent="Bitte den Namen des Orts ergänzen.";return msg($("proposalStatus").textContent)}const {error}=await db.from("suggestions").insert(row);if(error){const feedback=$("proposalStatus");feedback.textContent="Einreichen fehlgeschlagen: "+error.message;feedback.scrollIntoView({block:"center"});return msg(feedback.textContent)}selectedPlace=null;$("selectedData").hidden=true;$("siteFields").hidden=true;$("searchResults").replaceChildren();$("proposal").reset();$("proposalPreview").hidden=true;$("searchStatus").textContent="";$("proposalStatus").textContent="Eingereicht – wartet auf Prüfung.";msg($("proposalStatus").textContent);if(adminMode){await listMine();if(profile.is_admin)await listAdmin()}};
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
       const websiteButton=element("button","Offizielle Website ermitteln");websiteButton.type="button";websiteButton.className="secondary";
       const websiteFeedback=element("p");row.append(websiteButton,websiteFeedback);
       websiteButton.onclick=async()=>{
         websiteButton.disabled=true;websiteFeedback.textContent="Website wird geprüft …";
         try{
           let address=p.website||"";
           if(!address){
             const {data:{session}}=await db.auth.getSession();
             if(!session?.access_token)throw Error("Bitte neu anmelden.");
             const response=await fetch("https://itaoljnqwoiifztjlfyc.supabase.co/functions/v1/popgo-website-lookup",{method:"POST",headers:{authorization:"Bearer "+session.access_token,apikey:"sb_publishable_9SXRrjZnf1-Od24sBr6QNA_9WUPofZV","content-type":"application/json"},body:JSON.stringify({osm_id:p.osm_id,osm_type:p.osm_type})});
             const payload=await response.json();if(!response.ok)throw Error(payload.error||"Website-Suche fehlgeschlagen");
             address=payload.website||"";
           }
           if(!address){websiteFeedback.textContent="Für diesen Treffer ist keine Website in den Ortsdaten hinterlegt.";return}
           const u=new URL(address);if(u.protocol!=="https:")throw Error("Nur HTTPS-Adressen werden übernommen.");
           websiteFeedback.replaceChildren(element("span","Gefundene Website: "),element("strong",address));
           const link=element("a"," Website prüfen ↗");link.href=address;link.target="_blank";link.rel="noopener noreferrer";websiteFeedback.append(link);
           const apply=element("button","Diese Website übernehmen");apply.type="button";apply.onclick=()=>{fields.edited_website.value=address;websiteFeedback.append(element("small"," Website-Feld ausgefüllt. Bitte speichern."));apply.disabled=true};row.append(apply);
         }catch(error){websiteFeedback.textContent="Website-Ermittlung: "+error.message}finally{websiteButton.disabled=false}
       };
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

const designDefaults={background:"#F2F1EE",surface:"#FFFFFF",primary:"#7135F4",accent:"#D9FF38",text:"#24163C",soft:"#F0EAFF",border:"#DDD8E4",nav:"#FFFFFF"};
const designLabels={background:"App-Hintergrund",surface:"Kacheln und Flächen",primary:"Hauptfarbe",accent:"Aktionsfarbe",text:"Textfarbe",soft:"Filterfarbe",border:"Rahmen",nav:"Navigation"};
let designDraft={...designDefaults},designHasPrevious=false,designArmed=false;
async function designApi(action,colors){
 const {data:{session}}=await db.auth.getSession();if(!session?.access_token)throw Error("Bitte neu anmelden");
 const response=await fetch("https://itaoljnqwoiifztjlfyc.supabase.co/functions/v1/popgo-design-studio",{method:"POST",headers:{authorization:"Bearer "+session.access_token,apikey:"sb_publishable_9SXRrjZnf1-Od24sBr6QNA_9WUPofZV","content-type":"application/json"},body:JSON.stringify({action,colors})});
 const result=await response.json();if(!response.ok)throw Error(result.error||"Designanfrage fehlgeschlagen");return result;
}
function renderDesignPreview(){
 const c=designDraft,box=$("designPreview");box.replaceChildren();
 const hero=element("div");hero.style.cssText="padding:17px;border-radius:16px;color:white;background:"+c.primary;
 hero.append(element("strong","raus & guggen"),element("p","Deine Ideen fürs nächste Erlebnis"));
 const actions=element("div");actions.style.cssText="padding:14px;margin:10px 0;border-radius:15px;background:"+c.background;
 const pill=element("div","Überrasch mich!");pill.style.cssText="padding:10px;border-radius:18px;font-weight:700;text-align:center;background:"+c.accent+";color:"+c.text;actions.append(pill);
 const card=element("div");card.style.cssText="padding:14px;border:1px solid "+c.border+";border-radius:15px;background:"+c.surface+";color:"+c.text;
 card.append(element("strong","Beispiel-Restaurant"),element("p","Heidelberg · Restaurant"));
 const nav=element("div","Start  ·  Entdecken  ·  Neu  ·  Favoriten  ·  Mehr");nav.style.cssText="padding:12px;border-radius:12px;text-align:center;background:"+c.nav+";color:"+c.text;
 box.append(hero,actions,card,nav);
}
function renderDesignFields(){
 const container=$("designColors");container.replaceChildren();
 for(const [key,label] of Object.entries(designLabels)){
  const row=element("div");row.style.cssText="display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:10px";
  const title=element("label",label);title.style.flex="1";
  const picker=element("input");picker.type="color";picker.value=designDraft[key];picker.style.cssText="width:56px;height:42px;padding:3px;margin:0";
  const hex=element("input");hex.type="text";hex.value=designDraft[key];hex.maxLength=7;hex.style.cssText="width:112px;margin:0";
  picker.oninput=()=>{designDraft[key]=picker.value.toUpperCase();hex.value=designDraft[key];renderDesignPreview()};
  hex.onchange=()=>{if(/^#[0-9a-f]{6}$/i.test(hex.value)){designDraft[key]=hex.value.toUpperCase();picker.value=hex.value;renderDesignPreview()}else hex.value=designDraft[key]};
  row.append(title,picker,hex);container.append(row);
 }
 renderDesignPreview();
}
async function openDesignStudio(){
 showTab("design");
 renderDesignFields();
 $("designMessage").textContent="Designstudio geöffnet. Gespeicherter Entwurf wird geladen …";
 try{
  const result=await designApi("get");
  designDraft={...designDefaults,...result.draft};
  designHasPrevious=!!result.has_previous;
  renderDesignFields();
  $("designMessage").textContent="Privater Entwurf geladen.";
 }catch(e){$("designMessage").textContent="Designstudio geöffnet, aber Entwurf konnte nicht geladen werden: "+e.message}
}
$("designSave").onclick=async()=>{try{await designApi("save",designDraft);designArmed=false;$("designMessage").textContent="Entwurf privat gespeichert. Öffentliches Design unverändert."}catch(e){$("designMessage").textContent=e.message}};
$("designPublish").onclick=async()=>{
 if(!designArmed){designArmed=true;$("designPublish").textContent="Veröffentlichung bestätigen";$("designMessage").textContent="Zuerst den Entwurf speichern. Dann erneut bestätigen.";return}
 try{await designApi("save",designDraft);await designApi("publish");designArmed=false;$("designPublish").textContent="Design veröffentlichen";designHasPrevious=true;$("designMessage").textContent="Design veröffentlicht. Nach Neuladen für alle sichtbar."}catch(e){$("designMessage").textContent=e.message}
};
$("designRestore").onclick=async()=>{if(!designHasPrevious){$("designMessage").textContent="Noch keine frühere Version vorhanden.";return}try{await designApi("restore");const result=await designApi("get");designDraft={...designDefaults,...result.draft};renderDesignFields();$("designMessage").textContent="Vorheriges Design wiederhergestellt."}catch(e){$("designMessage").textContent=e.message}};

async function loadAdminPublishedTheme(){
 try{const resp=await fetch("https://itaoljnqwoiifztjlfyc.supabase.co/rest/v1/published_design?select=published",{headers:{apikey:"sb_publishable_9SXRrjZnf1-Od24sBr6QNA_9WUPofZV"},cache:"no-store"});
 const data=await resp.json(),c=data?.[0]?.published;if(!c||!Object.values(c).every(x=>typeof x==="string"&&/^#[0-9a-f]{6}$/i.test(x)))return;
 const style=document.createElement("style");
 style.textContent=`body{background:${c.background};color:${c.text}}header{background:${c.primary}!important}form,.panel{background:${c.surface};border-color:${c.border}}button:not(.secondary){background:${c.primary}}button.secondary{background:${c.soft};color:${c.primary}}#proposal button[type=submit],#parseDictation{background:${c.accent}!important;color:${c.text}!important}`;
 document.head.append(style)
 }catch(e){console.warn("Design nicht geladen",e)}
}
loadAdminPublishedTheme();


let adminPlaces=[],adminCategories=[];
async function placesApi(action,data={}){
 const {data:{session}}=await db.auth.getSession();if(!session?.access_token)throw Error("Bitte neu anmelden");
 const response=await fetch("https://itaoljnqwoiifztjlfyc.supabase.co/functions/v1/popgo-places-admin",{method:"POST",headers:{authorization:"Bearer "+session.access_token,apikey:"sb_publishable_9SXRrjZnf1-Od24sBr6QNA_9WUPofZV","content-type":"application/json"},body:JSON.stringify({action,...data})});
 const result=await response.json();if(!response.ok)throw Error(result.error||"Verwaltung nicht verfügbar");return result;
}
function missingPlace(p){
 const missing=[];if(!p.address?.trim())missing.push("Adresse");
 if(p.latitude==null||p.longitude==null)missing.push("GPS");
 if(!p.website_url?.trim())missing.push("Website");
 return missing;
}
async function loadPlacesAdmin(){
 $("placesSummary").textContent="Einträge werden geladen …";
 try{const result=await placesApi("list");adminPlaces=result.places||[];adminCategories=result.categories||[];renderPlacesAdmin();renderCategoryAdmin();}
 catch(e){$("placesSummary").textContent="Laden fehlgeschlagen: "+e.message}
}
function renderPlacesAdmin(){
 const filter=$("placesFilter").value,q=$("placesSearch").value.trim().toLocaleLowerCase("de");
 const items=adminPlaces.filter(p=>(filter==="archived"?p.status==="archived":p.status==="published"&&(filter==="all"||filter==="categories"||filter==="address"&&!p.address?.trim()||filter==="incomplete"&&missingPlace(p).length>0))&&[p.name,p.locality,p.address].join(" ").toLocaleLowerCase("de").includes(q));
 $("placesSummary").textContent=items.length+" Einträge · "+adminPlaces.filter(p=>p.status==="published"&&!p.address?.trim()).length+" ohne Adresse · "+adminPlaces.filter(p=>p.status==="published"&&(p.latitude==null||p.longitude==null)).length+" ohne GPS";
 const box=$("placesAdminList");box.replaceChildren();
 for(const p of items){
  if(filter==="categories"){
   const row=element("div");row.className="compact-category-row";
   const name=element("strong",p.name+" · "+p.locality);name.title=p.name+" · "+p.locality;
   const choose=element("select");choose.setAttribute("aria-label","Kategorie von "+p.name);
   for(const c of [{id:"",label:"Ohne Kategorie"},...adminCategories]){const option=element("option",c.label);option.value=c.id;choose.append(option)}
   choose.value=p.category_id||"";
   const status=element("small");status.setAttribute("role","status");
   choose.onchange=async()=>{
    choose.disabled=true;status.textContent="…";
    try{const result=await placesApi("update",{id:p.id,fields:{category_id:choose.value||null},expected_updated_at:p.updated_at});Object.assign(p,result.place);status.textContent="✓"}
    catch(e){choose.value=p.category_id||"";status.textContent="Fehler";status.title=e.message}
    finally{choose.disabled=false}
   };
   row.append(name,choose,status);box.append(row);continue;
  }
  const card=element("div");card.className="item";
  card.append(element("strong",p.name+" · "+p.locality),element("p","Kategorie: "+(adminCategories.find(c=>c.id===p.category_id)?.label||"Nicht zugeordnet")),element("p",p.status==="archived"?"Archiviert":"Fehlt: "+(missingPlace(p).join(", ")||"Keine wesentlichen Angaben")));
  if(p.status==="published"){
   const quick=element("div");quick.className="quick-category";
   const categorySelect=element("select");categorySelect.setAttribute("aria-label","Kategorie für "+p.name);
   for(const c of [{id:"",label:"Ohne Kategorie"},...adminCategories]){const option=element("option",c.label);option.value=c.id;categorySelect.append(option)}
   categorySelect.value=p.category_id||"";
   const result=element("small");result.setAttribute("role","status");
   categorySelect.onchange=async()=>{
    categorySelect.disabled=true;result.textContent="Speichern …";
    try{
     const updated=await placesApi("update",{id:p.id,fields:{category_id:categorySelect.value||null},expected_updated_at:p.updated_at});
     Object.assign(p,updated.place);result.textContent="Gespeichert";
    }catch(error){categorySelect.value=p.category_id||"";result.textContent="Fehler: "+error.message}
    finally{categorySelect.disabled=false}
   };
   quick.append(categorySelect,result);card.append(quick);
  }
  const action=element("button",p.status==="archived"?"Wiederherstellen":"Bearbeiten");action.type="button";action.className="secondary";card.append(action);
  if(p.status==="archived"){
   action.onclick=()=>confirmPlaceAction(p,"restore",card);box.append(card);continue;
  }
  action.onclick=()=>{
   if(card.querySelector("form")){card.querySelector("form").remove();return}
   const form=element("form");form.noValidate=true;
   const keys=[["name","Name"],["locality","Ort"],["region","Region"],["address","Adresse"],["phone","Telefon"],["email","E-Mail"],["website_url","Website"],["source_url","Quelle"],["notes","Beschreibung"],["latitude","Breitengrad"],["longitude","Längengrad"]];
   const fields={};
   for(const [key,label] of keys){
    const wrapper=element("label",label);const input=element(key==="notes"?"textarea":"input");
    if(key==="website_url"||key==="source_url")input.type="url";if(key==="email")input.type="email";
    if(key==="latitude"||key==="longitude")input.inputMode="decimal";
    input.value=p[key]??"";input.dataset.placeField=key;if(key==="source_url")input.dataset.sourceUrl="true";wrapper.append(input);form.append(wrapper);fields[key]=input;
   }
   const categoryLabel=element("label","Kategorie");const categorySelect=element("select");categorySelect.dataset.placeField="category_id";
   for(const c of [{id:"",label:"Keine Kategorie"},...adminCategories]){const opt=element("option",c.label);opt.value=c.id;categorySelect.append(opt)}
   categorySelect.value=p.category_id||"";categoryLabel.append(categorySelect);form.prepend(categoryLabel);fields.category_id=categorySelect;
   const sourceButton=element("button","Quellen-Website auswerten");sourceButton.type="button";sourceButton.className="source-lookup secondary";const sourceResult=element("div");sourceResult.className="source-results";form.append(sourceButton,sourceResult);
   const gpsButton=element("button","GPS aus Adresse ermitteln");gpsButton.type="button";gpsButton.className="geocode-address secondary";const gpsResult=element("div");gpsResult.className="geocode-results";form.append(gpsButton,gpsResult);
   const findAddress=element("button","Adresse automatisch suchen");findAddress.type="button";findAddress.className="secondary";
   const addressMatches=element("div");addressMatches.setAttribute("aria-live","polite");
   form.append(findAddress,addressMatches);
   findAddress.onclick=async()=>{
    const term=[fields.name.value.trim(),fields.locality.value.trim()].filter(Boolean).join(", ");
    if(term.length<3){addressMatches.textContent="Bitte Name oder Ort eintragen.";return}
    findAddress.disabled=true;addressMatches.replaceChildren(element("p","Adresssuche läuft …"));
    try{
     const {data:{session}}=await db.auth.getSession();if(!session?.access_token)throw Error("Bitte neu anmelden");
     const response=await fetch("https://itaoljnqwoiifztjlfyc.supabase.co/functions/v1/popgo-place-search?q="+encodeURIComponent(term),{headers:{authorization:"Bearer "+session.access_token,apikey:"sb_publishable_9SXRrjZnf1-Od24sBr6QNA_9WUPofZV"}});
     const result=await response.json();if(!response.ok)throw Error(result.error||"Suche fehlgeschlagen");
     addressMatches.replaceChildren();
     if(!result.results?.length){addressMatches.append(element("p","Keine passenden Adressen. Bitte manuell ergänzen."));return}
     const norm=t=>String(t||"").toLocaleLowerCase("de").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
     const significant=norm(fields.name.value).split(" ").filter(w=>w.length>=3&&!["restaurant","cafe","bar","gasthaus","hotel","zum","zur","der","die","das"].includes(w));
     const town=norm(fields.locality.value);
     const matches=(result.results||[]).filter(hit=>{
      const n=norm(hit.name),loc=norm(hit.locality+" "+hit.address);
      return significant.length>0&&significant.every(w=>n.split(" ").some(x=>x===w||x.startsWith(w)&&w.length>=5))&&(!town||loc.includes(town));
     });
     if(!matches.length){
      const warning=element("p","Kein eindeutig passender Ort gefunden. Allgemeine Treffer (z. B. Stadtzentren) werden aus Sicherheitsgründen nicht angeboten.");
      addressMatches.append(warning);
      if(fields.source_url.value.trim()){
       const reference=element("a","Vorhandene Quelle zur Prüfung öffnen");reference.href=fields.source_url.value.trim();reference.target="_blank";reference.rel="noopener noreferrer";addressMatches.append(reference)
      }
      return;
     }
     for(const hit of matches){
      const option=element("div");option.className="item";
      option.append(element("strong",hit.name||""),element("p",hit.address||hit.locality||"Adresse unbekannt"));
      if(hit.latitude!=null&&hit.longitude!=null)option.append(element("small","GPS: "+hit.latitude+", "+hit.longitude));
      const use=element("button","Diese Daten übernehmen");use.type="button";
      use.onclick=()=>{
       if(hit.address)fields.address.value=hit.address;
       if(hit.latitude!=null&&hit.longitude!=null){fields.latitude.value=hit.latitude;fields.longitude.value=hit.longitude}
       if(hit.website&&!fields.website_url.value.trim())fields.website_url.value=hit.website;
       addressMatches.replaceChildren(element("p","Angaben in die Felder übernommen. Bitte prüfen und „Änderungen speichern“ tippen."));
      };
      option.append(use);addressMatches.append(option);
     }
    }catch(e){addressMatches.replaceChildren(element("p","Adresssuche fehlgeschlagen: "+e.message))}
    finally{findAddress.disabled=false}
   };
   const info=element("p");info.setAttribute("role","status");form.append(info);
   const save=element("button","Änderungen speichern");save.type="submit";
   form.append(save);
   const archive=element("button","Archivieren");archive.type="button";archive.className="secondary";archive.onclick=()=>confirmPlaceAction(p,"archive",card);
   form.append(archive);
   form.onsubmit=async ev=>{
    ev.preventDefault();save.disabled=true;info.textContent="Speichere …";
    try{
     const values={};for(const key of Object.keys(fields)){let value=fields[key].value.trim();values[key]=key==="category_id"?(value||null):(key==="latitude"||key==="longitude")?(value===""?null:Number(value)):value}
     if(!values.name)throw Error("Name darf nicht leer sein.");
     const res=await placesApi("update",{id:p.id,fields:values,expected_updated_at:p.updated_at});
     Object.assign(p,res.place);info.textContent="Gespeichert.";renderPlacesAdmin()
    }catch(e){info.textContent="Speichern fehlgeschlagen: "+e.message}finally{save.disabled=false}
   };
   card.append(form);
  };
  box.append(card);
 }
 if(!items.length)box.append(element("p","Keine passenden Einträge."));
}
async function confirmPlaceAction(p,action,card){
 const prior=card.querySelector(".confirm-place");
 if(prior){prior.remove();return}
 const panel=element("div");panel.className="confirm-place";
 panel.append(element("p",action==="archive"?"Der Eintrag verschwindet aus der öffentlichen Liste. Wiederherstellung bleibt möglich.":"Der Eintrag wird wieder veröffentlicht."));
 const proceed=element("button",action==="archive"?"Archivierung bestätigen":"Wiederherstellung bestätigen");proceed.type="button";
 const cancel=element("button","Abbrechen");cancel.type="button";cancel.className="secondary";cancel.onclick=()=>panel.remove();
 const info=element("p");info.setAttribute("role","status");
 proceed.onclick=async()=>{
  proceed.disabled=true;try{await placesApi(action,{id:p.id,expected_updated_at:p.updated_at});info.textContent="Aktion ausgeführt.";await loadPlacesAdmin()}
  catch(e){info.textContent="Aktion fehlgeschlagen: "+e.message;proceed.disabled=false}
 };
 panel.append(proceed,cancel,info);card.append(panel);
}
$("placesFilter").onchange=renderPlacesAdmin;
$("placesSearch").oninput=renderPlacesAdmin;


function renderCategoryAdmin(){
 const box=$("categoryAdminList");box.replaceChildren();
 const all=adminCategories.slice().sort((a,b)=>a.label.localeCompare(b.label,"de"));
 for(const cat of all){
  const used=adminPlaces.filter(p=>p.category_id===cat.id).length;
  const row=element("div");row.className="item";
  row.append(element("strong",cat.label),element("p",used+" veröffentlichte oder archivierte Einträge"));
  const rename=element("button","Umbenennen");rename.type="button";rename.className="secondary";
  const remove=element("button","Löschen");remove.type="button";remove.className="secondary";remove.disabled=used>0;
  const edit=element("div");row.append(rename,remove,edit);box.append(row);
  rename.onclick=()=>{
   edit.replaceChildren();const input=element("input");input.value=cat.label;input.maxLength=80;
   const apply=element("button","Namen speichern");apply.type="button";
   apply.onclick=async()=>{try{apply.disabled=true;await placesApi("category_rename",{category_id:cat.id,label:input.value.trim()});$("categoryAdminStatus").textContent="Kategorie umbenannt.";await loadPlacesAdmin()}catch(e){$("categoryAdminStatus").textContent=e.message;apply.disabled=false}};
   edit.append(input,apply);
  };
  remove.onclick=async()=>{
   if(!confirm("Ungenutzte Kategorie „"+cat.label+"“ wirklich löschen?"))return;
   try{await placesApi("category_delete",{category_id:cat.id});$("categoryAdminStatus").textContent="Kategorie gelöscht.";await loadPlacesAdmin()}catch(e){$("categoryAdminStatus").textContent=e.message}
  };
 }
}
$("categoryCreateForm").onsubmit=async e=>{
 e.preventDefault();const input=$("categoryNewName"),name=input.value.trim();if(!name)return;
 try{await placesApi("category_create",{label:name});input.value="";$("categoryAdminStatus").textContent="Kategorie angelegt.";await loadPlacesAdmin()}
 catch(error){$("categoryAdminStatus").textContent="Kategorie nicht angelegt: "+error.message}
};

refresh().catch(e=>msg(e.message));