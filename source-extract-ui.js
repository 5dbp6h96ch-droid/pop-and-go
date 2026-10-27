"use strict";
document.addEventListener("click",async event=>{
 const button=event.target.closest("#placesAdmin .source-lookup");
 if(!button)return;
 const form=button.closest("form");
 if(!form)return;
 const source=form.querySelector('[data-source-url]');
 const output=form.querySelector(".source-results");
 if(!source||!output)return;
 output.textContent="Website wird ausgewertet …";
 button.disabled=true;
 try{
  const session=(await db.auth.getSession()).data.session;
  if(!session)throw Error("Anmeldung erforderlich");
  const response=await fetch("https://itaoljnqwoiifztjlfyc.supabase.co/functions/v1/popgo-source-extract",{method:"POST",headers:{"authorization":"Bearer "+session.access_token,"apikey":"sb_publishable_9SXRrjZnf1-Od24sBr6QNA_9WUPofZV","content-type":"application/json"},body:JSON.stringify({url:source.value.trim()})});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||"Abruf fehlgeschlagen");
  output.replaceChildren();
  output.append(document.createTextNode("Gefundene Angaben einzeln prüfen und übernehmen:"));
  for(const [name,title,values] of [["address","Adresse",data.addresses],["phone","Telefon",data.phones],["email","E-Mail",data.emails]]){
   for(const item of values||[]){
    const value=typeof item==="string"?item:item?.value;
    if(!value)continue;
    const row=document.createElement("div");row.className="item";
    const label=document.createElement("p");label.textContent=title+": "+value;
    const sourceUrl=typeof item==="object"?item.source:"";
    if(sourceUrl){const sourceLink=document.createElement("a");sourceLink.textContent="Fundstelle prüfen";sourceLink.href=sourceUrl;sourceLink.target="_blank";sourceLink.rel="noopener noreferrer";row.append(sourceLink)}
    if(name==="address"&&typeof item==="object"&&!item.complete){
      const warning=document.createElement("p");warning.textContent="Straße, Hausnummer oder Postleitzahl fehlt – nicht als vollständige Adresse übernehmen.";row.append(label,warning);output.append(row);continue;
    }
    const take=document.createElement("button");take.type="button";take.textContent="Übernehmen";
    take.onclick=()=>{const field=form.querySelector('[data-place-field="'+name+'"]');if(field){field.value=value;if(name==="address")form.querySelector('[data-place-field="latitude"]')&&(form.querySelector('[data-place-field="latitude"]').value="");if(name==="address")form.querySelector('[data-place-field="longitude"]')&&(form.querySelector('[data-place-field="longitude"]').value="");}take.disabled=true;take.textContent="Übernommen – noch nicht gespeichert"};
    row.append(label,take);output.append(row);
   }
  }
  if(!output.querySelector("button"))output.append(document.createTextNode("Keine eindeutigen Kontaktdaten gefunden."));
 }catch(error){output.textContent="Auswertung nicht möglich: "+error.message}
 finally{button.disabled=false}
});
document.addEventListener("click",async event=>{
 const button=event.target.closest("#placesAdmin .geocode-address");
 if(!button)return;
 const form=button.closest("form"),out=form?.querySelector(".geocode-results");
 if(!form||!out)return;
 const get=k=>form.querySelector('[data-place-field="'+k+'"]');
 const address=get("address")?.value.trim()||"",locality=get("locality")?.value.trim()||"";
 if(!address){out.textContent="Zuerst eine vollständige Straßenadresse übernehmen oder eintragen.";return}
 button.disabled=true;out.textContent="Koordinaten werden gesucht …";
 try{
  const session=(await db.auth.getSession()).data.session;
  if(!session)throw Error("Anmeldung erforderlich");
  const res=await fetch("https://itaoljnqwoiifztjlfyc.supabase.co/functions/v1/popgo-geocode-address",{method:"POST",headers:{"authorization":"Bearer "+session.access_token,"apikey":"sb_publishable_9SXRrjZnf1-Od24sBr6QNA_9WUPofZV","content-type":"application/json"},body:JSON.stringify({address,locality})});
  const data=await res.json();if(!res.ok)throw Error(data.error||"Suche fehlgeschlagen");
  out.replaceChildren();
  if(!data.results?.length){out.textContent="Keine hinreichend passende Adresse mit Koordinaten gefunden. Bitte manuell prüfen.";return}
  for(const place of data.results){
   const row=document.createElement("div");row.className="item";
   const description=document.createElement("p");description.textContent=place.address+" · GPS "+place.latitude+", "+place.longitude;
   const select=document.createElement("button");select.type="button";select.textContent="Koordinaten übernehmen";
   select.onclick=()=>{get("latitude").value=String(place.latitude);get("longitude").value=String(place.longitude);select.disabled=true;select.textContent="GPS übernommen – noch nicht gespeichert"};
   row.append(description,select);out.append(row);
  }
 }catch(error){out.textContent="GPS-Suche fehlgeschlagen: "+error.message}
 finally{button.disabled=false}
});
/* Manuelle, kostenlose Webrecherche für vorhandene Admin-Einträge.
   Keine automatischen Änderungen: Website und extrahierte Werte werden nur nach Prüfung übernommen. */
