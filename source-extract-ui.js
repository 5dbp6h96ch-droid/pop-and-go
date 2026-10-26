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
   for(const value of values||[]){
    const row=document.createElement("div");row.className="item";
    const label=document.createElement("p");label.textContent=title+": "+value;
    const take=document.createElement("button");take.type="button";take.textContent="Übernehmen";
    take.onclick=()=>{const field=form.querySelector('[data-place-field="'+name+'"]');if(field)field.value=value;take.disabled=true;take.textContent="Übernommen – noch nicht gespeichert"};
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