document.addEventListener("click",event=>{
 const button=event.target.closest("#placesAdmin .web-research");
 if(!button)return;
 const form=button.closest("form"),panel=form?.querySelector(".web-research-panel");
 if(!form||!panel)return;
 panel.hidden=!panel.hidden;
 if(panel.hidden)return;
 const get=k=>form.querySelector('[data-place-field="'+k+'"]');
 const name=get("name")?.value.trim()||"",locality=get("locality")?.value.trim()||"",address=get("address")?.value.trim()||"";
 const query=[name,locality,address].filter(Boolean).join(" ");
 const search=panel.querySelector(".web-research-search");
 search.href="https://www.google.com/search?q="+encodeURIComponent(query+" offizielle Website Kontakt");
 const url=panel.querySelector(".web-research-url");
 url.value=get("website_url")?.value.trim()||"";
 panel.querySelector(".web-research-status").textContent="Öffne die Suche, prüfe die offizielle Website und füge ihre Adresse hier ein.";
});
document.addEventListener("click",event=>{
 const button=event.target.closest("#placesAdmin .web-research-apply");
 if(!button)return;
 const form=button.closest("form"),panel=button.closest(".web-research-panel");
 if(!form||!panel)return;
 const input=panel.querySelector(".web-research-url");
 const status=panel.querySelector(".web-research-status");
 const website=form.querySelector('[data-place-field="website_url"]');
 const source=form.querySelector('[data-place-field="source_url"]');
 let url;try{url=new URL(input.value.trim());if(url.protocol!=="https:"&&url.protocol!=="http:")throw Error();if(url.username||url.password)throw Error();}catch{status.textContent="Bitte eine gültige http(s)-Website-Adresse eingeben.";return}
 if(!website||!source)return;
 const current=website.value.trim();
 if(current&&current!==url.href&&!window.confirm("Die bisherige Website ersetzen?"))return;
 website.value=url.href;
 // Die Website-Auswertung muss dieselbe, gerade gewählte Betreiberseite verwenden.
 source.value=url.href;
 input.value=url.href;
 website.dispatchEvent(new Event("input",{bubbles:true}));
 source.dispatchEvent(new Event("input",{bubbles:true}));
 status.textContent="Website und Quellenadresse übernommen: "+url.href+" — noch nicht gespeichert. Bitte anschließend „Änderungen speichern“ wählen.";
 const extract=form.querySelector(".source-lookup");
 if(extract){extract.scrollIntoView({block:"nearest",behavior:"smooth"});extract.focus();}
});
document.addEventListener("click",event=>{
 const button=event.target.closest("#placesAdmin .web-research-extract");
 if(!button)return;
 const form=button.closest("form"),panel=button.closest(".web-research-panel");
 if(!form||!panel)return;
 const website=form.querySelector('[data-place-field="website_url"]'),source=form.querySelector('[data-place-field="source_url"]');
 const input=panel.querySelector(".web-research-url");
 if(input.value.trim()&&website.value.trim()!==input.value.trim()){
  panel.querySelector(".web-research-status").textContent="Bitte zuerst die Website übernehmen.";
  return;
 }
 if(!source.value.trim()&&website.value.trim())source.value=website.value.trim();
 const extract=form.querySelector(".source-lookup");
 if(extract)extract.click();
});
document.addEventListener("click",event=>{
 const button=event.target.closest("#placesAdmin .secondary");
 if(!button||button.textContent.trim()!=="Bearbeiten")return;
 // Der Bearbeitungsdialog entsteht synchron im bestehenden Handler.
 queueMicrotask(()=>{
  const form=button.closest(".item")?.querySelector("form");
  if(!form||form.querySelector(".web-research"))return;
  const extract=form.querySelector(".source-lookup");
  if(!extract)return;
  const open=document.createElement("button");
  open.type="button";open.className="secondary web-research";open.textContent="Im Web recherchieren";
  const panel=document.createElement("div");panel.className="web-research-panel";panel.hidden=true;
  const title=document.createElement("strong");title.textContent="Offizielle Website finden";
  const explain=document.createElement("p");explain.textContent="Die kostenlose Suche öffnet sich in einem neuen Tab. Vergleiche Name und Ort, bevor du die Betreiberwebsite übernimmst.";
  const search=document.createElement("a");search.className="web-research-search";search.target="_blank";search.rel="noopener noreferrer";search.textContent="Websuche öffnen";search.href="https://www.google.com/search";
  const label=document.createElement("label");label.textContent="Gefundene Internetadresse";
  const url=document.createElement("input");url.className="web-research-url";url.type="url";url.inputMode="url";url.placeholder="https://www.beispiel.de";url.maxLength=500;label.append(url);
  const apply=document.createElement("button");apply.type="button";apply.className="secondary web-research-apply";apply.textContent="Website übernehmen";
  const evaluation=document.createElement("button");evaluation.type="button";evaluation.className="secondary web-research-extract";evaluation.textContent="Kontaktdaten auswerten";
  const status=document.createElement("p");status.className="web-research-status";status.setAttribute("role","status");status.setAttribute("aria-live","polite");
  panel.append(title,explain,search,label,apply,evaluation,status);
  extract.before(open,panel);
 });
});
